import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import AtlassianClient from './atlassian-client.js';

dotenv.config();

const app = express();
const PORT = process.env.MCP_PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Atlassian Client initialisieren
const atlassian = new AtlassianClient();

/**
 * MCP Server für Jira/Confluence
 * 
 * Dieser Server stellt Tools bereit, die Claude nutzen kann um:
 * - Jira Tickets abzurufen
 * - Tickets zu aktualisieren
 * - Kommentare hinzuzufügen
 * - Confluence Seiten zu erstellen/aktualisieren
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
  const result = await atlassian.testConnection();
  
  if (result.success) {
    res.json({
      success: true,
      message: 'Connection successful',
      user: result.user,
      email: result.email
    });
  } else {
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

/**
 * Tool: get_tickets
 * Alle Tickets aus Jira abrufen
 */
app.post('/tools/get_tickets', async (req, res) => {
  try {
    console.log('[MCP Tool] get_tickets called');
    const { status, assignee, maxResults } = req.body;
    
    const result = await atlassian.getTickets({ status, assignee, maxResults });
    
    res.json(result);
  } catch (error) {
    console.error('[MCP Tool] Error in get_tickets:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Tool: get_ticket
 * Einzelnes Ticket aus Jira abrufen
 */
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
    
    const result = await atlassian.getTicket(ticketKey);
    
    res.json(result);
  } catch (error) {
    console.error('[MCP Tool] Error in get_ticket:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Tool: update_ticket
 * Ticket in Jira aktualisieren
 */
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
    
    const result = await atlassian.updateTicket(ticketKey, updates);
    
    res.json(result);
  } catch (error) {
    console.error('[MCP Tool] Error in update_ticket:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Tool: add_comment
 * Kommentar zu Ticket hinzufügen
 */
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
    
    const result = await atlassian.addComment(ticketKey, comment);
    
    res.json(result);
  } catch (error) {
    console.error('[MCP Tool] Error in add_comment:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ============================================
// CONFLUENCE TOOLS
// ============================================

/**
 * Tool: update_confluence_page
 * Confluence Seite erstellen oder aktualisieren
 */
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
    
    const result = await atlassian.updateConfluencePage(title, content, spaceKey);
    
    res.json(result);
  } catch (error) {
    console.error('[MCP Tool] Error in update_confluence_page:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ============================================
// MCP TOOL CATALOG
// ============================================

/**
 * Tool Catalog: Liste aller verfügbaren Tools
 * Das ist das "Menu" für Claude - hier sieht er welche Tools verfügbar sind
 */
app.get('/tools', (req, res) => {
  res.json({
    tools: [
      {
        name: 'get_tickets',
        description: 'Get all Jira tickets with optional filters',
        parameters: {
          status: { type: 'string', optional: true, description: 'Filter by status (e.g. "To Do", "In Progress")' },
          assignee: { type: 'string', optional: true, description: 'Filter by assignee or "UNASSIGNED"' },
          maxResults: { type: 'number', optional: true, description: 'Maximum number of results (default: 50)' }
        },
        endpoint: '/tools/get_tickets'
      },
      {
        name: 'get_ticket',
        description: 'Get a single Jira ticket by key',
        parameters: {
          ticketKey: { type: 'string', required: true, description: 'Ticket key (e.g. "AT-1")' }
        },
        endpoint: '/tools/get_ticket'
      },
      {
        name: 'update_ticket',
        description: 'Update a Jira ticket',
        parameters: {
          ticketKey: { type: 'string', required: true, description: 'Ticket key to update' },
          updates: { 
            type: 'object', 
            required: true,
            description: 'Fields to update',
            fields: {
              status: { type: 'string', optional: true },
              summary: { type: 'string', optional: true },
              description: { type: 'string', optional: true },
              assignee: { type: 'string', optional: true }
            }
          }
        },
        endpoint: '/tools/update_ticket'
      },
      {
        name: 'add_comment',
        description: 'Add a comment to a Jira ticket',
        parameters: {
          ticketKey: { type: 'string', required: true, description: 'Ticket key' },
          comment: { type: 'string', required: true, description: 'Comment text' }
        },
        endpoint: '/tools/add_comment'
      },
      {
        name: 'update_confluence_page',
        description: 'Create or update a Confluence page',
        parameters: {
          title: { type: 'string', required: true, description: 'Page title' },
          content: { type: 'string', required: true, description: 'Page content (HTML)' },
          spaceKey: { type: 'string', optional: true, description: 'Space key (default: from env)' }
        },
        endpoint: '/tools/update_confluence_page'
      }
    ]
  });
});

// Error Handler
app.use((err, req, res, next) => {
  console.error('[MCP] Error:', err);
  res.status(500).json({
    success: false,
    error: err.message
  });
});

// Server starten
app.listen(PORT, () => {
  console.log('='.repeat(60));
  console.log('🚀 Jira/Confluence MCP Server started!');
  console.log(`📍 Server running on: http://localhost:${PORT}`);
  console.log(`🏥 Health check: http://localhost:${PORT}/health`);
  console.log(`🔧 Tools catalog: http://localhost:${PORT}/tools`);
  console.log(`🔗 Jira: https://${process.env.JIRA_HOST}`);
  console.log(`📅 Started at: ${new Date().toISOString()}`);
  console.log('='.repeat(60));
});

export default app;
