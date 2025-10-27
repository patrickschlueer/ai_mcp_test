import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

/**
 * 🧪 GitHub MCP Test Agent (UPDATED)
 * 
 * Testet den kompletten GitHub-Workflow:
 * a) Branch erstellen
 * b) EXISTIERENDE Datei auswählen (app.component.ts)
 * c) Datei anpassen (console.log hinzufügen)
 * d) Änderung committen
 * e) Pull Request erstellen
 * f) 🆕 Alle PRs abrufen
 */

const GITHUB_MCP_URL = process.env.GITHUB_MCP_URL || 'http://localhost:3002';
const TEST_BRANCH_NAME = `test/github-mcp-${Date.now()}`;
const TARGET_FILE = 'test-app/frontend/src/app/app.component.ts';

/**
 * Rufe ein GitHub MCP Tool auf
 */
async function callGitHubTool(toolName, params) {
  try {
    console.log(`\n🔧 Calling ${toolName}...`);
    console.log(`   Params:`, JSON.stringify(params, null, 2));
    
    const response = await axios.post(`${GITHUB_MCP_URL}/tools/${toolName}`, params);
    
    if (response.data.success) {
      console.log(`   ✅ Success!`);
      return response.data;
    } else {
      console.log(`   ❌ Failed:`, response.data.error);
      throw new Error(response.data.error);
    }
  } catch (error) {
    console.error(`   ❌ Error calling ${toolName}:`, error.message);
    if (error.response) {
      console.error(`   HTTP ${error.response.status}:`, error.response.data);
    }
    throw error;
  }
}

/**
 * Teste GitHub MCP Server Verbindung
 */
async function testConnection() {
  console.log('\n' + '='.repeat(60));
  console.log('🧪 Testing GitHub MCP Connection');
  console.log('='.repeat(60));
  
  try {
    const response = await axios.get(`${GITHUB_MCP_URL}/test-connection`);
    console.log('✅ Connection successful!');
    console.log(`   User: ${response.data.user}`);
    console.log(`   Repo: ${response.data.repo}`);
    return true;
  } catch (error) {
    console.error('❌ Connection failed:', error.message);
    return false;
  }
}

/**
 * SCHRITT A: Branch erstellen
 */
async function createBranch() {
  console.log('\n' + '='.repeat(60));
  console.log('📝 STEP A: Create Branch');
  console.log('='.repeat(60));
  
  const result = await callGitHubTool('create_branch', {
    branchName: TEST_BRANCH_NAME,
    fromBranch: 'main'
  });
  
  console.log(`\n   ✅ Branch created: ${TEST_BRANCH_NAME}`);
  return result;
}

/**
 * SCHRITT B: Existierende Datei auswählen und laden
 */
async function selectAndLoadFile() {
  console.log('\n' + '='.repeat(60));
  console.log('🔍 STEP B: Select and Load Existing File');
  console.log('='.repeat(60));
  
  console.log(`\n   📄 Target file: ${TARGET_FILE}`);
  
  // Hole aktuellen Content
  const fileResult = await callGitHubTool('get_file', {
    path: TARGET_FILE,
    branch: 'main'
  });
  
  console.log(`   ✅ File loaded (${fileResult.file.size} bytes)`);
  console.log(`   📋 Content preview (first 300 chars):`);
  console.log(`   ${fileResult.file.content.substring(0, 300)}...`);
  
  return {
    path: fileResult.file.path,
    name: fileResult.file.name,
    content: fileResult.file.content,
    sha: fileResult.file.sha
  };
}

/**
 * SCHRITT C: Datei anpassen (console.log hinzufügen)
 */
