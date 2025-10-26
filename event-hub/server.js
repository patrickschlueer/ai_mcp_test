import express from 'express';
import { WebSocketServer } from 'ws';
import cors from 'cors';
import http from 'http';

/**
 * Event Hub Server
 * 
 * Zentraler WebSocket Server der:
 * 1. Events von Agents empfängt (HTTP POST)
 * 2. Events von MCP Servers empfängt (HTTP POST)
 * 3. Events per WebSocket an Dashboard verteilt
 */

const PORT = 3000;

// Express App
const app = express();
app.use(cors());
app.use(express.json());

// HTTP Server
const server = http.createServer(app);

// WebSocket Server
const wss = new WebSocketServer({ server });

// Connected Clients (Dashboard)
const clients = new Set();

// Agent Status Tracking
const agentStatus = new Map();
const mcpServerStatus = new Map();

// 🔧 FIX: Größerer Event History Buffer (500 statt 100)
const eventHistory = [];
const MAX_HISTORY = 500;

console.log('🎯 Event Hub Server starting...');

/**
 * WebSocket Connection Handler
 */
wss.on('connection', (ws) => {
  console.log('📱 Dashboard connected');
  clients.add(ws);

  // 🔧 FIX: Sende ALLE Events (nicht nur letzte 20)
  // Damit Dashboard nach Reload alle analysierten Tickets sieht
  ws.send(JSON.stringify({
    type: 'initial_state',
    agents: Array.from(agentStatus.values()),
    mcpServers: Array.from(mcpServerStatus.values()),
    recentEvents: eventHistory // Sende ALLE Events (bis zu 500)
  }));

  console.log(`   📤 Sent ${eventHistory.length} events to new dashboard client`);

  ws.on('close', () => {
    console.log('📱 Dashboard disconnected');
    clients.delete(ws);
  });

  ws.on('error', (error) => {
    console.error('WebSocket error:', error.message);
    clients.delete(ws);
  });
});

/**
 * Broadcast event to all connected clients
 */
function broadcast(event) {
  const message = JSON.stringify(event);
  console.log(`📤 Broadcasting: ${event.type}`);
  
  clients.forEach(client => {
    if (client.readyState === 1) { // OPEN
      try {
        client.send(message);
      } catch (error) {
        console.error('Error sending to client:', error.message);
      }
    }
  });
}

/**
 * Add event to history
 */
function addToHistory(event) {
  eventHistory.push({
    ...event,
    timestamp: event.timestamp || new Date().toISOString()
  });
  
  if (eventHistory.length > MAX_HISTORY) {
    eventHistory.shift();
  }
}

/**
 * Health Check
 */
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    connectedClients: clients.size,
    agents: agentStatus.size,
    mcpServers: mcpServerStatus.size,
    eventHistory: eventHistory.length,
    uptime: process.uptime()
  });
});

/**
 * POST /events/agent
 * Agents senden ihre Events hierhin
 */
app.post('/events/agent', (req, res) => {
  const event = req.body;
  
  if (!event.agentId || !event.type) {
    return res.status(400).json({ error: 'Missing agentId or type' });
  }

  // Update agent status
  if (!agentStatus.has(event.agentId)) {
    agentStatus.set(event.agentId, {
      id: event.agentId,
      name: event.agentName || event.agentId,
      emoji: event.emoji || '🤖',
      status: 'active',
      lastSeen: new Date().toISOString(),
      currentActivity: null
    });
  }

  const agent = agentStatus.get(event.agentId);
  agent.lastSeen = new Date().toISOString();
  agent.status = 'active';
  
  if (event.activity) {
    agent.currentActivity = event.activity;
  }

  // Add to history (skip heartbeat events from history)
  if (event.type !== 'heartbeat') {
    addToHistory({
      source: 'agent',
      agentId: event.agentId,
      agentName: event.agentName,
      emoji: event.emoji,
      ...event
    });
  }

  // Broadcast to dashboard
  broadcast({
    type: 'agent_event',
    agent: agent,
    event: event,
    timestamp: new Date().toISOString()
  });

  if (event.type !== 'heartbeat') {
    console.log(`${event.emoji || '🤖'} ${event.agentName}: ${event.message || event.type}`);
  }

  res.json({ success: true });
});

/**
 * POST /events/mcp
 * MCP Servers senden ihre Events hierhin
 */
