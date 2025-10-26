import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import axios from 'axios';
import GitHubClient from './github-client.js';

dotenv.config();

const app = express();
const PORT = process.env.MCP_PORT || 3002;
const SERVER_ID = 'github-mcp-001';
const SERVER_NAME = process.env.SERVER_NAME || 'GitHub MCP';
const EVENT_HUB_URL = process.env.EVENT_HUB_URL || 'http://localhost:3000';

// Middleware
app.use(cors());
app.use(express.json());

// GitHub Client initialisieren
const github = new GitHubClient();

/**
 * Event an Event Hub senden
 */
async function sendEvent(eventData) {
  try {
    await axios.post(`${EVENT_HUB_URL}/events/mcp`, {
      serverId: SERVER_ID,
      serverName: SERVER_NAME,
      serverType: 'github',
      port: PORT,
      timestamp: new Date().toISOString(),
      ...eventData
    }, { timeout: 1000 });
  } catch (error) {
    // Silent fail - Event Hub Fehler nicht kritisch
  }
}

/**
 * Shutdown Hook - meldet Server explizit als offline
 */
async function shutdown() {
  console.log('\n⚠️  Shutting down GitHub MCP Server...');
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
 */
setInterval(async () => {
  await sendEvent({
    type: 'heartbeat',
    message: 'Server is online'
  });
}, 25000); // Alle 25 Sekunden

/**
 * MCP Server für GitHub - WITH EVENT HUB INTEGRATION
 */

// Health Check
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    service: 'GitHub MCP Server',
    timestamp: new Date().toISOString()
  });
});

