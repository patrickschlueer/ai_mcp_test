import { Injectable } from '@angular/core';
import { BehaviorSubject, Subject } from 'rxjs';
import { 
  Agent, 
  McpServer, 
  Event, 
  WebSocketMessage,
  InitialState,
  AgentEvent as AgentEventType,
  McpEvent,
  StatusChangeEvent
} from '../models/types';

@Injectable({
  providedIn: 'root'
})
export class EventHubService {
  private ws: WebSocket | null = null;
  private reconnectTimeout: any = null;
  private readonly WS_URL = 'ws://localhost:3000';

  // Observable streams
  public connectionStatus$ = new BehaviorSubject<'connecting' | 'connected' | 'disconnected'>('disconnected');
  public agents$ = new BehaviorSubject<Agent[]>([]);
  public mcpServers$ = new BehaviorSubject<McpServer[]>([]);
  public events$ = new BehaviorSubject<Event[]>([]);

  constructor() {}

  connect() {
    if (this.ws && (this.ws.readyState === WebSocket.CONNECTING || this.ws.readyState === WebSocket.OPEN)) {
      console.log('WebSocket already connected or connecting');
      return;
    }

    console.log('Connecting to Event Hub:', this.WS_URL);
    this.connectionStatus$.next('connecting');

    try {
      this.ws = new WebSocket(this.WS_URL);

      this.ws.onopen = () => {
        console.log('✅ WebSocket connected');
        this.connectionStatus$.next('connected');
        if (this.reconnectTimeout) {
          clearTimeout(this.reconnectTimeout);
          this.reconnectTimeout = null;
        }
      };

      this.ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          console.log('📩 WebSocket message received:', message.type);
          this.handleMessage(message);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
      };

      this.ws.onclose = () => {
        console.log('WebSocket disconnected');
        this.connectionStatus$.next('disconnected');
        this.ws = null;
        
        // Auto-reconnect after 3 seconds
        this.reconnectTimeout = setTimeout(() => {
          console.log('Attempting to reconnect...');
          this.connect();
        }, 3000);
      };

    } catch (error) {
      console.error('Error creating WebSocket:', error);
      this.connectionStatus$.next('disconnected');
    }
  }

  disconnect() {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    this.connectionStatus$.next('disconnected');
  }

  private handleMessage(message: WebSocketMessage) {
    switch (message.type) {
      case 'initial_state':
        this.handleInitialState(message as InitialState);
        break;
      case 'agent_event':
        this.handleAgentEvent(message as AgentEventType);
        break;
      case 'mcp_event':
        this.handleMcpEvent(message as McpEvent);
        break;
      case 'agent_status_change':
      case 'mcp_status_change':
        this.handleStatusChange(message as StatusChangeEvent);
        break;
      default:
        console.log('Unknown message type:', message);
    }
  }

  private handleInitialState(state: InitialState) {
    console.log('📥 Received initial state');
    console.log('   Agents:', (state.agents || []).length);
    console.log('   MCP Servers:', (state.mcpServers || []).length);
    console.log('   Events:', (state.recentEvents || []).length);
    
    this.agents$.next(state.agents || []);
    this.mcpServers$.next(state.mcpServers || []);
    this.events$.next(state.recentEvents || []);
    
    console.log('✅ Initial state applied');
  }

  private handleAgentEvent(message: AgentEventType) {
    console.log('📊 Agent event:', message.event.type, '-', message.event.message?.substring(0, 50) || '(no message)');
    
    // Update agent
    const agents = this.agents$.value;
    const index = agents.findIndex(a => a.id === message.agent.id);
    
    if (index >= 0) {
      agents[index] = message.agent;
    } else {
      agents.push(message.agent);
    }
    
    this.agents$.next([...agents]);

    // Add event (skip heartbeat)
    if (message.event.type !== 'heartbeat') {
      const events = this.events$.value;
      events.push({
        ...message.event,  // Zuerst das Event
        source: 'agent',  // 🔧 FIX: Dann source überschreiben!
        agentId: message.agent.id,  // 🔧 FIX: AgentId hinzufügen!
        agentName: message.agent.name,  // 🔧 FIX: AgentName hinzufügen!
        timestamp: message.timestamp
      });
      
      // 🔧 FIX: Größerer Buffer (500 statt 100) für mehr Event History
      if (events.length > 500) {
        events.shift();
      }
      
      console.log('   📋 Total events now:', events.length);
      console.log('   🔄 Triggering events$ subscription...');
      this.events$.next([...events]);
      console.log('   ✅ Subscription triggered!');
    } else {
      console.log('   ⏭️  Skipped heartbeat event');
    }
  }

  private handleMcpEvent(message: McpEvent) {
    console.log('📡 MCP event:', message.event.type);
    
    // Update MCP server
    const servers = this.mcpServers$.value;
    const index = servers.findIndex(s => s.id === message.server.id);
    
    if (index >= 0) {
      servers[index] = message.server;
    } else {
      servers.push(message.server);
    }
    
    this.mcpServers$.next([...servers]);

    // Add event (skip heartbeat)
    if (message.event.type !== 'heartbeat') {
      const events = this.events$.value;
      events.push({
        ...message.event,  // Zuerst das Event
        source: 'mcp',  // 🔧 FIX: Dann source überschreiben!
        serverId: message.server.id,  // 🔧 FIX: ServerId hinzufügen!
        serverName: message.server.name,  // 🔧 FIX: ServerName hinzufügen!
        timestamp: message.timestamp
      });
      
      // 🔧 FIX: Größerer Buffer (500 statt 100)
      if (events.length > 500) {
        events.shift();
      }
      
      console.log('   📋 Total events now:', events.length);
      this.events$.next([...events]);
    }
  }

  private handleStatusChange(message: StatusChangeEvent) {
    console.log('🔄 Status change:', message);
    
    if (message.type === 'agent_status_change' && message.agentId) {
      const agents = this.agents$.value;
      const agent = agents.find(a => a.id === message.agentId);
      
      if (agent) {
        agent.status = message.status as any;
        agent.lastSeen = message.timestamp;
        this.agents$.next([...agents]);
        
        // Add status change as event
        const events = this.events$.value;
        events.push({
          source: 'agent',
          agentId: message.agentId,
          agentName: agent.name,
          type: 'status_change',
          message: `Status changed to ${message.status}`,
          timestamp: message.timestamp
        });
        
        if (events.length > 500) {
          events.shift();
        }
        
        this.events$.next([...events]);
      }
    } else if (message.type === 'mcp_status_change' && message.serverId) {
      const servers = this.mcpServers$.value;
      const server = servers.find(s => s.id === message.serverId);
      
      if (server) {
        const oldStatus = server.status;
        server.status = message.status as any;
        server.lastSeen = message.timestamp;
        this.mcpServers$.next([...servers]);
        
        console.log(`✅ MCP Server ${server.name} status: ${oldStatus} → ${message.status}`);
        
        // Add status change as event
        const events = this.events$.value;
        events.push({
          source: 'mcp',
          serverId: message.serverId,
          serverName: server.name,
          type: message.status === 'offline' ? 'server_shutdown' : 'status_change',
          message: message.status === 'offline' 
            ? 'Server went offline' 
            : `Status changed to ${message.status}`,
          timestamp: message.timestamp
        });
        
        if (events.length > 500) {
          events.shift();
        }
        
        this.events$.next([...events]);
      }
    }
  }
}
