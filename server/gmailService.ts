// Gmail Service - Integration with Replit's Gmail connector
// Used for scanning emails for invoices and payment notices

import { google } from 'googleapis';

let connectionSettings: any;

async function getAccessToken() {
  if (connectionSettings && connectionSettings.settings.expires_at && new Date(connectionSettings.settings.expires_at).getTime() > Date.now()) {
    return connectionSettings.settings.access_token;
  }
  
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY 
    ? 'repl ' + process.env.REPL_IDENTITY 
    : process.env.WEB_REPL_RENEWAL 
    ? 'depl ' + process.env.WEB_REPL_RENEWAL 
    : null;

  if (!xReplitToken) {
    throw new Error('X_REPLIT_TOKEN not found for repl/depl');
  }

  connectionSettings = await fetch(
    'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=google-mail',
    {
      headers: {
        'Accept': 'application/json',
        'X_REPLIT_TOKEN': xReplitToken
      }
    }
  ).then(res => res.json()).then(data => data.items?.[0]);

  const accessToken = connectionSettings?.settings?.access_token || connectionSettings.settings?.oauth?.credentials?.access_token;

  if (!connectionSettings || !accessToken) {
    throw new Error('Gmail not connected');
  }
  return accessToken;
}

// WARNING: Never cache this client.
// Access tokens expire, so a new client must be created each time.
async function getGmailClient() {
  const accessToken = await getAccessToken();

  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials({
    access_token: accessToken
  });

  return google.gmail({ version: 'v1', auth: oauth2Client });
}

// Check if Gmail is connected
export async function isGmailConnected(): Promise<boolean> {
  try {
    await getAccessToken();
    return true;
  } catch {
    return false;
  }
}

export interface ParsedInvoice {
  subject: string;
  sender: string;
  senderEmail: string;
  amount: number | null;
  dueDate: Date | null;
  messageId: string;
  receivedAt: Date;
  snippet: string;
  category: 'utility' | 'credit_card' | 'subscription' | 'medical' | 'insurance' | 'other';
}

// Common invoice/payment keywords
const INVOICE_KEYWORDS = [
  'invoice', 'bill', 'payment due', 'amount due', 'statement',
  'pay now', 'payment reminder', 'balance due', 'due date',
  'utility bill', 'monthly statement', 'account statement'
];

// Common sender patterns for financial emails
const FINANCIAL_SENDERS = [
  // Utilities
  { pattern: /electric|power|energy|utility/i, category: 'utility' as const },
  { pattern: /water|sewer/i, category: 'utility' as const },
  { pattern: /gas|natural gas/i, category: 'utility' as const },
  { pattern: /internet|cable|telecom|wireless|mobile|verizon|at&t|t-mobile|comcast|xfinity/i, category: 'utility' as const },
  // Credit Cards
  { pattern: /visa|mastercard|amex|american express|discover|capital one|chase|citi|bank of america/i, category: 'credit_card' as const },
  // Subscriptions
  { pattern: /netflix|spotify|hulu|disney|amazon prime|apple|google play|subscription/i, category: 'subscription' as const },
  // Medical
  { pattern: /hospital|clinic|medical|doctor|health|pharmacy|cvs|walgreens/i, category: 'medical' as const },
  // Insurance
  { pattern: /insurance|geico|allstate|state farm|progressive|liberty mutual/i, category: 'insurance' as const },
];

function categorizeEmail(sender: string, subject: string): ParsedInvoice['category'] {
  const combined = `${sender} ${subject}`.toLowerCase();
  
  for (const { pattern, category } of FINANCIAL_SENDERS) {
    if (pattern.test(combined)) {
      return category;
    }
  }
  
  return 'other';
}

function extractAmount(text: string): number | null {
  // Look for currency patterns like $123.45 or USD 123.45
  const patterns = [
    /\$\s*([\d,]+\.?\d*)/,
    /USD\s*([\d,]+\.?\d*)/i,
    /amount[:\s]+\$?\s*([\d,]+\.?\d*)/i,
    /total[:\s]+\$?\s*([\d,]+\.?\d*)/i,
    /due[:\s]+\$?\s*([\d,]+\.?\d*)/i,
    /balance[:\s]+\$?\s*([\d,]+\.?\d*)/i,
  ];
  
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      const amount = parseFloat(match[1].replace(/,/g, ''));
      if (!isNaN(amount) && amount > 0 && amount < 100000) {
        return amount;
      }
    }
  }
  
  return null;
}