function modifyFileContent(file) {
  console.log('\n' + '='.repeat(60));
  console.log('✏️  STEP C: Modify File');
  console.log('='.repeat(60));
  
  const timestamp = new Date().toISOString();
  
  // Suche nach der ngOnInit oder constructor Methode und füge console.log hinzu
  let newContent = file.content;
  
  // Versuche nach ngOnInit zu suchen
  if (newContent.includes('ngOnInit()')) {
    // Füge console.log nach ngOnInit hinzu
    newContent = newContent.replace(
      /ngOnInit\(\)\s*{/,
      `ngOnInit() {
    // 🤖 Automated test modification at ${timestamp}
    console.log('GitHub MCP Test - Modified at ${timestamp}');`
    );
    console.log(`\n   ✅ Added console.log to ngOnInit() method`);
  } else if (newContent.includes('constructor(')) {
    // Fallback: Füge nach constructor hinzu
    newContent = newContent.replace(
      /constructor\([^)]*\)\s*{/,
      (match) => `${match}
    // 🤖 Automated test modification at ${timestamp}
    console.log('GitHub MCP Test - Modified at ${timestamp}');`
    );
    console.log(`\n   ✅ Added console.log to constructor`);
  } else {
    // Fallback: Füge am Anfang der Klasse hinzu
    newContent = newContent.replace(
      /export class \w+ {/,
      (match) => `${match}
  // 🤖 Automated test modification at ${timestamp}
  constructor() {
    console.log('GitHub MCP Test - Modified at ${timestamp}');
  }`
    );
    console.log(`\n   ✅ Added console.log in new constructor`);
  }
  
  // Zeige die Änderung
  const originalLines = file.content.split('\n').length;
  const newLines = newContent.split('\n').length;
  console.log(`   📊 Lines: ${originalLines} → ${newLines} (+${newLines - originalLines})`);
  
  return newContent;
}

/**
 * SCHRITT D: Änderung committen
 */
async function commitChanges(file, newContent) {
  console.log('\n' + '='.repeat(60));
  console.log('💾 STEP D: Commit Changes');
  console.log('='.repeat(60));
  
  const commitMessage = `test: add console.log for GitHub MCP test

Automated modification at ${new Date().toISOString()}
- Added console.log statement for testing
- Modified by GitHub MCP Test Agent

Test branch: ${TEST_BRANCH_NAME}`;
  
  const result = await callGitHubTool('commit_file', {
    path: file.path,
    content: newContent,
    message: commitMessage,
    branch: TEST_BRANCH_NAME
  });
  
  console.log(`\n   ✅ File committed!`);
  console.log(`   Path: ${result.path}`);
  console.log(`   SHA: ${result.sha}`);
  console.log(`   Commit: ${result.commit.sha}`);
  
  return result;
}

/**
 * SCHRITT E: Pull Request erstellen
 */
async function createPullRequest(file) {
  console.log('\n' + '='.repeat(60));
  console.log('📬 STEP E: Create Pull Request');
  console.log('='.repeat(60));
  
  const prTitle = `🧪 Test: GitHub MCP Workflow Test - console.log added`;
  
  const prBody = `## 🧪 Automated Test PR

This Pull Request was automatically created by the **GitHub MCP Test Agent** to verify the complete workflow.

### Test Summary
- ✅ Branch created: \`${TEST_BRANCH_NAME}\`
- ✅ File modified: \`${file.path}\`
- ✅ Added console.log statement for testing
- ✅ Changes committed
- ✅ Pull Request created

### What Changed?
Modified \`${file.path}\` to add a \`console.log()\` statement for testing purposes.

### Test Steps Executed
1. **Create Branch** - Created test branch from main
2. **Select File** - Loaded existing \`${file.path}\`
3. **Modify Content** - Added console.log statement
4. **Commit Changes** - Committed with descriptive message
5. **Create PR** - This Pull Request!

### Verification
All GitHub MCP tools are working correctly! 🎉

---
**Note:** This is a test PR. You can merge it safely (it only adds a console.log) or close it.

_Created by 🤖 GitHub MCP Test Agent at ${new Date().toISOString()}_`;
  
  const result = await callGitHubTool('create_pull_request', {
    title: prTitle,
    body: prBody,
    headBranch: TEST_BRANCH_NAME,
    baseBranch: 'main'
  });
  
  console.log(`\n   ✅ Pull Request created!`);
  console.log(`   PR #${result.pr.number}: ${result.pr.title}`);
  console.log(`   URL: ${result.pr.url}`);
  
  return result;
}

/**
 * 🆕 SCHRITT F: Alle Pull Requests abrufen
 */
async function getAllPullRequests() {
  console.log('\n' + '='.repeat(60));
  console.log('📋 STEP F: Get All Pull Requests');
  console.log('='.repeat(60));
  
  try {
    const result = await callGitHubTool('get_pull_requests', {
      state: 'all', // 'open', 'closed', or 'all'
      limit: 10
    });
    
    console.log(`\n   ✅ Found ${result.count} pull request(s):`);
    console.log('');
    
    if (result.pullRequests.length === 0) {
      console.log('   (No pull requests found)');
    } else {
      result.pullRequests.forEach((pr, index) => {
        const stateIcon = pr.state === 'open' ? '🟢' : pr.merged ? '🟣' : '🔴';
        console.log(`   ${stateIcon} PR #${pr.number}: ${pr.title}`);
        console.log(`      State: ${pr.state} | Branch: ${pr.headBranch} → ${pr.baseBranch}`);
        console.log(`      Author: ${pr.author} | Updated: ${pr.updatedAt}`);
        console.log(`      URL: ${pr.url}`);
        if (index < result.pullRequests.length - 1) {
          console.log('');
        }
      });
    }
    
    return result;
  } catch (error) {
    console.error(`   ❌ Failed to get pull requests: ${error.message}`);
    throw error;
  }
}

/**
 * Haupt-Test-Funktion
 */
async function runTest() {
  console.log('\n' + '🧪'.repeat(30));
  console.log('🚀 Starting GitHub MCP Test Agent (UPDATED)');
  console.log('🧪'.repeat(30));
  
  try {
    // 0. Test Connection
    const connected = await testConnection();
    if (!connected) {
      throw new Error('Cannot connect to GitHub MCP Server');
    }
    
    // A. Create Branch
    await createBranch();
    
    // Kurze Pause
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // B. Select and Load Existing File
    const file = await selectAndLoadFile();
    
    // C. Modify File (add console.log)
    const newContent = modifyFileContent(file);
    
    // Kurze Pause
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // D. Commit Changes
    const commitResult = await commitChanges(file, newContent);
    
    // Kurze Pause
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // E. Create Pull Request
    const prResult = await createPullRequest(file);
    
    // Kurze Pause
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // F. Get All Pull Requests
    const prsResult = await getAllPullRequests();
    
    // 🎉 SUCCESS!
    console.log('\n' + '='.repeat(60));
    console.log('🎉 ALL TESTS PASSED!');
    console.log('='.repeat(60));
    console.log(`\n📋 Summary:`);
    console.log(`   Branch: ${TEST_BRANCH_NAME}`);
    console.log(`   File Modified: ${file.path}`);
    console.log(`   Change: Added console.log statement`);
    console.log(`   Commit: ${commitResult.commit.sha}`);
    console.log(`   PR: ${prResult.pr.url}`);
    console.log(`   Total PRs in Repo: ${prsResult.count}`);
    console.log(`\n✅ GitHub MCP is working perfectly!`);
    console.log(`\n💡 Next steps:`);
    console.log(`   1. Review the PR: ${prResult.pr.url}`);
    console.log(`   2. Check the console.log in ${file.path}`);
    console.log(`   3. Merge or close the PR`);
    console.log(`   4. Delete the test branch if desired`);
    
  } catch (error) {
    console.error('\n' + '='.repeat(60));
    console.error('❌ TEST FAILED');
    console.error('='.repeat(60));
    console.error(`\nError: ${error.message}`);
    
    if (error.stack) {
      console.error('\nStack trace:');
      console.error(error.stack);
    }
    
    process.exit(1);
  }
}

// Run the test
runTest();
