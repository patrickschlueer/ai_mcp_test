import Anthropic from '@anthropic-ai/sdk';
import axios from 'axios';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Import Agent Workers
import TechnicalProductOwnerAgent from '../agents/technical-product-owner/agent.js';
import SoftwareArchitectAgent from '../agents/software-architect/agent.js';
import UIDesignerAgent from '../agents/ui-designer/agent.js';
import CoderAgent from '../agents/coder/agent.js';
import ReviewAgent from '../agents/reviewer/agent.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * 🎯 AGENT ORCHESTRATOR
 * 
 * Koordiniert alle Agenten zentral:
 * - Tech PO Agent
 * - Software Architect Agent  
 * - UI Designer Agent
 * - Coder Agent
 * - Review Agent
 * 
 * Features:
 * - Ein Prozess für alle Agenten
 * - Gemeinsame MCP Connection Pools
 * - Task Queue Management
 * - Zentrales Event Management
 * - Agent Health Monitoring
 */

class AgentOrchestrator {
  constructor() {
    this.orchestratorId = 'orchestrator-001';
    this.name = 'Agent Orchestrator';
    this.emoji = '🎭';
    
    // Config
    this.jiraMcpUrl = process.env.JIRA_MCP_SERVER_URL || 'http://localhost:3001';
    this.githubMcpUrl = process.env.GITHUB_MCP_SERVER_URL || 'http://localhost:3002';
    this.eventHubUrl = process.env.EVENT_HUB_URL || 'http://localhost:3000';
    this.projectKey = process.env.JIRA_PROJECT_KEY || 'AT';
    
    // Agents
    this.agents = new Map();
    this.agentStatus = new Map();
    
    // Task Queue
    this.taskQueue = [];
    this.runningTasks = new Map();
    
    // Timings
    this.pollingInterval = parseInt(process.env.POLLING_INTERVAL || '30') * 1000; // 30s default
    
    console.log(`\n${'='.repeat(60)}`);
    console.log(`${this.emoji} ${this.name} initialized`);
    console.log(`   Polling interval: ${this.pollingInterval / 1000}s`);
    console.log(`${'='.repeat(60)}`);
  }

  /**
   * Initialisiere alle Agenten
   */
  async initializeAgents() {
    console.log(`\n${this.emoji} Initializing agents...`);
    
    try {
      // 1. Technical Product Owner Agent
      console.log(`\n   🎯 Initializing Tech PO Agent...`);
      const techPO = new TechnicalProductOwnerAgent();
      this.agents.set('tech-po', techPO);
      this.agentStatus.set('tech-po', {
        name: 'Technical Product Owner',
        emoji: '🎯',
        status: 'idle',
        lastActive: new Date().toISOString(),
        tasksProcessed: 0
      });
      console.log(`   ✅ Tech PO Agent ready`);
      
      // 2. Software Architect Agent
      console.log(`\n   🏛️ Initializing Architect Agent...`);
      const architect = new SoftwareArchitectAgent();
      this.agents.set('architect', architect);
      this.agentStatus.set('architect', {
        name: 'Software Architect',
        emoji: '🏛️',
        status: 'idle',
        lastActive: new Date().toISOString(),
        tasksProcessed: 0
      });
      console.log(`   ✅ Architect Agent ready`);
      
      // 3. UI Designer Agent
      console.log(`\n   🎨 Initializing Designer Agent...`);
      const designer = new UIDesignerAgent();
      this.agents.set('designer', designer);
      this.agentStatus.set('designer', {
        name: 'UI Designer',
        emoji: '🎨',
        status: 'idle',
        lastActive: new Date().toISOString(),
        tasksProcessed: 0
      });
      console.log(`   ✅ Designer Agent ready`);
      
      // 4. Coder Agent
      console.log(`\n   👨‍💻 Initializing Coder Agent...`);
      const coder = new CoderAgent();
      this.agents.set('coder', coder);
      this.agentStatus.set('coder', {
        name: 'Coder',
        emoji: '👨‍💻',
        status: 'idle',
        lastActive: new Date().toISOString(),
        tasksProcessed: 0
      });
      console.log(`   ✅ Coder Agent ready`);
      
      // 5. Review Agent
      console.log(`\n   🔍 Initializing Review Agent...`);
      const reviewer = new ReviewAgent();
      this.agents.set('reviewer', reviewer);
      this.agentStatus.set('reviewer', {
        name: 'Review Agent',
        emoji: '🔍',
        status: 'idle',
        lastActive: new Date().toISOString(),
        tasksProcessed: 0
      });
      console.log(`   ✅ Review Agent ready`);
      
      console.log(`\n${this.emoji} ✅ All ${this.agents.size} agents initialized!`);
      
    } catch (error) {
      console.error(`${this.emoji} ❌ Error initializing agents:`, error.message);
      throw error;
    }
  }