function extractDueDate(text: string): Date | null {
  // Look for date patterns
  const patterns = [
    // "due date: Jan 15, 2024" or "due by January 15, 2024"
    /due\s*(?:date|by)?[:\s]+(\w+\s+\d{1,2},?\s+\d{4})/i,
    // "due: 01/15/2024" or "due date 01-15-2024"
    /due\s*(?:date)?[:\s]+(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i,
    // "payment due January 15" (assumes current year)
    /payment\s+due\s+(\w+\s+\d{1,2})/i,
    // "by 01/15/2024"
    /by\s+(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i,
  ];
  
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      try {
        const parsed = new Date(match[1]);
        // If year wasn't in the match, it might default to 2001 or similar
        if (parsed.getFullYear() < 2020) {
          parsed.setFullYear(new Date().getFullYear());
        }
        // Only return future dates or dates within the last 30 days
        const now = new Date();
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        if (parsed >= thirtyDaysAgo && !isNaN(parsed.getTime())) {
          return parsed;
        }
      } catch {
        continue;
      }
    }
  }
  
  return null;
}

function extractSenderInfo(headers: any[]): { name: string; email: string } {
  const fromHeader = headers.find((h: any) => h.name.toLowerCase() === 'from');
  if (!fromHeader) {
    return { name: 'Unknown', email: '' };
  }
  
  const value = fromHeader.value;
  // Parse "Name <email@example.com>" format
  const match = value.match(/^(.+?)\s*<(.+?)>$/);
  if (match) {
    return { name: match[1].replace(/"/g, '').trim(), email: match[2] };
  }
  
  // Just an email address
  return { name: value, email: value };
}

export async function scanForInvoices(daysBack: number = 30): Promise<ParsedInvoice[]> {
  const gmail = await getGmailClient();
  
  // Build search query for invoice-related emails
  const afterDate = new Date();
  afterDate.setDate(afterDate.getDate() - daysBack);
  const afterStr = afterDate.toISOString().split('T')[0].replace(/-/g, '/');
  
  // Search for emails with invoice-related keywords
  const query = `after:${afterStr} (${INVOICE_KEYWORDS.map(k => `"${k}"`).join(' OR ')})`;
  
  try {
    const response = await gmail.users.messages.list({
      userId: 'me',
      q: query,
      maxResults: 50,
    });
    
    const messages = response.data.messages || [];
    const invoices: ParsedInvoice[] = [];
    
    for (const msg of messages) {
      try {
        const fullMessage = await gmail.users.messages.get({
          userId: 'me',
          id: msg.id!,
          format: 'metadata',
          metadataHeaders: ['From', 'Subject', 'Date'],
        });
        
        const headers = fullMessage.data.payload?.headers || [];
        const subjectHeader = headers.find((h: any) => h.name.toLowerCase() === 'subject');
        const dateHeader = headers.find((h: any) => h.name.toLowerCase() === 'date');
        
        const subject = subjectHeader?.value || 'No Subject';
        const { name: senderName, email: senderEmail } = extractSenderInfo(headers);
        const snippet = fullMessage.data.snippet || '';
        const receivedAt = dateHeader?.value ? new Date(dateHeader.value) : new Date();
        
        // Combine subject and snippet for parsing
        const textContent = `${subject} ${snippet}`;
        
        const invoice: ParsedInvoice = {
          subject,
          sender: senderName,
          senderEmail,
          amount: extractAmount(textContent),
          dueDate: extractDueDate(textContent),
          messageId: msg.id!,
          receivedAt,
          snippet,
          category: categorizeEmail(senderName, subject),
        };
        
        invoices.push(invoice);
      } catch (err) {
        console.error('Error fetching message:', msg.id, err);
      }
    }
    
    // Sort by received date, newest first
    invoices.sort((a, b) => b.receivedAt.getTime() - a.receivedAt.getTime());
    
    return invoices;
  } catch (error) {
    console.error('Error scanning for invoices:', error);
    throw error;
  }
}
