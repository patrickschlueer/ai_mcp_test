import Anthropic from '@anthropic-ai/sdk';
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Coder Agent
 * 
 * ✅ Wartet auf finalisierte Tasks mit fertigen Sub-Tasks
 * ✅ Erstellt Feature-Branch
 * ✅ Implementiert Code-Änderungen
 * ✅ Erstellt Pull Request
 * ✅ Arbeitet mit Review Agent zusammen
 * ✅ Postet finale PR-Info in Jira
 * 
 * 🛠️ TECH STACK:
 * - Frontend: Angular (eigenes CSS, kein Material!)
 * - Backend: Node.js
 * - Datenbank: In-Memory Node.js
 * - 3rd Party Libs: KEINE (außer TPO weist es explizit an!)
 */

class CoderAgent {
  constructor() {
    this.agentId = 'coder-001';
    this.name = process.env.AGENT_NAME || 'Coder Agent';
    this.emoji = process.env.AGENT_EMOJI || '👨‍💻';
    this.jiraMcpUrl = process.env.JIRA_MCP_SERVER_URL || 'http://localhost:3001';
    this.githubMcpUrl = process.env.GITHUB_MCP_SERVER_URL || 'http://localhost:3002';
    this.eventHubUrl = process.env.EVENT_HUB_URL || 'http://localhost:3000';
    this.projectKey = process.env.JIRA_PROJECT_KEY || 'AT';
    
    this.anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY
    });
    
    this.processedTickets = new Set();
    this.currentBranch = null;
    
    // Tech Stack Constraints
    this.techStack = {
      frontend: 'Angular',
      backend: 'Node.js',
      database: 'In-Memory Node.js',
      styling: 'Custom CSS (NO Angular Material or other UI frameworks)',
      thirdPartyLibs: 'NONE (unless explicitly approved by TPO)'
    };
    
    console.log(`${this.emoji} ${this.name} initialized`);
    console.log(`   Tech Stack:`);
    console.log(`     Frontend: ${this.techStack.frontend}`);
    console.log(`     Backend: ${this.techStack.backend}`);
    console.log(`     Database: ${this.techStack.database}`);
    console.log(`     Styling: ${this.techStack.styling}`);
    console.log(`     3rd Party: ${this.techStack.thirdPartyLibs}`);
    
    this.sendEvent({
      type: 'agent_started',
      message: `${this.name} started`,
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

  /**
   * Hole alle finalisierten Tickets (mit fertigen Sub-Tasks)
   */
  async getReadyForDevelopmentTickets() {
    console.log(`\n${this.emoji} Checking for ready tickets...`);
    
    // Hole alle Tickets die vom TPO approved wurden
    const result = await this.callMCPTool('jira', 'get_tickets', {
      status: 'To Do',
      maxResults: 10
    });

    if (!result.success) return [];

    const readyTickets = [];

    for (const ticket of result.tickets) {
      // Skip Sub-Tasks
      if (ticket.issueType === 'Sub-task' || ticket.issueType === 'Sub-Task') {
        continue;
      }

      // Skip bereits bearbeitete
      if (this.processedTickets.has(ticket.key)) {
        continue;
      }

      // Check ob Ticket finalisiert wurde (anhand Comments)
      const fullTicket = await this.callMCPTool('jira', 'get_ticket', { 
        ticketKey: ticket.key 
      });

      if (!fullTicket.success) continue;

      // Check ob TPO finalisiert hat
      const hasFinalComment = fullTicket.ticket.comments?.some(comment => {
        const bodyText = this.extractTextFromComment(comment.body);
        return (bodyText.includes('✅') && bodyText.includes('finalisiert')) || 
               bodyText.toLowerCase().includes('ready for development');
      });

      if (!hasFinalComment) continue;

      // Check Sub-Tasks
      const subTasksResult = await this.callMCPTool('jira', 'get_tickets', {
        status: 'all',
        maxResults: 50
      });

      if (subTasksResult.success) {
        const subTasks = subTasksResult.tickets.filter(t => 
          t.parentKey === ticket.key && 
          (t.issueType === 'Sub-task' || t.issueType === 'Sub-Task')
        );

        // Wenn Sub-Tasks existieren, müssen ALLE "Fertig" sein
        if (subTasks.length > 0) {
          const allDone = subTasks.every(st => 
            st.status === 'Fertig' || st.status === 'Done'
          );

          if (!allDone) {
            console.log(`   ⏳ ${ticket.key} has pending sub-tasks`);
            continue;
          }
        }
      }

      // Ticket ist bereit!
      readyTickets.push(fullTicket.ticket);
    }

    console.log(`   Found ${readyTickets.length} ready ticket(s)`);
    return readyTickets;
  }

  extractTextFromComment(body) {
    if (typeof body === 'string') return body;
    if (!body?.content) return '';
    
    let text = '';
    const processContent = (content) => {
      if (Array.isArray(content)) {
        content.forEach(item => {
          if (item.type === 'text') text += item.text + ' ';
          else if (item.content) processContent(item.content);
        });
      }
    };
    processContent(body.content);
    return text.trim();
  }

  /**
   * Setze Ticket auf "In Arbeit"
   */
  async startWorkOnTicket(ticket) {
    console.log(`\n${this.emoji} Starting work on ${ticket.key}...`);
    
    await this.sendEvent({
      type: 'work_started',
      message: `Started development on ${ticket.key}`,
      details: ticket.summary,
      activity: `💻 Coding ${ticket.key}`
    });

    await this.callMCPTool('jira', 'update_ticket', {
      ticketKey: ticket.key,
      updates: {
        status: 'In Arbeit'
      }
    });

    console.log(`   ✅ Status updated to "In Arbeit"`);
  }

  /**
   * Erstelle Feature-Branch
   */
  async createFeatureBranch(ticket) {
    console.log(`\n${this.emoji} Creating feature branch...`);
    
    // Branch-Name: feature/AT-123-short-description
    const shortDesc = ticket.summary
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .substring(0, 50);
    
    const branchName = `feature/${ticket.key}-${shortDesc}`;
    
    await this.sendEvent({
      type: 'branch_created',
      message: `Creating branch: ${branchName}`,
      details: `For ticket ${ticket.key}`,
      activity: `🌿 Creating branch`
    });

    try {
      const result = await this.callMCPTool('github', 'create_branch', {
        branchName,
        fromBranch: 'main'
      });

      if (result.success) {
        this.currentBranch = branchName;
        console.log(`   ✅ Branch created: ${branchName}`);
        return branchName;
      }
    } catch (error) {
      console.error(`   ❌ Failed to create branch: ${error.message}`);
      throw error;
    }
  }

  /**
   * Lese alle relevanten Files für Kontext
   */
  async readProjectContext(ticket) {
    console.log(`\n${this.emoji} Reading project context...`);
    
    // Sammle alle relevanten Infos aus Ticket und Sub-Tasks
    const architecture = this.extractSection(ticket.description, '🏛️ Architektur-Design');
    const uiDesign = this.extractSection(ticket.description, '🎨 UI-Design Spezifikation');
    
    // Lese aktuelle Code-Files
    const filesToRead = [
      'test-app/backend/server.js',
      'test-app/backend/models/user.js',
      'test-app/backend/routes/auth.js',
      'test-app/frontend/src/app/app.component.ts',
      'test-app/frontend/src/app/app.component.html',
      'test-app/frontend/src/styles.css'
    ];

    const filesContent = [];
    
    for (const filePath of filesToRead) {
      try {
        const file = await this.callMCPTool('github', 'get_file', { path: filePath });
        
        if (file.success) {
          filesContent.push({
            path: file.file.path,
            name: file.file.name,
            content: file.file.content,
            size: file.file.size
          });
          console.log(`   ✅ ${file.file.name}`);
        }
      } catch (error) {
        console.log(`   ⚠️  Could not read ${filePath}`);
      }
    }

    return {
      architecture,
      uiDesign,
      files: filesContent
    };
  }

  extractSection(text, header) {
    if (!text) return null;
    const regex = new RegExp(`${header}([\\s\\S]*?)(?=\\n## |$)`, 'i');
    const match = text.match(regex);
    return match ? match[1].trim() : null;
  }

  /**
   * Implementiere die Code-Änderungen
   */
  async implementChanges(ticket, context) {
    console.log(`\n${this.emoji} Implementing changes...`);
    
    await this.sendEvent({
      type: 'coding',
      message: `Implementing ${ticket.key}`,
      details: `Working on ${context.files.length} files`,
      activity: `⚙️ Coding ${ticket.key}`
    });

    // Erstelle Code-Context für Claude
    let codeContext = '=== EXISTING CODE ===\n\n';
    for (const file of context.files) {
      codeContext += `━━━ ${file.path} ━━━\n${file.content}\n\n`;
    }

    const prompt = `Du bist ein Senior Full-Stack Developer. Implementiere die folgenden Anforderungen.

=== TICKET ===
${ticket.key}: ${ticket.summary}
${ticket.description || ''}

=== ARCHITEKTUR-DESIGN ===
${context.architecture || 'Keine spezielle Architektur vorgegeben'}

=== UI-DESIGN SPEZIFIKATION ===
${context.uiDesign || 'Keine spezielle UI-Vorgaben'}

${codeContext}

=== TECH STACK CONSTRAINTS ===
⚠️ KRITISCH - Du MUSST dich an folgende Technologie-Vorgaben halten:

**Frontend:**
- Angular (kein React, Vue, etc.)
- Custom CSS (KEIN Angular Material, Bootstrap, Tailwind, etc.!)
- Schreibe eigene CSS-Styles von Grund auf

**Backend:**
- Node.js
- Express (falls nötig)
- KEINE zusätzlichen Frameworks

**Datenbank:**
- In-Memory Node.js (einfaches Array/Object)
- KEINE echte Datenbank (MongoDB, PostgreSQL, etc.)
- Es sei denn, das Ticket erwähnt explizit eine DB-Migration

**3rd Party Libraries:**
- KEINE zusätzlichen npm packages installieren
- KEINE externen Libraries verwenden
- Nur eingebaute Node.js/Angular Module
- Ausnahme: Nur wenn der TPO es EXPLIZIT im Ticket angewiesen hat!

=== AUFGABE ===
Implementiere die Anforderungen aus dem Ticket. Beachte:

1. **Folge dem Architektur-Design** (falls vorhanden)
2. **Folge der UI-Design Spezifikation** (falls vorhanden)
3. **Halte dich STRIKT an den Tech Stack** (siehe oben!)
4. **Halte dich an den bestehenden Code-Stil**
5. **Schreibe sauberen, wartbaren Code**
6. **Füge Kommentare für komplexe Logik hinzu**
7. **Keine Breaking Changes** am bestehenden Code
8. **KEIN Angular Material oder andere UI-Frameworks!**
9. **Schreibe CSS selbst, kein Framework-CSS!**

Antworte mit einem JSON-Array von File-Änderungen:

\`\`\`json
{
  "changes": [
    {
      "action": "create" | "update" | "delete",
      "path": "test-app/...",
      "content": "Der vollständige File-Content (bei create/update)",
      "reason": "Warum diese Änderung?"
    }
  ],
  "summary": "Kurze Zusammenfassung der Implementierung"
}
\`\`\`

**WICHTIG**: 
- Gib den KOMPLETTEN File-Content zurück, nicht nur Snippets!
- Bei Updates: Komplette Datei mit allen Änderungen!
- Mache nur die minimal nötigen Änderungen!
- KEINE neuen npm packages oder Libraries!`;

    try {
      const message = await this.anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 8000,
        messages: [{ role: 'user', content: prompt }]
      });

      let responseText = message.content[0].text.trim();
      
      // Extract JSON from markdown code blocks
      responseText = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      
      const implementation = JSON.parse(responseText);
      
      console.log(`   ✅ Implementation planned: ${implementation.changes.length} file(s)`);
      console.log(`   📝 ${implementation.summary}`);
      
      return implementation;
      
    } catch (error) {
      console.error(`   ❌ Failed to generate implementation: ${error.message}`);
      throw error;
    }
  }

  /**
   * Wende Code-Änderungen auf Branch an
   */
  async applyChanges(implementation, branchName) {
    console.log(`\n${this.emoji} Applying changes to branch...`);
    
    for (const change of implementation.changes) {
      try {
        await this.sendEvent({
          type: 'file_modified',
          message: `${change.action}: ${change.path}`,
          details: change.reason,
          activity: `✏️ Modifying files`
        });

        if (change.action === 'create' || change.action === 'update') {
          await this.callMCPTool('github', 'update_file', {
            path: change.path,
            content: change.content,
            branch: branchName,
            message: `${change.action}: ${change.path} - ${change.reason}`
          });
          
          console.log(`   ✅ ${change.action}: ${change.path}`);
          
        } else if (change.action === 'delete') {
          await this.callMCPTool('github', 'delete_file', {
            path: change.path,
            branch: branchName,
            message: `delete: ${change.path} - ${change.reason}`
          });
          
          console.log(`   ✅ Deleted: ${change.path}`);
        }

        // Kurze Pause zwischen File-Operationen
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        console.error(`   ❌ Failed to ${change.action} ${change.path}: ${error.message}`);
      }
    }

    console.log(`   ✅ All changes applied`);
  }

  /**
   * Erstelle Pull Request
   */
  async createPullRequest(ticket, branchName, implementation) {
    console.log(`\n${this.emoji} Creating Pull Request...`);
    
    await this.sendEvent({
      type: 'pr_created',
      message: `Creating PR for ${ticket.key}`,
      details: `From ${branchName} to main`,
      activity: `📝 Creating PR`
    });

    const prTitle = `${ticket.key}: ${ticket.summary}`;
    
    const prBody = `## 📋 Ticket
[${ticket.key}](https://patrickschlueer.atlassian.net/browse/${ticket.key})

## 📝 Implementation Summary
${implementation.summary}

## 🔧 Changes
${implementation.changes.map(c => `- **${c.action}**: \`${c.path}\` - ${c.reason}`).join('\n')}

