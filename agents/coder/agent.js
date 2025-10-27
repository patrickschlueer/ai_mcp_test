import Anthropic from '@anthropic-ai/sdk';
import axios from 'axios';
import dotenv from 'dotenv';
import FileDiscoveryUtil from '../shared-utils/file-discovery.js';

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
    this.currentPRFeedback = null; // 🆕 Für Rework-Modus
    
    // File Discovery Utility
    this.fileDiscovery = new FileDiscoveryUtil(
      this.callMCPTool.bind(this),
      this.emoji
    );
    
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
   * Prüfe ob bereits ein PR für dieses Ticket existiert
   */
  async findExistingPR(ticket) {
    console.log(`\n${this.emoji} Checking for existing PR...`);
    
    try {
      const result = await this.callMCPTool('github', 'get_pull_requests', {
        state: 'open'
      });

      if (!result.success) return null;

      // Suche PR der zu diesem Ticket gehört
      const existingPR = result.pullRequests.find(pr => {
        // Check Title oder Body für Ticket-Key
        return pr.title?.includes(ticket.key) || pr.body?.includes(ticket.key);
      });

      if (existingPR) {
        console.log(`   ✅ Found existing PR #${existingPR.number}: ${existingPR.title}`);
        console.log(`   🌿 Branch: ${existingPR.headBranch}`);
        return existingPR;
      }

      console.log(`   🆕 No existing PR found`);
      return null;
      
    } catch (error) {
      console.error(`   ⚠️  Failed to check for existing PR: ${error.message}`);
      return null;
    }
  }

  /**
   * 🆕 Lese alle PR-Kommentare und Review-Feedback
   */
  async readPRFeedback(prNumber) {
    console.log(`\n${this.emoji} Reading PR feedback...`);
    
    await this.sendEvent({
      type: 'reading_pr',
      message: `Reading PR #${prNumber} feedback`,
      details: 'Analyzing reviewer comments',
      activity: `📖 Reading PR #${prNumber}`
    });
    
    try {
      // Hole PR-Kommentare
      const commentsResult = await this.callMCPTool('github', 'get_pr_comments', {
        prNumber: prNumber
      });

      const feedback = {
        comments: [],
        reviewDecision: null,
        requestedChanges: [],
        summary: ''
      };

      console.log('Hallo 2');

      if (commentsResult.success && commentsResult.comments) {
        feedback.comments = commentsResult.comments.map(c => ({
          author: c.author,
          body: c.body,
          createdAt: c.createdAt
        }));

        console.log('RES');
        console.log(commentsResult);

        // Extrahiere Review-Entscheidung
        // 🔥 FIXED: Suche nach den tatsächlichen Markern vom Review Agent
        const reviewComments = commentsResult.comments.filter(c => 
          c.body.includes('🔍 **Code Review') || 
          c.body.includes('🚨 Critical Issues') ||
          c.body.includes('⚠️ Major Improvements') ||
          c.body.includes('**Recommendation**:') ||
          c.body.includes('Review by 🔍 Review Agent')
        );
        
        console.log(`   📋 Found ${reviewComments.length} review comment(s) from Review Agent`);

        console.log('Hallo 1');
        console.log(reviewComments);

        if (reviewComments.length > 0) {
          const latestReview = reviewComments[reviewComments.length - 1];

          console.log('LATEST REVIEW:');
          console.log(latestReview);
          
          if (latestReview.body.includes('✅ APPROVED') || latestReview.body.includes('Ready to merge')) {
            feedback.reviewDecision = 'APPROVED';
          } else if (latestReview.body.includes('🚨 Critical Issues') || 
                     latestReview.body.includes('⚠️ Major Improvements') ||
                     latestReview.body.includes('needs_fixes')) {
            feedback.reviewDecision = 'CHANGES_REQUESTED';
            
            // 🔥 VERBESSERT: Parse das Reviewer-Format
            const requestedChanges = [];
            
            console.log(`\n   🔍 DEBUG: Parsing review comment...`);
            console.log(`   📏 Comment length: ${latestReview.body.length} chars`);
            console.log(`   👤 Author: ${latestReview.author}`);
            
            // Debug: Zeige erste 500 Zeichen
            console.log(`\n   📄 Comment preview (first 500 chars):`);
            console.log(`   ${'-'.repeat(60)}`);
            console.log(latestReview.body.substring(0, 500));
            console.log(`   ${'-'.repeat(60)}`);
            
            // Debug: Suche nach allen ## Headers
            const allHeaders = latestReview.body.match(/##[^\n]*/g);
            if (allHeaders) {
              console.log(`\n   📋 Found headers in comment:`);
              allHeaders.forEach((header, i) => {
                console.log(`      ${i + 1}. "${header}"`);
              });
            } else {
              console.log(`\n   ⚠️  No ## headers found in comment!`);
            }
            
            // Debug: Test verschiedene Regex-Patterns
            console.log(`\n   🧪 Testing regex patterns...`);
            
            // Pattern 1: Mit ##
            const pattern1 = /## 🚨 Critical Issues\s*([\s\S]*?)(?=\n##|\n---|$)/;
            console.log(`   Pattern 1: /## 🚨 Critical Issues.../`);
            console.log(`   Match: ${pattern1.test(latestReview.body) ? '✅ YES' : '❌ NO'}`);
            
            // Pattern 2: Ohne ##
            const pattern2 = /🚨 Critical Issues\s*([\s\S]*?)(?=\n##|\n---|$)/;
            console.log(`   Pattern 2: /🚨 Critical Issues.../`);
            console.log(`   Match: ${pattern2.test(latestReview.body) ? '✅ YES' : '❌ NO'}`);
            
            // Pattern 3: Case insensitive
            const pattern3 = /critical issues/i;
            console.log(`   Pattern 3: /critical issues/i`);
            console.log(`   Match: ${pattern3.test(latestReview.body) ? '✅ YES' : '❌ NO'}`);
            
            // Extrahiere Critical Issues (mit verbessertem Regex)
            console.log(`\n   🎯 Attempting to extract Critical Issues...`);
            const criticalMatch = latestReview.body.match(/## 🚨 Critical Issues\s*([\s\S]*?)(?=\n##|\n---|$)/);
            if (criticalMatch) {
              console.log(`   ✅ Found Critical Issues section`);
              console.log(`   📦 Matched text length: ${criticalMatch[1].length} chars`);
              console.log(`   📄 First 200 chars of match:`);
              console.log(`   ${'-'.repeat(60)}`);
              console.log(criticalMatch[1].substring(0, 200));
              console.log(`   ${'-'.repeat(60)}`);
              
              const criticalText = criticalMatch[1].trim();
              const criticalItems = criticalText
                .split('\n')
                .filter(line => line.trim().startsWith('-'))
                .map(line => line.trim().substring(1).trim())
                .filter(item => item.length > 0);
              console.log(`   ✅ Extracted ${criticalItems.length} critical item(s)`);
              requestedChanges.push(...criticalItems);
            } else {
              console.log(`   ❌ No Critical Issues section found`);
            }
            
            // Extrahiere Major Improvements (mit verbessertem Regex)
            console.log(`\n   🎯 Attempting to extract Major Improvements...`);
            const majorMatch = latestReview.body.match(/## ⚠️ Major Improvements\s*([\s\S]*?)(?=\n##|\n---|$)/);
            if (majorMatch) {
              console.log(`   ✅ Found Major Improvements section`);
              console.log(`   📦 Matched text length: ${majorMatch[1].length} chars`);
              
              const majorText = majorMatch[1].trim();
              const majorItems = majorText
                .split('\n')
                .filter(line => line.trim().startsWith('-'))
                .map(line => line.trim().substring(1).trim())
                .filter(item => item.length > 0);
              console.log(`   ✅ Extracted ${majorItems.length} major item(s)`);
              requestedChanges.push(...majorItems);
            } else {
              console.log(`   ❌ No Major Improvements section found`);
            }
            
            console.log(`\n   📊 FINAL: Total changes extracted: ${requestedChanges.length}`);
            if (requestedChanges.length > 0) {
              console.log(`   📋 Changes list:`);
              requestedChanges.forEach((change, i) => {
                console.log(`      ${i + 1}. ${change.substring(0, 80)}...`);
              });
            }
            
            feedback.requestedChanges = requestedChanges;
          }
          
          feedback.summary = latestReview.body;
        }

        console.log(`   ✅ Read ${feedback.comments.length} comment(s)`);
        
        if (feedback.reviewDecision) {
          console.log(`   📊 Review Status: ${feedback.reviewDecision}`);
        }
        
        if (feedback.requestedChanges.length > 0) {
          console.log(`   🔧 Requested Changes (${feedback.requestedChanges.length}):`);
          feedback.requestedChanges.forEach((change, i) => {
            console.log(`      ${i + 1}. ${change}`);
          });
        }
        
        await this.sendEvent({
          type: 'pr_feedback_read',
          message: `PR #${prNumber} feedback analyzed`,
          details: JSON.stringify({
            reviewDecision: feedback.reviewDecision,
            changesCount: feedback.requestedChanges.length,
            plan: feedback.requestedChanges.length > 0 
              ? `Will address: ${feedback.requestedChanges.slice(0, 2).join(', ')}${feedback.requestedChanges.length > 2 ? '...' : ''}`
              : 'No specific changes requested'
          }),
          activity: `✅ Analyzed PR #${prNumber}`
        });
      }

      return feedback;
      
    } catch (error) {
      console.error(`   ⚠️  Failed to read PR feedback: ${error.message}`);
      
      await this.sendEvent({
        type: 'error',
        message: `Failed to read PR feedback`,
        details: error.message
      });
      
      return {
        comments: [],
        reviewDecision: null,
        requestedChanges: [],
        summary: 'Failed to read feedback'
      };
    }
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
   * 🆕 Wähle relevante Files basierend auf Ticket (wie TPO Agent)
   */
  async selectRelevantFiles(ticket) {
    console.log(`\n${this.emoji} Selecting relevant files for ticket...`);
    
    // Discover alle verfügbaren Files
    const discoveryResult = await this.fileDiscovery.discoverProjectFiles();
    const allFiles = discoveryResult.all;
    
    if (allFiles.length === 0) {
      console.log(`   ⚠️  No files discovered`);
      return [];
    }
    
    // Gruppiere Files nach Typ
    const fileGroups = this.fileDiscovery.groupFilesByType(allFiles);
    
    const prompt = `Du bist ein Senior Developer. Wähle die relevantesten Files für dieses Ticket.

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
Wähle die 5-10 relevantesten Files die zum Ticket passen.

**Regeln:**
1. Wenn Ticket über "User" spricht → user-related Files
2. Wenn Ticket über UI spricht → frontend Components
3. Wenn Ticket über API spricht → backend Files
4. IMMER relevante Models/Services mit einbeziehen
5. Wähle Files die geändert werden müssen + deren Dependencies

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
      
      return validFiles.length > 0 ? validFiles : allFiles.slice(0, 5);
      
    } catch (error) {
      console.error(`   ⚠️  Selection failed: ${error.message}`);
      // Fallback: Nimm erste 5 Files
      return allFiles.slice(0, 5);
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
    
    // 🔥 VERBESSERT: Verwende eigene selectRelevantFiles() Methode!
    const selectedFiles = await this.selectRelevantFiles(ticket);
    
    console.log(`   📚 Reading ${selectedFiles.length} relevant files for context...`);

    const filesContent = [];
    
    for (const filePath of selectedFiles) {
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
      files: filesContent,
      selectedFiles // Für spätere Verwendung
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
  async planImplementation(ticket, context, prFeedback = null) {
    console.log(`\n${this.emoji} Planning implementation...`);
    
    // 🔥 NEU: Füge PR-Feedback zum Prompt hinzu wenn vorhanden
    const feedbackSection = prFeedback && prFeedback.requestedChanges.length > 0 
      ? `\n=== REVIEWER FEEDBACK (MUST ADDRESS!) ===
**Review Status:** ${prFeedback.reviewDecision}

**Requested Changes:**
${prFeedback.requestedChanges.map((c, i) => `${i + 1}. ${c}`).join('\n')}

**WICHTIG:** Diese Änderungen müssen ZWINGEND umgesetzt werden! Der Reviewer hat explizit danach gefragt.
`
      : '';
    
    const prompt = `Du bist ein Senior Full-Stack Developer. Analysiere die Anforderungen und erstelle einen Implementierungsplan.
${feedbackSection ? '\n⚠️ ACHTUNG: Dies ist ein REWORK! Der Reviewer hat Änderungen angefordert. Fokussiere dich NUR auf die geforderten Änderungen!' : ''}
${feedbackSection}
=== TICKET ===
${ticket.key}: ${ticket.summary}
${ticket.description ? ticket.description.substring(0, 2000) : ''}

=== EXISTING FILES ===
${context.files.length > 0 ? `Relevant files loaded:
${context.files.map(f => `- ${f.path} (${f.size} bytes)`).join('\n')}` : 'No files loaded yet'}

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
  async implementChanges(ticket, context, prFeedback = null) {
    console.log(`\n${this.emoji} Starting implementation (step-by-step)...`);
    
    try {
      // SCHRITT 1: Erstelle Implementierungsplan (mit optional PR-Feedback)
      const plan = await this.planImplementation(ticket, context, prFeedback);
      
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
   * 🆕 Poste Jira-Kommentar wenn Rework startet
   */
  async postReworkStartComment(ticket, pullRequest, prFeedback) {
    console.log(`\n${this.emoji} Posting rework start comment to Jira...`);
    
    let comment = `${this.emoji} *Rework Started!*\n\n`;
    comment += `Ich arbeite jetzt an den Änderungen die vom Review Agent angefordert wurden.\n\n`;
    comment += `🔗 **Pull Request**: ${pullRequest.url}\n`;
    comment += `🔍 **Review Status**: ${prFeedback.reviewDecision}\n\n`;
    
    if (prFeedback.requestedChanges.length > 0) {
      comment += `## 🔧 Änderungen die umgesetzt werden (${prFeedback.requestedChanges.length}):\n\n`;
      
      prFeedback.requestedChanges.forEach((change, index) => {
        // Kürze lange Changes für bessere Lesbarkeit
        const shortChange = change.length > 100 ? change.substring(0, 100) + '...' : change;
        comment += `${index + 1}. ${shortChange}\n`;
      });
      
      comment += `\n`;
    }
    
    comment += `## ✅ Nächste Schritte\n`;
    comment += `1. Implementiere die geforderten Änderungen\n`;
    comment += `2. Update den Pull Request\n`;
    comment += `3. Warte auf erneutes Review\n\n`;
    
    comment += `---\n`;
    comment += `_Rework gestartet am ${new Date().toISOString()}_`;

    try {
      await this.callMCPTool('jira', 'add_comment', {
        ticketKey: ticket.key,
        comment
      });
      
      console.log(`   ✅ Rework start comment posted to Jira`);
      
      await this.sendEvent({
        type: 'jira_comment_posted',
        message: `Posted rework start comment to ${ticket.key}`,
        details: `${prFeedback.requestedChanges.length} changes to address`,
        activity: `📝 Updating Jira`
      });
      
    } catch (error) {
      console.error(`   ⚠️  Failed to post Jira comment: ${error.message}`);
    }
  }

  /**
   * Verarbeite ein Ticket
   */
  async processTicket(ticket) {
    try {
      console.log(`\n${'='.repeat(60)}`);
      console.log(`${this.emoji} Processing: ${ticket.key}`);
      console.log(`${'='.repeat(60)}`);

      // 🔥 WICHTIG: Prüfe ob bereits ein PR existiert
      const existingPR = await this.findExistingPR(ticket);
      
      let branchName;
      let isRework = false;
      
      if (existingPR) {
        // 🔄 REWORK MODE: Verwende existierenden Branch
        console.log(`\n${this.emoji} 🔄 REWORK MODE: Updating existing PR`);
        branchName = existingPR.headBranch;
        isRework = true;
        
        // 🔥 NEU: Lese PR-Feedback vom Reviewer
        const prFeedback = await this.readPRFeedback(existingPR.number);
        
        // Speichere Feedback für spätere Verwendung
        this.currentPRFeedback = prFeedback;
        
        // 🔥 WICHTIG: Auch bei Rework den Status auf "In Arbeit" setzen!
        await this.startWorkOnTicket(ticket);
        
        // 🔥 NEU: Poste Jira-Kommentar dass Rework gestartet wurde
        await this.postReworkStartComment(ticket, existingPR, prFeedback);
        
        await this.sendEvent({
          type: 'rework_started',
          message: `Reworking ${ticket.key} based on review feedback`,
          details: `PR #${existingPR.number} - ${prFeedback.requestedChanges.length} changes requested`,
          activity: `🔧 Fixing ${ticket.key}`
        });
        
      } else {
        // 🆕 FRESH START: Erstelle neuen Branch
        console.log(`\n${this.emoji} 🆕 FRESH START: Creating new implementation`);
        
        // 1. Setze auf "In Arbeit"
        await this.startWorkOnTicket(ticket);

        // 2. Erstelle Feature-Branch
        branchName = await this.createFeatureBranch(ticket);
      }

      // 3. Lese Kontext
      const context = await this.readProjectContext(ticket);

      // 4. Implementiere Änderungen (mit optional PR-Feedback bei Rework)
      const implementation = await this.implementChanges(
        ticket, 
        context, 
        isRework ? this.currentPRFeedback : null
      );

      // 5. Wende Änderungen an
      await this.applyChanges(implementation, branchName);

      // 6. Erstelle oder Update Pull Request
      let pullRequest;
      
      if (isRework) {
        // 🔄 Update existierenden PR mit neuem Comment
        console.log(`\n${this.emoji} Updating existing PR with fixes...`);
        
        const updateComment = `${this.emoji} **Code Updated - Review Feedback Addressed**

## 🔧 Changes Made
${implementation.changes.map(c => `- **${c.action}**: \`${c.path}\` - ${c.reason}`).join('\n')}

## ✅ Ready for Re-Review
The issues from the previous review have been addressed. Please review again.

---
_Updated by ${this.emoji} ${this.name} at ${new Date().toISOString()}_`;
        
        await this.callMCPTool('github', 'add_pr_comment', {
          prNumber: existingPR.number,
          comment: updateComment
        });
        
        console.log(`   ✅ PR #${existingPR.number} updated with fixes`);
        
        pullRequest = existingPR;
        
        await this.sendEvent({
          type: 'pr_updated',
          message: `PR updated for ${ticket.key}`,
          details: `PR #${existingPR.number} ready for re-review`,
          activity: `✅ Updated PR #${existingPR.number}`
        });
        
      } else {
        // 🆕 Erstelle neuen PR
        pullRequest = await this.createPullRequest(ticket, branchName, implementation);
      }

      // 7. Poste Info in Jira (nur bei neuem PR)
      if (!isRework) {
        await this.postPRInfoToJira(ticket, pullRequest);
      } else {
        // Bei Rework: Update Jira mit Info dass Fixes applied wurden
        const reworkComment = `${this.emoji} *Code Fixes Applied!*\n\nDie Review-Feedback wurde umgesetzt und der Pull Request wurde aktualisiert:\n\n🔗 **Pull Request**: ${pullRequest.url}\n\n## ✅ Nächste Schritte\nDer **Review Agent** wird die Änderungen erneut reviewen.\n\n---\n_Aktualisiert am ${new Date().toISOString()}_`;
        
        await this.callMCPTool('jira', 'add_comment', {
          ticketKey: ticket.key,
          comment: reworkComment
        });
        
        console.log(`   ✅ Jira updated with rework info`);
      }

      this.processedTickets.add(ticket.key);
      this.currentBranch = null;
      this.currentPRFeedback = null; // Reset nach Verarbeitung
      
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
