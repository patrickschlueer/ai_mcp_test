import AtlassianClient from './atlassian-client.js';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Debug: Prüfe Description Format
 */

async function debugDescription() {
  const client = new AtlassianClient();
  
  console.log('Fetching tickets to debug description format...\n');
  
  const result = await client.getTickets({ maxResults: 3 });
  
  if (!result.success) {
    console.error('Failed:', result.error);
    return;
  }
  
  console.log(`Found ${result.tickets.length} tickets\n`);
  
  result.tickets.forEach(ticket => {
    console.log('='.repeat(60));
    console.log(`Ticket: ${ticket.key}`);
    console.log(`Summary: ${ticket.summary}`);
    console.log(`Description Type: ${typeof ticket.description}`);
    console.log(`Description Value:`);
    console.log(ticket.description);
    console.log(`Description Length: ${ticket.description?.length || 0}`);
    console.log('='.repeat(60));
    console.log();
  });
}

debugDescription().catch(console.error);