## 🛠️ Tech Stack
- Frontend: Angular (Custom CSS, no UI frameworks)
- Backend: Node.js
- Database: In-Memory
- 3rd Party: None

## ✅ Ready for Review
This PR is ready for review by the Review Agent.

---
_Created by ${this.emoji} ${this.name}_`;

    try {
      const result = await this.callMCPTool('github', 'create_pull_request', {
        title: prTitle,
        body: prBody,
        head: branchName,
        base: 'main'
      });

      if (result.success) {
        console.log(`   ✅ PR created: ${result.pullRequest.url}`);
        
        await this.sendEvent({
          type: 'pr_ready',
          message: `PR created for ${ticket.key}`,
          details: JSON.stringify({
            prUrl: result.pullRequest.url,
            prNumber: result.pullRequest.number
          }),
          activity: `✅ PR Ready`
        });

        return result.pullRequest;
      }
    } catch (error) {
      console.error(`   ❌ Failed to create PR: ${error.message}`);
      throw error;
    }
  }

  /**
   * Poste PR-Info in Jira
   */
  async postPRInfoToJira(ticket, pullRequest) {
    console.log(`\n${this.emoji} Posting PR info to Jira...`);
    
    const comment = `${this.emoji} *Implementation Complete!*

Die Code-Änderungen für dieses Ticket wurden implementiert und ein Pull Request wurde erstellt:

