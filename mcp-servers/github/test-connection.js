import GitHubClient from './github-client.js';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Test Script für GitHub Verbindung
 */

async function testGitHub() {
  console.log('='.repeat(60));
  console.log('🧪 Testing GitHub Connection');
  console.log('='.repeat(60));
  console.log();

  const client = new GitHubClient();

  // Test 1: Connection
  console.log('Test 1: Connection');
  console.log('-'.repeat(60));
  const conn = await client.testConnection();
  if (conn.success) {
    console.log('✅ Connection successful!');
    console.log(`   User: ${conn.user}`);
    console.log(`   Repo: ${conn.repo}`);
    console.log(`   Private: ${conn.private}`);
  } else {
    console.log('❌ Connection failed!');
    console.log(`   Error: ${conn.error}`);
    return;
  }
  console.log();

  // Test 2: Get Tree (root)
  console.log('Test 2: Repository Structure');
  console.log('-'.repeat(60));
  const tree = await client.getTree('');
  if (tree.success) {
    console.log('✅ Repository structure:');
    tree.items.forEach(item => {
      const icon = item.type === 'dir' ? '📁' : '📄';
      console.log(`   ${icon} ${item.name} (${item.type})`);
    });
  } else {
    console.log('❌ Failed to get tree');
    console.log(`   Error: ${tree.error}`);
  }
  console.log();

  // Test 3: Get a file
  console.log('Test 3: Read a file');
  console.log('-'.repeat(60));
  
  // Try to read README.md or package.json
  const testFiles = ['README.md', 'package.json', 'test-app/backend/package.json'];
  let fileRead = false;
  
  for (const filePath of testFiles) {
    const file = await client.getFile(filePath);
    if (file.success) {
      console.log(`✅ File read: ${filePath}`);
      console.log(`   Size: ${file.file.size} bytes`);
      console.log(`   Content preview:`);
      console.log('   ' + file.file.content.substring(0, 200) + '...');
      fileRead = true;
      break;
    }
  }
  
  if (!fileRead) {
    console.log('⚠️  No test files found in repo');
  }
  console.log();

  // Test 4: Branches
  console.log('Test 4: Branches');
  console.log('-'.repeat(60));
  const branches = await client.getBranches();
  if (branches.success) {
    console.log(`✅ Found ${branches.branches.length} branch(es):`);
    branches.branches.forEach(branch => {
      console.log(`   - ${branch.name}${branch.protected ? ' (protected)' : ''}`);
    });
  } else {
    console.log('❌ Failed to get branches');
  }
  console.log();

  // Test 5: Commits
  console.log('Test 5: Recent Commits');
  console.log('-'.repeat(60));
  const commits = await client.getCommits(null, 3);
  if (commits.success) {
    console.log(`✅ Found ${commits.commits.length} recent commit(s):`);
    commits.commits.forEach(commit => {
      console.log(`   - ${commit.message.split('\n')[0]}`);
      console.log(`     by ${commit.author} at ${commit.date}`);
    });
  } else {
    console.log('❌ Failed to get commits');
  }
  console.log();

  console.log('='.repeat(60));
  console.log('✅ All tests completed!');
  console.log('='.repeat(60));
  console.log();
  console.log('Next steps:');
  console.log('1. Start the MCP Server: npm start');
  console.log('2. Test endpoints: http://localhost:3002/health');
  console.log('3. View available tools: http://localhost:3002/tools');
}

testGitHub().catch(console.error);
