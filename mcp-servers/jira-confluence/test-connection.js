import AtlassianClient from './atlassian-client.js';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Test Script für Jira/Confluence Verbindung
 * Testet alle wichtigen Funktionen des MCP Servers
 */

const atlassian = new AtlassianClient();

async function runTests() {
  console.log('='.repeat(60));
  console.log('🧪 Testing Jira/Confluence Connection');
  console.log('='.repeat(60));
  console.log();

  // Test 1: Verbindung
  console.log('Test 1: Connection Test');
  console.log('-'.repeat(60));
  const connectionTest = await atlassian.testConnection();
  if (connectionTest.success) {
    console.log('✅ Connection successful!');
    console.log(`   User: ${connectionTest.user}`);
    console.log(`   Email: ${connectionTest.email}`);
  } else {
    console.log('❌ Connection failed!');
    console.log(`   Error: ${connectionTest.error}`);
    return; // Stop if connection fails
  }
  console.log();

  // Test 2: Tickets abrufen
  console.log('Test 2: Get All Tickets');
  console.log('-'.repeat(60));
  const ticketsResult = await atlassian.getTickets();
  if (ticketsResult.success) {
    console.log(`✅ Found ${ticketsResult.tickets.length} tickets`);
    ticketsResult.tickets.forEach(ticket => {
      console.log(`   - ${ticket.key}: ${ticket.summary}`);
      console.log(`     Status: ${ticket.status} | Assignee: ${ticket.assignee}`);
    });
  } else {
    console.log('❌ Failed to fetch tickets');
    console.log(`   Error: ${ticketsResult.error}`);
  }
  console.log();

  // Test 3: Einzelnes Ticket abrufen (wenn Tickets vorhanden)
  if (ticketsResult.success && ticketsResult.tickets.length > 0) {
    const firstTicket = ticketsResult.tickets[0];
    console.log(`Test 3: Get Single Ticket (${firstTicket.key})`);
    console.log('-'.repeat(60));
    const ticketResult = await atlassian.getTicket(firstTicket.key);
    if (ticketResult.success) {
      console.log('✅ Ticket details fetched!');
      console.log(`   Key: ${ticketResult.ticket.key}`);
      console.log(`   Summary: ${ticketResult.ticket.summary}`);
      console.log(`   Status: ${ticketResult.ticket.status}`);
      const desc = typeof ticketResult.ticket.description === 'string' 
        ? ticketResult.ticket.description 
        : JSON.stringify(ticketResult.ticket.description).substring(0, 100);
      console.log(`   Description: ${desc}...`);
      console.log(`   Comments: ${ticketResult.ticket.comments.length}`);
    } else {
      console.log('❌ Failed to fetch ticket');
      console.log(`   Error: ${ticketResult.error}`);
    }
    console.log();

    // Test 4: Kommentar hinzufügen (optional - auskommentiert)
    /*
    console.log(`Test 4: Add Comment to ${firstTicket.key}`);
    console.log('-'.repeat(60));
    const commentResult = await atlassian.addComment(
      firstTicket.key, 
      '🤖 Test comment from MCP Server - ' + new Date().toISOString()
    );
    if (commentResult.success) {
      console.log('✅ Comment added!');
    } else {
      console.log('❌ Failed to add comment');
      console.log(`   Error: ${commentResult.error}`);
    }
    console.log();
    */
  }

  // Test 5: Confluence (optional - auskommentiert)
  /*
  console.log('Test 5: Update Confluence Page');
  console.log('-'.repeat(60));
  const confluenceResult = await atlassian.updateConfluencePage(
    'MCP Test Page',
    '<h1>Test Page</h1><p>This is a test from the MCP Server at ' + 
    new Date().toISOString() + '</p>'
  );
  if (confluenceResult.success) {
    console.log('✅ Confluence page updated!');
    console.log(`   URL: ${confluenceResult.url}`);
  } else {
    console.log('❌ Failed to update Confluence page');
    console.log(`   Error: ${confluenceResult.error}`);
  }
  console.log();
  */

  console.log('='.repeat(60));
  console.log('✅ All tests completed!');
  console.log('='.repeat(60));
  console.log();
  console.log('Next steps:');
  console.log('1. Start the MCP Server: npm start');
  console.log('2. Test endpoints: http://localhost:3001/health');
  console.log('3. View available tools: http://localhost:3001/tools');
}

runTests().catch(console.error);