  /**
   * Sende Event an Event Hub
   */
  async sendEvent(eventData) {
    try {
      await axios.post(`${this.eventHubUrl}/events/agent`, {
        agentId: this.orchestratorId,
        agentName: this.name,
        emoji: this.emoji,
        timestamp: new Date().toISOString(),
        ...eventData
      });
    } catch (error) {
      // Silent fail
    }
  }

  /**
   * Update Agent Status
   */
  updateAgentStatus(agentKey, status, details = {}) {
    const agentStat = this.agentStatus.get(agentKey);
    if (agentStat) {
      agentStat.status = status;
      agentStat.lastActive = new Date().toISOString();
      if (details.tasksProcessed) {
        agentStat.tasksProcessed += details.tasksProcessed;
      }
      this.agentStatus.set(agentKey, agentStat);
    }
  }

  /**
   * Haupt-Loop: Coordination Cycle
   */
  async coordinationCycle() {
    console.log(`\n${this.emoji} ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`${this.emoji} Coordination Cycle @ ${new Date().toLocaleTimeString()}`);
    console.log(`${this.emoji} ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

    try {
      // 1. Tech PO Agent: Check for "To Do" tickets
      await this.runTechPOCycle();
      
      // 2. Tech PO Agent: Check for "Approved" tickets
      await this.runTechPOApprovedCycle();
      
      // 3. 🚀 PARALLEL: Architect & Designer Agents
      console.log(`\n${this.emoji} Running Architect & Designer in parallel...`);
      await Promise.all([
        this.runArchitectCycle(),
        this.runDesignerCycle()
      ]);
      
      // 4. Coder Agent: Process ready tickets
      await this.runCoderCycle();
      
      // 5. Review Agent: Review PRs
      await this.runReviewCycle();
      
      // 6. Status Summary
      this.printStatusSummary();
      
    } catch (error) {
      console.error(`${this.emoji} ❌ Error in coordination cycle:`, error.message);
    }
  }

  /**
   * Tech PO: Process "To Do" tickets
   */
  async runTechPOCycle() {
    console.log(`\n🎯 Tech PO: Checking for "To Do" tickets...`);
    const agent = this.agents.get('tech-po');
    
    try {
      this.updateAgentStatus('tech-po', 'active');
      
      const newTickets = await agent.getNewTickets();
      
      if (newTickets.length > 0) {
        console.log(`   Found ${newTickets.length} ticket(s) to analyze`);
        
        for (const ticket of newTickets) {
          await agent.processTicket(ticket);
          this.updateAgentStatus('tech-po', 'active', { tasksProcessed: 1 });
        }
      } else {
        console.log(`   No new tickets`);
      }
      
      this.updateAgentStatus('tech-po', 'idle');
      
    } catch (error) {
      console.error(`   ❌ Error:`, error.message);
      this.updateAgentStatus('tech-po', 'error');
    }
  }

  /**
   * Tech PO: Process "Approved" tickets
   */
  async runTechPOApprovedCycle() {
    console.log(`\n🎯 Tech PO: Checking for "Approved" tickets...`);
    const agent = this.agents.get('tech-po');
    
    try {
      this.updateAgentStatus('tech-po', 'active');
      
      const approvedTickets = await agent.getApprovedTickets();
      
      if (approvedTickets.length > 0) {
        console.log(`   Found ${approvedTickets.length} approved ticket(s) to check`);
        
        for (const ticket of approvedTickets) {
          await agent.processApprovedTicket(ticket);
          this.updateAgentStatus('tech-po', 'active', { tasksProcessed: 1 });
        }
      } else {
        console.log(`   No approved tickets`);
      }
      
      this.updateAgentStatus('tech-po', 'idle');
      
    } catch (error) {
      console.error(`   ❌ Error:`, error.message);
      this.updateAgentStatus('tech-po', 'error');
    }
  }

  /**
   * Architect: Process architecture sub-tasks
   */
  async runArchitectCycle() {
    console.log(`\n🏛️ Architect: Checking for architecture sub-tasks...`);
    const agent = this.agents.get('architect');
    
    try {
      this.updateAgentStatus('architect', 'active');
      
      const subTasks = await agent.getArchitectureSubTasks();
      
      if (subTasks.length > 0) {
        console.log(`   Found ${subTasks.length} architecture sub-task(s)`);
        
        for (const subTask of subTasks) {
          await agent.processSubTask(subTask);
          this.updateAgentStatus('architect', 'active', { tasksProcessed: 1 });
        }
      } else {
        console.log(`   No architecture sub-tasks`);
      }
      
      this.updateAgentStatus('architect', 'idle');
      
    } catch (error) {
      console.error(`   ❌ Error:`, error.message);
      this.updateAgentStatus('architect', 'error');
    }
  }

  /**
   * Designer: Process design sub-tasks
   */
  async runDesignerCycle() {
    console.log(`\n🎨 Designer: Checking for design sub-tasks...`);
    const agent = this.agents.get('designer');
    
    try {
      this.updateAgentStatus('designer', 'active');
      
      const subTasks = await agent.getDesignSubTasks();
      
      if (subTasks.length > 0) {
        console.log(`   Found ${subTasks.length} design sub-task(s)`);
        
        for (const subTask of subTasks) {
          await agent.processSubTask(subTask);
          this.updateAgentStatus('designer', 'active', { tasksProcessed: 1 });
        }
      } else {
        console.log(`   No design sub-tasks`);
      }
      
      this.updateAgentStatus('designer', 'idle');
      
    } catch (error) {
      console.error(`   ❌ Error:`, error.message);
      this.updateAgentStatus('designer', 'error');
    }
  }

  /**
   * Coder: Process ready tickets
   */
  async runCoderCycle() {
    console.log(`\n👨‍💻 Coder: Checking for ready tickets...`);
    const agent = this.agents.get('coder');
    
    try {
      this.updateAgentStatus('coder', 'active');
      
      const tickets = await agent.getReadyForDevelopmentTickets();
      
      if (tickets.length > 0) {
        console.log(`   Found ${tickets.length} ready ticket(s)`);
        
        for (const ticket of tickets) {
          await agent.processTicket(ticket);
          this.updateAgentStatus('coder', 'active', { tasksProcessed: 1 });
        }
      } else {
        console.log(`   No ready tickets`);
      }
      
      this.updateAgentStatus('coder', 'idle');
      
    } catch (error) {
      console.error(`   ❌ Error:`, error.message);
      this.updateAgentStatus('coder', 'error');
    }
  }

  /**
   * Review: Process pull requests
   */
  async runReviewCycle() {
    console.log(`\n🔍 Review: Checking for open PRs...`);
    const agent = this.agents.get('reviewer');
    
    try {
      this.updateAgentStatus('reviewer', 'active');
      
      const prs = await agent.getOpenPullRequests();
      
      if (prs.length > 0) {
        console.log(`   Found ${prs.length} PR(s) to review`);
        
        for (const pr of prs) {
          await agent.processPR(pr);
          this.updateAgentStatus('reviewer', 'active', { tasksProcessed: 1 });
        }
      } else {
        console.log(`   No open PRs`);
      }
      
      this.updateAgentStatus('reviewer', 'idle');
      
    } catch (error) {
      console.error(`   ❌ Error:`, error.message);
      this.updateAgentStatus('reviewer', 'error');
    }
  }

  /**
   * Print Status Summary
   */
  printStatusSummary() {
    console.log(`\n${this.emoji} ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`${this.emoji} Agent Status Summary:`);
    console.log(`${this.emoji} ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    
    for (const [key, status] of this.agentStatus.entries()) {
      const statusIcon = status.status === 'idle' ? '💤' : 
                        status.status === 'active' ? '⚡' : 
                        status.status === 'error' ? '❌' : '❓';
      
      console.log(`   ${status.emoji} ${status.name}`);
      console.log(`      Status: ${statusIcon} ${status.status}`);
      console.log(`      Tasks Processed: ${status.tasksProcessed}`);
      console.log(`      Last Active: ${new Date(status.lastActive).toLocaleTimeString()}`);
    }
    
    console.log(`${this.emoji} ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  }

  /**
   * Main Run Loop
   */
  async run() {
    console.log(`\n${this.emoji} Starting Agent Orchestrator...`);
    
    // Initialize agents
    await this.initializeAgents();
    
    // Send startup event
    await this.sendEvent({
      type: 'orchestrator_started',
      message: 'Agent Orchestrator started with all agents',
      details: `Managing ${this.agents.size} agents`,
      activity: 'Orchestrating agents'
    });
    
    console.log(`\n${this.emoji} ✅ Orchestrator fully initialized!`);
    console.log(`${this.emoji} Starting coordination loop every ${this.pollingInterval / 1000}s...`);
    
    // Main loop
    while (true) {
      try {
        await this.coordinationCycle();
        
        console.log(`\n${this.emoji} Sleeping for ${this.pollingInterval / 1000}s...`);
        await new Promise(resolve => setTimeout(resolve, this.pollingInterval));
        
      } catch (error) {
        console.error(`\n${this.emoji} ❌ Fatal error:`, error.message);
        console.log(`${this.emoji} Retrying in ${this.pollingInterval / 1000}s...`);
        await new Promise(resolve => setTimeout(resolve, this.pollingInterval));
      }
    }
  }
}

// Start orchestrator
const orchestrator = new AgentOrchestrator();
orchestrator.run().catch(error => {
  console.error('💥 Orchestrator crashed:', error);
  process.exit(1);
});

export default AgentOrchestrator;
