import Anthropic from '@anthropic-ai/sdk';
import axios from 'axios';
import dotenv from 'dotenv';
import FileDiscoveryUtil from '../shared-utils/file-discovery.js';

dotenv.config();

/**
 * Technical Product Owner Agent - MIT APPROVAL WORKFLOW
 * 
 * ✅ Analysiert "To Do" Tickets
 * ✅ Prüft "Approved" Tickets auf vollständige Antworten
 * ✅ Finalisiert oder rejected Tickets
 * 
 * 🛠️ TECH STACK:
 * - Frontend: Angular (eigenes CSS, kein Material!)
 * - Backend: Node.js
 * - Datenbank: In-Memory Node.js
 * - 3rd Party Libs: KEINE (außer TPO weist es explizit an!)
 */

class TechnicalProductOwnerAgent {
  constructor() {
    this.agentId = 'tech-po-001';
    this.name = process.env.AGENT_NAME || 'Technical Product Owner Agent';
    this.emoji = process.env.AGENT_EMOJI || '🎯';
    this.jiraMcpUrl = process.env.JIRA_MCP_SERVER_URL || 'http://localhost:3001';
    this.githubMcpUrl = process.env.GITHUB_MCP_SERVER_URL || 'http://localhost:3002';
    this.eventHubUrl = process.env.EVENT_HUB_URL || 'http://localhost:3000';
    this.projectKey = process.env.JIRA_PROJECT_KEY || 'AT';
    
    this.anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY
    });
    
    this.processedTickets = new Set();
    this.agentDocumentation = null;
    this.realFiles = [];
    
    // 🆕 Initialisiere File Discovery Utility
    this.fileDiscovery = new FileDiscoveryUtil(
      this.callMCPTool.bind(this),
      this.emoji
    );
    
    // Angular Best Practices & Architecture Rules
    this.angularRules = {
      componentStructure: 'Split into .ts, .html, .css - use templateUrl/styleUrl - Max 400 lines',
      componentOrganization: 'Reusable → /shared/, Feature-specific → /features/',
      fileOrganization: 'One class per file, one interface per file',
      stateManagement: 'NgRx (@ngrx/store, effects, entity) + RxJS',
      testing: 'Every file needs .spec.ts test file'
    };
    
    console.log(`${this.emoji} ${this.name} initialized`);
    console.log(`   Workflow: To Do → Analyze → Approved → Finalize`);
    console.log(`   Angular Rules: Component split, NgRx, Testing mandatory`);
    
    this.sendEvent({
      type: 'agent_started',
      message: `${this.name} started with approval workflow`,
      activity: 'Initializing...'
    });
  }

  async sendEvent(eventData) {
    try {
      await axios.post(`${this.eventHubUrl}/events/agent`, {
        agentId: this.agentId,
        agentName: this.name,
        emoji: this.emoji,
        timestamp: new Date().toISOString(),
        ...eventData
      });
    } catch (error) {
      // Silent fail
    }
  }

  async callMCPTool(server, toolName, params) {
    try {
      const serverUrl = server === 'jira' ? this.jiraMcpUrl : this.githubMcpUrl;
      const response = await axios.post(`${serverUrl}/tools/${toolName}`, params);
      return response.data;
    } catch (error) {
      console.error(`[${this.name}] Error calling ${server}:${toolName}:`, error.message);
      throw error;
    }
  }

  async loadAgentDocumentation() {
    console.log(`\n${this.emoji} Loading agent documentation...`);
    
    try {
      const result = await this.callMCPTool('github', 'get_file', { 
        path: 'test-app/AGENT_DOCUMENTATION.md' 
      });
      
      if (result.success) {
        this.agentDocumentation = result.file.content;
        console.log(`   ✅ Documentation loaded (${result.file.size} bytes)`);
        this.extractFilesFromDocumentation();
        return true;
      }
    } catch (error) {
      console.log(`   ⚠️  Could not load documentation: ${error.message}`);
    }
    
    return false;
  }

  extractFilesFromDocumentation() {
    if (!this.agentDocumentation) return;

    const archMatch = this.agentDocumentation.match(/```\s*test-app\/[\s\S]*?```/);
    
    if (archMatch) {
      const tree = archMatch[0];
      const fileMatches = tree.match(/[├└─│\s]*([a-zA-Z0-9_-]+\.(ts|js|md))/g);
      
      if (fileMatches) {
        this.realFiles = [];
        const lines = tree.split('\n');
        let currentPath = ['test-app'];
        
        lines.forEach(line => {
          const cleaned = line.replace(/[├└─│\s]+/, '').trim();
          if (!cleaned || cleaned.includes('```')) return;
          
          if (cleaned.endsWith('/')) {
            const dirName = cleaned.slice(0, -1);
            const indent = line.match(/[│\s]*/)[0].length;
            const depth = Math.floor(indent / 4);
            currentPath = currentPath.slice(0, depth + 1);
            currentPath.push(dirName);
          }
          else if (cleaned.match(/\.(ts|js|md)$/)) {
            this.realFiles.push([...currentPath, cleaned].join('/'));
          }
        });
      }
    }
    
    if (this.realFiles.length === 0) {
      this.realFiles = [
        'test-app/backend/server.js',
        'test-app/backend/models/user.js',
        'test-app/frontend/src/app/app.component.ts',
        'test-app/frontend/src/app/user.service.ts',
        'test-app/frontend/src/app/auth.service.ts'
      ];
    }
    
    console.log(`   ✅ Extracted ${this.realFiles.length} files`);
  }

  /**
   * 🆕 VERWENDET JETZT: FileDiscoveryUtil
   */
  async discoverRealFilesViaMCP() {
    const result = await this.fileDiscovery.discoverProjectFiles();
    return result.all;
  }

  async getNewTickets() {
    console.log(`\n${this.emoji} Checking for new "To Do" tickets...`);
    
    const result = await this.callMCPTool('jira', 'get_tickets', {
      status: 'To Do',
      assignee: 'UNASSIGNED',
      maxResults: 10
    });

    if (!result.success) return [];

    // 🔥 FILTER: Keine Sub-Tasks analysieren!
    const newTickets = result.tickets.filter(ticket => {
      // Debug: Log issue type
      console.log(`   📝 ${ticket.key}: issueType="${ticket.issueType}"`);
      
      // Filter conditions
      const notProcessed = !this.processedTickets.has(`${ticket.key}-analyzed`);
      
      // 🔥 WICHTIG: Case-insensitive Check für Sub-Tasks!
      const issueTypeLower = (ticket.issueType || '').toLowerCase();
      const notSubTask = !issueTypeLower.includes('sub') && !issueTypeLower.includes('subtask');
      
      if (!notSubTask) {
        console.log(`   🚫 Filtering out ${ticket.key} - it's a Sub-Task!`);
      }
      
      return notProcessed && notSubTask;
    });

    console.log(`   Found ${newTickets.length} new ticket(s) to analyze (Sub-tasks filtered out)`);
    return newTickets;
  }

  /**
   * 🆕 NEU: Update Ticket-Beschreibung ohne zu finalisieren
   */
  async updateTicketDescription(ticket, originalAnalysis, answers, codeFiles) {
    console.log(`\n${this.emoji} Updating ticket description with PM answers...`);
    
    // Erstelle verbesserte Beschreibung
    const prompt = `Du bist ein Technical Product Owner. Erstelle eine verbesserte Ticket-Beschreibung.

=== ORIGINAL TICKET ===
Ticket: ${ticket.key}
Summary: ${ticket.summary}
Beschreibung: ${ticket.description || 'Keine'}

=== ANALYSE ===
Story Points: ${originalAnalysis.storyPoints}
Komplexität: ${originalAnalysis.complexity}
Code Insights: ${originalAnalysis.codeInsights?.join(', ') || 'Keine'}

=== PM ANTWORTEN ===
${Object.entries(answers || {}).map(([num, answer]) => `Frage ${num}: ${answer}`).join('\n')}

=== CODE FILES ===
${codeFiles.map(f => `- ${f.path}`).join('\n')}

=== AUFGABE ===
Erstelle eine VERBESSERTE Beschreibung mit den PM-Antworten. Strukturiere sie klar für Developer/Designer/Architekt.

Antworte NUR mit JSON:
{
  "description": "Die verbesserte Beschreibung als Markdown"
}`;

    try {
      const message = await this.anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 3000,
        messages: [{ role: 'user', content: prompt }]
      });

      let responseText = message.content[0].text.trim();
      responseText = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('No JSON found');
      
      const result = JSON.parse(jsonMatch[0]);
      
      // Update Ticket
      await this.callMCPTool('jira', 'update_ticket', {
        ticketKey: ticket.key,
        updates: {
          description: result.description
        }
      });
      
      console.log(`   ✅ Description updated`);
      
    } catch (error) {
      console.error(`   ❌ Failed to update description: ${error.message}`);
    }
  }

  /**
   * 🆕 NEU: Stelle Follow-up Fragen und setze Status auf "Needs Clarification"
   */
  async requestClarification(ticket, newQuestions, reason, iteration) {
    console.log(`\n${this.emoji} Requesting clarification (Iteration ${iteration}/${this.maxIterations})...`);
    
    // Kommentar mit neuen Fragen
    let comment = `${this.emoji} *Iteration ${iteration}/${this.maxIterations} - Weitere Klärung benötigt*\n\n`;
    comment += `🔄 **Grund:** ${reason}\n\n`;
    comment += `*Follow-up Fragen:*\n`;
    newQuestions.forEach((q, i) => comment += `${i + 1}. ${q}\n`);
    comment += `\n_Bitte beantworten und Status auf "Approved" setzen._`;
    
    await this.callMCPTool('jira', 'add_comment', {
      ticketKey: ticket.key,
      comment
    });
    
    // Status auf "Needs Clarification" setzen
    await this.callMCPTool('jira', 'update_ticket', {
      ticketKey: ticket.key,
      updates: {
        status: 'Needs Clarification'
      }
    });
    
    // Event senden
    await this.sendEvent({
      type: 'ticket_needs_clarification',
      message: `Ticket ${ticket.key} needs clarification (Iteration ${iteration}/${this.maxIterations})`,
      details: JSON.stringify({
        ticketKey: ticket.key,
        iteration,
        maxIterations: this.maxIterations,
        reason,
        questionsCount: newQuestions.length,
        questions: newQuestions
      }),
      activity: `Waiting for clarification on ${ticket.key}`
    });
    
    console.log(`   🔄 Clarification requested - ${newQuestions.length} questions`);
  }

  /**
   * 🔧 NEU: Hole "Approved" Tickets
   */
  async getApprovedTickets() {
    console.log(`\n${this.emoji} Checking for "Approved" tickets...`);
    
    const result = await this.callMCPTool('jira', 'get_tickets', {
      status: 'Approved',
      maxResults: 10
    });

    if (!result.success) return [];

    // 🆕 Filter: Nur Tickets die NICHT bereits finalisiert wurden UND keine Sub-Tasks
    const ticketsToCheck = [];
    
    for (const ticket of result.tickets) {
      // 🔥 Skip Sub-Tasks - die sind für andere Agenten!
      if (ticket.issueType === 'Sub-task') {
        continue;
      }
      
      // 👉 Skip nur wenn bereits in diesem Zyklus verarbeitet
      if (this.processedTickets.has(`${ticket.key}-finalized-this-cycle`)) {
        continue;
      }
      
      ticketsToCheck.push(ticket);
    }

    console.log(`   Found ${ticketsToCheck.length} approved ticket(s) to check`);
    
    // 🔥 FÜR JEDES APPROVED TICKET: Sende Event damit Dashboard weiß dass es aus Approval Queue raus muss
    for (const ticket of ticketsToCheck) {
      await this.sendEvent({
        type: 'ticket_approved',
        message: `Ticket ${ticket.key} was approved by PM`,
        details: `Checking answers | Ticket: ${ticket.key}`,
        activity: `Verifying ${ticket.key}`
      });
    }
    
    return ticketsToCheck;
  }

  /**
   * 🆕 VERWENDET JETZT: FileDiscoveryUtil mit improved grouping
   */
  async selectRelevantFiles(ticket) {
    // 📊 Status Update: Starting file discovery
    await this.sendEvent({
      type: 'file_discovery_started',
      message: `Discovering project files for ${ticket.key}`,
      activity: `🔍 Scanning project structure for ${ticket.key}`
    });
    
    const allFiles = await this.discoverRealFilesViaMCP();
    
    if (allFiles.length === 0) {
      console.log(`   ⚠️  No files discovered`);
      return [];
    }
    
    // 📊 Status Update: File selection
    await this.sendEvent({
      type: 'file_selection_started',
      message: `Selecting relevant files from ${allFiles.length} discovered files`,
      activity: `📁 Analyzing ${allFiles.length} files for ${ticket.key}`
    });
    
    console.log(`\n${this.emoji} Selecting relevant files for ticket...`);
    
    // Verwende FileDiscoveryUtil für Grouping
    const fileGroups = this.fileDiscovery.groupFilesByType(allFiles);
    
    const prompt = `Du bist ein Technical Product Owner. Wähle die relevantesten Files für dieses Ticket.

=== TICKET ===
Ticket: ${ticket.key}
Summary: ${ticket.summary}
Description: ${ticket.description?.substring(0, 500) || 'Keine'}

=== VERFÜGBARE FILE-GRUPPEN ===

**Backend (${fileGroups.backend.length} files):**
${fileGroups.backend.slice(0, 10).join('\n')}

**Frontend Core (${fileGroups.core.length} files):**
${fileGroups.core.join('\n')}

**Models & Services (${fileGroups.models.length + fileGroups.services.length} files):**
${[...fileGroups.models, ...fileGroups.services].join('\n')}

**Shared Components (${fileGroups.shared.length} files):**
${fileGroups.shared.join('\n')}

**Feature Components (${fileGroups.features.length} files):**
${fileGroups.features.join('\n')}

=== AUFGABE ===
Wähle die 3-7 relevantesten Files die zum Ticket passen.

**Regeln:**
1. Wenn Ticket über "User" spricht → user-related Files
2. Wenn Ticket über UI spricht → frontend Components
3. Wenn Ticket über API spricht → backend Files
4. IMMER relevante Models/Services mit einbeziehen

Antworte NUR mit JSON Array:
["file1", "file2", "file3"]`;

    try {
      const message = await this.anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        messages: [{ role: 'user', content: prompt }]
      });

      let responseText = message.content[0].text.trim();
      responseText = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      
      const jsonMatch = responseText.match(/\[[\s\S]*?\]/);
      if (!jsonMatch) throw new Error('No JSON array found');
      
      const selectedFiles = JSON.parse(jsonMatch[0]);
      const validFiles = selectedFiles.filter(f => allFiles.includes(f));
      
      console.log(`   ✅ Selected ${validFiles.length} relevant files:`);
      validFiles.forEach(f => console.log(`      - ${f}`));
      
      // 📊 Status Update: Files selected
      await this.sendEvent({
        type: 'files_selected',
        message: `Selected ${validFiles.length} relevant files for ${ticket.key}`,
        activity: `📄 Reading ${validFiles.length} files for ${ticket.key}`
      });
      
      return validFiles.length > 0 ? validFiles : allFiles.slice(0, 5);
      
    } catch (error) {
      console.error(`   ⚠️  Selection failed: ${error.message}`);
      // Fallback: Nimm ersten 5 Files
      return allFiles.slice(0, 5);
    }
  }

  async readFilesCompletely(filePaths) {
    const filesContent = [];
    
    for (const filePath of filePaths) {
      try {
        const file = await this.callMCPTool('github', 'get_file', { path: filePath });
        
        if (file.success) {
          const lines = file.file.content.split('\n').length;
          filesContent.push({
            path: file.file.path,
            name: file.file.name,
            content: file.file.content,
            size: file.file.size,
            lines
          });
        }
      } catch (error) {
        console.log(`   ❌ Error reading ${filePath}`);
      }
    }
    
    return filesContent;
  }

  async gatherCodeContext(ticket) {
    try {
      const selectedFiles = await this.selectRelevantFiles(ticket);
      const filesContent = await this.readFilesCompletely(selectedFiles);
      return { relevantFiles: filesContent };
    } catch (error) {
      return { relevantFiles: [] };
    }
  }

  async analyzeTicket(ticket) {
    console.log(`\n${this.emoji} Analyzing ticket: ${ticket.key}`);
    
    // 📊 Status Update: Start analysis
    await this.sendEvent({
      type: 'analysis_started',
      message: `Analyzing ticket ${ticket.key}`,
      activity: `🧠 AI analyzing ${ticket.key}`
    });
    
    const codeContext = await this.gatherCodeContext(ticket);

    let codeSection = '';
    if (codeContext.relevantFiles.length > 0) {
      codeSection = '=== VOLLSTÄNDIGER FILE-INHALT ===\n\n';
      
      for (const file of codeContext.relevantFiles) {
        codeSection += `━━━ FILE: ${file.path} (${file.lines} Zeilen) ━━━\n\n`;
        codeSection += file.content;
        codeSection += '\n\n━━━ ENDE ━━━\n\n';
      }
    }

    const prompt = `Du bist ein Technical Product Owner. Analysiere auf Deutsch.

=== JIRA TICKET ===
Ticket: ${ticket.key}
Summary: ${ticket.summary}
Description: ${ticket.description || 'Keine Beschreibung'}

${codeSection}

Antworte AUSSCHLIESSLICH mit JSON (auf Deutsch!):
{
  "storyPoints": 5,
  "complexity": "mittel",
  "clarity": "klar",
  "questions": ["Konkrete Frage?"],
  "codeInsights": ["KONKRET: Details aus dem Code"],
  "recommendation": "Empfehlung"
}`;

    try {
      const message = await this.anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 3000,
        messages: [{ role: 'user', content: prompt }]
      });

      let responseText = message.content[0].text.trim();
      responseText = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('No JSON found');
      
      const analysis = JSON.parse(jsonMatch[0]);
      console.log(`   ✅ Analysis complete: SP=${analysis.storyPoints}`);
      
      return analysis;
      
    } catch (error) {
      console.error(`   ❌ Analysis failed: ${error.message}`);
      
      return {
        storyPoints: 5,
        complexity: 'mittel',
        clarity: 'unklar',
        questions: ['Was genau soll implementiert werden?'],
        codeInsights: ['Analyse fehlgeschlagen'],
        recommendation: 'Ticket sollte manuell geprüft werden'
      };
    }
  }

  formatAnalysisComment(analysis) {
    let comment = `${this.emoji} *Technical Product Owner Analyse*\n\n`;
    comment += `*Story Points:* ${analysis.storyPoints}\n`;
    comment += `*Komplexität:* ${analysis.complexity}\n`;
    comment += `*Klarheit:* ${analysis.clarity}\n\n`;

    if (analysis.codeInsights?.length > 0) {
      comment += `*Code Insights:*\n`;
      analysis.codeInsights.forEach(i => comment += `• ${i}\n`);
      comment += `\n`;
    }

    if (analysis.questions?.length > 0) {
      comment += `*Fragen an PM:*\n`;
      analysis.questions.forEach((q, i) => comment += `${i + 1}. ${q}\n`);
      comment += `\n`;
      comment += `_Bitte alle Fragen beantworten und Status auf "Approved" setzen._\n\n`;
    }

    comment += `*Empfehlung:* ${analysis.recommendation}\n\n`;
    comment += `---\n_Analysiert am ${new Date().toISOString()}_`;

    return comment;
  }

  async postAnalysisComment(ticketKey, analysis) {
    const comment = this.formatAnalysisComment(analysis);
    
    await this.sendEvent({
      type: 'posting_comment',
      message: `Posting analysis for ${ticketKey}`,
      details: `SP: ${analysis.storyPoints} | Complexity: ${analysis.complexity}`,
      activity: `Writing comment for ${ticketKey}`
    });
    
    const result = await this.callMCPTool('jira', 'add_comment', {
      ticketKey,
      comment
    });

    if (result.success) {
      console.log(`   ✅ Posted analysis`);
      
      // 🔥 WICHTIG: Event an Dashboard senden mit VOLLSTÄNDIGER Analyse als JSON
      await this.sendEvent({
        type: 'comment_posted',
        message: `Analysis posted for ${ticketKey}`,
        details: JSON.stringify({
          ticketKey,
          storyPoints: analysis.storyPoints,
          complexity: analysis.complexity,
          clarity: analysis.clarity,
          questions: analysis.questions || [],
          codeInsights: analysis.codeInsights || [],
          recommendation: analysis.recommendation
        }),
        activity: `Waiting for PM approval on ${ticketKey}`
      });
    }

    return result;
  }

  extractTextFromCommentADF(adf) {
    if (!adf?.content) return '';
    let text = '';
    const processContent = (content) => {
      if (Array.isArray(content)) {
        content.forEach(item => {
          if (item.type === 'text') text += item.text + ' ';
          else if (item.content) processContent(item.content);
        });
      }
    };
    processContent(adf.content);
    return text.trim();
  }

  /**
   * 🔧 NEU: Prüfe ob alle Fragen beantwortet wurden
   */
  async checkQuestionsAnswered(ticket, originalQuestions) {
    console.log(`\n${this.emoji} Checking if all questions were answered...`);
    
    // Hole alle Kommentare
    const fullTicket = await this.callMCPTool('jira', 'get_ticket', { ticketKey: ticket.key });
    
    if (!fullTicket.success || !fullTicket.ticket.comments) {
      return { allAnswered: false, unansweredQuestions: originalQuestions };
    }

    // Sammle alle PM-Kommentare (nicht vom Agent)
    const pmComments = fullTicket.ticket.comments
      .filter(comment => {
        let bodyText = '';
        if (typeof comment.body === 'string') bodyText = comment.body;
        else if (comment.body?.content) bodyText = this.extractTextFromCommentADF(comment.body);
        return !bodyText.includes(this.emoji); // Nicht vom Agent
      })
      .map(comment => {
        if (typeof comment.body === 'string') return comment.body;
        return this.extractTextFromCommentADF(comment.body);
      })
      .join('\n\n');

    console.log(`   Found ${pmComments.length} chars of PM comments`);

    // Frage Claude ob alle Fragen beantwortet wurden
    const prompt = `Du bist ein Technical Product Owner.

=== ORIGINAL FRAGEN ===
${originalQuestions.map((q, i) => `${i + 1}. ${q}`).join('\n')}

=== PM ANTWORTEN ===
${pmComments || 'Keine Antworten gefunden'}

=== AUFGABE ===
Prüfe ob der PM ALLE Fragen beantwortet hat.

Antworte NUR mit diesem JSON:
{
  "allAnswered": true,
  "unansweredQuestions": [],
  "answers": {
    "1": "Zusammenfassung der Antwort auf Frage 1",
    "2": "Zusammenfassung der Antwort auf Frage 2"
  }
}

Wenn nicht alle beantwortet: "allAnswered": false und liste unbeantwortete Fragen.`;

    try {
      const message = await this.anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2000,
        messages: [{ role: 'user', content: prompt }]
      });

      let responseText = message.content[0].text.trim();
      responseText = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('No JSON found');
      
      const result = JSON.parse(jsonMatch[0]);
      
      if (result.allAnswered) {
        console.log(`   ✅ All questions answered!`);
      } else {
        console.log(`   ⚠️  ${result.unansweredQuestions?.length || 0} questions unanswered`);
      }
      
      return result;
      
    } catch (error) {
      console.error(`   ❌ Check failed: ${error.message}`);
      return { allAnswered: false, unansweredQuestions: originalQuestions };
    }
  }

  /**
   * 🆕 NEU: Prüfe ob Ticket vollständig genug ist oder weitere Iteration benötigt
   */
  async assessTicketCompleteness(ticket, currentDescription, answers, codeFiles) {
    console.log(`\n${this.emoji} Assessing ticket completeness for next iteration...`);
    
    const currentIteration = this.ticketIterations.get(ticket.key) || 1;
    console.log(`   Current iteration: ${currentIteration}/${this.maxIterations}`);
    
    // Wenn Max-Iterationen erreicht, force finalize
    if (currentIteration >= this.maxIterations) {
      console.log(`   ⚠️ Max iterations reached, forcing finalization`);
      return {
        needsMoreInfo: false,
        reason: 'Max iterations reached',
        newQuestions: []
      };
    }
    
    // Erstelle Prompt für Claude um Vollständigkeit zu prüfen
    const prompt = `Du bist ein Technical Product Owner. Prüfe ob dieses Ticket VOLLSTÄNDIG genug ist.

=== TICKET ===
Ticket: ${ticket.key}
Summary: ${ticket.summary}

=== AKTUELLE BESCHREIBUNG ===
${currentDescription}

=== PM ANTWORTEN (Iteration ${currentIteration}) ===
${Object.entries(answers || {}).map(([num, answer]) => `Frage ${num}: ${answer}`).join('\n')}

=== CODE FILES ===
${codeFiles.map(f => `- ${f.path} (${f.lines} Zeilen)`).join('\n')}

=== AUFGABE ===
Prüfe KRITISCH ob das Ticket jetzt VOLLSTÄNDIG ist für:
1. **Developer** - Sind ALLE technischen Details klar? Welche Functions/Komponenten? Welche Implementierungsschritte?
2. **Designer** - Sind UI/UX Anforderungen klar? (falls relevant)
3. **Architekt** - Sind Architektur-Entscheidungen klar? (falls relevant)

Wenn IRGENDWAS noch unklar ist, stelle 1-3 präzise Follow-up Fragen.

Antworte NUR mit JSON:
{
  "needsMoreInfo": false,
  "reason": "Alles ist klar für Developer/Designer/Architekt",
  "newQuestions": []
}

ODER wenn noch Fragen offen:
{
  "needsMoreInfo": true,
  "reason": "Developer braucht mehr Details über X",
  "newQuestions": [
    "Konkrete Follow-up Frage 1?",
    "Konkrete Follow-up Frage 2?"
  ]
}

**WICHTIG:** Sei kritisch! Nur finalisieren wenn WIRKLICH alles klar ist.`;

    try {
      const message = await this.anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2000,
        messages: [{ role: 'user', content: prompt }]
      });

      let responseText = message.content[0].text.trim();
      responseText = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('No JSON found');
      
      const result = JSON.parse(jsonMatch[0]);
      
      if (result.needsMoreInfo) {
        console.log(`   🔄 Needs more info: ${result.reason}`);
        console.log(`   New questions: ${result.newQuestions.length}`);
      } else {
        console.log(`   ✅ Ticket is complete: ${result.reason}`);
      }
      
      return result;
      
    } catch (error) {
      console.error(`   ❌ Assessment failed: ${error.message}`);
      // Bei Fehler: Nicht iterieren, direkt finalisieren
      return {
        needsMoreInfo: false,
        reason: 'Assessment error - finalizing',
        newQuestions: []
      };
    }
  }

  /**
 * 🆕 NEUE METHODEN FÜR TECH PO AGENT
 * 
 * Diese 4 Methoden in agent.js einfügen - DIREKT VOR der finalizeTicket Methode (ca. Zeile 735)
 */

  /**
   * 🆕 Methode 1: Generiere detaillierte Beschreibung
   */
  async generateDetailedDescription(ticket, originalAnalysis, answers, codeFiles) {
    // 📊 Status Update: Generating description
    await this.sendEvent({
      type: 'generating_description',
      message: `Generating detailed description for ${ticket.key}`,
      activity: `📝 Writing detailed description for ${ticket.key}`
    });
    
    const prompt = `Du bist ein Technical Product Owner. Erstelle eine DETAILLIERTE Ticket-Beschreibung.

=== ORIGINAL TICKET ===
Ticket: ${ticket.key}
Summary: ${ticket.summary}
Beschreibung: ${ticket.description || 'Keine'}

=== ANALYSE ===
Story Points: ${originalAnalysis.storyPoints}
Komplexität: ${originalAnalysis.complexity}
Code Insights: ${originalAnalysis.codeInsights?.join(', ') || 'Keine'}

=== PM ANTWORTEN ===
${Object.entries(answers || {}).map(([num, answer]) => `Frage ${num}: ${answer}`).join('\n')}

=== RELEVANTE CODE FILES ===
${codeFiles.map(f => `- ${f.path}`).join('\n')}

=== ANGULAR ARCHITECTURE RULES ===
**WICHTIG: Diese Regeln MÜSSEN in die Beschreibung für Developer einfließen!**

1. Component Structure: .ts, .html, .css getrennt - templateUrl/styleUrl - Max 400 Zeilen
2. Component Organization: Reusable → /shared/, Feature-specific → /features/
3. File Organization: ONE class per file, ONE interface per file
4. State Management: NgRx (@ngrx/store, effects, entity) + RxJS
5. Testing: EVERY file needs .spec.ts

Erstelle eine strukturierte Beschreibung mit:
1. Zusammenfassung
2. Für Developer (immer) - inkl. Angular Rules!
3. Technische Details
4. Akzeptanzkriterien

Antworte NUR mit JSON: { "description": "..." }`;

    try {
      const message = await this.anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 3000,
        messages: [{ role: 'user', content: prompt }]
      });

      let responseText = message.content[0].text.trim();
      responseText = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('No JSON found');
      
      const result = JSON.parse(jsonMatch[0]);
      console.log(`   ✅ Generated description (${result.description.length} chars)`);
      return result.description;
    } catch (error) {
      console.error(`   ❌ Description generation failed: ${error.message}`);
      return `${ticket.description || ticket.summary}\n\n## Technical Product Owner Analysis\n\n**Story Points:** ${originalAnalysis.storyPoints}\n**Complexity:** ${originalAnalysis.complexity}`;
    }
  }

  /**
   * 🆕 Methode 2: Entscheide welche Agenten benötigt werden
   */
  async determineRequiredAgents(ticket, description, originalAnalysis, codeFiles) {
    // 📊 Status Update: Determining required agents
    await this.sendEvent({
      type: 'determining_agents',
      message: `Determining required agents for ${ticket.key}`,
      activity: `🤔 Deciding which agents are needed for ${ticket.key}`
    });
    
    const prompt = `Du bist ein Technical Product Owner. Entscheide ob Architekt oder Designer benötigt werden.

=== TICKET ===
${ticket.summary}

=== BESCHREIBUNG ===
${description.substring(0, 1500)}

=== CODE FILES ===
${codeFiles.map(f => f.path).join('\n')}

Entscheide:
- **Architekt** nötig wenn: API-Änderungen, neue Datenmodelle, Architektur-Entscheidungen, neue Services
- **Designer** nötig wenn: UI-Änderungen, neue Komponenten, Layout-Änderungen, UX-Flows

Antworte NUR mit JSON:
{
  "needsArchitect": false,
  "architectReason": "Grund warum Architekt benötigt wird",
  "needsDesigner": false,
  "designReason": "Grund warum Designer benötigt wird"
}`;

    try {
      const message = await this.anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        messages: [{ role: 'user', content: prompt }]
      });

      let responseText = message.content[0].text.trim();
      responseText = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('No JSON found');
      
      const result = JSON.parse(jsonMatch[0]);
      console.log(`   ✅ Determined agents: Architect=${result.needsArchitect}, Designer=${result.needsDesigner}`);
      return result;
    } catch (error) {
      console.error(`   ❌ Agent determination failed: ${error.message}`);
      return { 
        needsArchitect: false, 
        architectReason: '',
        needsDesigner: false,
        designReason: ''
      };
    }
  }

  /**
   * 🆕 Methode 3: Erstelle Architektur Sub-Task
   */
  async createArchitectureSubTask(parentTicket, description, reason, codeFiles) {
    console.log(`\n${this.emoji} Creating architecture sub-task...`);
    
    const subTaskDescription = `# Architektur für: ${parentTicket.summary}

## Warum dieser Sub-Task?
${reason}

## Aus Parent-Task
${description.substring(0, 1000)}...

## Relevante Files
${codeFiles.map(f => `- ${f.path}`).join('\n')}

## Deine Aufgabe als Software-Architekt
1. Analysiere die Anforderungen aus dem Parent-Task
2. Lese die relevanten Code-Files
3. Erstelle Architektur-Design:
   - API-Endpoints (falls nötig)
   - Datenmodelle
   - Service-Architektur
   - Performance-Überlegungen
4. Dokumentiere alles in einem Kommentar

_Dieser Sub-Task wurde automatisch vom Technical Product Owner erstellt._`;

    const result = await this.callMCPTool('jira', 'create_subtask', {
      parentKey: parentTicket.key,
      summary: `🏛️ Architektur: ${parentTicket.summary}`,
      description: subTaskDescription,
      labels: ['architecture', 'auto-created']
    });

    if (result.success) {
      const subTaskKey = result.key || result.ticket?.key || 'unknown';
      console.log(`   ✅ Created architecture sub-task: ${subTaskKey}`);
      
      // 🔥 WICHTIG: Event mit VOLLSTÄNDIGEN Daten senden!
      await this.sendEvent({
        type: 'subtask_created',
        message: `Architecture sub-task ${subTaskKey} created for ${parentTicket.key}`,
        details: JSON.stringify({
          ticketKey: subTaskKey,
          parentKey: parentTicket.key,
          summary: `🏛️ Architektur: ${parentTicket.summary}`,
          status: 'To Do',
          agentType: 'architecture',
          created: new Date().toISOString()
        }),
        activity: `Created architecture sub-task ${subTaskKey}`
      });
    } else {
      console.error(`   ❌ Failed to create architecture sub-task`);
    }
  }

  /**
   * 🆕 Methode 4: Erstelle Design Sub-Task
   */
  async createDesignSubTask(parentTicket, description, reason, codeFiles) {
    console.log(`\n${this.emoji} Creating design sub-task...`);
    
    const frontendFiles = codeFiles.filter(f => 
      f.path.includes('frontend') || 
      f.path.includes('.html') || 
      f.path.includes('.css') ||
      f.path.includes('.component')
    );
    
    const subTaskDescription = `# UI-Design für: ${parentTicket.summary}

## Warum dieser Sub-Task?
${reason}

## Aus Parent-Task
${description.substring(0, 1000)}...

## Relevante Frontend-Files
${frontendFiles.length > 0 ? frontendFiles.map(f => `- ${f.path}`).join('\n') : 'Keine spezifischen Frontend-Files identifiziert'}

## Deine Aufgabe als UI-Designer
1. Analysiere die UI-Anforderungen aus dem Parent-Task
2. Lese die relevanten Frontend-Files
3. Erstelle UI-Spezifikation:
   - Wireframes (als Text-Beschreibung)
   - Design-Guidelines
   - Komponenten-Struktur
   - Responsive Verhalten
4. Dokumentiere alles in einem Kommentar

_Dieser Sub-Task wurde automatisch vom Technical Product Owner erstellt._`;

    const result = await this.callMCPTool('jira', 'create_subtask', {
      parentKey: parentTicket.key,
      summary: `🎨 UI-Design: ${parentTicket.summary}`,
      description: subTaskDescription,
      labels: ['ui-design', 'auto-created']
    });

    if (result.success) {
      const subTaskKey = result.key || result.ticket?.key || 'unknown';
      console.log(`   ✅ Created design sub-task: ${subTaskKey}`);
      
      // 🔥 WICHTIG: Event mit VOLLSTÄNDIGEN Daten senden!
      await this.sendEvent({
        type: 'subtask_created',
        message: `Design sub-task ${subTaskKey} created for ${parentTicket.key}`,
        details: JSON.stringify({
          ticketKey: subTaskKey,
          parentKey: parentTicket.key,
          summary: `🎨 UI-Design: ${parentTicket.summary}`,
          status: 'To Do',
          agentType: 'ui-design',
          created: new Date().toISOString()
        }),
        activity: `Created design sub-task ${subTaskKey}`
      });
    } else {
      console.error(`   ❌ Failed to create design sub-task`);
    }
  }
  
  /**
   * 🔧 NEU: Finalisiere Ticket mit DETAILLIERTER Beschreibung für nächste Agenten
   */
  async finalizeTicket(ticket, originalAnalysis, answers, codeFiles) {
    console.log(`\n${this.emoji} Finalizing ticket: ${ticket.key}`);
    
    // 📊 Status Update: Starting finalization
    await this.sendEvent({
      type: 'finalization_started',
      message: `Finalizing ticket ${ticket.key}`,
      activity: `⚙️ Finalizing ${ticket.key}`
    });
    
    // 🧠 Hole Code Context falls nicht vorhanden
    if (!codeFiles || codeFiles.length === 0) {
      const context = await this.gatherCodeContext(ticket);
      codeFiles = context.relevantFiles;
    }
    
    // 📝 Erstelle DETAILLIERTE Beschreibung mit Claude
    const finalDescription = await this.generateDetailedDescription(
      ticket, 
      originalAnalysis, 
      answers, 
      codeFiles
    );
    
    // 🆕 Entscheide ob Architekt oder Designer benötigt werden
    const agentNeeds = await this.determineRequiredAgents(
      ticket,
      finalDescription,
      originalAnalysis,
      codeFiles
    );
    
    console.log(`   📋 Required agents: ${agentNeeds.needsArchitect ? '🏛️ Architect' : ''} ${agentNeeds.needsDesigner ? '🎨 Designer' : ''}`);
    
    // 📊 Status Update: Updating description
    await this.sendEvent({
      type: 'updating_description',
      message: `Updating description for ${ticket.key}`,
      activity: `📝 Updating ticket description for ${ticket.key}`
    });
    
    // Update Main-Task Beschreibung
    const updateResult = await this.callMCPTool('jira', 'update_ticket', {
      ticketKey: ticket.key,
      updates: {
        description: finalDescription
      }
    });
    
    if (!updateResult.success) {
      console.error(`   ❌ Failed to update description`);
    }
    
    // 📊 Status Update: Creating sub-tasks
    if (agentNeeds.needsArchitect || agentNeeds.needsDesigner) {
      await this.sendEvent({
        type: 'creating_subtasks',
        message: `Creating sub-tasks for ${ticket.key}`,
        activity: `📋 Creating sub-tasks for ${ticket.key}`
      });
    }
    
    // 🆕 Erstelle Sub-Tasks falls benötigt
    if (agentNeeds.needsArchitect) {
      await this.createArchitectureSubTask(ticket, finalDescription, agentNeeds.architectReason, codeFiles);
    }
    
    if (agentNeeds.needsDesigner) {
      await this.createDesignSubTask(ticket, finalDescription, agentNeeds.designReason, codeFiles);
    }
    
    // Finaler Kommentar
    let finalComment = `${this.emoji} *Ticket finalisiert!*\n\n`;
    finalComment += `✅ Alle Fragen wurden beantwortet\n`;
    finalComment += `✅ Beschreibung wurde aktualisiert\n`;
    finalComment += `✅ Story Points: ${originalAnalysis.storyPoints}\n\n`;
    
    if (agentNeeds.needsArchitect || agentNeeds.needsDesigner) {
      finalComment += `📋 *Sub-Tasks erstellt für:*\n`;
      if (agentNeeds.needsArchitect) finalComment += `- 🏛️ Software-Architekt\n`;
      if (agentNeeds.needsDesigner) finalComment += `- 🎨 UI-Designer\n`;
      finalComment += `\n_Diese Agenten werden das Ticket jetzt verfeinern._`;
    } else {
      finalComment += `Das Ticket ist bereit für die Entwicklung - keine weiteren Agenten benötigt.`;
    }

    await this.callMCPTool('jira', 'add_comment', {
      ticketKey: ticket.key,
      comment: finalComment
    });
    
    // 🔥 Setze Status basierend auf Sub-Tasks
    if (agentNeeds.needsArchitect || agentNeeds.needsDesigner) {
      // Wenn Sub-Tasks erstellt wurden -> "Genehmigt" (wartet auf Sub-Tasks)
      await this.callMCPTool('jira', 'update_ticket', {
        ticketKey: ticket.key,
        updates: {
          status: 'Genehmigt'
        }
      });
      console.log(`   ✅ Status set to 'Genehmigt' - waiting for sub-tasks`);
    } else {
      // Wenn KEINE Sub-Tasks -> direkt "To Do" (ready for Coder)
      await this.callMCPTool('jira', 'update_ticket', {
        ticketKey: ticket.key,
        updates: {
          status: 'To Do'
        }
      });
      console.log(`   ✅ Status set to 'To Do' - ready for Coder`);
    }
    
    // 🔥 WICHTIG: Event senden dass Ticket finalisiert wurde
    await this.sendEvent({
      type: 'ticket_complete',
      message: `Ticket ${ticket.key} finalized and approved`,
      details: JSON.stringify({
        ticketKey: ticket.key,
        storyPoints: originalAnalysis.storyPoints,
        finalized: true,
        description: finalDescription,
        needsArchitect: agentNeeds.needsArchitect,
        needsDesigner: agentNeeds.needsDesigner
      }),
      activity: `Ticket ${ticket.key} ready for ${agentNeeds.needsArchitect || agentNeeds.needsDesigner ? 'architecture/design' : 'development'}`
    });

    console.log(`   ✅ Ticket finalized!`);
  }

  /**
   * 🔧 NEU: Reject Ticket zurück zu "To Do"
   */
  async rejectTicket(ticket, unansweredQuestions) {
    console.log(`\n${this.emoji} Rejecting ticket: ${ticket.key}`);
    
    // Status zurück zu "To Do"
    await this.callMCPTool('jira', 'update_ticket', {
      ticketKey: ticket.key,
      updates: {
        status: 'To Do'
      }
    });

    // Kommentar mit fehlenden Fragen
    let comment = `${this.emoji} *Ticket zurückgestellt*\n\n`;
    comment += `⚠️ Nicht alle Fragen wurden beantwortet.\n\n`;
    comment += `*Fehlende Antworten:*\n`;
    unansweredQuestions.forEach((q, i) => comment += `${i + 1}. ${q}\n`);
    comment += `\n_Bitte beantworten und erneut auf "Approved" setzen._`;

    await this.callMCPTool('jira', 'add_comment', {
      ticketKey: ticket.key,
      comment
    });

    // 🔥 Event senden für Dashboard
    await this.sendEvent({
      type: 'ticket_rejected',
      message: `Ticket ${ticket.key} rejected - incomplete answers`,
      details: `Missing ${unansweredQuestions.length} answers | Ticket: ${ticket.key}`,
      activity: `Waiting for complete answers on ${ticket.key}`
    });

    console.log(`   ⚠️  Ticket rejected - ${unansweredQuestions.length} questions unanswered`);
  }

  /**
   * 🔧 NEU: Verarbeite Approved Ticket
   */
  async processApprovedTicket(ticket) {
    try {
      console.log(`\n${'='.repeat(60)}`);
      console.log(`${this.emoji} Processing APPROVED: ${ticket.key}`);
      console.log(`${'='.repeat(60)}`);

      // 🔥 CRITICAL: Skip Sub-Tasks immediately!
      if (ticket.issueType === 'Sub-task') {
        console.log(`\n${this.emoji} ⚠️  Skipping Sub-Task ${ticket.key} - not for Tech PO!`);
        this.processedTickets.add(`${ticket.key}-finalized-this-cycle`);
        return { success: true, skipped: true, reason: 'Sub-task' };
      }

      // Hole Original-Analyse aus Kommentaren
      const fullTicket = await this.callMCPTool('jira', 'get_ticket', { ticketKey: ticket.key });
      
      if (!fullTicket.success) {
        console.error(`   ❌ Could not fetch ticket`);
        return { success: false };
      }

      // Finde Agent-Kommentar mit Original-Analyse
      // 🆕 FIX: Suche nach JEDEM Agent-Kommentar, nicht nur nach "Fragen an PM"
      const agentComment = fullTicket.ticket.comments?.find(comment => {
        let bodyText = '';
        if (typeof comment.body === 'string') bodyText = comment.body;
        else if (comment.body?.content) bodyText = this.extractTextFromCommentADF(comment.body);
        // Nur prüfen ob es vom Agent ist (enthält Emoji + "Technical Product Owner Analyse")
        return bodyText.includes(this.emoji) && bodyText.includes('Technical Product Owner Analyse');
      });

      if (!agentComment) {
        console.log(`   ⚠️  No agent analysis comment found`);
        console.log(`   → Ticket was finalized without standard analysis flow`);
        console.log(`   → Will be checked in checkReadyForDevelopment() instead`);
        // NICHT als finalized-this-cycle markieren, damit checkReadyForDevelopment() es findet!
        return { success: true, skipped: true };
      }

      // Extrahiere Fragen aus Original-Kommentar
      let agentCommentText = '';
      if (typeof agentComment.body === 'string') {
        agentCommentText = agentComment.body;
      } else {
        agentCommentText = this.extractTextFromCommentADF(agentComment.body);
      }

      const questionsMatch = agentCommentText.match(/\*Fragen an PM:\*\n([\s\S]*?)\n\n/);
      const originalQuestions = [];
      
      if (questionsMatch) {
        const questionsText = questionsMatch[1];
        const questionLines = questionsText.split('\n').filter(line => /^\d+\./.test(line));
        questionLines.forEach(line => {
          const question = line.replace(/^\d+\.\s*/, '').trim();
          originalQuestions.push(question);
        });
      }

      console.log(`   Found ${originalQuestions.length} original questions`);

      if (originalQuestions.length === 0) {
        // Keine Fragen gestellt - kann direkt finalisieren
        console.log(`   No questions - finalizing directly`);
        
        // Extrahiere Original-Analyse aus Kommentar
        const spMatch = agentCommentText.match(/\*Story Points:\*\s*(\d+)/);
        const complexityMatch = agentCommentText.match(/\*Komplexität:\*\s*([^\n]+)/);
        const insightsMatch = agentCommentText.match(/\*Code Insights:\*\n([\s\S]*?)\n\n/);
        const recommendationMatch = agentCommentText.match(/\*Empfehlung:\*\s*([^\n]+)/);
        
        const originalAnalysis = {
          storyPoints: spMatch ? parseInt(spMatch[1]) : 5,
          complexity: complexityMatch ? complexityMatch[1].trim() : 'mittel',
          codeInsights: insightsMatch 
            ? insightsMatch[1].split('\n').filter(line => line.trim().startsWith('•')).map(line => line.replace('•', '').trim())
            : [],
          recommendation: recommendationMatch ? recommendationMatch[1].trim() : 'Approved'
        };
        
        // Hole Code Context für die finale Beschreibung
        const codeContext = await this.gatherCodeContext(ticket);
        
        await this.finalizeTicket(ticket, originalAnalysis, {}, codeContext.relevantFiles);
        this.processedTickets.add(`${ticket.key}-finalized-this-cycle`);
        return { success: true };
      }

      // Prüfe ob alle Fragen beantwortet wurden
      const checkResult = await this.checkQuestionsAnswered(ticket, originalQuestions);

      if (checkResult.allAnswered) {
        // ✅ Alle Fragen beantwortet - Finalisieren
        
        // Extrahiere Original-Analyse aus Kommentar
        const spMatch = agentCommentText.match(/\*Story Points:\*\s*(\d+)/);
        const complexityMatch = agentCommentText.match(/\*Komplexität:\*\s*([^\n]+)/);
        const insightsMatch = agentCommentText.match(/\*Code Insights:\*\n([\s\S]*?)\n\n/);
        const recommendationMatch = agentCommentText.match(/\*Empfehlung:\*\s*([^\n]+)/);
        
        const originalAnalysis = {
          storyPoints: spMatch ? parseInt(spMatch[1]) : 5,
          complexity: complexityMatch ? complexityMatch[1].trim() : 'mittel',
          codeInsights: insightsMatch 
            ? insightsMatch[1].split('\n').filter(line => line.trim().startsWith('•')).map(line => line.replace('•', '').trim())
            : [],
          recommendation: recommendationMatch ? recommendationMatch[1].trim() : 'Approved'
        };
        
        console.log(`   📊 Extracted analysis: SP=${originalAnalysis.storyPoints}, Complexity=${originalAnalysis.complexity}`);
        
        // Hole Code Context für die finale Beschreibung
        const codeContext = await this.gatherCodeContext(ticket);
        
        await this.finalizeTicket(ticket, originalAnalysis, checkResult.answers, codeContext.relevantFiles);
        this.processedTickets.add(`${ticket.key}-finalized-this-cycle`);
        
        return { success: true, finalized: true };
      } else {
        // ❌ Fragen fehlen - Zurück zu "To Do"
        await this.rejectTicket(ticket, checkResult.unansweredQuestions);
        this.processedTickets.delete(`${ticket.key}-analyzed`); // Damit es neu analysiert werden kann
        
        return { success: true, rejected: true };
      }
      
    } catch (error) {
      console.error(`\n${this.emoji} ❌ Error: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  async processTicket(ticket) {
    try {
      console.log(`\n${'='.repeat(60)}`);
      console.log(`${this.emoji} Processing: ${ticket.key}`);
      console.log(`${'='.repeat(60)}`);

      // 📊 Status Update: Start processing
      await this.sendEvent({
        type: 'ticket_processing_started',
        message: `Processing ticket ${ticket.key}`,
        activity: `📝 Analyzing ${ticket.key}`
      });

      // 🔥 CRITICAL: Skip Sub-Tasks immediately!
      if (ticket.issueType === 'Sub-task') {
        console.log(`\n${this.emoji} ⚠️  Skipping Sub-Task ${ticket.key} - not for Tech PO!`);
        this.processedTickets.add(`${ticket.key}-analyzed`);
        return { success: true, skipped: true, reason: 'Sub-task' };
      }

      const fullTicket = await this.callMCPTool('jira', 'get_ticket', { ticketKey: ticket.key });
      if (fullTicket.success && fullTicket.ticket.comments) {
        const hasAgentComment = fullTicket.ticket.comments.some(comment => {
          let bodyText = '';
          if (typeof comment.body === 'string') bodyText = comment.body;
          else if (comment.body?.content) bodyText = this.extractTextFromCommentADF(comment.body);
          return bodyText.includes(this.emoji);
        });
        
        if (hasAgentComment) {
          console.log(`\n${this.emoji} ⚠️  Already analyzed`);
          this.processedTickets.add(`${ticket.key}-analyzed`);
          return { success: true, skipped: true };
        }
      }

      const analysis = await this.analyzeTicket(ticket);
      await this.postAnalysisComment(ticket.key, analysis);
      this.processedTickets.add(`${ticket.key}-analyzed`);

      console.log(`\n${this.emoji} ✅ Completed analysis`);
      
      return { success: true, analysis };
      
    } catch (error) {
      console.error(`\n${this.emoji} ❌ Error: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * 🆕 NEU: Prüfe finalisierte Tickets mit fertigen Sub-Tasks
   */
  async checkReadyForDevelopment() {
    console.log(`\n${this.emoji} Checking for tickets ready for development...`);
    
    // 📊 Status Update: Checking ready tickets
    await this.sendEvent({
      type: 'checking_ready_tickets',
      message: 'Checking for tickets ready for development',
      activity: '✅ Checking completed sub-tasks'
    });
    
    // 🔥 Hole ALLE Tickets mit Status "Approved" ODER "Genehmigt"
    const statuses = ['Approved', 'Genehmigt'];
    const allTickets = [];
    
    for (const status of statuses) {
      const result = await this.callMCPTool('jira', 'get_tickets', {
        status: status,
        maxResults: 10
      });
      
      if (result.success && result.tickets) {
        allTickets.push(...result.tickets);
      }
    }
    
    console.log(`   Found ${allTickets.length} ticket(s) with status Approved/Genehmigt`);

    for (const ticket of allTickets) {
      // Skip Sub-Tasks
      if (ticket.issueType === 'Sub-task' || ticket.issueType === 'Sub-Task') {
        continue;
      }

      // Skip wenn bereits verarbeitet
      if (this.processedTickets.has(`${ticket.key}-ready`)) {
        continue;
      }

      // Hole vollständige Ticket-Details
      const fullTicket = await this.callMCPTool('jira', 'get_ticket', { 
        ticketKey: ticket.key 
      });

      if (!fullTicket.success) continue;
      
      // 🔥 Prüfe ob Ticket finalisiert wurde (hat "Ticket finalisiert!" Kommentar)
      if (fullTicket.ticket.comments) {
        const hasFinalizationComment = fullTicket.ticket.comments.some(comment => {
          let bodyText = '';
          if (typeof comment.body === 'string') bodyText = comment.body;
          else if (comment.body?.content) bodyText = this.extractTextFromCommentADF(comment.body);
          return bodyText.includes(this.emoji) && bodyText.includes('Ticket finalisiert!');
        });
        
        if (!hasFinalizationComment) {
          console.log(`   ⏭️  ${ticket.key} not finalized yet - skipping`);
          continue;
        }
      } else {
        console.log(`   ⏭️  ${ticket.key} has no comments - skipping`);
        continue;
      }

      // Prüfe ob Sub-Tasks existieren
      const subTasksResult = await this.callMCPTool('jira', 'get_tickets', {
        status: 'all',
        maxResults: 50
      });

      let allSubTasksDone = true;
      let hasSubTasks = false;

      if (subTasksResult.success) {
        const subTasks = subTasksResult.tickets.filter(t => 
          t.parentKey === ticket.key && 
          (t.issueType === 'Sub-task' || t.issueType === 'Sub-Task')
        );

        if (subTasks.length > 0) {
          hasSubTasks = true;
          console.log(`   📑 ${ticket.key} has ${subTasks.length} sub-task(s)`);
          
          // Prüfe ob ALLE Sub-Tasks "Fertig" sind
          allSubTasksDone = subTasks.every(st => 
            st.status === 'Fertig' || st.status === 'Done'
          );
          
          if (!allSubTasksDone) {
            const pendingSubTasks = subTasks.filter(st => 
              st.status !== 'Fertig' && st.status !== 'Done'
            );
            console.log(`   ⏳ ${ticket.key} has ${pendingSubTasks.length} pending sub-task(s):`);
            pendingSubTasks.forEach(st => {
              console.log(`      - ${st.key}: ${st.status}`);
            });
            continue;
          }
        }
      }

      // ✅ ALLE Sub-Tasks fertig (oder keine Sub-Tasks) - Ticket ist ready!
      console.log(`\n${this.emoji} ✅ ${ticket.key} is ready for development!`);
      console.log(`   Sub-Tasks: ${hasSubTasks ? 'All completed' : 'None'}`);
      
      // Setze Status auf "To Do"
      await this.callMCPTool('jira', 'update_ticket', {
        ticketKey: ticket.key,
        updates: {
          status: 'To Do'
        }
      });

      // Poste Kommentar
      const readyComment = `${this.emoji} *Bereit für Entwicklung!*\n\n✅ Alle Vorarbeiten abgeschlossen\n${hasSubTasks ? `✅ Alle Sub-Tasks (Architekt/Designer) fertig\n` : ''}👨‍💻 Das Ticket kann jetzt vom Coder Agent implementiert werden\n\n---\n_Status geändert: ${ticket.status} → To Do_\n_${new Date().toISOString()}_`;
      
      await this.callMCPTool('jira', 'add_comment', {
        ticketKey: ticket.key,
        comment: readyComment
      });

      // Event senden
      await this.sendEvent({
        type: 'ticket_ready_for_development',
        message: `Ticket ${ticket.key} ready for Coder Agent`,
        details: JSON.stringify({
          ticketKey: ticket.key,
          hasSubTasks,
          allSubTasksDone: true
        }),
        activity: `🚀 ${ticket.key} ready for development`
      });

      this.processedTickets.add(`${ticket.key}-ready`);
      
      console.log(`   ✅ ${ticket.key} moved to 'To Do' for Coder Agent`);
    }
  }

  async run(intervalSeconds = 30) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`${this.emoji} ${this.name} started!`);
    console.log(`   Workflow: To Do → Analyze → Approved → Finalize → Check Ready`);
    console.log(`${'='.repeat(60)}`);

    await this.loadAgentDocumentation();

    while (true) {
      try {
        // 1. Check for new "To Do" tickets
        const newTickets = await this.getNewTickets();
        for (const ticket of newTickets) {
          await this.processTicket(ticket);
        }

        // 2. Check for "Approved" tickets
        const approvedTickets = await this.getApprovedTickets();
        for (const ticket of approvedTickets) {
          await this.processApprovedTicket(ticket);
        }

        // 🆕 3. Check for finalized tickets with completed sub-tasks
        await this.checkReadyForDevelopment();

        if (newTickets.length === 0 && approvedTickets.length === 0) {
          await this.sendEvent({ 
            type: 'idle', 
            message: 'No tickets to process',
            activity: 'Idle - waiting for new tickets'
          });
        }

        console.log(`\n${this.emoji} Waiting ${intervalSeconds}s...`);
        await new Promise(resolve => setTimeout(resolve, intervalSeconds * 1000));

      } catch (error) {
        console.error(`\n${this.emoji} Error: ${error.message}`);
        await new Promise(resolve => setTimeout(resolve, intervalSeconds * 1000));
      }
    }
  }
}

const isMainModule = process.argv[1]?.replace(/\\/g, '/').endsWith('/agent.js');
if (isMainModule) {
  new TechnicalProductOwnerAgent().run(30);
}

export default TechnicalProductOwnerAgent;
