import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import axios from 'axios';
import AtlassianClient from './atlassian-client.js';

dotenv.config();

const app = express();
const PORT = process.env.MCP_PORT || 3001;
const SERVER_ID = 'jira-mcp-001';
const SERVER_NAME = process.env.SERVER_NAME || 'Jira/Confluence MCP';
const EVENT_HUB_URL = process.env.EVENT_HUB_URL || 'http://localhost:3000';

// Middleware
app.use(cors());
app.use(express.json());

// Atlassian Client initialisieren
const atlassian = new AtlassianClient();

/**
 * Event an Event Hub senden
 */
async function sendEvent(eventData) {
  try {
    await axios.post(`${EVENT_HUB_URL}/events/mcp`, {
      serverId: SERVER_ID,
      serverName: SERVER_NAME,
      serverType: 'jira-confluence',
      port: PORT,
      timestamp: new Date().toISOString(),
      ...eventData
    }, { timeout: 1000 }); // 1 second timeout
  } catch (error) {
    // Silent fail - Event Hub Fehler nicht kritisch
  }
}

/**
 * Shutdown Hook - meldet Server explizit als offline
 */
async function shutdown() {
  console.log('\n⚠️  Shutting down Jira/Confluence MCP Server...');
  try {
    await axios.post(`${EVENT_HUB_URL}/mcp/shutdown`, {
      serverId: SERVER_ID,
      serverName: SERVER_NAME
    }, { timeout: 1000 });
  } catch (error) {
    // Silent fail
  }
  process.exit(0);
}

// Shutdown Hooks registrieren
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
process.on('SIGHUP', shutdown);

/**
 * HEARTBEAT - Sende alle 25 Sekunden ein "I'm alive" Event
 * (weniger als 30s damit es sicher vor dem 90s Timeout ankommt)
 */
setInterval(async () => {
  await sendEvent({
    type: 'heartbeat',
    message: 'Server is online'
  });
}, 25000); // Alle 25 Sekunden

/**
 * MCP Server für Jira/Confluence - WITH EVENT HUB INTEGRATION
 */

// Health Check
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    service: 'Jira/Confluence MCP Server',
    timestamp: new Date().toISOString()
  });
});

// Test: Verbindung zu Jira/Confluence
app.get('/test-connection', async (req, res) => {
  console.log('[MCP] Testing Atlassian connection...');
  await sendEvent({
    type: 'test_connection',
    message: 'Testing Atlassian connection'
  });
  
  const result = await atlassian.testConnection();
  
  if (result.success) {
    await sendEvent({
      type: 'connection_success',
      message: `Connected to Atlassian as ${result.email}`
    });
    res.json({
      success: true,
      message: 'Connection successful',
      user: result.user,
      email: result.email
    });
  } else {
    await sendEvent({
      type: 'connection_error',
      message: `Connection failed: ${result.error}`
    });
    res.status(500).json({
      success: false,
      message: 'Connection failed',
      error: result.error
    });
  }
});

// ============================================
// JIRA TOOLS
// ============================================

