import Anthropic from '@anthropic-ai/sdk';
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Review Agent
 * 
 * ✅ Wartet auf neue Pull Requests vom Coder
 * ✅ Reviewed Code-Änderungen
 * ✅ Kommentiert im PR (nicht zu streng!)
 * ✅ Diskutiert mit Coder über Verbesserungen
 * ✅ Approved PR nach finaler Einigung
 * 
 * 🛠️ TECH STACK:
 * - Frontend: Angular (eigenes CSS, kein Material!)
 * - Backend: Node.js
 * - Datenbank: In-Memory Node.js
 * - 3rd Party Libs: KEINE (außer TPO weist es explizit an!)
 */

class ReviewAgent {
  constructor() {
    this.agentId = 'reviewer-001';
    this.name = process.env.AGENT_NAME || 'Review Agent';
    this.emoji = process.env.AGENT_EMOJI || '🔍';
    this.jiraMcpUrl = process.env.JIRA_MCP_SERVER_URL || 'http://localhost:3001';
    this.githubMcpUrl = process.env.GITHUB_MCP_SERVER_URL || 'http://localhost:3002';
    this.eventHubUrl = process.env.EVENT_HUB_URL || 'http://localhost:3000';
    
    this.anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY
    });
    
    this.reviewedPRs = new Set();
    this.maxIterations = 2; // Max 2 Review-Runden mit Coder
    
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
        enforcement: 'REJECT PR if components exceed 400 lines'
      },
      componentOrganization: {
        rule: 'Reusable components in shared folder',
        detail: 'Generic components (search, buttons, etc.) → /shared/',
        enforcement: 'REJECT if reusable component not in /shared/'
      },
      fileOrganization: {
        rule: 'One class per file, one interface per file',
        detail: 'NO multiple classes/interfaces in same file',
        enforcement: 'REJECT if multiple classes/interfaces found'
      },
      stateManagement: {
        rule: 'Use NgRx from the start',
        detail: 'RxJS + NgRx for ALL state management',
        libraries: ['@ngrx/store', '@ngrx/effects', '@ngrx/entity'],
        enforcement: 'REJECT if component-level state for shared data'
      },
      testing: {
        rule: 'EVERY file MUST have tests',
        detail: 'Unit tests (.spec.ts) + E2E tests (when applicable)',
        coverage: 'Minimum: test core functionality',
        enforcement: 'REJECT PR if files missing .spec.ts tests'
      }
    };
    
    console.log(`${this.emoji} ${this.name} initialized`);
    console.log(`   Max review iterations: ${this.maxIterations}`);
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
   * Prüfe ob PR seit letztem Review aktualisiert wurde
   */
  async hasRecentUpdates(prNumber) {
    try {
      // Hole PR Details mit Comments
      const prResult = await this.callMCPTool('github', 'get_pull_request', {
        prNumber
      });

      if (!prResult.success) return false;

      // Hole PR Comments
      // TODO: Wenn GitHub MCP Server get_pr_comments hat, hier verwenden
      // Für jetzt: Check ob "Code Updated" im letzten Update ist
      const pr = prResult.pr;
      
      // Check updated_at timestamp - wenn kürzlich aktualisiert, dann re-review
      const updatedAt = new Date(pr.updated_at);
      const now = new Date();
      const minutesSinceUpdate = (now - updatedAt) / 1000 / 60;
      
      // Wenn in letzten 5 Minuten aktualisiert, dann hat Coder wahrscheinlich Fixes gemacht
      if (minutesSinceUpdate < 5) {
        console.log(`   🔄 PR #${prNumber} was updated ${Math.round(minutesSinceUpdate)} min ago`);
        return true;
      }
      
      return false;
      
    } catch (error) {
      console.error(`   ⚠️  Failed to check updates: ${error.message}`);
      return false;
    }
  }

  /**
   * Hole alle offenen PRs die ready for review sind
   */
  async getOpenPullRequests() {
    console.log(`\n${this.emoji} Checking for open pull requests...`);
    
    try {
      const result = await this.callMCPTool('github', 'get_pull_requests', {
        state: 'open'
      });

      if (!result.success) return [];


      // Filter PRs die vom Coder erstellt wurden und noch nicht reviewed
      const prsToReview = [];
      
      for (const pr of result.pullRequests) {
        console.log('Found PR:', pr);
        
        const createdByCoder = pr.body?.includes('Created by 👨‍💻 Coder Agent') || 
                             pr.body?.includes('Updated by 👨‍💻 Coder Agent');
        const notApproved = !pr.body?.includes('✅ Approved by 🔍 Review Agent');
        
        if (!createdByCoder || !notApproved) continue;
        
        // Check ob bereits reviewed
        const alreadyReviewed = this.reviewedPRs.has(pr.number);
        
        if (alreadyReviewed) {
          // 🔥 Check ob PR seit Review aktualisiert wurde
          const hasUpdates = await this.hasRecentUpdates(pr.number);
          
          if (hasUpdates) {
            console.log(`   🔄 PR #${pr.number} has updates, will re-review`);
            this.reviewedPRs.delete(pr.number); // Reset damit wir neu reviewen
            prsToReview.push(pr);
          }
        } else {
          // Noch nie reviewed
          prsToReview.push(pr);
        }
      }

      console.log(`   Found ${prsToReview.length} PR(s) to review`);
      return prsToReview;
      
    } catch (error) {
      console.error(`   ❌ Failed to fetch PRs: ${error.message}`);
      return [];
    }
  }

  /**
   * Hole PR-Details mit Files
   */
  async getPRDetails(prNumber) {
    console.log(`\n${this.emoji} Getting PR details...`);
    
    try {
      // 1. Hole PR Basis-Details
      const prResult = await this.callMCPTool('github', 'get_pull_request', {
        prNumber
      });

      if (!prResult.success) {
        throw new Error(prResult.error || 'Failed to get PR details');
      }

      // 2. Hole PR Files (Changed Files)
      const filesResult = await this.callMCPTool('github', 'get_pull_request_files', {
        prNumber
      });

      if (!filesResult.success) {
        console.warn(`   ⚠️  Could not get PR files: ${filesResult.error}`);
      }

      // Combine PR details with files
      const fullPR = {
        ...prResult.pr,
        files: filesResult.success ? filesResult.files : []
      };

      console.log(`   ✅ PR #${prNumber}: ${fullPR.title}`);
      console.log(`   📝 ${fullPR.files.length} file(s) changed`);
      
      return fullPR;
      
    } catch (error) {
      console.error(`   ❌ Failed to get PR details: ${error.message}`);
      throw error;
    }
  }

  /**
   * Extrahiere Ticket-Key aus PR
   */
  extractTicketKey(pr) {
    const match = pr.title?.match(/\b([A-Z]+-\d+)\b/) || 
                  pr.body?.match(/\b([A-Z]+-\d+)\b/);
    return match ? match[1] : null;
  }

  /**
   * Review den Code mit EVIDENCE-BASED POLICY
   * 
   * 🎯 WICHTIG: Jedes Issue MUSS enthalten:
   * 1. Exakte Datei + Zeilennummer
   * 2. Code-Snippet das das Problem zeigt
   * 3. Konkrete Lösung wie es zu fixen ist
   */
  async reviewCode(pr) {
    console.log(`\n${this.emoji} Reviewing code with EVIDENCE-BASED POLICY...`);
    
    await this.sendEvent({
      type: 'reviewing',
      message: `Reviewing PR #${pr.number} (Evidence-Based)`,
      details: JSON.stringify({
        prNumber: pr.number,
        prTitle: pr.title,
        filesChanged: pr.files ? pr.files.length : 0,
        additions: pr.files ? pr.files.reduce((sum, f) => sum + (f.additions || 0), 0) : 0,
        deletions: pr.files ? pr.files.reduce((sum, f) => sum + (f.deletions || 0), 0) : 0
      }, null, 2),
      activity: `👀 Reviewing PR #${pr.number}`
    });

    // Erstelle File-Changes Context mit Zeilennummern
    let changesContext = '=== CODE CHANGES (with line numbers) ===\n\n';
    
    if (pr.files && pr.files.length > 0) {
      for (const file of pr.files) {
        changesContext += `━━━ FILE: ${file.filename} (${file.status}) ━━━\n`;
        changesContext += `Changes: +${file.additions} -${file.deletions}\n`;
        if (file.patch) {
          // Parse patch und füge Zeilennummern hinzu
          const lines = file.patch.split('\n');
          let currentLine = 0;
          
          for (const line of lines) {
            // Extrahiere Zeilennummer aus patch header
            const lineMatch = line.match(/@@ -(\d+),?(\d+)? \+(\d+),?(\d+)? @@/);
            if (lineMatch) {
              currentLine = parseInt(lineMatch[3]);
              changesContext += `${line}\n`;
            } else if (line.startsWith('+') && !line.startsWith('+++')) {
              changesContext += `Line ${currentLine}: ${line}\n`;
              currentLine++;
            } else if (line.startsWith('-') && !line.startsWith('---')) {
              changesContext += `${line}\n`;
            } else {
              changesContext += `Line ${currentLine}: ${line}\n`;
              currentLine++;
            }
          }
        }
        changesContext += `\n`;
      }
    }

    const prompt = `Du bist ein Senior Code Reviewer mit EVIDENCE-BASED REVIEW POLICY.

⚠️ KRITISCHE REGEL: JEDES Issue das du findest MUSS folgendes Format haben:

**Format für Issues:**
(Beispiel)
📍 File: [exakte Datei]
📏 Line: [Zeilennummer oder Zeilenbereich]
❌ Problem: [Was ist falsch]
📋 Evidence: [Code-Snippet das das Problem zeigt]
✅ Solution: [Konkrete Lösung wie es zu fixen ist]

**Beispiel GUTES Issue:**
📍 File: src/app/user/user.component.ts
📏 Line: 45-48
❌ Problem: Error handling fehlt bei API Call
📋 Evidence:
this.userService.getUser(id).subscribe(user => {
  this.user = user;
});
✅ Solution: Füge error handler hinzu:
this.userService.getUser(id).subscribe({
  next: (user) => this.user = user,
  error: (err) => console.error('Failed to load user:', err)
});

**Beispiel SCHLECHTES Issue (zu vage):**
❌ "Fehlende Error-Handling" → NICHT ERLAUBT!
❌ "Code-Stil inkonsistent" → NICHT ERLAUBT!
❌ "Performance-Probleme" → NICHT ERLAUBT!

Du bist ein Senior Code Reviewer. Reviewe diesen Pull Request.

=== PULL REQUEST ===
Title: ${pr.title}
Description:
${pr.body}

${changesContext}

=== TECH STACK CONSTRAINTS ===
⚠️ Der Code MUSS folgende Technologie-Vorgaben einhalten:

**Frontend:**
- Angular (kein React, Vue, etc.)
- Custom CSS (KEIN Angular Material, Bootstrap, Tailwind, etc.!)
- Nur eigene CSS-Styles

**Backend:**
- Node.js
- Express (falls nötig)
- KEINE zusätzlichen Frameworks

**Datenbank:**
- In-Memory Node.js (einfaches Array/Object)
- KEINE echte Datenbank

**3rd Party Libraries:**
- KEINE zusätzlichen npm packages (außer NgRx!)
- KEINE externen Libraries
- Nur eingebaute Node.js/Angular Module + NgRx

=== ANGULAR ARCHITECTURE RULES (CRITICAL!) ===

**🔴 CRITICAL - Component Structure:**
- Components MUST be split into .ts, .html, .css files
- MUST use templateUrl and styleUrl (NO inline templates/styles!)
- Components MUST NOT exceed 400 lines
- If >400 lines → MUST split into smaller components
- Prüfe: Ist die Component sinnvoll aufgeteilt?

**🔴 CRITICAL - Testing:**
- EVERY .ts file MUST have a .spec.ts test file
- Components without .spec.ts → AUTOMATIC REJECT
- Services without .spec.ts → AUTOMATIC REJECT
- Minimum: Test core functionality (not 100%, but basics)
- Check: Sind die Tests sinnvoll oder nur Dummy-Tests?

**⚠️ MAJOR - Component Organization:**
- Reusable components (search, buttons, modals) MUST be in /shared/
- Feature-specific components → /features/[feature-name]/
- Check: Könnte diese Component woanders wiederverwendet werden?

**⚠️ MAJOR - File Organization:**
- ONE class per file (NO multiple classes!)
- ONE interface per file (NO multiple interfaces!)
- Each file serves ONE purpose only
- Check: Enthält die Datei mehrere Klassen/Interfaces?

**⚠️ MAJOR - State Management:**
- MUST use NgRx for shared state (@ngrx/store, @ngrx/effects, @ngrx/entity)
- MUST use RxJS for reactive programming
- NO component-level state for shared data
- Check: Wird State Management korrekt verwendet?

=== REVIEW-RICHTLINIEN ===

Du sollst **NICHT ZU STRENG** sein! Review nach folgenden Kriterien:

**🚨 CRITICAL (MUSS behoben werden):**
- Verletzt Tech Stack Constraints (z.B. Angular Material verwendet)
- Sicherheitslücken (SQL Injection, XSS, etc.)
- Funktioniert offensichtlich nicht (Syntax-Fehler, fehlende Imports)
- Breaking Changes am bestehenden Code

**⚠️ MAJOR (sollte behoben werden):**
- Code-Stil inkonsistent
- Fehlende Error-Handling
- Performance-Probleme
- Fehlende Kommentare bei komplexer Logik

**ℹ️ MINOR (nice-to-have, diskutierbar):**
- Kleinere Verbesserungen möglich
- Alternative Ansätze
- Zusätzliche Features

**✅ GOOD (positives Feedback!):**
- Was ist gut gemacht?
- Welche Teile sind besonders clean?

=== AUFGABE ===

Reviewe den Code und gib PRÄZISES, UMSETZBARES Feedback. 

⚠️ WICHTIG: Jedes Issue MUSS das Evidence-Based Format verwenden!

Antworte mit JSON (ohne Code-Block-Markierungen):

{
  "status": "approve" | "request_changes" | "comment",
  "summary": "Kurze Zusammenfassung des Reviews",
  "critical": [
    {
      "file": "exakte/datei/path.ts",
      "line": "45-48" oder "45",
      "problem": "Was ist falsch",
      "evidence": "Code-Snippet das Problem zeigt",
      "solution": "Konkrete Lösung"
    }
  ],
  "major": [
    {
      "file": "exakte/datei/path.ts",
      "line": "23",
      "problem": "Was sollte verbessert werden",
      "evidence": "Code-Snippet",
      "solution": "Vorgeschlagene Verbesserung"
    }
  ],
  "minor": [
    {
      "file": "datei.ts",
      "line": "10",
      "problem": "Kleine Anmerkung",
      "evidence": "Code",
      "solution": "Optional: Verbesserungsvorschlag"
    }
  ],
  "good": ["Liste positiver Punkte - HIER kannst du allgemein sein"],
  "recommendation": "approve" | "needs_discussion" | "needs_fixes"
}

**KRITISCH**: 
- JEDES critical/major/minor Issue MUSS ein Objekt mit file, line, problem, evidence, solution sein!
- KEINE vagen Strings wie "Error handling fehlt" - immer KONKRET mit Datei + Zeile!
- Der Coder soll EXAKT wissen: WO, WAS, WIE fixen!

**Status:**
- "approve": Keine kritischen oder major Issues, kann approved werden
- "request_changes": Kritische oder wichtige Issues gefunden
- "comment": Nur kleinere Anmerkungen, diskutierbar

**WICHTIG**: 
- Sei konstruktiv, nicht destruktiv!
- Bei kleineren Issues: Diskussion statt strikter Ablehnung
- Fokus auf funktionale Probleme, nicht auf Stil-Präferenzen
- Anerkenne gute Arbeit explizit!`;

    try {
      const message = await this.anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4000,
        messages: [{ role: 'user', content: prompt }]
      });

      let responseText = message.content[0].text.trim();
      responseText = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      
      const review = JSON.parse(responseText);
      
      console.log(`   ✅ Review complete: ${review.status}`);
      console.log(`   📝 ${review.summary}`);
      
      return review;
      
    } catch (error) {
      console.error(`   ❌ Failed to review code: ${error.message}`);
      throw error;
    }
  }

  /**
   * Poste Review-Kommentar im PR (mit Evidence-Based Format)
   */
  async postReviewComment(pr, review, iteration = 1) {
    console.log(`\n${this.emoji} Posting review comment...`);
    
    let comment = `${this.emoji} **Code Review - Iteration ${iteration}** (Evidence-Based)\n\n`;
    comment += `${review.summary}\n\n`;
    
    // Helper function für strukturierte Issues
    const formatIssue = (issue) => {
      if (typeof issue === 'string') {
        // Fallback für alte Format
        return `- ${issue}\n`;
      }
      
      // Neues Evidence-Based Format
      let formatted = `\n**📍 File:** \`${issue.file}\`\n`;
      formatted += `**📏 Line:** ${issue.line}\n`;
      formatted += `**❌ Problem:** ${issue.problem}\n`;
      
      if (issue.evidence) {
        formatted += `**📋 Evidence:**\n\`\`\`\n${issue.evidence}\n\`\`\`\n`;
      }
      
      formatted += `**✅ Solution:** ${issue.solution}\n`;
      return formatted;
    };
    
    if (review.critical && review.critical.length > 0) {
      comment += `## 🚨 Critical Issues (${review.critical.length})\n`;
      comment += `⚠️ These MUST be fixed before approval!\n`;
      review.critical.forEach((issue, i) => {
        comment += `\n### ${i + 1}. ${typeof issue === 'object' ? issue.problem : issue}\n`;
        comment += formatIssue(issue);
      });
      comment += `\n`;
    }
    
    if (review.major && review.major.length > 0) {
      comment += `## ⚠️ Major Improvements (${review.major.length})\n`;
      comment += `These should be addressed for code quality.\n`;
      review.major.forEach((issue, i) => {
        comment += `\n### ${i + 1}. ${typeof issue === 'object' ? issue.problem : issue}\n`;
        comment += formatIssue(issue);
      });
      comment += `\n`;
    }
    
    if (review.minor && review.minor.length > 0) {
      comment += `## ℹ️ Minor Notes (${review.minor.length})\n`;
      review.minor.forEach((issue, i) => {
        comment += `\n### ${i + 1}. ${typeof issue === 'object' ? issue.problem : issue}\n`;
        comment += formatIssue(issue);
      });
      comment += `\n`;
    }
    
    if (review.good && review.good.length > 0) {
      comment += `## ✅ What I Like\n`;
      review.good.forEach(point => {
        comment += `- ${point}\n`;
      });
      comment += `\n`;
    }
    
    comment += `---\n`;
    
    if (review.recommendation === 'approve') {
      comment += `✅ **Recommendation**: Ready to merge after human approval!\n`;
    } else if (review.recommendation === 'needs_fixes') {
      comment += `⚠️ **Recommendation**: Please fix the issues above (focus on Critical first!), then I'll review again.\n`;
    } else {
      comment += `💬 **Recommendation**: Let's discuss these points, but overall looks good!\n`;
    }
    
    comment += `\n_Review by ${this.emoji} ${this.name}_`;

    try {
      await this.callMCPTool('github', 'add_pr_comment', {
        prNumber: pr.number,
        comment
      });
      
      console.log(`   ✅ Review comment posted`);
      
      await this.sendEvent({
        type: 'review_posted',
        message: `Review posted for PR #${pr.number}`,
        details: JSON.stringify({
          status: review.status,
          recommendation: review.recommendation,
          criticalIssues: review.critical ? review.critical.length : 0,
          majorIssues: review.major ? review.major.length : 0,
          minorIssues: review.minor ? review.minor.length : 0,
          summary: review.summary
        }, null, 2),
        activity: `✍️ Posted review`
      });
      
    } catch (error) {
      console.error(`   ❌ Failed to post comment: ${error.message}`);
    }
  }

  /**
   * Approve PR
   */
  async approvePR(pr) {
    console.log(`\n${this.emoji} Approving PR...`);
    
    try {
      await this.callMCPTool('github', 'approve_pull_request', {
        prNumber: pr.number
      });
      
      console.log(`   ✅ PR approved`);
      
      await this.sendEvent({
        type: 'pr_approved',
        message: `PR #${pr.number} approved`,
        details: JSON.stringify({
          prNumber: pr.number,
          prTitle: pr.title,
          prUrl: pr.url || 'N/A'
        }, null, 2),
        activity: `✅ Approved PR`
      });
      
    } catch (error) {
      console.error(`   ❌ Failed to approve PR: ${error.message}`);
    }
  }

  /**
   * Update Jira Ticket
   */
  async updateJiraTicket(ticketKey, pr, review) {
    console.log(`\n${this.emoji} Updating Jira ticket...`);
    
    let comment = `${this.emoji} *Code Review Complete!*\n\n`;
    comment += `Der Pull Request wurde reviewed:\n\n`;
    comment += `🔗 **Pull Request**: ${pr.url}\n`;
    comment += `📝 **Review Summary**: ${review.summary}\n\n`;
    
    if (review.recommendation === 'approve') {
      comment += `## ✅ Approved\n`;
      comment += `Der Code ist ready for merge! Ein menschlicher Developer kann den PR jetzt final reviewen und mergen.\n\n`;
    } else if (review.recommendation === 'needs_fixes') {
      comment += `## ⚠️ Changes Requested\n`;
      comment += `Es wurden einige Verbesserungen angefordert. Der Coder Agent wird diese umsetzen.\n\n`;
    } else {
      comment += `## 💬 Discussion\n`;
      comment += `Es gibt einige Diskussionspunkte, aber der Code ist grundsätzlich gut.\n\n`;
    }
    
    comment += `Siehe PR für Details: ${pr.url}\n\n`;
    comment += `---\n_Review erstellt am ${new Date().toISOString()}_`;

    try {
      await this.callMCPTool('jira', 'add_comment', {
        ticketKey,
        comment
      });
      
      console.log(`   ✅ Jira comment posted`);
      
      // 🔥 CRITICAL: Setze Status basierend auf Review-Ergebnis!
      if (review.recommendation === 'needs_fixes') {
        // Changes requested → Zurück zu "To Do" damit Coder es wieder aufnimmt
        await this.callMCPTool('jira', 'update_ticket', {
          ticketKey,
          updates: {
            status: 'To Do'
          }
        });
        console.log(`   🔄 Ticket status set to 'To Do' - Coder will fix issues`);
        
        await this.sendEvent({
          type: 'changes_requested',
          message: `Changes requested for ${ticketKey}`,
          details: JSON.stringify({
            ticketKey,
            prNumber: pr.number,
            prUrl: pr.url,
            reason: 'PR needs fixes',
            criticalIssues: review.critical ? review.critical.length : 0,
            majorIssues: review.major ? review.major.length : 0
          }, null, 2),
          activity: `⚠️ Changes requested for ${ticketKey}`
        });
      } else if (review.recommendation === 'needs_discussion') {
        // 🔥 NEU: Auch bei Discussion → Zurück zu "To Do" damit Coder die Punkte adressiert
        await this.callMCPTool('jira', 'update_ticket', {
          ticketKey,
          updates: {
            status: 'To Do'
          }
        });
        console.log(`   💬 Ticket status set to 'To Do' - Coder will address discussion points`);
        
        await this.sendEvent({
          type: 'discussion_requested',
          message: `Discussion points for ${ticketKey}`,
          details: JSON.stringify({
            ticketKey,
            prNumber: pr.number,
            prUrl: pr.url,
            reason: 'PR has discussion items',
            minorIssues: review.minor ? review.minor.length : 0
          }, null, 2),
          activity: `💬 Discussion for ${ticketKey}`
        });
      } else if (review.recommendation === 'approve') {
        // Approved → "Fertig" (oder ein custom "Ready to Merge" Status falls vorhanden)
        await this.callMCPTool('jira', 'update_ticket', {
          ticketKey,
          updates: {
            status: 'Fertig'
          }
        });
        console.log(`   ✅ Ticket status set to 'Fertig'`);
        
        await this.sendEvent({
          type: 'pr_approved',
          message: `PR approved for ${ticketKey}`,
          details: JSON.stringify({
            ticketKey,
            prNumber: pr.number,
            prUrl: pr.url,
            status: 'Ready to merge'
          }, null, 2),
          activity: `✅ Approved ${ticketKey}`
        });
      }
      
    } catch (error) {
      console.error(`   ❌ Failed to update Jira: ${error.message}`);
    }
  }

  /**
   * Verarbeite einen PR
   */
  async processPR(pr) {
    try {
      console.log(`\n${'='.repeat(60)}`);
      console.log(`${this.emoji} Processing PR #${pr.number}`);
      console.log(`${'='.repeat(60)}`);

      // 1. Hole vollständige PR-Details
      const fullPR = await this.getPRDetails(pr.number);

      // 2. Review den Code
      const review = await this.reviewCode(fullPR);

      // 3. Poste Review-Kommentar
      await this.postReviewComment(fullPR, review);

      // 4. Approve wenn empfohlen
      if (review.recommendation === 'approve') {
        await this.approvePR(fullPR);
      }

      // 5. Update Jira
      const ticketKey = this.extractTicketKey(fullPR);
      if (ticketKey) {
        await this.updateJiraTicket(ticketKey, fullPR, review);
      }

      this.reviewedPRs.add(pr.number);
      
      console.log(`\n${this.emoji} ✅ PR review complete!`);
      
      if (review.recommendation === 'approve') {
        console.log(`   ✅ Ready for human final review and merge`);
      } else if (review.recommendation === 'needs_fixes') {
        console.log(`   ⚠️ Waiting for Coder to fix issues...`);
      } else {
        console.log(`   💬 Discussion recommended, but overall good`);
      }
      
      return { success: true, review };
      
    } catch (error) {
      console.error(`\n${this.emoji} ❌ Error: ${error.message}`);
      
      await this.sendEvent({
        type: 'error',
        message: `Failed to review PR #${pr.number}`,
        details: error.message
      });
      
      return { success: false, error: error.message };
    }
  }

  async run(intervalSeconds = 30) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`${this.emoji} ${this.name} started!`);
    console.log(`   Looking for pull requests to review...`);
    console.log(`${'='.repeat(60)}`);

    while (true) {
      try {
        const prs = await this.getOpenPullRequests();
        
        for (const pr of prs) {
          await this.processPR(pr);
        }

        if (prs.length === 0) {
          await this.sendEvent({ 
            type: 'idle', 
            message: 'No pull requests to review',
            activity: 'Idle - waiting for PRs'
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
  new ReviewAgent().run(30);
}

export default ReviewAgent;
