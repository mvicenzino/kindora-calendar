import { format, startOfWeek, endOfWeek, addDays, isSameDay } from 'date-fns';

interface EventSummary {
  id: string;
  title: string;
  startTime: Date;
  endTime: Date;
  description?: string | null;
  memberNames: string[];
  isAllDay?: boolean;
}

interface WeeklySummaryData {
  familyName: string;
  weekStart: Date;
  weekEnd: Date;
  events: EventSummary[];
  recipientName: string;
}

export function generateWeeklySummaryHtml(data: WeeklySummaryData): string {
  const { familyName, weekStart, weekEnd, events, recipientName } = data;
  
  const weekRange = `${format(weekStart, 'MMM d')}–${format(weekEnd, 'd, yyyy')}`;
  
  const days: { date: Date; events: EventSummary[] }[] = [];
  for (let i = 0; i < 7; i++) {
    const day = addDays(weekStart, i);
    const dayEvents = events.filter(e => isSameDay(new Date(e.startTime), day));
    days.push({ date: day, events: dayEvents });
  }

  const dayRows = days.map(({ date, events: dayEvents }) => {
    const dateHeader = format(date, 'EEEE, MMMM do');
    
    if (dayEvents.length === 0) {
      return `
        <tr>
          <td style="background-color: #e3f2fd; padding: 8px 12px; font-weight: 600; color: #1976d2; border-bottom: 1px solid #bbdefb;">
            ${dateHeader}
          </td>
        </tr>
        <tr>
          <td style="padding: 12px 16px; color: #666; font-style: italic; border-bottom: 1px solid #e0e0e0;">
            No events scheduled
          </td>
        </tr>
      `;
    }

    const eventRows = dayEvents.map(event => {
      const timeStr = event.isAllDay 
        ? 'All Day' 
        : format(new Date(event.startTime), 'h:mm a');
      const members = event.memberNames.length > 0 
        ? `<span style="color: #f44336;">●</span> ${event.memberNames.join(', ')}` 
        : '';
      
      return `
        <tr>
          <td style="padding: 10px 16px; border-bottom: 1px solid #f0f0f0;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="width: 80px; color: #666; font-size: 13px; vertical-align: top;">
                  ${timeStr}
                </td>
                <td style="vertical-align: top;">
                  <div style="font-weight: 500; color: #333; margin-bottom: 2px;">${event.title}</div>
                  ${members ? `<div style="font-size: 12px; color: #666;">${members}</div>` : ''}
                </td>
              </tr>
            </table>
          </td>
        </tr>
      `;
    }).join('');

    return `
      <tr>
        <td style="background-color: #e3f2fd; padding: 8px 12px; font-weight: 600; color: #1976d2; border-bottom: 1px solid #bbdefb;">
          ${dateHeader}
        </td>
      </tr>
      ${eventRows}
    `;
  }).join('');

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your Weekly Agenda</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f5f5f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 20px 0;">
    <tr>
      <td align="center">
        <table width="100%" style="max-width: 600px; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 24px; text-align: center;">
              <div style="font-size: 28px; font-weight: bold; color: white; margin-bottom: 4px;">
                📅 Kindora
              </div>
              <div style="color: rgba(255,255,255,0.9); font-size: 14px;">
                CALENDAR
              </div>
            </td>
          </tr>
          
          <!-- Greeting -->
          <tr>
            <td style="padding: 20px 24px 12px;">
              <div style="color: #333; font-size: 16px;">
                Hi ${recipientName},
              </div>
              <div style="color: #666; font-size: 14px; margin-top: 8px;">
                Here's your family's agenda for <strong>${weekRange}</strong>
              </div>
            </td>
          </tr>
          
          <!-- Family Name -->
          <tr>
            <td style="padding: 0 24px 16px;">
              <div style="display: inline-block; background-color: #f0f4ff; padding: 8px 16px; border-radius: 20px; color: #5c6bc0; font-weight: 600; font-size: 14px;">
                ${familyName}
              </div>
            </td>
          </tr>
          
          <!-- Events Table -->
          <tr>
            <td style="padding: 0 16px 24px;">
              <table width="100%" cellpadding="0" cellspacing="0" style="border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden;">
                ${dayRows}
              </table>
            </td>
          </tr>
          
          <!-- CTA Button -->
          <tr>
            <td style="padding: 0 24px 24px; text-align: center;">
              <a href="${process.env.REPLIT_DOMAINS?.split(',')[0] ? `https://${process.env.REPLIT_DOMAINS.split(',')[0]}` : 'https://kindora.replit.app'}" 
                 style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-decoration: none; padding: 12px 32px; border-radius: 25px; font-weight: 600; font-size: 14px;">
                View Full Calendar
              </a>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #f9f9f9; padding: 16px 24px; text-align: center; border-top: 1px solid #e0e0e0;">
              <div style="color: #999; font-size: 12px;">
                This email was sent by Kindora Calendar.<br>
                You're receiving this because you have weekly summaries enabled.
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

export function generateWeeklySummaryText(data: WeeklySummaryData): string {
  const { familyName, weekStart, weekEnd, events, recipientName } = data;
  
  const weekRange = `${format(weekStart, 'MMM d')}–${format(weekEnd, 'd, yyyy')}`;
  
  let text = `Hi ${recipientName},\n\n`;
  text += `Here's your family's agenda for ${weekRange}\n`;
  text += `Family: ${familyName}\n\n`;
  text += `${'='.repeat(40)}\n\n`;
  
  for (let i = 0; i < 7; i++) {
    const day = addDays(weekStart, i);
    const dayEvents = events.filter(e => isSameDay(new Date(e.startTime), day));
    
    text += `${format(day, 'EEEE, MMMM do')}\n`;
    text += `${'-'.repeat(30)}\n`;
    
    if (dayEvents.length === 0) {
      text += `  No events scheduled\n`;
    } else {
      dayEvents.forEach(event => {
        const timeStr = event.isAllDay 
          ? 'All Day' 
          : format(new Date(event.startTime), 'h:mm a');
        text += `  ${timeStr} - ${event.title}`;
        if (event.memberNames.length > 0) {
          text += ` (${event.memberNames.join(', ')})`;
        }
        text += '\n';
      });
    }
    text += '\n';
  }
  
  text += `${'='.repeat(40)}\n\n`;
  text += `View your full calendar at Kindora\n`;
  
  return text;
}

export async function sendWeeklySummaryEmail(
  toEmail: string,
  htmlContent: string,
  textContent: string,
  weekRange: string
): Promise<{ success: boolean; error?: string }> {
  const sendgridApiKey = process.env.SENDGRID_API_KEY;
  const fromEmail = process.env.EMAIL_FROM_ADDRESS || 'noreply@kindora.app';
  
  if (!sendgridApiKey) {
    return { success: false, error: 'SendGrid API key not configured' };
  }
  
  const subject = `Your agenda for ${weekRange}`;
  
  try {
    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${sendgridApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: toEmail }] }],
        from: { email: fromEmail, name: 'Kindora Calendar' },
        subject: subject,
        content: [
          { type: 'text/plain', value: textContent },
          { type: 'text/html', value: htmlContent }
        ]
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('SendGrid error:', response.status, errorText);
      return { success: false, error: `SendGrid error: ${response.status}` };
    }
    
    return { success: true };
  } catch (error) {
    console.error('Email send error:', error);
    return { success: false, error: String(error) };
  }
}