app.post('/tools/get_tickets', async (req, res) => {
  try {
    console.log('[MCP Tool] get_tickets called');
    const { status, assignee, maxResults } = req.body;
    
    await sendEvent({
      type: 'get_tickets',
      message: `Fetching tickets (status: ${status || 'all'})`
    });
    
    const result = await atlassian.getTickets({ status, assignee, maxResults });
    
    if (result.success) {
      await sendEvent({
        type: 'tickets_fetched',
        message: `Fetched ${result.tickets.length} tickets`
      });
    }
    
    res.json(result);
  } catch (error) {
    console.error('[MCP Tool] Error in get_tickets:', error);
    await sendEvent({
      type: 'error',
      message: `Error fetching tickets: ${error.message}`
    });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.post('/tools/get_ticket', async (req, res) => {
  try {
    console.log('[MCP Tool] get_ticket called');
    const { ticketKey } = req.body;
    
    if (!ticketKey) {
      return res.status(400).json({
        success: false,
        error: 'ticketKey is required'
      });
    }
    
    await sendEvent({
      type: 'get_ticket',
      message: `Fetching ticket ${ticketKey}`
    });
    
    const result = await atlassian.getTicket(ticketKey);
    
    if (result.success) {
      await sendEvent({
        type: 'ticket_fetched',
        message: `Fetched ticket ${ticketKey}`
      });
    }
    
    res.json(result);
  } catch (error) {
    console.error('[MCP Tool] Error in get_ticket:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.post('/tools/update_ticket', async (req, res) => {
  try {
    console.log('[MCP Tool] update_ticket called');
    const { ticketKey, updates } = req.body;
    
    if (!ticketKey) {
      return res.status(400).json({
        success: false,
        error: 'ticketKey is required'
      });
    }
    
    await sendEvent({
      type: 'update_ticket',
      message: `Updating ticket ${ticketKey}`
    });
    
    const result = await atlassian.updateTicket(ticketKey, updates);
    
    if (result.success) {
      await sendEvent({
        type: 'ticket_updated',
        message: `Updated ticket ${ticketKey}`
      });
    }
    
    res.json(result);
  } catch (error) {
    console.error('[MCP Tool] Error in update_ticket:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.post('/tools/add_comment', async (req, res) => {
  try {
    console.log('[MCP Tool] add_comment called');
    const { ticketKey, comment } = req.body;
    
    if (!ticketKey || !comment) {
      return res.status(400).json({
        success: false,
        error: 'ticketKey and comment are required'
      });
    }
    
    await sendEvent({
      type: 'add_comment',
      message: `Adding comment to ${ticketKey}`
    });
    
    const result = await atlassian.addComment(ticketKey, comment);
    
    if (result.success) {
      await sendEvent({
        type: 'comment_added',
        message: `Added comment to ${ticketKey}`
      });
    }
    
    res.json(result);
  } catch (error) {
    console.error('[MCP Tool] Error in add_comment:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.post('/tools/create_subtask', async (req, res) => {
  try {
    console.log('[MCP Tool] create_subtask called');
    const { parentKey, summary, description, labels } = req.body;
    
    if (!parentKey || !summary) {
      return res.status(400).json({
        success: false,
        error: 'parentKey and summary are required'
      });
    }
    
    await sendEvent({
      type: 'create_subtask',
      message: `Creating sub-task for ${parentKey}`
    });
    
    const result = await atlassian.createSubTask(parentKey, summary, description, labels);
    
    if (result.success) {
      await sendEvent({
        type: 'subtask_created',
        message: `Created sub-task ${result.key} for ${parentKey}`
      });
    }
    
    res.json(result);
  } catch (error) {
    console.error('[MCP Tool] Error in create_subtask:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.post('/tools/update_confluence_page', async (req, res) => {
  try {
    console.log('[MCP Tool] update_confluence_page called');
    const { title, content, spaceKey } = req.body;
    
    if (!title || !content) {
      return res.status(400).json({
        success: false,
        error: 'title and content are required'
      });
    }
    
    await sendEvent({
      type: 'update_confluence',
      message: `Updating Confluence page: ${title}`
    });
    
    const result = await atlassian.updateConfluencePage(title, content, spaceKey);
    
    if (result.success) {
      await sendEvent({
        type: 'confluence_updated',
        message: `Updated Confluence page: ${title}`
      });
    }
    
    res.json(result);
  } catch (error) {
    console.error('[MCP Tool] Error in update_confluence_page:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.get('/tools', (req, res) => {
  res.json({
    tools: [
      {
        name: 'get_tickets',
        description: 'Get all Jira tickets with optional filters',
        parameters: {
          status: { type: 'string', optional: true },
          assignee: { type: 'string', optional: true },
          maxResults: { type: 'number', optional: true }
        },
        endpoint: '/tools/get_tickets'
      },
      {
        name: 'get_ticket',
        description: 'Get a single Jira ticket by key',
        parameters: {
          ticketKey: { type: 'string', required: true }
        },
        endpoint: '/tools/get_ticket'
      },
      {
        name: 'update_ticket',
        description: 'Update a Jira ticket',
        parameters: {
          ticketKey: { type: 'string', required: true },
          updates: { type: 'object', required: true }
        },
        endpoint: '/tools/update_ticket'
      },
      {
        name: 'add_comment',
        description: 'Add a comment to a Jira ticket',
        parameters: {
          ticketKey: { type: 'string', required: true },
          comment: { type: 'string', required: true }
        },
        endpoint: '/tools/add_comment'
      },
      {
        name: 'create_subtask',
        description: 'Create a sub-task for a Jira ticket',
        parameters: {
          parentKey: { type: 'string', required: true },
          summary: { type: 'string', required: true },
          description: { type: 'string', optional: true },
          labels: { type: 'array', optional: true }
        },
        endpoint: '/tools/create_subtask'
      },
      {
        name: 'update_confluence_page',
        description: 'Create or update a Confluence page',
        parameters: {
          title: { type: 'string', required: true },
          content: { type: 'string', required: true },
          spaceKey: { type: 'string', optional: true }
        },
        endpoint: '/tools/update_confluence_page'
      }
    ]
  });
});

app.use((err, req, res, next) => {
  console.error('[MCP] Error:', err);
  res.status(500).json({
    success: false,
    error: err.message
  });
});

app.listen(PORT, async () => {
  console.log('='.repeat(60));
  console.log('🚀 Jira/Confluence MCP Server started!');
  console.log(`📍 Server running on: http://localhost:${PORT}`);
  console.log(`🏥 Health check: http://localhost:${PORT}/health`);
  console.log(`📊 Event Hub: ${EVENT_HUB_URL}`);
  console.log(`⏱️  Heartbeat: every 25s`);
  console.log(`💡 Press Ctrl+C to shutdown gracefully`);
  console.log('='.repeat(60));
  
  await sendEvent({
    type: 'server_started',
    message: `${SERVER_NAME} started on port ${PORT}`
  });
});

export default app;
