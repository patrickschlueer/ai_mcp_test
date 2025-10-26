import AtlassianClient from './atlassian-client.js';
import dotenv from 'dotenv';
import axios from 'axios';

dotenv.config();

/**
 * Debug Script - Finde heraus welche API funktioniert
 */

async function debugJiraAPI() {
  console.log('='.repeat(60));
  console.log('🔍 Jira API Debug');
  console.log('='.repeat(60));
  console.log();

  const host = process.env.JIRA_HOST;
  const email = process.env.JIRA_EMAIL;
  const apiToken = process.env.JIRA_API_TOKEN;
  const auth = Buffer.from(`${email}:${apiToken}`).toString('base64');

  const axiosInstance = axios.create({
    baseURL: `https://${host}`,
    headers: {
      'Authorization': `Basic ${auth}`,
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    }
  });

  // Test 1: Server Info
  console.log('Test 1: Server Info');
  console.log('-'.repeat(60));
  try {
    const response = await axiosInstance.get('/rest/api/2/serverInfo');
    console.log('✅ Server Info:');
    console.log(`   Version: ${response.data.version}`);
    console.log(`   Build: ${response.data.buildNumber}`);
    console.log(`   Type: ${response.data.deploymentType}`);
  } catch (error) {
    console.log('❌ Failed:', error.response?.status, error.message);
  }
  console.log();

  // Test 2: Direct JQL Search (verschiedene Versionen)
  console.log('Test 2: Try different API versions');
  console.log('-'.repeat(60));

  const versions = ['2', '3', 'latest'];
  
  for (const version of versions) {
    console.log(`Testing /rest/api/${version}/search...`);
    try {
      const response = await axiosInstance.get(`/rest/api/${version}/search`, {
        params: {
          jql: 'project = AT',
          maxResults: 5
        }
      });
      console.log(`✅ API v${version} works! Found ${response.data.total} issues`);
      if (response.data.issues && response.data.issues.length > 0) {
        console.log(`   First issue: ${response.data.issues[0].key}`);
      }
    } catch (error) {
      console.log(`❌ API v${version} failed: ${error.response?.status} - ${error.message}`);
    }
  }
  console.log();

  // Test 3: Try agile/board API (manchmal anders)
  console.log('Test 3: Try Agile API');
  console.log('-'.repeat(60));
  try {
    const response = await axiosInstance.get('/rest/agile/1.0/board');
    console.log('✅ Agile API works!');
    console.log(`   Boards: ${response.data.total}`);
  } catch (error) {
    console.log(`❌ Agile API failed: ${error.response?.status}`);
  }
  console.log();

  // Test 4: List all projects
  console.log('Test 4: List Projects');
  console.log('-'.repeat(60));
  try {
    const response = await axiosInstance.get('/rest/api/2/project');
    console.log('✅ Projects found:');
    response.data.forEach(project => {
      console.log(`   - ${project.key}: ${project.name}`);
    });
  } catch (error) {
    console.log(`❌ Failed: ${error.response?.status}`);
  }
  console.log();

  // Test 5: Detailed error info
  console.log('Test 5: Detailed Error Analysis');
  console.log('-'.repeat(60));
  try {
    const response = await axiosInstance.get('/rest/api/2/search', {
      params: {
        jql: 'project = AT ORDER BY created DESC',
        maxResults: 5
      }
    });
    console.log('✅ Search works!');
  } catch (error) {
    console.log('❌ Error Details:');
    console.log(`   Status: ${error.response?.status}`);
    console.log(`   Status Text: ${error.response?.statusText}`);
    console.log(`   Headers:`, error.response?.headers);
    console.log(`   Data:`, JSON.stringify(error.response?.data, null, 2));
  }
  console.log();

  console.log('='.repeat(60));
  console.log('Debug complete!');
  console.log('='.repeat(60));
}

debugJiraAPI().catch(console.error);
