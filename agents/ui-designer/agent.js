import Anthropic from '@anthropic-ai/sdk';
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

/**
 * UI Designer Agent
 * 
 * ✅ Bearbeitet UI-Design Sub-Tasks
 * ✅ Analysiert Code und erstellt UI-Design Spezifikation
 * ✅ Plant Component-Struktur im Vorfeld (welche Elemente = eigene Components)
 * ✅ Gibt Splitting-Regeln vor (400-Zeilen-Limit, /shared/ vs /features/)
 * ✅ 3 Iterationen: Selbst-Review & Verbesserung
 * ✅ Dokumentiert finale Erkenntnisse im Parent-Task
 * 
 * 🛠️ TECH STACK:
 * - Frontend: Angular (eigenes CSS, kein Material!)
 * - Backend: Node.js
 * - Datenbank: In-Memory Node.js
 * - 3rd Party Libs: KEINE (außer TPO weist es explizit an!)
 * 
 * 🏛️ COMPONENT-STRUKTUR PLANUNG:
 * Der Designer plant bereits die Component-Architektur:
 * - Identifiziert wiederverwendbare Components (→ /shared/)
 * - Plant Component-Splits für komplexe Bereiche
 * - Berücksichtigt 400-Zeilen-Regel
 * - Gibt klare Struktur für Coder Agent vor
 */