app.post('/events/mcp', (req, res) => {
  const event = req.body;
  
  if (!event.serverId || !event.type) {
    return res.status(400).json({ error: 'Missing serverId or type' });
  }

  const timestamp = new Date().toISOString();
  
  // Check if this is a new server or status change
  const isNewServer = !mcpServerStatus.has(event.serverId);
  const wasOffline = mcpServerStatus.has(event.serverId) && 
                     mcpServerStatus.get(event.serverId).status === 'offline';

  // Update MCP server status - IMMER bei jedem Event (auch heartbeat!)
  if (!mcpServerStatus.has(event.serverId)) {
    mcpServerStatus.set(event.serverId, {
      id: event.serverId,
      name: event.serverName || event.serverId,
      type: event.serverType || 'unknown',
      status: 'online',
      lastSeen: timestamp,
      port: event.port
    });
  }

  const mcpServer = mcpServerStatus.get(event.serverId);
  mcpServer.lastSeen = timestamp;
  mcpServer.status = 'online';

  // Add to history (skip heartbeat events from history)
  if (event.type !== 'heartbeat') {
    addToHistory({
      source: 'mcp',
      serverId: event.serverId,
      serverName: event.serverName,
      ...event
    });
  }

  // Broadcast to dashboard
  broadcast({
    type: 'mcp_event',
    server: mcpServer,
    event: event,
    timestamp: timestamp
  });

  // WICHTIG: Wenn Server neu ist oder von offline → online wechselt,
  // sende zusätzlich eine status_change Message
  if (isNewServer || wasOffline) {
    console.log(`🟢 ${mcpServer.name} is now online`);
    
    broadcast({
      type: 'mcp_status_change',
      serverId: event.serverId,
      status: 'online',
      timestamp: timestamp
    });
  }

  if (event.type !== 'heartbeat') {
    console.log(`📡 ${event.serverName}: ${event.message || event.type}`);
  }

  res.json({ success: true });
});

/**
 * POST /mcp/shutdown
 * MCP Server kann sich explizit als offline melden
 */
app.post('/mcp/shutdown', (req, res) => {
  const { serverId, serverName } = req.body;
  
  if (!serverId) {
    return res.status(400).json({ error: 'Missing serverId' });
  }

  const timestamp = new Date().toISOString();

  if (mcpServerStatus.has(serverId)) {
    const mcpServer = mcpServerStatus.get(serverId);
    mcpServer.status = 'offline';
    mcpServer.lastSeen = timestamp;
    
    console.log(`🔴 ${mcpServer.name} is shutting down gracefully`);
    
    // Add to history
    addToHistory({
      source: 'mcp',
      serverId: serverId,
      serverName: mcpServer.name,
      type: 'server_shutdown',
      message: 'Server is shutting down',
      timestamp: timestamp
    });
    
    // Broadcast status change
    broadcast({
      type: 'mcp_status_change',
      serverId: serverId,
      status: 'offline',
      timestamp: timestamp
    });
  }
  
  res.json({ success: true });
});

/**
 * GET /agents
 * List all agents
 */
app.get('/agents', (req, res) => {
  res.json({
    agents: Array.from(agentStatus.values())
  });
});

/**
 * GET /mcp-servers
 * List all MCP servers
 */
app.get('/mcp-servers', (req, res) => {
  res.json({
    servers: Array.from(mcpServerStatus.values())
  });
});

/**
 * GET /events
 * Get recent events
 */
app.get('/events', (req, res) => {
  const limit = parseInt(req.query.limit) || 100;
  res.json({
    events: eventHistory.slice(-limit)
  });
});

/**
 * Check for stale agents/servers (haven't sent event in 90s)
 * Erhöht von 60s auf 90s um sicher zu sein dass Heartbeats ankommen
 */
setInterval(() => {
  const now = Date.now();
  const staleThreshold = 90000; // 90 seconds (3x heartbeat interval)

  agentStatus.forEach((agent, id) => {
    const lastSeen = new Date(agent.lastSeen).getTime();
    if (now - lastSeen > staleThreshold && agent.status !== 'idle') {
      console.log(`⚠️  Agent ${agent.name} marked as idle (no heartbeat for 90s)`);
      agent.status = 'idle';
      
      const timestamp = new Date().toISOString();
      
      // Add to history
      addToHistory({
        source: 'agent',
        agentId: id,
        agentName: agent.name,
        type: 'status_change',
        message: 'Agent went idle',
        timestamp: timestamp
      });
      
      // Broadcast
      broadcast({
        type: 'agent_status_change',
        agentId: id,
        status: 'idle',
        timestamp: timestamp
      });
    }
  });

  mcpServerStatus.forEach((server, id) => {
    const lastSeen = new Date(server.lastSeen).getTime();
    if (now - lastSeen > staleThreshold && server.status !== 'offline') {
      console.log(`⚠️  MCP Server ${server.name} marked as offline (no heartbeat for 90s)`);
      server.status = 'offline';
      
      const timestamp = new Date().toISOString();
      
      // Add to history
      addToHistory({
        source: 'mcp',
        serverId: id,
        serverName: server.name,
        type: 'server_shutdown',
        message: 'Server went offline (timeout)',
        timestamp: timestamp
      });
      
      // Broadcast
      broadcast({
        type: 'mcp_status_change',
        serverId: id,
        status: 'offline',
        timestamp: timestamp
      });
    }
  });
}, 10000); // Check every 10 seconds

/**
 * Start Server
 */
server.listen(PORT, () => {
  console.log('='.repeat(60));
  console.log('🎯 Event Hub Server Started');
  console.log('='.repeat(60));
  console.log(`HTTP API:      http://localhost:${PORT}`);
  console.log(`WebSocket:     ws://localhost:${PORT}`);
  console.log(`Health Check:  http://localhost:${PORT}/health`);
  console.log(`Event Buffer:  ${MAX_HISTORY} events`);
  console.log(`Stale Timeout: 90 seconds (heartbeat should be < 30s)`);
  console.log('='.repeat(60));
  console.log('\nWaiting for agents and MCP servers to connect...\n');
});
