import Anthropic from '@anthropic-ai/sdk';
import axios from 'axios';
import dotenv from 'dotenv';
import { checkAndResetParentTask } from '../shared-utils/subtask-coordinator.js';

dotenv.config();

/**
 * Software Architect Agent
 * 
 * ✅ Bearbeitet Architecture Sub-Tasks
 * ✅ Analysiert Code und erstellt Architektur-Design
 * ✅ 3 Iterationen: Selbst-Review & Verbesserung
 * ✅ Dokumentiert finale Erkenntnisse im Parent-Task
 * ✅ Prüft ob ALLE Agent Sub-Tasks fertig sind (flexibel 1-N) → Reset Parent zu "To Do"
 * 
 * 🛠️ TECH STACK:
 * - Frontend: Angular (eigenes CSS, kein Material!)
 * - Backend: Node.js
 * - Datenbank: In-Memory Node.js
 * - 3rd Party Libs: KEINE (außer TPO weist es explizit an!)
 */

class SoftwareArchitectAgent {
  constructor() {
    this.agentId = 'architect-001';
    this.name = process.env.AGENT_NAME || 'Software Architect Agent';
    this.emoji = process.env.AGENT_EMOJI || '🏛️';
    this.jiraMcpUrl = process.env.JIRA_MCP_SERVER_URL || 'http://localhost:3001';
    this.githubMcpUrl = process.env.GITHUB_MCP_SERVER_URL || 'http://localhost:3002';
    this.eventHubUrl = process.env.EVENT_HUB_URL || 'http://localhost:3000';
    this.projectKey = process.env.JIRA_PROJECT_KEY || 'AT';
    
    this.anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY
    });
    
    this.processedSubTasks = new Set();
    this.maxIterations = 1;  // Nur 1 Iteration = Initial + 1 Review
    
    // Angular Best Practices & Architecture Rules
    this.angularRules = {
      componentStructure: 'Split into .ts, .html, .css - use templateUrl/styleUrl - Max 400 lines',
      componentOrganization: 'Reusable → /shared/, Feature-specific → /features/',
      fileOrganization: 'One class per file, one interface per file',
      stateManagement: 'NgRx (@ngrx/store, effects, entity) + RxJS',
      testing: 'Every file needs .spec.ts test file'
    };
    
    console.log(`${this.emoji} ${this.name} initialized`);
    console.log(`   Max iterations: ${this.maxIterations}`);
    console.log(`   Angular Rules: Component split, NgRx, Testing mandatory`);
    
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
   * Hole alle Architecture Sub-Tasks mit Status "To Do"
   */
  async getArchitectureSubTasks() {
    console.log(`\n${this.emoji} Checking for architecture sub-tasks...`);
    
    const result = await this.callMCPTool('jira', 'get_tickets', {
      status: 'To Do',
      maxResults: 10
    });

    if (!result.success) return [];

    // Filter: Nur Sub-Tasks mit Label "architecture"
    const subTasks = result.tickets.filter(ticket => {
      const isSubTask = ticket.issueType === 'Sub-task' || ticket.issueType === 'Sub-Task';
      const hasArchLabel = ticket.labels?.includes('architecture') || 
                          ticket.summary?.includes('🏛️') ||
                          ticket.summary?.toLowerCase().includes('architektur');
      const notProcessed = !this.processedSubTasks.has(ticket.key);
      
      return isSubTask && hasArchLabel && notProcessed;
    });

    console.log(`   Found ${subTasks.length} architecture sub-task(s)`);
    return subTasks;
  }

  /**
   * Lese Parent-Task Details
   */
  async getParentTask(subTask) {
    console.log(`\n${this.emoji} Reading parent task...`);
    
    // Hole vollständige Sub-Task Details (enthält parentKey)
    const fullSubTask = await this.callMCPTool('jira', 'get_ticket', { 
      ticketKey: subTask.key 
    });
    
    if (!fullSubTask.success || !fullSubTask.ticket.parentKey) {
      console.log(`   ⚠️  No parent key found`);
      return null;
    }
    
    const parentKey = fullSubTask.ticket.parentKey;
    console.log(`   Parent: ${parentKey}`);
    
    const parentTicket = await this.callMCPTool('jira', 'get_ticket', { 
      ticketKey: parentKey 
    });
    
    if (parentTicket.success) {
      console.log(`   ✅ Parent loaded: ${parentTicket.ticket.summary}`);
      return parentTicket.ticket;
    }
    
    return null;
  }

  /**
   * Lese relevante Code-Files
   */
  async readRelevantFiles(subTask, parentTask) {
    console.log(`\n${this.emoji} Reading relevant code files...`);
    
    // Extrahiere File-Liste aus Sub-Task Beschreibung
    const description = subTask.description || '';
    const fileMatches = description.match(/test-app\/[^\s\n]+\.(ts|js|json)/g);
    
    const filesToRead = fileMatches || [
      'test-app/backend/server.js',
      'test-app/backend/models/user.js',
      'test-app/frontend/src/app/app.component.ts'
    ];
    
    console.log(`   Reading ${filesToRead.length} files...`);
    
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
          console.log(`   ✅ ${file.file.name} (${file.file.size} bytes)`);
        }
      } catch (error) {
        console.log(`   ⚠️  Could not read ${filePath}`);
      }
    }
    
    console.log(`   ✅ Read ${filesContent.length} files`);
    return filesContent;
  }

  /**
   * Erstelle initiale Architektur-Ausarbeitung
   */
  async createInitialArchitecture(subTask, parentTask, codeFiles) {
    console.log(`\n${this.emoji} Creating initial architecture design...`);
    
    await this.sendEvent({
      type: 'work_in_progress',
      message: `Creating initial architecture for ${subTask.key}`,
      details: `Analyzing ${codeFiles.length} code files`,
      activity: `📝 Designing ${subTask.key}`
    });
    
    let codeSection = '';
    if (codeFiles.length > 0) {
      codeSection = '=== CODE FILES ===\n\n';
      for (const file of codeFiles) {
        codeSection += `━━━ ${file.path} ━━━\n${file.content}\n\n`;
      }
    }
    
    const prompt = `Du bist ein Software-Architekt. Erstelle ein HIGH-LEVEL Architektur-Design für dieses Sub-Task.

=== SUB-TASK ===
${subTask.key}: ${subTask.summary}
${subTask.description || ''}

=== PARENT-TASK ===
${parentTask.key}: ${parentTask.summary}
${parentTask.description || ''}

${codeSection}

=== ANGULAR ARCHITECTURE RULES ===
**WICHTIG: Diese Regeln MÜSSEN in das Architektur-Design einfließen!**

1. **Component Structure:**
   - JEDE Component: .ts, .html, .css (getrennte Files!)
   - templateUrl + styleUrl (KEINE inline templates/styles!)
   - Max 400 Zeilen - bei Überschreitung: Split in Sub-Components
   - Prüfe: Sollte Component aufgeteilt werden?

2. **Component Organization:**
   - Wiederverwendbare Components (Search, Buttons, Modals) → /shared/
   - Feature-spezifische Components → /features/[feature-name]/
   - Frage: Kann Component woanders verwendet werden?

3. **File Organization:**
   - ONE class per file
   - ONE interface per file
   - KEINE Gruppierung mehrerer Classes/Interfaces

4. **State Management (MANDATORY!):**
   - NgRx für shared state (@ngrx/store, @ngrx/effects, @ngrx/entity)
   - RxJS für reactive programming
   - Store Structure: Actions, Reducers, Effects, Selectors
   - KEINE component-level state für shared data

5. **Testing (MANDATORY!):**
   - JEDE Component braucht .spec.ts
   - JEDER Service braucht .spec.ts
   - Unit Tests + E2E Tests für kritische Flows

=== AUFGABE ===
Erstelle ein HIGH-LEVEL Architektur-Design (KEINE Implementierung!):

1. **Architektur-Pattern**: Welches Pattern passt? (Berücksichtige NgRx Store Pattern!)
2. **Komponenten-Struktur**: 
   - Welche Components benötigt? (Beachte 400-Zeilen-Regel!)
   - Welche Components sind reusable → /shared/?
   - Welche sind feature-specific?
3. **NgRx State Management**:
   - Welche State Slices?
   - Welche Actions/Effects werden benötigt?
   - Welche Selectors?
4. **Datenfluss**: Wie fließen Daten? (Component → Store → Effects → API)
5. **API-Struktur**: Welche Endpoints? Request/Response-Konzept
6. **Datenmodell-Konzept**: Welche Interfaces/Models? (Ein File pro Interface!)
7. **Testing-Strategie**: Welche Tests sind nötig? (Unit + E2E)
8. **Skalierbarkeit & Performance**: Caching? Lazy Loading?

⚠️ WICHTIG:
- KEINE Code-Implementierungen!
- KEINE konkreten Funktionen oder Services!
- NUR High-Level Architektur-Entscheidungen!
- ABER: Beachte die Angular Architecture Rules (Component Split, NgRx, Testing)!
- Fokus auf WARUM und WIE (Konzept), nicht WAS (Code)!
- Der Developer implementiert später basierend auf deinen Architektur-Vorgaben!
- MANDATORY: NgRx Store Structure definieren!
- MANDATORY: Component-Aufteilung planen (max 400 Zeilen)!

Antworte direkt mit Markdown (KEIN JSON-Wrapper!).
Halte dich kurz und prägnant - max. 2-3 Seiten!`;

    try {
      const message = await this.anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4000,
        messages: [{ role: 'user', content: prompt }]
      });

      let architecture = message.content[0].text.trim();
      
      // Remove any markdown code blocks if present
      architecture = architecture.replace(/```markdown\n?/g, '').replace(/```\n?/g, '').trim();
      
      console.log(`   ✅ Architecture created (${architecture.length} chars)`);
      return architecture;
      
    } catch (error) {
      console.error(`   ❌ Failed: ${error.message}`);
      return '# Architecture Design\n\nError creating initial design.';
    }
  }

  /**
   * Review & Improve Architecture (für Iterationen)
   */
  async reviewAndImprove(currentArchitecture, iteration, subTask, parentTask) {
    console.log(`\n${this.emoji} Iteration ${iteration}/${this.maxIterations}: Review & Improve...`);
    
    await this.sendEvent({
      type: 'work_in_progress',
      message: `Iteration ${iteration}/${this.maxIterations} for ${subTask.key}`,
      details: 'Reviewing and improving architecture design',
      activity: `🔍 Iteration ${iteration}/${this.maxIterations} - ${subTask.key}`
    });
    
    const prompt = `Du bist ein Software-Architekt. Review und verbessere das folgende HIGH-LEVEL Architektur-Design.

=== SUB-TASK CONTEXT ===
${subTask.key}: ${subTask.summary}

=== PARENT-TASK CONTEXT ===
${parentTask.key}: ${parentTask.summary}

=== AKTUELLES ARCHITEKTUR-DESIGN (Iteration ${iteration - 1}) ===
${currentArchitecture}

=== AUFGABE ===
Reviewe KRITISCH das obige HIGH-LEVEL Design und verbessere es:
1. **Pattern-Auswahl**: Ist das gewählte Pattern optimal?
2. **Komponenten**: Fehlen wichtige Komponenten? Zu granular?
3. **Datenfluss**: Ist der Datenfluss klar und effizient?
4. **API-Design**: Ist die API-Struktur RESTful/sinnvoll?
5. **Security**: Sind alle Security-Aspekte berücksichtigt?
6. **Performance**: Gibt es Performance-Bottlenecks?
7. **Skalierbarkeit**: Skaliert das Design gut?

⚠️ WICHTIG:
- KEINE Code-Implementierungen hinzufügen!
- Bleibe auf HIGH-LEVEL Architektur-Ebene!
- Fokus auf Architektur-Entscheidungen, nicht Details!

Antworte direkt mit dem verbesserten Markdown (KEIN JSON-Wrapper!).
Füge am Anfang einen kurzen Abschnitt "## 🔍 Verbesserungen in dieser Iteration" hinzu.`;

    try {
      const message = await this.anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4000,
        messages: [{ role: 'user', content: prompt }]
      });

      let improvedArchitecture = message.content[0].text.trim();
      improvedArchitecture = improvedArchitecture.replace(/```markdown\n?/g, '').replace(/```\n?/g, '').trim();
      
      // Extract improvements summary from the "Verbesserungen" section
      const improvementsMatch = improvedArchitecture.match(/##\s*🔍\s*Verbesserungen.*?\n([\s\S]*?)\n##/);
      const improvements = improvementsMatch ? improvementsMatch[1].trim() : 'Architecture verbessert';
      
      console.log(`   ✅ Improvements: ${improvements.substring(0, 100)}...`);
      
      return {
        improvements: improvements,
        architecture: improvedArchitecture
      };
      
    } catch (error) {
      console.error(`   ❌ Failed: ${error.message}`);
      return {
        improvements: 'Review failed',
        architecture: currentArchitecture
      };
    }
  }

  /**
   * Post Architecture als Kommentar im Sub-Task
   */
  async postArchitectureComment(subTask, architecture, iteration) {
    // ❌ KEIN comment_posted Event für Sub-Tasks!
    // Sub-Tasks sollten NICHT in Approval Queue landen
    // await this.sendEvent({
    //   type: 'comment_posted',
    //   message: `Posted architecture comment (iteration ${iteration}) on ${subTask.key}`,
    //   details: `Comment size: ${architecture.length} characters`,
    //   activity: `✍️ Posting comment - ${subTask.key}`
    // });
    const isInitial = iteration === 0;
    const isFinal = iteration === this.maxIterations;
    
    let comment = '';
    
    if (isInitial) {
      comment = `${this.emoji} *Architektur-Design - Initiale Version*\n\n`;
    } else if (isFinal) {
      comment = `${this.emoji} *Architektur-Design - Finale Version (nach ${this.maxIterations} Iterationen)*\n\n`;
    } else {
      comment = `${this.emoji} *Architektur-Design - Iteration ${iteration}/${this.maxIterations}*\n\n`;
    }
    
    comment += architecture;
    comment += `\n\n---\n_${isInitial ? 'Erstellt' : 'Verbessert'} am ${new Date().toISOString()}_`;
    
    await this.callMCPTool('jira', 'add_comment', {
      ticketKey: subTask.key,
      comment
    });
    
    console.log(`   ✅ Posted ${isInitial ? 'initial' : `iteration ${iteration}`} comment`);
  }

  /**
   * Dokumentiere finale Erkenntnisse im Parent-Task
   */
  async documentInParentTask(parentTask, finalArchitecture) {
    console.log(`\n${this.emoji} Documenting in parent task...`);
    
    // 1. Kommentar im Parent
    const comment = `${this.emoji} *Software-Architekt: Finale Architektur-Erkenntnisse*\n\n${finalArchitecture}\n\n---\n_Dokumentiert am ${new Date().toISOString()}_`;
    
    await this.callMCPTool('jira', 'add_comment', {
      ticketKey: parentTask.key,
      comment
    });
    
    console.log(`   ✅ Comment posted in parent`);
    
    // 2. Update Parent Description
    const currentDescription = parentTask.description || '';
    const architectureSection = `\n\n## 🏛️ Architektur-Design\n\n${finalArchitecture}`;
    
    await this.callMCPTool('jira', 'update_ticket', {
      ticketKey: parentTask.key,
      updates: {
        description: currentDescription + architectureSection
      }
    });
    
    console.log(`   ✅ Parent description updated`);
  }

  /**
   * Setze Sub-Task auf "Fertig" und prüfe ob beide Sub-Tasks fertig sind
   */
  async completeSubTask(subTask, parentTaskKey) {
    console.log(`\n${this.emoji} Completing sub-task...`);
    
    await this.callMCPTool('jira', 'update_ticket', {
      ticketKey: subTask.key,
      updates: {
        status: 'Fertig'  // Deutscher Jira-Status
      }
    });
    
    await this.sendEvent({
      type: 'subtask_completed',
      message: `Architecture sub-task ${subTask.key} completed`,
      details: JSON.stringify({
        ticketKey: subTask.key,
        iterations: this.maxIterations
      }),
      activity: `Completed ${subTask.key}`
    });
    
    console.log(`   ✅ Sub-task completed and set to Done`);
    
    // 🎯 NEU: Prüfe ob ALLE Sub-Tasks fertig sind → Reset Parent zu "To Do"
    const result = await checkAndResetParentTask(
      (toolName, params) => this.callMCPTool('jira', toolName, params),
      parentTaskKey,
      subTask.key,
      this.emoji
    );
    
    if (result.allComplete && result.parentUpdated) {
      console.log(`   🎉 All ${result.completedCount} sub-task(s) complete! Parent ${parentTaskKey} reset to "To Do"`);
      console.log(`   📋 ${result.summary}`);
      
      await this.sendEvent({
        type: 'parent_task_ready_for_implementation',
        message: `All sub-tasks complete - Parent ${parentTaskKey} ready for coding`,
        details: JSON.stringify({
          parentKey: parentTaskKey,
          completedSubTasks: result.completedCount,
          summary: result.summary
        }),
        activity: `✅ Parent ${parentTaskKey} ready for implementation`
      });
    }
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
   * Verarbeite ein Architecture Sub-Task
   */
  async processSubTask(subTask) {
    try {
      console.log(`\n${'='.repeat(60)}`);
      console.log(`${this.emoji} Processing: ${subTask.key}`);
      console.log(`${'='.repeat(60)}`);

      // 📊 Status Update: Start processing
      await this.sendEvent({
        type: 'subtask_processing_started',
        message: `Processing architecture sub-task ${subTask.key}`,
        activity: `🏛️ Architecting ${subTask.key}`
      });

      // Check ob bereits bearbeitet
      const fullSubTask = await this.callMCPTool('jira', 'get_ticket', { 
        ticketKey: subTask.key 
      });
      
      if (fullSubTask.success && fullSubTask.ticket.comments) {
        const hasArchitectComment = fullSubTask.ticket.comments.some(comment => {
          let bodyText = '';
          if (typeof comment.body === 'string') bodyText = comment.body;
          else if (comment.body?.content) bodyText = this.extractTextFromCommentADF(comment.body);
          return bodyText.includes(this.emoji) && bodyText.includes('Finale Version');
        });
        
        if (hasArchitectComment) {
          console.log(`   ⏭️  Already processed`);
          this.processedSubTasks.add(subTask.key);
          return { success: true, skipped: true };
        }
      }

      // 1. Hole Parent-Task
      await this.sendEvent({
        type: 'reading_parent_task',
        message: `Reading parent task for ${subTask.key}`,
        activity: `📝 Reading parent task for ${subTask.key}`
      });
      
      const parentTask = await this.getParentTask(fullSubTask.ticket);
      if (!parentTask) {
        console.log(`   ❌ Could not load parent task`);
        return { success: false };
      }

      // 2. Lese Code-Files
      await this.sendEvent({
        type: 'reading_code_files',
        message: `Reading code files for ${subTask.key}`,
        activity: `📁 Reading code files for ${subTask.key}`
      });
      
      const codeFiles = await this.readRelevantFiles(fullSubTask.ticket, parentTask);

      // 3. Erstelle initiale Architektur
      await this.sendEvent({
        type: 'creating_initial_design',
        message: `Creating initial architecture for ${subTask.key}`,
        activity: `🏛️ Creating initial architecture for ${subTask.key}`
      });
      let currentArchitecture = await this.createInitialArchitecture(
        fullSubTask.ticket, 
        parentTask, 
        codeFiles
      );
      
      await this.postArchitectureComment(fullSubTask.ticket, currentArchitecture, 0);

      // 4. Iterationen (3x Review & Improve)
      for (let i = 1; i <= this.maxIterations; i++) {
        await new Promise(resolve => setTimeout(resolve, 2000)); // 2s Pause zwischen Iterationen
        
        const result = await this.reviewAndImprove(
          currentArchitecture, 
          i, 
          fullSubTask.ticket, 
          parentTask
        );
        
        currentArchitecture = result.architecture;
        
        await this.postArchitectureComment(fullSubTask.ticket, currentArchitecture, i);
        
        await this.sendEvent({
          type: 'iteration_complete',
          message: `Iteration ${i}/${this.maxIterations} for ${subTask.key}`,
          details: `Improvements: ${result.improvements.substring(0, 100)}...`,
          activity: `Improving ${subTask.key}`
        });
      }

      // 5. Dokumentiere im Parent
      await this.sendEvent({
        type: 'documenting_in_parent',
        message: `Documenting architecture in parent task`,
        activity: `📝 Documenting in parent ${parentTask.key}`
      });
      
      await this.documentInParentTask(parentTask, currentArchitecture);

      // 6. Complete Sub-Task (inkl. Prüfung ob beide Sub-Tasks fertig)
      await this.sendEvent({
        type: 'completing_subtask',
        message: `Completing sub-task ${subTask.key}`,
        activity: `✅ Completing ${subTask.key}`
      });
      await this.completeSubTask(fullSubTask.ticket, parentTask.key);

      this.processedSubTasks.add(subTask.key);
      
      console.log(`\n${this.emoji} ✅ Sub-task fully processed!`);
      
      return { success: true };
      
    } catch (error) {
      console.error(`\n${this.emoji} ❌ Error: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  async run(intervalSeconds = 30) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`${this.emoji} ${this.name} started!`);
    console.log(`   Looking for architecture sub-tasks...`);
    console.log(`${'='.repeat(60)}`);

    while (true) {
      try {
        const subTasks = await this.getArchitectureSubTasks();
        
        for (const subTask of subTasks) {
          await this.processSubTask(subTask);
        }

        if (subTasks.length === 0) {
          await this.sendEvent({ 
            type: 'idle', 
            message: 'No architecture sub-tasks to process',
            activity: 'Idle - waiting for architecture work'
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
  new SoftwareArchitectAgent().run(30);
}

export default SoftwareArchitectAgent;
