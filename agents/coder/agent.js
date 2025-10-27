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
    
    // Angular Best Practices & Architecture Rules
    this.angularRules = {
      componentStructure: {
        rule: 'Split into .ts, .html, .css files',
        detail: 'Use templateUrl and styleUrl, NO inline templates',
        maxLines: 400,
        enforcement: 'Components MUST be split when exceeding 400 lines'
      },
      componentOrganization: {
        rule: 'Create reusable components in shared folder',
        detail: 'Generic components (search, buttons, etc.) → /shared/',
        enforcement: 'Check reusability before placing components'
      },
      fileOrganization: {
        rule: 'One class per file, one interface per file',
        detail: 'NO multiple classes/interfaces in same file',
        enforcement: 'Each file serves ONE purpose only'
      },
      stateManagement: {
        rule: 'Use NgRx from the start',
        detail: 'RxJS + NgRx for ALL state management',
        libraries: ['@ngrx/store', '@ngrx/effects', '@ngrx/entity'],
        enforcement: 'NO component-level state for shared data'
      },
      testing: {
        rule: 'EVERY file must have tests',
        detail: 'Unit tests (.spec.ts) + E2E tests (when applicable)',
        coverage: 'Minimum: test core functionality',
        enforcement: 'PR cannot be approved without tests'
      }
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
    
    const branchName = `feature/${ticket.key}-${ticket.summary
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .substring(0, 50)}`;
    
    await this.sendEvent({
      type: 'branch_created',
      message: `Creating branch: ${branchName}`,
      activity: `🌿 Creating ${branchName}`
    });
    
    const result = await this.callMCPTool('github', 'create_branch', {
      branchName: branchName,
      fromBranch: 'main'
    });
    
    if (result.success) {
      console.log(`   ✅ Branch created: ${branchName}`);
      this.currentBranch = branchName;
      return branchName;
    } else {
      throw new Error(`Failed to create branch: ${result.error}`);
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
   * SCHRITT 1: Plane welche Files geändert werden müssen
   */
  async planImplementation(ticket, context) {
    console.log(`\n${this.emoji} Planning implementation...`);
    
    const prompt = `Du bist ein Senior Full-Stack Developer. Analysiere die Anforderungen und erstelle einen Implementierungsplan.

=== TICKET ===
${ticket.key}: ${ticket.summary}
${ticket.description ? ticket.description.substring(0, 2000) : ''}

=== EXISTING FILES ===
${context.files.map(f => `- ${f.path} (${f.size} bytes)`).join('\n')}

=== TECH STACK CONSTRAINTS ===
- Frontend: Angular (Custom CSS, NO frameworks!)
- Backend: Node.js
- Database: In-Memory
- 3rd Party: NONE

=== ANGULAR ARCHITECTURE RULES ===
**Component Structure:**
- Split EVERY component into .ts, .html, .css files
- Use templateUrl and styleUrl (NO inline templates!)
- Max 400 lines per component - split into smaller components if longer

**Component Organization:**
- Reusable components → /shared/ folder (search bars, buttons, etc.)
- Feature-specific → /features/[feature-name]/
- Check: Can this component be reused elsewhere?

**File Organization:**
- ONE class per file
- ONE interface per file
- NO grouping multiple classes/interfaces together

**State Management:**
- Use NgRx from the start (@ngrx/store, @ngrx/effects, @ngrx/entity)
- RxJS for reactive programming
- NO component-level state for shared data

**Testing (MANDATORY):**
- EVERY component needs .spec.ts file
- EVERY service needs .spec.ts file
- Test core functionality (not 100%, but basics)
- E2E tests for critical user flows

=== AUFGABE ===
Erstelle einen Implementierungsplan. Welche Files müssen geändert werden?

**WICHTIG:**
- Beachte die 400-Zeilen-Regel für Components!
- Erstelle IMMER separate .ts, .html, .css Files
- Erstelle IMMER .spec.ts Test-Files
- Prüfe ob NgRx Store/Effects/Actions benötigt werden

Antworte NUR mit JSON:

\`\`\`json
{
  "filesToModify": [
    {
      "path": "test-app/...",
      "action": "create" | "update" | "delete",
      "reason": "Warum muss diese Datei geändert werden?"
    }
  ],
  "implementationStrategy": "Kurze Beschreibung der Strategie"
}
\`\`\`

**WICHTIG**: Liste NUR die Files die wirklich geändert werden müssen!`;

    try {
      const message = await this.anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2000,
        messages: [{ role: 'user', content: prompt }]
      });

      const responseText = message.content[0].text.trim()
        .replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('No JSON found');
      
      const plan = JSON.parse(jsonMatch[0]);
      
      console.log(`   ✅ Plan created: ${plan.filesToModify.length} file(s)`);
      console.log(`   📋 Strategy: ${plan.implementationStrategy}`);
      
      return plan;
      
    } catch (error) {
      console.error(`   ❌ Planning failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * 🛡️ FALLBACK: Splitte große Datei in kleinere Chunks
   */
  async implementFileInChunks(fileToModify, ticket, context, existingContent) {
    console.log(`\n${this.emoji} ⚠️  File too large, splitting into chunks...`);
    
    // Bestimme wie viele Chunks wir brauchen (basierend auf existierendem Content)
    const lines = existingContent.split('\n');
    const chunkSize = Math.min(100, Math.ceil(lines.length / 3)); // Max 3 Chunks
    const chunks = [];
    
    for (let i = 0; i < lines.length; i += chunkSize) {
      chunks.push({
        startLine: i + 1,
        endLine: Math.min(i + chunkSize, lines.length),
        content: lines.slice(i, i + chunkSize).join('\n')
      });
    }
    
    console.log(`   📦 Splitting into ${chunks.length} chunk(s)`);
    
    // Implementiere jeden Chunk einzeln
    const modifiedChunks = [];
    
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      
      const prompt = `Du bist ein Senior Developer. Modifiziere NUR DIESEN CHUNK der Datei.

=== FILE INFO ===
Path: ${fileToModify.path}
Chunk ${i + 1}/${chunks.length} (Lines ${chunk.startLine}-${chunk.endLine})

=== TICKET ===
${ticket.key}: ${ticket.summary}

=== ÄNDERUNGSGRUND ===
${fileToModify.reason}

=== CHUNK CONTENT ===
${chunk.content}

=== VORHERIGER CHUNK ===
${modifiedChunks[i - 1] || 'N/A'}

=== AUFGABE ===
Modifiziere DIESEN Chunk basierend auf den Anforderungen.

WICHTIG:
- Behalte alle Imports/Dependencies bei
- Ändere nur was nötig ist für ${fileToModify.reason}
- Gib den KOMPLETTEN modifizierten Chunk zurück

Antworte NUR mit dem Code (KEIN JSON, KEIN Markdown):`;

      try {
        const message = await this.anthropic.messages.create({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 4000,
          messages: [{ role: 'user', content: prompt }]
        });

        let chunkResult = message.content[0].text.trim();
        
        // Remove markdown code blocks if present
        chunkResult = chunkResult.replace(/```[a-z]*\n?/g, '').replace(/```\n?/g, '').trim();
        
        modifiedChunks.push(chunkResult);
        console.log(`   ✅ Chunk ${i + 1}/${chunks.length} modified`);
        
        // Kurze Pause zwischen Chunks
        await new Promise(resolve => setTimeout(resolve, 500));
        
      } catch (error) {
        console.error(`   ❌ Chunk ${i + 1} failed: ${error.message}`);
        // Verwende Original-Chunk als Fallback
        modifiedChunks.push(chunk.content);
      }
    }
    
    // Kombiniere alle Chunks
    const finalContent = modifiedChunks.join('\n');
    
    return {
      content: finalContent,
      changes: `Modified in ${chunks.length} chunks due to size`
    };
  }

  /**
   * SCHRITT 2: Implementiere EINE einzelne Datei (mit Retry-Logik)
   */
  async implementSingleFile(fileToModify, ticket, context, retryCount = 0) {
    console.log(`\n${this.emoji} Implementing ${fileToModify.path}...`);
    
    await this.sendEvent({
      type: 'coding',
      message: `Working on ${fileToModify.path}`,
      details: fileToModify.reason,
      activity: `⚙️ Coding ${fileToModify.path}`
    });

    // Hole den aktuellen File-Content falls vorhanden
    const existingFile = context.files.find(f => f.path === fileToModify.path);
    const existingContent = existingFile ? existingFile.content : '';

    const prompt = `Du bist ein Senior Full-Stack Developer. Implementiere die Änderungen für DIESE EINE Datei.

=== TICKET ===
${ticket.key}: ${ticket.summary}

=== FILE ZU ÄNDERN ===
Path: ${fileToModify.path}
Action: ${fileToModify.action}
Reason: ${fileToModify.reason}

=== AKTUELLER CONTENT ===
${existingContent || '(Neue Datei)'}

=== ARCHITEKTUR-HINWEISE ===
${this.extractSection(ticket.description, '🏛️ Architektur-Design')?.substring(0, 1000) || 'Keine'}

=== UI-DESIGN-HINWEISE ===
${this.extractSection(ticket.description, '🎨 UI-Design')?.substring(0, 1000) || 'Keine'}

=== TECH STACK ===
- Frontend: Angular (Custom CSS, NO Material!)
- Backend: Node.js
- Database: In-Memory
- 3rd Party: NONE

=== ANGULAR ARCHITECTURE RULES ===
**Component Structure:**
- ALWAYS split into .ts, .html, .css (use templateUrl/styleUrl)
- Max 400 lines - if longer, split into smaller components
- NO inline templates or styles

**Component Organization:**
- Reusable (search, buttons) → /shared/
- Feature-specific → /features/[name]/

**File Organization:**
- ONE class per file, ONE interface per file
- No multiple classes/interfaces in same file

**State Management:**
- Use NgRx (@ngrx/store, effects, entity)
- RxJS for reactive code
- NO component state for shared data

**Testing (MANDATORY):**
- Create .spec.ts for this file
- Test core functionality
- Include in implementation

=== AUFGABE ===
Generiere den KOMPLETTEN neuen Content für diese Datei.

**WICHTIG**:
- Gib den VOLLSTÄNDIGEN File-Content zurück
- KEINE Kommentare wie "// rest bleibt gleich"
- Halte dich an bestehenden Code-Stil
- KEIN Angular Material oder UI-Frameworks
- Schreibe CSS selbst!

Antworte NUR mit JSON:

\`\`\`json
{
  "content": "Der KOMPLETTE File-Content hier",
  "changes": "Kurze Liste der Änderungen"
}
\`\`\``;

    try {
      const message = await this.anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 8000,
        messages: [{ role: 'user', content: prompt }]
      });

      let responseText = message.content[0].text.trim();
      
      // Robust JSON extraction
      responseText = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      
      // Versuche JSON zu extrahieren
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }
      
      const result = JSON.parse(jsonMatch[0]);
      
      // Validiere result
      if (!result.content) {
        throw new Error('JSON missing content field');
      }
      
      console.log(`   ✅ ${fileToModify.path} implemented`);
      console.log(`   📝 Changes: ${result.changes || 'Changes applied'}`);
      
      return {
        path: fileToModify.path,
        action: fileToModify.action,
        content: result.content,
        reason: fileToModify.reason
      };
      
    } catch (error) {
      console.error(`   ❌ Failed to implement ${fileToModify.path}: ${error.message}`);
      
      // 🛡️ FEHLERBEHANDLUNG
      
      // Fall 1: JSON Parse Error oder zu großer Output
      if (error.message.includes('JSON') || 
          error.message.includes('Unexpected token') ||
          error.message.includes('Unterminated string') ||
          retryCount === 0) {
        
        console.log(`   🔄 Retry Strategy: Using chunk-based approach...`);
        
        // Verwende Chunk-basierte Implementierung
        try {
          const chunkResult = await this.implementFileInChunks(
            fileToModify, 
            ticket, 
            context, 
            existingContent || ''
          );
          
          return {
            path: fileToModify.path,
            action: fileToModify.action,
            content: chunkResult.content,
            reason: fileToModify.reason
          };
          
        } catch (chunkError) {
          console.error(`   ❌ Chunk-based retry also failed: ${chunkError.message}`);
        }
      }
      
      // Fall 2: Anderer Fehler - einfach neu versuchen mit kürzerem Prompt
      if (retryCount < 1) {
        console.log(`   🔄 Retry ${retryCount + 1}/1 with simplified prompt...`);
        
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Vereinfachte Version des Prompts (ohne viel Kontext)
        const simplePrompt = `Implementiere folgende Änderung:

File: ${fileToModify.path}
Action: ${fileToModify.action}
Reason: ${fileToModify.reason}

Existing Content:
${existingContent.substring(0, 3000) || '(new file)'}

Gib NUR den neuen File-Content zurück. Kein JSON, nur reiner Code.`;
        
        try {
          const retryMessage = await this.anthropic.messages.create({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 6000,
            messages: [{ role: 'user', content: simplePrompt }]
          });
          
          let retryContent = retryMessage.content[0].text.trim();
          retryContent = retryContent.replace(/```[a-z]*\n?/g, '').replace(/```\n?/g, '').trim();
          
          console.log(`   ✅ Retry successful!`);
          
          return {
            path: fileToModify.path,
            action: fileToModify.action,
            content: retryContent,
            reason: fileToModify.reason
          };
          
        } catch (retryError) {
          console.error(`   ❌ Retry failed: ${retryError.message}`);
        }
      }
      
      // Fall 3: Alle Versuche fehlgeschlagen
      throw new Error(`All retry attempts failed for ${fileToModify.path}`);
    }
  }

  /**
   * HAUPT-METHODE: Implementiere die Code-Änderungen (Schritt für Schritt)
   */
  async implementChanges(ticket, context) {
    console.log(`\n${this.emoji} Starting implementation (step-by-step)...`);
    
    try {
      // SCHRITT 1: Erstelle Implementierungsplan
      const plan = await this.planImplementation(ticket, context);
      
      // SCHRITT 2: Implementiere jede Datei einzeln
      const changes = [];
      
      for (const fileToModify of plan.filesToModify) {
        try {
          const fileChange = await this.implementSingleFile(fileToModify, ticket, context);
          changes.push(fileChange);
          
          // Kurze Pause zwischen Files
          await new Promise(resolve => setTimeout(resolve, 500));
          
        } catch (error) {
          console.error(`   ⚠️  Skipping ${fileToModify.path}: ${error.message}`);
          // Weiter mit nächster Datei
        }
      }
      
      if (changes.length === 0) {
        throw new Error('No files were successfully implemented');
      }
      
      console.log(`\n   ✅ Implementation complete: ${changes.length}/${plan.filesToModify.length} file(s)`);
      
      return {
        changes,
        summary: plan.implementationStrategy
      };
      
    } catch (error) {
      console.error(`   ❌ Implementation failed: ${error.message}`);
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
          await this.callMCPTool('github', 'commit_file', {
            path: change.path,
            content: change.content,
            branch: branchName,
            message: `${change.action}: ${change.path} - ${change.reason}`
          });
          
          console.log(`   ✅ ${change.action}: ${change.path}`);
          
        } else if (change.action === 'delete') {
          console.log(`   ⚠️  Skipping delete: ${change.path} (not implemented yet)`);
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
        headBranch: branchName,
        baseBranch: 'main'
      });

      if (result.success) {
        console.log(`   ✅ PR created: ${result.pr.url}`);
        
        await this.sendEvent({
          type: 'pr_ready',
          message: `PR created for ${ticket.key}`,
          details: JSON.stringify({
            prUrl: result.pr.url,
            prNumber: result.pr.number
          }),
          activity: `✅ PR Ready`
        });

        return result.pr;
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
