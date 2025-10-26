import TicketAnalystAgent from './agent.js';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Test Script für den Ticket Analyst Agent
 * Führt einen einzelnen Durchlauf aus (ohne Loop)
 */

async function testAgent() {
  console.log('='.repeat(60));
  console.log('🧪 Testing Ticket Analyst Agent');
  console.log('='.repeat(60));
  console.log();

  // Agent erstellen
  const agent = new TicketAnalystAgent();

  // Test 1: Neue Tickets holen
  console.log('Test 1: Fetch new tickets');
  console.log('-'.repeat(60));
  const tickets = await agent.getNewTickets();
  
  if (tickets.length === 0) {
    console.log('⚠️  No new tickets found!');
    console.log('   Make sure you have tickets with status "To Do" in Jira');
    return;
  }

  console.log(`✅ Found ${tickets.length} ticket(s)`);
  console.log();

  // Test 2: Erstes Ticket analysieren
  console.log('Test 2: Analyze first ticket');
  console.log('-'.repeat(60));
  const firstTicket = tickets[0];
  
  const result = await agent.processTicket(firstTicket);
  
  if (result.success) {
    console.log('✅ Ticket processed successfully!');
    console.log();
    console.log('Analysis:');
    console.log(JSON.stringify(result.analysis, null, 2));
  } else {
    console.log('❌ Failed to process ticket');
    console.log('   Error:', result.error);
  }
  
  console.log();
  console.log('='.repeat(60));
  console.log('✅ Test complete!');
  console.log('='.repeat(60));
  console.log();
  console.log('Next steps:');
  console.log('1. Check the ticket in Jira for the analysis comment');
  console.log('2. Reply with "approved" to test approval detection');
  console.log('3. Run: npm start (to start the agent in continuous mode)');
}

testAgent().catch(console.error);
