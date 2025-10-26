import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { EventHubService } from './services/event-hub.service';
import { Agent, McpServer, Event as AgentEvent } from './models/types';

interface ApprovalQueueItem {
  ticketKey: string;
  summary: string;
  agentId: string;
  agentName: string;
  timestamp: string;
  rejected?: boolean; // 🆕 Flag wenn Ticket rejected wurde
  rejectedReason?: string; // 🆕 Grund für Rejection
  needsClarification?: boolean; // 🆕 Flag für Iterations-Prozess
  iteration?: number; // 🆕 Aktuelle Iteration
  maxIterations?: number; // 🆕 Max Iterationen
  clarificationReason?: string; // 🆕 Grund für Clarification
  analysis?: {
    storyPoints: number;
    complexity: string;
    clarity: string;
    questions: string[];
    codeInsights: string[];
    recommendation: string;
  } | undefined;
}

interface ApprovedTicketItem {
  ticketKey: string;
  summary: string;
  agentId: string;
  agentName: string;
  timestamp: string;
  storyPoints: number;
  finalized: boolean;
  description?: string; // 🆕 NEU: Beschreibung für die Anzeige
}

interface SubTaskItem {
  ticketKey: string;
  summary: string;
  status: string;
  parentKey: string;
  agentType?: 'architecture' | 'ui-design';
  created: string;
}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit, OnDestroy {
  title = 'AI Agent Control Center';
  
  agents: Agent[] = [];
  mcpServers: McpServer[] = [];
  events: AgentEvent[] = [];
  
  connectionStatus: 'connecting' | 'connected' | 'disconnected' = 'connecting';
  
  // Approval Queue (wartet auf PM Antwort)
  ticketsWaitingForApproval: ApprovalQueueItem[] = [];
  
  // 🆕 Approved Tickets (vom PM approved, Agent arbeitet daran)
  approvedTickets: ApprovedTicketItem[] = [];
  
  // 🆕 Sub-Tasks (Architekt & Designer Arbeit)
  subTasks: SubTaskItem[] = [];
  
  // Jira Config
  jiraBaseUrl = 'https://patrickschlueer.atlassian.net/browse';
  
  constructor(
    private eventHub: EventHubService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.eventHub.connectionStatus$.subscribe(status => {
      this.connectionStatus = status;
      console.log('🔌 Connection status:', status);
      this.cdr.detectChanges();
    });

    this.eventHub.agents$.subscribe(agents => {
      console.log('📊 Agents updated:', agents.length, 'agents');
      this.agents = agents;
      this.updateApprovalQueue();
      this.updateApprovedTickets();
      this.cdr.detectChanges();
    });

    this.eventHub.mcpServers$.subscribe(servers => {
      console.log('📡 MCP Servers updated:', servers.length, 'servers');
      this.mcpServers = servers;
      this.cdr.detectChanges();
    });

    this.eventHub.events$.subscribe(events => {
      console.log('\n========================================');
      console.log('🚨 events$ SUBSCRIPTION FIRED');
      console.log('========================================');
      console.log('Events count:', events.length);
      
      if (events.length > 0) {
        const lastEvent = events[events.length - 1];
        console.log('Last event:', lastEvent.source, lastEvent.type);
      }
      
      this.events = events;
      this.updateAgentEventsMap();
      this.updateApprovalQueue();
      this.updateApprovedTickets();
      this.updateSubTasks();
      this.cdr.detectChanges();
      
      console.log('✅ DONE');
      console.log('========================================\n');
    });

    this.eventHub.connect();
  }

  ngOnDestroy() {
    this.eventHub.disconnect();
  }

  // Getter für gefilterte Listen
  get activeAgents(): Agent[] {
    return this.agents.filter(a => a.status === 'active');
  }

  get onlineMcpServers(): McpServer[] {
    return this.mcpServers.filter(s => s.status === 'online');
  }

  get recentEvents(): AgentEvent[] {
    return this.events.slice(-30).reverse();
  }

  private _agentEventsMap: Map<string, AgentEvent[]> = new Map();
  
  private updateAgentEventsMap() {
    const map = new Map<string, AgentEvent[]>();
    
    console.log('   🔄 updateAgentEventsMap:', this.events.length, 'events');
    
    const agentEvents = this.events.filter(e => e.source === 'agent');
    
    agentEvents.forEach(event => {
      const agentId = event.agentId || 'unknown';
      if (!map.has(agentId)) {
        map.set(agentId, []);
      }
      map.get(agentId)!.push(event);
    });
    
    // Nur letzte 15 Events pro Agent
    map.forEach((events, agentId) => {
      map.set(agentId, events.slice(-15));
    });
    
    this._agentEventsMap = map;
  }

  /**
   * Approval Queue: Tickets die analysiert wurden und auf PM Antwort warten
   * Sortiert nach Clarity: unklar → mittel → klar
   */
  updateApprovalQueue() {
    console.log('🔍 updateApprovalQueue...');
    
    const completedTickets = new Map<string, Partial<ApprovalQueueItem>>();
    
    // Sammle zuerst alle Tickets aus 'comment_posted' Events
    this.events
      .filter(e => e.source === 'agent' && e.type === 'comment_posted')
      .forEach(event => {
        const ticketKeyMatch = event.message?.match(/\b([A-Z]+-\d+)\b/) || 
                              event.details?.match(/\b([A-Z]+-\d+)\b/);
        
        if (!ticketKeyMatch) return;
        
        const ticketKey = ticketKeyMatch[1];
        
        if (!completedTickets.has(ticketKey)) {
          const agent = this.agents.find(a => a.id === event.agentId);
          
          // 🔥 Parse die ECHTEN Analyse-Daten aus dem Event
          let analysis: ApprovalQueueItem['analysis'] = undefined;
          
          try {
            // Versuche JSON aus details zu parsen
            if (event.details) {
              const analysisData = JSON.parse(event.details);
              
              if (analysisData.storyPoints !== undefined) {
                analysis = {
                  storyPoints: analysisData.storyPoints,
                  complexity: analysisData.complexity || 'unbekannt',
                  clarity: analysisData.clarity || 'unbekannt',
                  questions: analysisData.questions || [],
                  codeInsights: analysisData.codeInsights || [],
                  recommendation: analysisData.recommendation || 'Keine Empfehlung'
                };
                
                console.log(`   📊 Parsed analysis for ${ticketKey}: SP=${analysis.storyPoints}, ${analysis.questions.length} questions`);
              }
            }
          } catch (error) {
            // Fallback: Versuche aus dem alten Format zu parsen
            const spMatch = event.details?.match(/SP:\s*(\d+)/);
            if (spMatch) {
              analysis = {
                storyPoints: parseInt(spMatch[1]),
                complexity: 'See Jira',
                clarity: 'See Jira',
                questions: ['See Jira for questions'],
                codeInsights: ['See Jira for insights'],
                recommendation: 'See Jira'
              };
            }
          }
          
          completedTickets.set(ticketKey, {
            ticketKey,
            agentId: event.agentId || 'unknown',
            agentName: agent?.name || event.agentName || 'Unknown Agent',
            timestamp: event.timestamp,
            summary: 'Click ticket for details',
            analysis
          });
        }
      });
    
    // 🆕 NEU: Füge auch Tickets aus 'ticket_needs_clarification' hinzu (falls nicht schon drin)
    this.events
      .filter(e => e.source === 'agent' && e.type === 'ticket_needs_clarification')
      .forEach(event => {
        const ticketKeyMatch = event.message?.match(/\b([A-Z]+-\d+)\b/) || 
                              event.details?.match(/\b([A-Z]+-\d+)\b/);
        
        if (!ticketKeyMatch) return;
        
        const ticketKey = ticketKeyMatch[1];
        
        // Nur hinzufügen wenn noch nicht in der Liste
        if (!completedTickets.has(ticketKey)) {
          const agent = this.agents.find(a => a.id === event.agentId);
          
          // Parse Daten aus dem Event
          let analysis: ApprovalQueueItem['analysis'] = undefined;
          
          try {
            if (event.details) {
              const data = JSON.parse(event.details);
              
              // Versuche Story Points zu finden (kann in verschiedenen Events sein)
              const allEvents = this.events.filter(e => 
                e.source === 'agent' && 
                (e.message?.includes(ticketKey) || e.details?.includes(ticketKey))
              );
              
              // Suche nach comment_posted Event für dieses Ticket
              const commentEvent = allEvents.find(e => e.type === 'comment_posted');
              if (commentEvent?.details) {
                try {
                  const commentData = JSON.parse(commentEvent.details);
                  analysis = {
                    storyPoints: commentData.storyPoints || 5,
                    complexity: commentData.complexity || 'mittel',
                    clarity: commentData.clarity || 'mittel',
                    questions: data.questions || [],
                    codeInsights: [],
                    recommendation: 'Needs clarification'
                  };
                } catch {}
              }
            }
          } catch (error) {}
          
          completedTickets.set(ticketKey, {
            ticketKey,
            agentId: event.agentId || 'unknown',
            agentName: agent?.name || event.agentName || 'Unknown Agent',
            timestamp: event.timestamp,
            summary: 'Click ticket for details',
            analysis
          });
          
          console.log(`   🔄 Added ${ticketKey} from needs_clarification event`);
        }
      });
    
    // 🔥 Markiere rejected Tickets
    const rejectedTickets = new Map<string, { reason: string, timestamp: string }>();
    
    this.events
      .filter(e => e.source === 'agent' && e.type === 'ticket_rejected')
      .forEach(event => {
        const ticketKeyMatch = event.message?.match(/\b([A-Z]+-\d+)\b/) || 
                              event.details?.match(/\b([A-Z]+-\d+)\b/);
        if (ticketKeyMatch) {
          const ticketKey = ticketKeyMatch[1];
          let reason = 'Incomplete answers';
          if (event.details) {
            const missingMatch = event.details.match(/Missing (\d+) answers/);
            if (missingMatch) {
              reason = `${missingMatch[1]} unbeantwortete Fragen`;
            }
          }
          rejectedTickets.set(ticketKey, { reason, timestamp: event.timestamp });
          console.log(`   ⚠️ ${ticketKey} was rejected: ${reason}`);
        }
      });
    
    // 🆕 NEU: Markiere "Needs Clarification" Tickets (Iterations-Prozess)
    const clarificationTickets = new Map<string, { iteration: number, maxIterations: number, reason: string, questions: string[], timestamp: string }>();
    
    this.events
      .filter(e => e.source === 'agent' && e.type === 'ticket_needs_clarification')
      .forEach(event => {
        const ticketKeyMatch = event.message?.match(/\b([A-Z]+-\d+)\b/) || 
                              event.details?.match(/\b([A-Z]+-\d+)\b/);
        if (ticketKeyMatch) {
          const ticketKey = ticketKeyMatch[1];
          let iteration = 1;
          let maxIterations = 3;
          let reason = 'Needs more information';
          let questions: string[] = [];
          
          try {
            if (event.details) {
              const data = JSON.parse(event.details);
              iteration = data.iteration || 1;
              maxIterations = data.maxIterations || 3;
              reason = data.reason || reason;
              questions = data.questions || [];
            }
          } catch (error) {
            // Fallback
          }
          
          clarificationTickets.set(ticketKey, { iteration, maxIterations, reason, questions, timestamp: event.timestamp });
          console.log(`   🔄 ${ticketKey} needs clarification (${iteration}/${maxIterations}): ${reason}`);
        }
      });
    
    // 🔥 KRITISCH: Sammle Sub-Task Keys (diese gehören NICHT in Approval Queue!)
    const subTaskKeys = new Set<string>();
    
    this.events
      .filter(e => e.source === 'agent' && e.type === 'subtask_created')
      .forEach(event => {
        const ticketKeyMatch = event.message?.match(/\b([A-Z]+-\d+)\b/);
        if (ticketKeyMatch) {
          subTaskKeys.add(ticketKeyMatch[1]);
          console.log(`   🔥 Identified sub-task: ${ticketKeyMatch[1]}`);
        }
      });
    
    // Entferne Sub-Tasks aus Approval Queue!
    subTaskKeys.forEach(key => {
      if (completedTickets.has(key)) {
        console.log(`   🚫 ${key} is a sub-task, removing from approval queue`);
        completedTickets.delete(key);
      }
    });
    
    // 🔥 Sammle finalized Tickets (nur ticket_complete, NICHT ticket_approved)
    const finalizedTicketKeys = new Set<string>();
    
    this.events
      .filter(e => e.source === 'agent' && e.type === 'ticket_complete')
      .forEach(event => {
        const ticketKeyMatch = event.message?.match(/\b([A-Z]+-\d+)\b/) || 
                              event.details?.match(/\b([A-Z]+-\d+)\b/);
        if (ticketKeyMatch) {
          finalizedTicketKeys.add(ticketKeyMatch[1]);
        }
      });
    
    // Entferne finalized Tickets IMMER (auch wenn sie rejected waren)
    finalizedTicketKeys.forEach(key => {
      if (completedTickets.has(key)) {
        console.log(`   ➠️ ${key} is finalized, removing from approval queue`);
        completedTickets.delete(key);
      }
    });
    
    // Markiere NUR noch verbleibende rejected Tickets (die NICHT finalized sind)
    rejectedTickets.forEach((info, ticketKey) => {
      if (completedTickets.has(ticketKey)) {
        const ticket = completedTickets.get(ticketKey)!;
        ticket.rejected = true;
        ticket.rejectedReason = info.reason;
        ticket.timestamp = info.timestamp;
        console.log(`   🟡 ${ticketKey} marked as rejected in queue`);
      }
    });
    
    // 🆕 NEU: Markiere "Needs Clarification" Tickets
    clarificationTickets.forEach((info, ticketKey) => {
      if (completedTickets.has(ticketKey)) {
        const ticket = completedTickets.get(ticketKey)!;
        ticket.needsClarification = true;
        ticket.iteration = info.iteration;
        ticket.maxIterations = info.maxIterations;
        ticket.clarificationReason = info.reason;
        // Update questions falls vorhanden
        if (info.questions.length > 0 && ticket.analysis) {
          ticket.analysis.questions = info.questions;
        }
        ticket.timestamp = info.timestamp;
        console.log(`   🔄 ${ticketKey} marked as needs clarification (${info.iteration}/${info.maxIterations})`);
      }
    });
    
    const oldCount = this.ticketsWaitingForApproval.length;
    
    // Sortier-Priorität: rejected & clarification zuerst, dann nach Clarity
    const clarityPriority = (clarity: string): number => {
      const c = clarity.toLowerCase();
      if (c.includes('unklar') || c.includes('unclear')) return 0;
      if (c.includes('mittel') || c.includes('medium')) return 1;
      if (c.includes('klar') || c.includes('clear')) return 2;
      return 3; // Unknown zuletzt
    };
    
    this.ticketsWaitingForApproval = Array.from(completedTickets.values())
      .filter(t => t.ticketKey)
      .map(t => t as ApprovalQueueItem)
      .sort((a, b) => {
        // Rejected Tickets zuerst!
        if (a.rejected && !b.rejected) return -1;
        if (!a.rejected && b.rejected) return 1;
        
        // 🆕 Needs Clarification Tickets als zweites!
        if (a.needsClarification && !b.needsClarification) return -1;
        if (!a.needsClarification && b.needsClarification) return 1;
        
        // Dann nach Clarity sortieren (unklar zuerst)
        const clarityA = clarityPriority(a.analysis?.clarity || 'unknown');
        const clarityB = clarityPriority(b.analysis?.clarity || 'unknown');
        
        if (clarityA !== clarityB) {
          return clarityA - clarityB;
        }
        
        // Bei gleicher Clarity, nach Timestamp (neueste zuerst)
        return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
      });
    
    console.log(`   ⏳ Approval Queue: ${oldCount} → ${this.ticketsWaitingForApproval.length} tickets`);
    const rejectedCount = this.ticketsWaitingForApproval.filter(t => t.rejected).length;
    const clarificationCount = this.ticketsWaitingForApproval.filter(t => t.needsClarification).length;
    if (rejectedCount > 0) {
      console.log(`   ⚠️ Including ${rejectedCount} rejected tickets`);
    }
    if (clarificationCount > 0) {
      console.log(`   🔄 Including ${clarificationCount} clarification tickets`);
    }
  }

  /**
   * 🆕 Approved Tickets: Tickets die finalisiert wurden
   */
  updateApprovedTickets() {
    console.log('✅ updateApprovedTickets...');
    console.log(`   Total events: ${this.events.length}`);
    
    // Debug: Zeige alle ticket_complete Events
    const ticketCompleteEvents = this.events.filter(e => e.source === 'agent' && e.type === 'ticket_complete');
    console.log(`   Found ${ticketCompleteEvents.length} ticket_complete events`);
    
    if (ticketCompleteEvents.length > 0) {
      console.log('   ticket_complete events:');
      ticketCompleteEvents.forEach(e => {
        console.log(`     - ${e.message} | details: ${e.details?.substring(0, 100)}`);
      });
    }
    
    const approved = new Map<string, Partial<ApprovedTicketItem>>();
    
    // Suche nach 'ticket_complete' Events (= finalisiert)
    this.events
      .filter(e => e.source === 'agent' && e.type === 'ticket_complete')
      .forEach(event => {
        const message = event.message?.toLowerCase() || '';
        const details = event.details?.toLowerCase() || '';
        
        console.log(`   Processing event: ${event.message}`);
        console.log(`     - rejected: ${message.includes('rejected')}`);
        console.log(`     - finalized/approved: ${message.includes('finalized') || message.includes('approved') || details.includes('finalized') || details.includes('approved')}`);
        
        // Check if this is a finalization event (not rejected)
        if (!message.includes('rejected') && 
            (message.includes('finalized') || message.includes('approved') || 
             details.includes('finalized') || details.includes('approved'))) {
          
          const ticketKeyMatch = event.message?.match(/\b([A-Z]+-\d+)\b/) || 
                                event.details?.match(/\b([A-Z]+-\d+)\b/);
          
          if (!ticketKeyMatch) {
            console.log(`     ⚠️ No ticket key found`);
            return;
          }
          
          const ticketKey = ticketKeyMatch[1];
          console.log(`     ✅ Found ticket: ${ticketKey}`);
          
          if (!approved.has(ticketKey)) {
            const agent = this.agents.find(a => a.id === event.agentId);
            
            // 🔥 Parse Beschreibung aus Event-Details (falls vorhanden)
            let description: string | undefined = undefined;
            let storyPoints = 5;
            
            try {
              if (event.details) {
                const detailsData = JSON.parse(event.details);
                storyPoints = detailsData.storyPoints || 5;
                description = detailsData.description;
                console.log(`       Parsed: SP=${storyPoints}`);
              }
            } catch (error) {
              // Fallback: Alte Methode
              const spMatch = event.details?.match(/SP:\s*(\d+)/);
              if (spMatch) {
                storyPoints = parseInt(spMatch[1]);
                console.log(`       Fallback parsed: SP=${storyPoints}`);
              }
            }
            
            approved.set(ticketKey, {
              ticketKey,
              agentId: event.agentId || 'unknown',
              agentName: agent?.name || event.agentName || 'Unknown Agent',
              timestamp: event.timestamp,
              summary: 'Finalized - Ready for Development',
              storyPoints,
              finalized: true,
              description
            });
            
            console.log(`       ➕ Added ${ticketKey} to approved tickets`);
          }
        }
      });
    
    const oldCount = this.approvedTickets.length;
    this.approvedTickets = Array.from(approved.values())
      .filter(t => t.ticketKey)
      .map(t => t as ApprovedTicketItem)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    
    console.log(`   ✅ Approved Tickets: ${oldCount} → ${this.approvedTickets.length} tickets`);
    if (this.approvedTickets.length > 0) {
      console.log('   Approved ticket keys:', this.approvedTickets.map(t => t.ticketKey).join(', '));
    }
  }

  /**
   * 🆕 Sub-Tasks: Zeige alle Sub-Tasks die von Agenten bearbeitet werden
   * Nur "To Do" und "In Arbeit" - "Fertig" Tasks werden ausgeblendet!
   */
  updateSubTasks() {
    console.log('📋 updateSubTasks...');
    
    const subTasksMap = new Map<string, Partial<SubTaskItem>>();
    
    // Suche nach 'subtask_created' Events
    this.events
      .filter(e => e.source === 'agent' && e.type === 'subtask_created')
      .forEach(event => {
        try {
          // 🔥 Parse die VOLLSTÄNDIGEN Daten aus event.details (JSON)
          if (event.details) {
            const data = JSON.parse(event.details);
            
            if (data.ticketKey && !subTasksMap.has(data.ticketKey)) {
              subTasksMap.set(data.ticketKey, {
                ticketKey: data.ticketKey,
                summary: data.summary || 'Sub-Task',
                status: data.status || 'To Do',
                parentKey: data.parentKey || 'Unknown',
                agentType: data.agentType,
                created: data.created || event.timestamp
              });
              
              console.log(`   ➕ Found sub-task: ${data.ticketKey} (${data.agentType || 'unknown'}) - ${data.summary}`);
            }
          } else {
            // Fallback: Alte Methode (falls Event kein JSON details hat)
            const ticketKeyMatch = event.message?.match(/\b([A-Z]+-\d+)\b/);
            
            if (!ticketKeyMatch) return;
            
            const ticketKey = ticketKeyMatch[1];
            
            if (!subTasksMap.has(ticketKey)) {
              let agentType: 'architecture' | 'ui-design' | undefined = undefined;
              
              if (event.details?.toLowerCase().includes('architecture') || 
                  event.message?.toLowerCase().includes('architecture')) {
                agentType = 'architecture';
              } else if (event.details?.toLowerCase().includes('design') || 
                         event.message?.toLowerCase().includes('design')) {
                agentType = 'ui-design';
              }
              
              const parentKeyMatch = event.message?.match(/for ([A-Z]+-\d+)/) || 
                                     event.details?.match(/parent.*?([A-Z]+-\d+)/);
              
              subTasksMap.set(ticketKey, {
                ticketKey,
                summary: 'Loading...',
                status: 'To Do',
                parentKey: parentKeyMatch ? parentKeyMatch[1] : 'Unknown',
                agentType,
                created: event.timestamp
              });
              
              console.log(`   ➕ Found sub-task (fallback): ${ticketKey} (${agentType || 'unknown'})`);
            }
          }
        } catch (error) {
          console.error('   ❌ Error parsing subtask event:', error);
        }
      });
    
    // 🔥 KRITISCH: Entferne Sub-Tasks die "Fertig" sind (subtask_completed Events)
    const completedSubTasks = new Set<string>();
    
    this.events
      .filter(e => e.source === 'agent' && e.type === 'subtask_completed')
      .forEach(event => {
        const ticketKeyMatch = event.message?.match(/\b([A-Z]+-\d+)\b/) || 
                              event.details?.match(/\b([A-Z]+-\d+)\b/);
        if (ticketKeyMatch) {
          completedSubTasks.add(ticketKeyMatch[1]);
          console.log(`   ✅ Sub-task completed: ${ticketKeyMatch[1]}`);
        }
      });
    
    // Entferne completed Sub-Tasks aus der Liste!
    completedSubTasks.forEach(key => {
      if (subTasksMap.has(key)) {
        console.log(`   🗑️ Removing completed sub-task from dashboard: ${key}`);
        subTasksMap.delete(key);
      }
    });
    
    const oldCount = this.subTasks.length;
    this.subTasks = Array.from(subTasksMap.values())
      .filter(t => t.ticketKey)
      .map(t => t as SubTaskItem)
      .sort((a, b) => new Date(b.created).getTime() - new Date(a.created).getTime());
    
    console.log(`   📋 Sub-Tasks: ${oldCount} → ${this.subTasks.length} tasks (${completedSubTasks.size} completed hidden)`);
    if (this.subTasks.length > 0) {
      console.log('   Sub-task keys:', this.subTasks.map(t => t.ticketKey).join(', '));
    }
  }

  getAgentEvents(agentId: string): AgentEvent[] {
    return this._agentEventsMap.get(agentId) || [];
  }

  trackByEvent(index: number, event: AgentEvent): string {
    return event.timestamp + event.type;
  }

  trackByTicket(index: number, ticket: ApprovalQueueItem | ApprovedTicketItem | SubTaskItem): string {
    return ticket.ticketKey;
  }

  getMcpEvents(): AgentEvent[] {
    return this.events
      .filter(e => e.source === 'mcp')
      .slice(-20);
  }

  getJiraTicketUrl(ticketKey: string): string {
    return `${this.jiraBaseUrl}/${ticketKey}`;
  }

  getStatusColor(status: string): string {
    switch(status) {
      case 'active': return '#10b981';
      case 'idle': return '#f59e0b';
      case 'offline': return '#ef4444';
      case 'online': return '#10b981';
      default: return '#6b7280';
    }
  }

  getStatusIcon(status: string): string {
    switch(status) {
      case 'active': return '🟢';
      case 'idle': return '🟡';
      case 'offline': return '🔴';
      case 'online': return '🟢';
      default: return '⚪';
    }
  }

  formatTime(timestamp: string): string {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('de-DE', { 
      hour: '2-digit', 
      minute: '2-digit',
      second: '2-digit'
    });
  }

  getEventIcon(event: AgentEvent): string {
    if (event.emoji) return event.emoji;
    if (event.source === 'agent') return '🤖';
    if (event.source === 'mcp') return '📡';
    return '📊';
  }

  getEventTypeColor(eventType: string): string {
    if (eventType === 'server_shutdown') return '#ef4444';
    if (eventType === 'status_change') return '#f59e0b';
    if (eventType.includes('error')) return '#ef4444';
    if (eventType.includes('complete') || eventType.includes('success') || eventType === 'comment_posted') return '#10b981';
    if (eventType.includes('warning') || eventType.includes('idle')) return '#f59e0b';
    if (eventType.includes('polling') || eventType.includes('analyzing') || eventType.includes('gathering')) return '#3b82f6';
    if (eventType.includes('documentation')) return '#8b5cf6';
    return '#6b7280';
  }

  getClarityBadgeColor(clarity: string): { bg: string, text: string, border: string } {
    const c = clarity.toLowerCase();
    
    if (c.includes('unklar') || c.includes('unclear')) {
      return {
        bg: 'rgba(239, 68, 68, 0.15)',
        text: '#ef4444',
        border: '#ef4444'
      };
    }
    
    if (c.includes('mittel') || c.includes('medium')) {
      return {
        bg: 'rgba(251, 191, 36, 0.15)',
        text: '#fbbf24',
        border: '#fbbf24'
      };
    }
    
    if (c.includes('klar') || c.includes('clear')) {
      return {
        bg: 'rgba(34, 197, 94, 0.15)',
        text: '#22c55e',
        border: '#22c55e'
      };
    }
    
    // Unknown
    return {
      bg: 'rgba(148, 163, 184, 0.15)',
      text: '#94a3b8',
      border: '#94a3b8'
    };
  }

  getComplexityBadgeColor(complexity: string): { bg: string, text: string, border: string } {
    const c = complexity.toLowerCase();
    
    if (c.includes('einfach') || c.includes('simple') || c.includes('low')) {
      return {
        bg: 'rgba(34, 197, 94, 0.15)',
        text: '#22c55e',
        border: '#22c55e'
      };
    }
    
    if (c.includes('mittel') || c.includes('medium')) {
      return {
        bg: 'rgba(251, 191, 36, 0.15)',
        text: '#fbbf24',
        border: '#fbbf24'
      };
    }
    
    if (c.includes('komplex') || c.includes('complex') || c.includes('high')) {
      return {
        bg: 'rgba(239, 68, 68, 0.15)',
        text: '#ef4444',
        border: '#ef4444'
      };
    }
    
    return {
      bg: 'rgba(148, 163, 184, 0.15)',
      text: '#94a3b8',
      border: '#94a3b8'
    };
  }

  getEventTypeName(eventType: string): string {
    const names: { [key: string]: string } = {
      'agent_started': '🚀 Started',
      'polling': '🔍 Polling',
      'tickets_found': '🎫 Tickets Found',
      'processing_ticket': '⚙️ Processing',
      'gathering_context': '📖 Reading Code',
      'context_gathered': '✅ Code Read',
      'analyzing': '🧠 Analyzing',
      'analysis_complete': '✅ Analysis Done',
      'posting_comment': '✍️ Writing Comment',
      'comment_posted': '💬 Comment Posted',
      'ticket_approved': '✅ Approved by PM',
      'ticket_complete': '✅ Completed',
      'ticket_rejected': '⚠️ Rejected',
      'ticket_skipped': '⏭️ Skipped',
      'error': '❌ Error',
      'idle': '💤 Idle',
      'loading_documentation': '📚 Loading Docs',
      'documentation_loaded': '📚 Docs Loaded',
      'server_started': '🟢 Started',
      'server_shutdown': '🔴 Shutdown',
      'status_change': '🔄 Status Changed',
      'get_tickets': '🎫 Get Tickets',
      'tickets_fetched': '✅ Tickets Fetched',
      'get_file': '📄 Read File',
      'file_read': '✅ File Read',
      'add_comment': '💬 Add Comment',
      'comment_added': '✅ Comment Added',
      'test_connection': '🔌 Testing Connection',
      'connection_success': '✅ Connected',
      'connection_error': '❌ Connection Failed'
    };
    return names[eventType] || eventType;
  }

  getTimeSince(timestamp: string): string {
    const now = new Date().getTime();
    const time = new Date(timestamp).getTime();
    const diff = Math.floor((now - time) / 1000);
    
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  }
}