🔗 **Pull Request**: ${pullRequest.url}
📝 **PR #${pullRequest.number}**: ${pullRequest.title}

## 🛠️ Tech Stack
- Frontend: Angular (Custom CSS)
- Backend: Node.js
- Database: In-Memory
- 3rd Party Libraries: None

## ✅ Nächste Schritte
1. **Review Agent** wird den Code reviewen
2. Falls nötig werden Anpassungen vorgenommen
3. Nach finaler Freigabe kann der PR von einem menschlichen Developer gemerged werden

---
_Erstellt am ${new Date().toISOString()}_`;

    await this.callMCPTool('jira', 'add_comment', {
      ticketKey: ticket.key,
      comment
    });

    console.log(`   ✅ PR info posted to Jira`);
  }

  /**
   * Verarbeite ein Ticket
   */
  async processTicket(ticket) {
    try {
      console.log(`\n${'='.repeat(60)}`);
      console.log(`${this.emoji} Processing: ${ticket.key}`);
      console.log(`${'='.repeat(60)}`);

      // 1. Setze auf "In Arbeit"
      await this.startWorkOnTicket(ticket);

      // 2. Erstelle Feature-Branch
      const branchName = await this.createFeatureBranch(ticket);

      // 3. Lese Kontext
      const context = await this.readProjectContext(ticket);

      // 4. Implementiere Änderungen
      const implementation = await this.implementChanges(ticket, context);

      // 5. Wende Änderungen an
      await this.applyChanges(implementation, branchName);

      // 6. Erstelle Pull Request
      const pullRequest = await this.createPullRequest(ticket, branchName, implementation);

      // 7. Poste Info in Jira
      await this.postPRInfoToJira(ticket, pullRequest);

      this.processedTickets.add(ticket.key);
      this.currentBranch = null;
      
      console.log(`\n${this.emoji} ✅ Ticket fully processed!`);
      console.log(`   Waiting for Review Agent...`);
      
      return { success: true, pullRequest };
      
    } catch (error) {
      console.error(`\n${this.emoji} ❌ Error: ${error.message}`);
      
      await this.sendEvent({
        type: 'error',
        message: `Failed to process ${ticket.key}`,
        details: error.message
      });
      
      return { success: false, error: error.message };
    }
  }

  async run(intervalSeconds = 30) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`${this.emoji} ${this.name} started!`);
    console.log(`   Looking for tickets ready for development...`);
    console.log(`${'='.repeat(60)}`);

    while (true) {
      try {
        const tickets = await this.getReadyForDevelopmentTickets();
        
        for (const ticket of tickets) {
          await this.processTicket(ticket);
        }

        if (tickets.length === 0) {
          await this.sendEvent({ 
            type: 'idle', 
            message: 'No tickets ready for development',
            activity: 'Idle - waiting for finalized tickets'
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
  new CoderAgent().run(30);
}

export default CoderAgent;
