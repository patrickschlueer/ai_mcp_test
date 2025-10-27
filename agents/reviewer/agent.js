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
      const prsToReview = result.pullRequests.filter(pr => {
        console.log('Found PR:', pr);
        const createdByCoder = pr.body?.includes('Created by 👨‍💻 Coder Agent');
        const notReviewed = !this.reviewedPRs.has(pr.number);
        const notApproved = !pr.body?.includes('✅ Approved by 🔍 Review Agent');
        
        return createdByCoder && notReviewed && notApproved;
      });

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
   * Review den Code
   */
  async reviewCode(pr) {
    console.log(`\n${this.emoji} Reviewing code...`);
    
    await this.sendEvent({
      type: 'reviewing',
      message: `Reviewing PR #${pr.number}`,
      details: pr.title,
      activity: `👀 Reviewing PR #${pr.number}`
    });

    // Erstelle File-Changes Context
    let changesContext = '=== CODE CHANGES ===\n\n';
    
    if (pr.files && pr.files.length > 0) {
      for (const file of pr.files) {
        changesContext += `━━━ ${file.filename} (${file.status}) ━━━\n`;
        changesContext += `Additions: ${file.additions}, Deletions: ${file.deletions}\n`;
        if (file.patch) {
          changesContext += `\n${file.patch}\n\n`;
        }
      }
    }

    const prompt = `Du bist ein Senior Code Reviewer. Reviewe diesen Pull Request.

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
- KEINE zusätzlichen npm packages
- KEINE externen Libraries
- Nur eingebaute Node.js/Angular Module

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

Reviewe den Code und gib konstruktives Feedback. Antworte mit JSON:

\`\`\`json
{
  "status": "approve" | "request_changes" | "comment",
  "summary": "Kurze Zusammenfassung des Reviews",
  "critical": ["Liste kritischer Probleme (wenn vorhanden)"],
  "major": ["Liste wichtiger Verbesserungen (wenn vorhanden)"],
  "minor": ["Liste kleinerer Anmerkungen (wenn vorhanden)"],
  "good": ["Liste positiver Punkte"],
  "recommendation": "approve" | "needs_discussion" | "needs_fixes"
}
\`\`\`

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
   * Poste Review-Kommentar im PR
   */
  async postReviewComment(pr, review, iteration = 1) {
    console.log(`\n${this.emoji} Posting review comment...`);
    
    let comment = `${this.emoji} **Code Review - Iteration ${iteration}**\n\n`;
    comment += `${review.summary}\n\n`;
    
    if (review.critical && review.critical.length > 0) {
      comment += `## 🚨 Critical Issues\n`;
      review.critical.forEach(issue => {
        comment += `- ${issue}\n`;
      });
      comment += `\n`;
    }
    
    if (review.major && review.major.length > 0) {
      comment += `## ⚠️ Major Improvements\n`;
      review.major.forEach(issue => {
        comment += `- ${issue}\n`;
      });
      comment += `\n`;
    }
    
    if (review.minor && review.minor.length > 0) {
      comment += `## ℹ️ Minor Notes\n`;
      review.minor.forEach(issue => {
        comment += `- ${issue}\n`;
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
      comment += `⚠️ **Recommendation**: Please fix critical/major issues, then I'll review again.\n`;
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
        details: review.status,
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
        details: pr.title,
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
      
      console.log(`   ✅ Jira updated`);
      
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