// Test: Verbindung zu GitHub
app.get('/test-connection', async (req, res) => {
  console.log('[MCP] Testing GitHub connection...');
  
  await sendEvent({
    type: 'test_connection',
    message: 'Testing GitHub connection'
  });
  
  const result = await github.testConnection();
  
  if (result.success) {
    await sendEvent({
      type: 'connection_success',
      message: `Connected to GitHub: ${result.repo}`
    });
    
    res.json({
      success: true,
      message: 'Connection successful',
      user: result.user,
      repo: result.repo,
      private: result.private
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
// GITHUB TOOLS
// ============================================

/**
 * Tool: get_file
 */
app.post('/tools/get_file', async (req, res) => {
  try {
    console.log('[MCP Tool] get_file called');
    const { path, branch } = req.body;
    
    if (!path) {
      return res.status(400).json({
        success: false,
        error: 'path is required'
      });
    }
    
    await sendEvent({
      type: 'get_file',
      message: `Reading file: ${path}`
    });
    
    const result = await github.getFile(path, branch);
    
    if (result.success) {
      await sendEvent({
        type: 'file_read',
        message: `Read file: ${path} (${result.file.size} bytes)`
      });
    }
    
    res.json(result);
  } catch (error) {
    console.error('[MCP Tool] Error in get_file:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Tool: get_tree
 */
app.post('/tools/get_tree', async (req, res) => {
  try {
    console.log('[MCP Tool] get_tree called');
    const { path, branch } = req.body;
    
    await sendEvent({
      type: 'get_tree',
      message: `Reading directory structure: ${path || '/'}`
    });
    
    const result = await github.getTree(path || '', branch);
    
    if (result.success) {
      await sendEvent({
        type: 'tree_read',
        message: `Read directory: ${result.items.length} items`
      });
    }
    
    res.json(result);
  } catch (error) {
    console.error('[MCP Tool] Error in get_tree:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * 🔧 NEW Tool: list_directory (alias for get_tree for convenience)
 */
app.post('/tools/list_directory', async (req, res) => {
  try {
    console.log('[MCP Tool] list_directory called');
    const { path, branch } = req.body;
    
    await sendEvent({
      type: 'list_directory',
      message: `Listing directory: ${path || '/'}`
    });
    
    const result = await github.getTree(path || '', branch);
    
    if (result.success) {
      // Transform to simpler format for listing
      const files = result.items
        .filter(item => item.type === 'file')
        .map(item => item.name);
      
      const dirs = result.items
        .filter(item => item.type === 'dir')
        .map(item => item.name);
      
      await sendEvent({
        type: 'directory_listed',
        message: `Listed: ${files.length} files, ${dirs.length} directories`
      });
      
      res.json({
        success: true,
        path: result.path,
        files,
        directories: dirs,
        allItems: result.items
      });
    } else {
      res.json(result);
    }
  } catch (error) {
    console.error('[MCP Tool] Error in list_directory:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Tool: search_code
 */
app.post('/tools/search_code', async (req, res) => {
  try {
    console.log('[MCP Tool] search_code called');
    const { query } = req.body;
    
    if (!query) {
      return res.status(400).json({
        success: false,
        error: 'query is required'
      });
    }
    
    await sendEvent({
      type: 'search_code',
      message: `Searching code for: ${query}`
    });
    
    const result = await github.searchCode(query);
    
    if (result.success) {
      await sendEvent({
        type: 'search_complete',
        message: `Found ${result.results.length} matches for "${query}"`
      });
    }
    
    res.json(result);
  } catch (error) {
    console.error('[MCP Tool] Error in search_code:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Tool: create_branch
 */
app.post('/tools/create_branch', async (req, res) => {
  try {
    console.log('[MCP Tool] create_branch called');
    const { branchName, fromBranch } = req.body;
    
    if (!branchName) {
      return res.status(400).json({
        success: false,
        error: 'branchName is required'
      });
    }
    
    await sendEvent({
      type: 'create_branch',
      message: `Creating branch: ${branchName}`
    });
    
    const result = await github.createBranch(branchName, fromBranch);
    
    if (result.success) {
      await sendEvent({
        type: 'branch_created',
        message: `Created branch: ${branchName}`
      });
    }
    
    res.json(result);
  } catch (error) {
    console.error('[MCP Tool] Error in create_branch:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Tool: commit_file
 */
app.post('/tools/commit_file', async (req, res) => {
  try {
    console.log('[MCP Tool] commit_file called');
    const { path, content, message, branch } = req.body;
    
    if (!path || !content || !message) {
      return res.status(400).json({
        success: false,
        error: 'path, content, and message are required'
      });
    }
    
    await sendEvent({
      type: 'commit_file',
      message: `Committing file: ${path}`
    });
    
    const result = await github.commitFile(path, content, message, branch);
    
    if (result.success) {
      await sendEvent({
        type: 'file_committed',
        message: `Committed: ${path}`
      });
    }
    
    res.json(result);
  } catch (error) {
    console.error('[MCP Tool] Error in commit_file:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Tool: create_pull_request
 */
app.post('/tools/create_pull_request', async (req, res) => {
  try {
    console.log('[MCP Tool] create_pull_request called');
    const { title, body, headBranch, baseBranch } = req.body;
    
    if (!title || !headBranch) {
      return res.status(400).json({
        success: false,
        error: 'title and headBranch are required'
      });
    }
    
    await sendEvent({
      type: 'create_pr',
      message: `Creating PR: ${title}`
    });
    
    const result = await github.createPullRequest(title, body, headBranch, baseBranch);
    
    if (result.success) {
      await sendEvent({
        type: 'pr_created',
        message: `Created PR: ${title}`
      });
    }
    
    res.json(result);
  } catch (error) {
    console.error('[MCP Tool] Error in create_pull_request:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Tool: get_branches
 */
app.post('/tools/get_branches', async (req, res) => {
  try {
    console.log('[MCP Tool] get_branches called');
    const result = await github.getBranches();
    res.json(result);
  } catch (error) {
    console.error('[MCP Tool] Error in get_branches:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Tool: get_commits
 */
app.post('/tools/get_commits', async (req, res) => {
  try {
    console.log('[MCP Tool] get_commits called');
    const { branch, limit } = req.body;
    const result = await github.getCommits(branch, limit);
    res.json(result);
  } catch (error) {
    console.error('[MCP Tool] Error in get_commits:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ============================================
// MCP TOOL CATALOG
// ============================================

app.get('/tools', (req, res) => {
  res.json({
    tools: [
      {
        name: 'get_file',
        description: 'Get file content from repository',
        parameters: {
          path: { type: 'string', required: true, description: 'File path in repo' },
          branch: { type: 'string', optional: true, description: 'Branch name (default: main)' }
        },
        endpoint: '/tools/get_file'
      },
      {
        name: 'get_tree',
        description: 'Get directory structure',
        parameters: {
          path: { type: 'string', optional: true, description: 'Directory path (default: root)' },
          branch: { type: 'string', optional: true, description: 'Branch name' }
        },
        endpoint: '/tools/get_tree'
      },
      {
        name: 'list_directory',
        description: 'List files and directories in a path (simplified output)',
        parameters: {
          path: { type: 'string', optional: true, description: 'Directory path (default: root)' },
          branch: { type: 'string', optional: true, description: 'Branch name' }
        },
        endpoint: '/tools/list_directory'
      },
      {
        name: 'search_code',
        description: 'Search code in repository',
        parameters: {
          query: { type: 'string', required: true, description: 'Search query' }
        },
        endpoint: '/tools/search_code'
      },
      {
        name: 'create_branch',
        description: 'Create a new branch',
        parameters: {
          branchName: { type: 'string', required: true, description: 'Name for new branch' },
          fromBranch: { type: 'string', optional: true, description: 'Source branch (default: main)' }
        },
        endpoint: '/tools/create_branch'
      },
      {
        name: 'commit_file',
        description: 'Commit a file (create or update)',
        parameters: {
          path: { type: 'string', required: true, description: 'File path' },
          content: { type: 'string', required: true, description: 'File content' },
          message: { type: 'string', required: true, description: 'Commit message' },
          branch: { type: 'string', optional: true, description: 'Branch name' }
        },
        endpoint: '/tools/commit_file'
      },
      {
        name: 'create_pull_request',
        description: 'Create a pull request',
        parameters: {
          title: { type: 'string', required: true, description: 'PR title' },
          body: { type: 'string', optional: true, description: 'PR description' },
          headBranch: { type: 'string', required: true, description: 'Source branch' },
          baseBranch: { type: 'string', optional: true, description: 'Target branch (default: main)' }
        },
        endpoint: '/tools/create_pull_request'
      },
      {
        name: 'get_branches',
        description: 'Get all branches',
        parameters: {},
        endpoint: '/tools/get_branches'
      },
      {
        name: 'get_commits',
        description: 'Get recent commits',
        parameters: {
          branch: { type: 'string', optional: true, description: 'Branch name' },
          limit: { type: 'number', optional: true, description: 'Max number of commits (default: 10)' }
        },
        endpoint: '/tools/get_commits'
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
app.listen(PORT, async () => {
  console.log('='.repeat(60));
  console.log('🚀 GitHub MCP Server started!');
  console.log(`📍 Server running on: http://localhost:${PORT}`);
  console.log(`🏥 Health check: http://localhost:${PORT}/health`);
  console.log(`🔧 Tools catalog: http://localhost:${PORT}/tools`);
  console.log(`📦 Repository: ${process.env.GITHUB_OWNER}/${process.env.GITHUB_REPO}`);
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
