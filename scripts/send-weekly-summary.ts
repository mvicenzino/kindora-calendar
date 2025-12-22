import 'dotenv/config';

const CRON_SECRET = process.env.CRON_SECRET;
const BASE_URL = process.env.REPLIT_DOMAINS?.split(',')[0] 
  ? `https://${process.env.REPLIT_DOMAINS.split(',')[0]}`
  : 'http://localhost:5000';

async function sendWeeklySummaries() {
  console.log('Starting weekly summary email job...');
  console.log(`Calling: ${BASE_URL}/api/cron/weekly-summary`);
  
  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    
    if (CRON_SECRET) {
      headers['X-Cron-Secret'] = CRON_SECRET;
    }
    
    const response = await fetch(`${BASE_URL}/api/cron/weekly-summary`, {
      method: 'POST',
      headers,
    });
    
    const result = await response.json();
    
    if (response.ok) {
      console.log('Weekly summary emails sent successfully!');
      console.log(`Emails sent: ${result.emailsSent || 0}`);
      console.log(`Families processed: ${result.familiesProcessed || 0}`);
    } else {
      console.error('Failed to send weekly summaries:', result.message);
      process.exit(1);
    }
  } catch (error) {
    console.error('Error calling weekly summary endpoint:', error);
    process.exit(1);
  }
}

sendWeeklySummaries();
