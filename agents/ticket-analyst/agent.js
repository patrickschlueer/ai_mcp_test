import Anthropic from '@anthropic-ai/sdk';
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Ticket Analyst Agent
 * 
 * Dieser Agent:
 * 1. Liest neue Jira Tickets (Status: "To Do")
 * 2. Analysiert sie mit Claude
 * 3. Schätzt Story Points
 * 4. Stellt Rückfragen
 * 5. Wartet auf PM Antwort
 */

class TicketAnalystAgent {
  constructor() {
    this.name = process.env.AGENT_NAME || 'Ticket Analyst Agent';
    this.emoji = process.env.AGENT_EMOJI || '🔍';
    this.mcpServerUrl = process.env.MCP_SERVER_URL || 'http://localhost:3001';
    this.projectKey = process.env.JIRA_PROJECT_KEY || 'AT';
    
    // Anthropic Client
    this.anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY
    });
    
    // Verarbeitete Tickets merken (damit wir sie nicht doppelt analysieren)
    this.processedTickets = new Set();
    
    console.log(`${this.emoji} ${this.name} initialized`);
    console.log(`   MCP Server: ${this.mcpServerUrl}`);
    console.log(`   Project: ${this.projectKey}`);
  }

  /**
   * MCP Tool aufrufen (über HTTP)
   */
  async callMCPTool(toolName, params) {
    try {
      const response = await axios.post(
        `${this.mcpServerUrl}/tools/${toolName}`,
        params
      );
      return response.data;
    } catch (error) {
      console.error(`[${this.name}] Error calling MCP tool ${toolName}:`, error.message);
      throw error;
    }
  }

  /**
   * Alle neuen Tickets aus Jira holen
   */
  async getNewTickets() {
    console.log(`\n${this.emoji} Checking for new tickets...`);
    
    const result = await this.callMCPTool('get_tickets', {
      status: 'To Do',
      assignee: 'UNASSIGNED',
      maxResults: 10
    });

    if (!result.success) {
      console.error(`Failed to fetch tickets: ${result.error}`);
      return [];
    }

    // Filter: Nur Tickets die wir noch nicht verarbeitet haben
    const newTickets = result.tickets.filter(ticket => 
      !this.processedTickets.has(ticket.key)
    );

    console.log(`   Found ${newTickets.length} new ticket(s)`);
    return newTickets;
  }

  /**
   * Ticket mit Claude analysieren
   */
  async analyzeTicket(ticket) {
    console.log(`\n${this.emoji} Analyzing ticket: ${ticket.key}`);
    console.log(`   Summary: ${ticket.summary}`);

    const prompt = `
Du bist ein Business Analyst, der Jira Tickets aus BUSINESS-PERSPEKTIVE analysiert.

WICHTIG: Du fragst NUR nach Business-Requirements und Geschäftslogik.
Technische Details (UI/UX, Datenbank, Code) sind NICHT deine Aufgabe - das machen später Designer, Architect und Developer Agents!

TICKET DETAILS:
Key: ${ticket.key}
Zusammenfassung: ${ticket.summary}
Beschreibung: ${typeof ticket.description === 'string' ? ticket.description : 'Keine Beschreibung vorhanden'}
Priorität: ${ticket.priority}
Issue Type: ${ticket.issueType}

DEINE AUFGABE:
1. Analysiere ob die BUSINESS-ANFORDERUNG klar ist
2. Schätze Story Points (1, 2, 3, 5, 8, 13, 21)
3. Identifiziere fehlende BUSINESS-INFORMATIONEN
4. Stelle NUR Fragen zum BUSINESS-ZWECK und GESCHÄFTSLOGIK

Frage NICHT nach:
❌ UI/UX Details (macht Designer Agent)
❌ Technischer Implementierung (macht Developer Agent)  
❌ Datenbank/API Design (macht Architect Agent)
❌ Code-Validierung (macht Developer Agent)

Frage stattdessen nach:
✅ Was soll die Funktion tun? (Business-Zweck)
✅ Wer darf was? (Berechtigungen, Rollen)
✅ Welche Geschäftsregeln gelten?
✅ Was sind die Acceptance Criteria?
✅ Gibt es Sonderfälle oder Einschränkungen?

BEISPIEL:
Ticket: "Neue Worker-Rolle hinzufügen"

GUTE Fragen (Business):
✅ "Was darf ein Worker im System tun?"
✅ "Welche Berechtigungen hat die Worker-Rolle?"
✅ "Gibt es Einschränkungen für Worker?"
✅ "Wer darf Worker-Rollen zuweisen?"

SCHLECHTE Fragen (zu technisch):
❌ "Wo wird die Rolle in der Datenbank gespeichert?" (Architect)
❌ "Welche UI/UX Vorgaben gibt es?" (Designer)
❌ "Welche Validierungslogik brauchen wir?" (Developer)
❌ "Muss eine Migration laufen?" (Developer)

Antworte im JSON-Format:
{
  "storyPoints": <number>,
  "complexity": "niedrig|mittel|hoch",
  "clarity": "klar|unklar",
  "missingInfo": ["Fehlende Business-Informationen"],
  "questions": ["Spezifische Business-Fragen für PM"],
  "recommendation": "Kurze Empfehlung",
  "analysisComplete": true/false
}

WICHTIG: 
- Konzentriere dich auf BUSINESS-ANFORDERUNGEN
- Stelle maximal 3-5 Fragen
- Fragen müssen vom PM beantwortbar sein
- Technische Details sind NICHT deine Aufgabe
- Bleibe professionell und freundlich
- Antworte auf DEUTSCH
`;

    try {
      const message = await this.anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2000,
        messages: [{
          role: 'user',
          content: prompt
        }]
      });

      const responseText = message.content[0].text;
      
      // Parse JSON (manchmal ist es in ```json ... ``` wrapped)
      let cleanedResponse = responseText.trim();
      if (cleanedResponse.startsWith('```json')) {
        cleanedResponse = cleanedResponse.replace(/```json\n?/g, '').replace(/```\n?/g, '');
      }
      
      const analysis = JSON.parse(cleanedResponse);
      
      console.log(`   ✅ Analysis complete:`);
      console.log(`      Story Points: ${analysis.storyPoints}`);
      console.log(`      Complexity: ${analysis.complexity}`);
      console.log(`      Questions: ${analysis.questions.length}`);
      
      return analysis;
    } catch (error) {
      console.error(`   ❌ Analysis failed:`, error.message);
      throw error;
    }
  }

  /**
   * Analyse-Ergebnis als Kommentar ins Ticket schreiben
   */
  async postAnalysisComment(ticketKey, analysis) {
    console.log(`\n${this.emoji} Posting analysis to ${ticketKey}...`);

    const comment = this.formatAnalysisComment(analysis);

    const result = await this.callMCPTool('add_comment', {
      ticketKey: ticketKey,
      comment: comment
    });

    if (result.success) {
      console.log(`   ✅ Comment posted successfully`);
    } else {
      console.error(`   ❌ Failed to post comment: ${result.error}`);
    }

    return result;
  }

  /**
   * Formatiere Analyse als Jira-Kommentar
   */
  formatAnalysisComment(analysis) {
    let comment = `${this.emoji} *Ticket Analysis Complete*\n\n`;
    
    comment += `*Story Points:* ${analysis.storyPoints}\n`;
    comment += `*Complexity:* ${analysis.complexity}\n`;
    comment += `*Clarity:* ${analysis.clarity}\n\n`;

    if (analysis.missingInfo && analysis.missingInfo.length > 0) {
      comment += `*Missing Information:*\n`;
      analysis.missingInfo.forEach(info => {
        comment += `• ${info}\n`;
      });
      comment += `\n`;
    }

    if (analysis.questions && analysis.questions.length > 0) {
      comment += `*Questions for Project Manager:*\n`;
      analysis.questions.forEach((question, index) => {
        comment += `${index + 1}. ${question}\n`;
      });
      comment += `\n`;
      comment += `_Please answer these questions and reply with "approved" when ready._\n\n`;
    } else {
      comment += `*Status:* ✅ All requirements are clear!\n`;
      comment += `_Reply with "approved" to proceed to next phase._\n\n`;
    }

    comment += `*Recommendation:* ${analysis.recommendation}\n\n`;
    comment += `---\n`;
    comment += `_Analyzed by ${this.name} at ${new Date().toISOString()}_`;

    return comment;
  }

  /**
   * Ticket verarbeiten (Hauptlogik)
   */
  async processTicket(ticket) {
    try {
      console.log(`\n${'='.repeat(60)}`);
      console.log(`${this.emoji} Processing Ticket: ${ticket.key}`);
      console.log(`${'='.repeat(60)}`);

      // Prüfe ob wir schon einen Kommentar geschrieben haben
      const fullTicket = await this.callMCPTool('get_ticket', { ticketKey: ticket.key });
      if (fullTicket.success && fullTicket.ticket.comments) {
        const hasAgentComment = fullTicket.ticket.comments.some(comment => {
          let bodyText = '';
          if (typeof comment.body === 'string') {
            bodyText = comment.body;
          } else if (comment.body && comment.body.content) {
            bodyText = this.extractTextFromCommentADF(comment.body);
          }
          
          // Prüfe ob Kommentar von uns ist
          return bodyText.includes(this.emoji) && 
                 bodyText.includes('Ticket Analysis Complete');
        });
        
        if (hasAgentComment) {
          console.log(`\n${this.emoji} ⚠️  Ticket ${ticket.key} already analyzed (found existing comment)`);
          console.log(`   Skipping...`);
          this.processedTickets.add(ticket.key);
          return {
            success: true,
            ticketKey: ticket.key,
            skipped: true,
            reason: 'Already analyzed'
          };
        }
      }

      // 1. Ticket analysieren
      const analysis = await this.analyzeTicket(ticket);

      // 2. Analyse als Kommentar posten
      await this.postAnalysisComment(ticket.key, analysis);

      // 3. Als verarbeitet markieren
      this.processedTickets.add(ticket.key);

      console.log(`\n${this.emoji} ✅ Ticket ${ticket.key} processed successfully!`);
      console.log(`   Waiting for PM approval...`);
      
      return {
        success: true,
        ticketKey: ticket.key,
        analysis: analysis
      };
    } catch (error) {
      console.error(`\n${this.emoji} ❌ Error processing ticket ${ticket.key}:`, error.message);
      return {
        success: false,
        ticketKey: ticket.key,
        error: error.message
      };
    }
  }

  /**
   * Prüfe ob PM auf ein analysiertes Ticket geantwortet hat
   */
  async checkForPMApproval() {
    console.log(`\n${this.emoji} Checking for PM approvals...`);
    
    // Hole alle Tickets die wir analysiert haben
    for (const ticketKey of this.processedTickets) {
      try {
        const result = await this.callMCPTool('get_ticket', { ticketKey });
        
        if (!result.success) continue;
        
        const ticket = result.ticket;
        
        // Finde unseren eigenen Analyse-Kommentar
        let agentCommentIndex = -1;
        ticket.comments.forEach((comment, index) => {
          let bodyText = '';
          if (typeof comment.body === 'string') {
            bodyText = comment.body;
          } else if (comment.body && comment.body.content) {
            bodyText = this.extractTextFromCommentADF(comment.body);
          }
          
          if (bodyText.includes(this.emoji) && bodyText.includes('Ticket Analysis Complete')) {
            agentCommentIndex = index;
          }
        });
        
        // Prüfe nur Kommentare NACH unserem Analyse-Kommentar
        const commentsAfterAnalysis = ticket.comments.slice(agentCommentIndex + 1);
        
        const hasApproval = commentsAfterAnalysis.some(comment => {
          // comment.body kann String oder Object sein
          let bodyText = '';
          if (typeof comment.body === 'string') {
            bodyText = comment.body;
          } else if (comment.body && comment.body.content) {
            // ADF Format - Text extrahieren
            bodyText = this.extractTextFromCommentADF(comment.body);
          }
          
          // Ignoriere unsere eigenen Kommentare
          if (bodyText.includes(this.emoji)) {
            return false;
          }
          
          const lowerBody = bodyText.toLowerCase();
          return lowerBody.includes('approved') || 
                 lowerBody.includes('approve') || 
                 lowerBody.includes('looks good') ||
                 lowerBody.includes('ok');
        });
        
        if (hasApproval) {
          console.log(`   ✅ ${ticketKey}: PM approval found!`);
          console.log(`      → Ready for next phase (Technical Lead)`);
          
          // Optional: Status ändern
          await this.callMCPTool('update_ticket', {
            ticketKey: ticketKey,
            updates: {
              status: 'In Progress'
            }
          });
          
          // Aus Tracking entfernen (ist jetzt für nächsten Agent)
          this.processedTickets.delete(ticketKey);
        }
      } catch (error) {
        console.error(`   Error checking ${ticketKey}:`, error.message);
      }
    }
  }

  /**
   * Hilfsfunktion: Text aus Kommentar-ADF extrahieren
   */
  extractTextFromCommentADF(adf) {
    if (!adf || !adf.content) return '';
    
    let text = '';
    
    const processContent = (content) => {
      if (Array.isArray(content)) {
        content.forEach(item => {
          if (item.type === 'text') {
            text += item.text + ' ';
          } else if (item.content) {
            processContent(item.content);
          }
        });
      }
    };
    
    processContent(adf.content);
    return text.trim();
  }

  /**
   * Haupt-Loop: Läuft kontinuierlich
   */
  async run(intervalSeconds = 30) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`${this.emoji} ${this.name} started!`);
    console.log(`${'='.repeat(60)}`);
    console.log(`Polling interval: ${intervalSeconds} seconds`);
    console.log(`Press Ctrl+C to stop\n`);

    while (true) {
      try {
        // 1. Neue Tickets suchen und analysieren
        const newTickets = await this.getNewTickets();
        
        for (const ticket of newTickets) {
          await this.processTicket(ticket);
        }

        // 2. Prüfe ob PM auf analysierte Tickets geantwortet hat
        if (this.processedTickets.size > 0) {
          await this.checkForPMApproval();
        }

        // 3. Warte bis zum nächsten Check
        console.log(`\n${this.emoji} Waiting ${intervalSeconds}s until next check...`);
        console.log(`   Processed tickets: ${this.processedTickets.size}`);
        await this.sleep(intervalSeconds * 1000);

      } catch (error) {
        console.error(`\n${this.emoji} Error in main loop:`, error.message);
        console.log(`   Retrying in ${intervalSeconds}s...`);
        await this.sleep(intervalSeconds * 1000);
      }
    }
  }

  /**
   * Sleep helper
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Agent starten (wenn direkt ausgeführt)
const isMainModule = process.argv[1]?.replace(/\\/g, '/').endsWith('/agent.js');
if (isMainModule) {
  const agent = new TicketAnalystAgent();
  agent.run(30); // Check alle 30 Sekunden
}

export default TicketAnalystAgent;