class UIDesignerAgent {
  constructor() {
    this.agentId = 'designer-001';
    this.name = process.env.AGENT_NAME || 'UI Designer Agent';
    this.emoji = process.env.AGENT_EMOJI || '🎨';
    this.jiraMcpUrl = process.env.JIRA_MCP_SERVER_URL || 'http://localhost:3001';
    this.githubMcpUrl = process.env.GITHUB_MCP_SERVER_URL || 'http://localhost:3002';
    this.eventHubUrl = process.env.EVENT_HUB_URL || 'http://localhost:3000';
    this.projectKey = process.env.JIRA_PROJECT_KEY || 'AT';
    
    this.anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY
    });
    
    this.processedSubTasks = new Set();
    this.maxIterations = 1;  // Nur 1 Iteration = Initial + 1 Review
    
    console.log(`${this.emoji} ${this.name} initialized`);
    console.log(`   Max iterations: ${this.maxIterations}`);
    
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
   * Hole alle UI-Design Sub-Tasks mit Status "To Do"
   */
  async getDesignSubTasks() {
    console.log(`\n${this.emoji} Checking for UI design sub-tasks...`);
    
    const result = await this.callMCPTool('jira', 'get_tickets', {
      status: 'To Do',
      maxResults: 10
    });

    if (!result.success) return [];

    // Filter: Nur Sub-Tasks mit Label "ui-design"
    const subTasks = result.tickets.filter(ticket => {
      const isSubTask = ticket.issueType === 'Sub-task' || ticket.issueType === 'Sub-Task';
      const hasDesignLabel = ticket.labels?.includes('ui-design') || 
                            ticket.summary?.includes('🎨') ||
                            ticket.summary?.toLowerCase().includes('ui-design');
      const notProcessed = !this.processedSubTasks.has(ticket.key);
      
      return isSubTask && hasDesignLabel && notProcessed;
    });

    console.log(`   Found ${subTasks.length} UI design sub-task(s)`);
    return subTasks;
  }

  /**
   * Lese Parent-Task Details
   */
  async getParentTask(subTask) {
    console.log(`\n${this.emoji} Reading parent task...`);
    
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
   * Lese relevante Frontend-Files
   */
  async readRelevantFiles(subTask, parentTask) {
    console.log(`\n${this.emoji} Reading relevant frontend files...`);
    
    // Extrahiere File-Liste aus Sub-Task Beschreibung
    const description = subTask.description || '';
    const fileMatches = description.match(/test-app\/[^\s\n]+\.(ts|html|css|scss)/g);
    
    const filesToRead = fileMatches || [
      'test-app/frontend/src/app/app.component.ts',
      'test-app/frontend/src/app/app.component.html',
      'test-app/frontend/src/styles.css'
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
   * Erstelle initiales UI-Design
   */
  async createInitialDesign(subTask, parentTask, codeFiles) {
    console.log(`\n${this.emoji} Creating initial UI design...`);
    
    await this.sendEvent({
      type: 'work_in_progress',
      message: `Creating initial UI design for ${subTask.key}`,
      details: `Analyzing ${codeFiles.length} code files`,
      activity: `🎨 Designing ${subTask.key}`
    });
    
    let codeSection = '';
    if (codeFiles.length > 0) {
      codeSection = '=== FRONTEND CODE FILES ===\n\n';
      for (const file of codeFiles) {
        codeSection += `━━━ ${file.path} ━━━\n${file.content}\n\n`;
      }
    }
    
    const prompt = `Du bist ein UI-Designer. Erstelle eine UI-Design Spezifikation für dieses Sub-Task.

=== SUB-TASK ===
${subTask.key}: ${subTask.summary}
${subTask.description || ''}

=== PARENT-TASK ===
${parentTask.key}: ${parentTask.summary}
${parentTask.description || ''}

${codeSection}

=== TECH STACK ===
- Frontend: Angular (Custom CSS, NO UI frameworks!)
- Component Structure: Split into .ts, .html, .css files

=== AUFGABE ===
Erstelle eine HIGH-LEVEL UI-Design Spezifikation (KEIN CODE!):

1. **UI-Anforderungen**: Was muss die UI können? Welche User-Aktionen?

2. **Component-Struktur** (KRITISCH!):
   - Welche UI-Elemente sollten eigene Components sein?
   - Gibt es wiederverwendbare Elemente? (→ /shared/)
   - Gibt es komplexe Bereiche die zu splitten sind?
   - Beispiel-Struktur:
     * MainComponent (Container)
       - HeaderComponent (wiederverwendbar → /shared/)
       - SearchBarComponent (wiederverwendbar → /shared/)
       - ResultListComponent (feature-spezifisch)
         * ResultItemComponent (sub-component)
       - FooterComponent (wiederverwendbar → /shared/)
   
   **Splitting-Regeln für Developer:**
   - Jede Component: max 400 Zeilen (sonst splitten!)
   - Wiederverwendbare UI-Elemente: eigene Components
   - Komplexe Listen/Grids: Item-Components erstellen
   - Formulare mit >5 Feldern: Section-Components
   - Modale/Dialoge/Overlays: eigene Components

3. **Wireframes (Textbeschreibung)**: Beschreibe das Layout in Prosa oder ASCII-Art
   - Keine React-Komponenten!
   - Keine TypeScript-Interfaces!
   - Nur visuelle Beschreibung mit Component-Hinweisen!

4. **Visuelles Design**: Farben, Schriftgrößen, Abstände, Schatten

5. **Interaktionen**: Was passiert bei Hover? Bei Click? User-Flows beschreiben

6. **Responsive Verhalten**: Wie ändert sich die UI auf Mobile/Tablet/Desktop?

7. **Accessibility-Konzept**: Welche ARIA-Labels? Keyboard-Navigation-Konzept?

8. **Animations-Konzept**: Welche Übergänge? Timing?

⚠️ KRITISCH - ABSOLUT KEIN CODE:
- ❌ KEINE TypeScript/JavaScript Interfaces oder Types!
- ❌ KEINE React Component-Definitionen!
- ❌ KEINE Props oder State-Definitionen!
- ❌ KEINE Code-Snippets jeglicher Art!
- ✅ NUR textuelle Beschreibungen und visuelle Konzepte!
- ✅ ABER: Gib klare Component-Struktur vor (welche Teile = eigene Components)
- ✅ Der Developer schreibt später den Code basierend auf deinem Design!

**WICHTIG für Component-Struktur:**
Denke wie ein Architekt! Identifiziere:
- Was ist wiederverwendbar? → /shared/
- Was ist zu komplex für eine Component? → Splitten!
- Welche Listen brauchen Item-Components?
- Welche Formulare brauchen Section-Components?

Antworte direkt mit Markdown (KEIN JSON-Wrapper!).
Halte dich kurz und prägnant - max. 2-3 Seiten!`;

    try {
      const message = await this.anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4000,
        messages: [{ role: 'user', content: prompt }]
      });

      let design = message.content[0].text.trim();
      design = design.replace(/```markdown\n?/g, '').replace(/```\n?/g, '').trim();
      
      console.log(`   ✅ Design created (${design.length} chars)`);
      return design;
      
    } catch (error) {
      console.error(`   ❌ Failed: ${error.message}`);
      return '# UI Design\n\nError creating initial design.';
    }
  }

  /**
   * Review & Improve Design (für Iterationen)
   */
  async reviewAndImprove(currentDesign, iteration, subTask, parentTask) {
    console.log(`\n${this.emoji} Iteration ${iteration}/${this.maxIterations}: Review & Improve...`);
    
    await this.sendEvent({
      type: 'work_in_progress',
      message: `Iteration ${iteration}/${this.maxIterations} for ${subTask.key}`,
      details: 'Reviewing and improving UI design',
      activity: `🔍 Iteration ${iteration}/${this.maxIterations} - ${subTask.key}`
    });
    
    const prompt = `Du bist ein UI-Designer. Review und verbessere das folgende UI-Design.

=== SUB-TASK CONTEXT ===
${subTask.key}: ${subTask.summary}

=== PARENT-TASK CONTEXT ===
${parentTask.key}: ${parentTask.summary}

=== AKTUELLES UI-DESIGN (Iteration ${iteration - 1}) ===
${currentDesign}

=== AUFGABE ===
Reviewe KRITISCH das obige HIGH-LEVEL UI-Design und verbessere es:

1. **Component-Struktur**: 
   - Sind alle Component-Splits sinnvoll identifiziert?
   - Sind wiederverwendbare Components als /shared/ markiert?
   - Fehlen Component-Splits für komplexe Bereiche?
   - Sind die 400-Zeilen-Regel und Splitting-Guidelines berücksichtigt?

2. **User Experience**: Ist die UX intuitiv? Klare User-Flows?

3. **Visuelles Konzept**: Ist das Design konsistent? Professionell?

4. **Accessibility**: WCAG-konform? Keyboard-Navigation klar?

5. **Responsive**: Funktioniert das Konzept auf allen Geräten?

6. **Klarheit für Developer**: 
   - Ist die Component-Hierarchie klar?
   - Sind alle Interaktionen beschrieben?
   - Ist klar, welche Components wiederverwendbar sind?

⚠️ KRITISCH - ABSOLUT KEIN CODE:
- ❌ Füge KEINE TypeScript/JavaScript Interfaces hinzu!
- ❌ Füge KEINE React Component-Definitionen hinzu!
- ❌ Füge KEINE Code-Snippets hinzu!
- ✅ Bleibe bei textuellen Beschreibungen!
- ✅ ABER: Präzisiere die Component-Struktur wenn nötig!

**BESONDERS WICHTIG:**
Stelle sicher, dass die Component-Struktur klar ist:
- Welche Bereiche = eigene Components?
- Was gehört nach /shared/?
- Wo könnten Components zu groß werden?

Antworte direkt mit dem verbesserten Markdown (KEIN JSON-Wrapper!).
Füge am Anfang einen kurzen Abschnitt "## 🔍 Verbesserungen in dieser Iteration" hinzu.`;

    try {
      const message = await this.anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4000,
        messages: [{ role: 'user', content: prompt }]
      });

      let improvedDesign = message.content[0].text.trim();
      improvedDesign = improvedDesign.replace(/```markdown\n?/g, '').replace(/```\n?/g, '').trim();
      
      // Extract improvements summary from the "Verbesserungen" section
      const improvementsMatch = improvedDesign.match(/##\s*🔍\s*Verbesserungen.*?\n([\s\S]*?)\n##/);
      const improvements = improvementsMatch ? improvementsMatch[1].trim() : 'Design verbessert';
      
      console.log(`   ✅ Improvements: ${improvements.substring(0, 100)}...`);
      
      return {
        improvements: improvements,
        design: improvedDesign
      };
      
    } catch (error) {
      console.error(`   ❌ Failed: ${error.message}`);
      return {
        improvements: 'Review failed',
        design: currentDesign
      };
    }
  }

  /**
   * Post Design als Kommentar im Sub-Task
   */
  async postDesignComment(subTask, design, iteration) {
    // ❌ KEIN comment_posted Event für Sub-Tasks!
    // Sub-Tasks sollten NICHT in Approval Queue landen
    // await this.sendEvent({
    //   type: 'comment_posted',
    //   message: `Posted UI design comment (iteration ${iteration}) on ${subTask.key}`,
    //   details: `Comment size: ${design.length} characters`,
    //   activity: `✍️ Posting comment - ${subTask.key}`
    // });
    const isInitial = iteration === 0;
    const isFinal = iteration === this.maxIterations;
    
    let comment = '';
    
    if (isInitial) {
      comment = `${this.emoji} *UI-Design Spezifikation - Initiale Version*\n\n`;
    } else if (isFinal) {
      comment = `${this.emoji} *UI-Design Spezifikation - Finale Version (nach ${this.maxIterations} Iterationen)*\n\n`;
    } else {
      comment = `${this.emoji} *UI-Design Spezifikation - Iteration ${iteration}/${this.maxIterations}*\n\n`;
    }
    
    comment += design;
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
  async documentInParentTask(parentTask, finalDesign) {
    console.log(`\n${this.emoji} Documenting in parent task...`);
    
    // 1. Kommentar im Parent
    const comment = `${this.emoji} *UI-Designer: Finale Design-Spezifikation*\n\n${finalDesign}\n\n---\n_Dokumentiert am ${new Date().toISOString()}_`;
    
    await this.callMCPTool('jira', 'add_comment', {
      ticketKey: parentTask.key,
      comment
    });
    
    console.log(`   ✅ Comment posted in parent`);
    
    // 2. Update Parent Description
    const currentDescription = parentTask.description || '';
    const designSection = `\n\n## 🎨 UI-Design Spezifikation\n\n${finalDesign}`;
    
    await this.callMCPTool('jira', 'update_ticket', {
      ticketKey: parentTask.key,
      updates: {
        description: currentDescription + designSection
      }
    });
    
    console.log(`   ✅ Parent description updated`);
  }

  /**
   * Setze Sub-Task auf "Fertig"
   */
  async completeSubTask(subTask) {
    console.log(`\n${this.emoji} Completing sub-task...`);
    
    await this.callMCPTool('jira', 'update_ticket', {
      ticketKey: subTask.key,
      updates: {
        status: 'Fertig'  // Deutscher Jira-Status
      }
    });
    
    await this.sendEvent({
      type: 'subtask_completed',
      message: `UI design sub-task ${subTask.key} completed`,
      details: JSON.stringify({
        ticketKey: subTask.key,
        iterations: this.maxIterations
      }),
      activity: `Completed ${subTask.key}`
    });
    
    console.log(`   ✅ Sub-task completed and set to Done`);
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
   * Verarbeite ein UI-Design Sub-Task
   */
  async processSubTask(subTask) {
    try {
      console.log(`\n${'='.repeat(60)}`);
      console.log(`${this.emoji} Processing: ${subTask.key}`);
      console.log(`${'='.repeat(60)}`);

      // 📊 Status Update: Start processing
      await this.sendEvent({
        type: 'subtask_processing_started',
        message: `Processing UI design sub-task ${subTask.key}`,
        activity: `🎨 Designing ${subTask.key}`
      });

      // Check ob bereits bearbeitet
      const fullSubTask = await this.callMCPTool('jira', 'get_ticket', { 
        ticketKey: subTask.key 
      });
      
      if (fullSubTask.success && fullSubTask.ticket.comments) {
        const hasDesignerComment = fullSubTask.ticket.comments.some(comment => {
          let bodyText = '';
          if (typeof comment.body === 'string') bodyText = comment.body;
          else if (comment.body?.content) bodyText = this.extractTextFromCommentADF(comment.body);
          return bodyText.includes(this.emoji) && bodyText.includes('Finale Version');
        });
        
        if (hasDesignerComment) {
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

      // 2. Lese Frontend-Files
      await this.sendEvent({
        type: 'reading_frontend_files',
        message: `Reading frontend files for ${subTask.key}`,
        activity: `📁 Reading frontend files for ${subTask.key}`
      });
      
      const codeFiles = await this.readRelevantFiles(fullSubTask.ticket, parentTask);

      // 3. Erstelle initiales Design
      await this.sendEvent({
        type: 'creating_initial_design',
        message: `Creating initial UI design for ${subTask.key}`,
        activity: `🎨 Creating initial design for ${subTask.key}`
      });
      let currentDesign = await this.createInitialDesign(
        fullSubTask.ticket, 
        parentTask, 
        codeFiles
      );
      
      await this.postDesignComment(fullSubTask.ticket, currentDesign, 0);

      // 4. Iterationen (3x Review & Improve)
      for (let i = 1; i <= this.maxIterations; i++) {
        await new Promise(resolve => setTimeout(resolve, 2000)); // 2s Pause zwischen Iterationen
        
        const result = await this.reviewAndImprove(
          currentDesign, 
          i, 
          fullSubTask.ticket, 
          parentTask
        );
        
        currentDesign = result.design;
        
        await this.postDesignComment(fullSubTask.ticket, currentDesign, i);
        
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
        message: `Documenting UI design in parent task`,
        activity: `📝 Documenting in parent ${parentTask.key}`
      });
      
      await this.documentInParentTask(parentTask, currentDesign);

      // 6. Complete Sub-Task
      await this.sendEvent({
        type: 'completing_subtask',
        message: `Completing sub-task ${subTask.key}`,
        activity: `✅ Completing ${subTask.key}`
      });
      await this.completeSubTask(fullSubTask.ticket);

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
    console.log(`   Looking for UI design sub-tasks...`);
    console.log(`${'='.repeat(60)}`);

    while (true) {
      try {
        const subTasks = await this.getDesignSubTasks();
        
        for (const subTask of subTasks) {
          await this.processSubTask(subTask);
        }

        if (subTasks.length === 0) {
          await this.sendEvent({ 
            type: 'idle', 
            message: 'No UI design sub-tasks to process',
            activity: 'Idle - waiting for design work'
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
  new UIDesignerAgent().run(30);
}

export default UIDesignerAgent;
