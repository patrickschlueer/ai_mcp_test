export interface Agent {
  id: string;
  name: string;
  emoji: string;
  status: 'active' | 'idle' | 'offline';
  lastSeen: string;
  currentActivity: string | null;
}

export interface McpServer {
  id: string;
  name: string;
  type: string;
  status: 'online' | 'offline';
  lastSeen: string;
  port?: number;
}

export interface Event {
  source: 'agent' | 'mcp' | 'system';
  type: string;
  timestamp: string;
  agentId?: string;
  agentName?: string;
  serverId?: string;
  serverName?: string;
  emoji?: string;
  message?: string;
  details?: string;
  activity?: string;
}

export interface InitialState {
  type: 'initial_state';
  agents: Agent[];
  mcpServers: McpServer[];
  recentEvents: Event[];
}

export interface AgentEvent {
  type: 'agent_event';
  agent: Agent;
  event: Event;
  timestamp: string;
}

export interface McpEvent {
  type: 'mcp_event';
  server: McpServer;
  event: Event;
  timestamp: string;
}

export interface StatusChangeEvent {
  type: 'agent_status_change' | 'mcp_status_change';
  agentId?: string;
  serverId?: string;
  status: string;
  timestamp: string;
}

export type WebSocketMessage = InitialState | AgentEvent | McpEvent | StatusChangeEvent;
