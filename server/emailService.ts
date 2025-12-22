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
          <td style="background: linear-gradient(135deg, #f3f0ff 0%, #ede9fe 100%); padding: 10px 14px; font-weight: 600; color: #7c3aed; border-bottom: 1px solid #ddd6fe;">
            ${dateHeader}
          </td>
        </tr>
        <tr>
          <td style="padding: 12px 16px; color: #888; font-style: italic; border-bottom: 1px solid #f0f0f0;">
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
        ? `<span style="color: #fdba74;">●</span> ${event.memberNames.join(', ')}` 
        : '';
      
      return `
        <tr>
          <td style="padding: 12px 16px; border-bottom: 1px solid #f5f5f5;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="width: 80px; color: #7c3aed; font-size: 13px; font-weight: 500; vertical-align: top;">
                  ${timeStr}
                </td>
                <td style="vertical-align: top;">
                  <div style="font-weight: 600; color: #333; margin-bottom: 2px;">${event.title}</div>
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
        <td style="background: linear-gradient(135deg, #f3f0ff 0%, #ede9fe 100%); padding: 10px 14px; font-weight: 600; color: #7c3aed; border-bottom: 1px solid #ddd6fe;">
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
<body style="margin: 0; padding: 0; background-color: #1a1a2e; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #1a1a2e; padding: 20px 0;">
    <tr>
      <td align="center">
        <table width="100%" style="max-width: 600px; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.25);">
          <!-- Header with Kindora Branding -->
          <tr>
            <td style="background: linear-gradient(135deg, #7c3aed 0%, #8b5cf6 50%, #a855f7 100%); padding: 28px 24px; text-align: center;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <!-- Logo Icon -->
                    <div style="width: 56px; height: 56px; background: rgba(255,255,255,0.15); border-radius: 12px; display: inline-block; margin-bottom: 12px; line-height: 56px;">
                      <span style="font-size: 28px;">📅</span>
                    </div>
                  </td>
                </tr>
                <tr>
                  <td align="center">
                    <div style="font-size: 32px; font-weight: 800; color: #fdba74; letter-spacing: -0.5px; margin-bottom: 4px;">
                      Kindora
                    </div>
                    <div style="color: rgba(255,255,255,0.85); font-size: 13px; text-transform: uppercase; letter-spacing: 2px; font-weight: 500;">
                      Family Calendar
                    </div>
                  </td>
                </tr>
              </table>
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
              <div style="display: inline-block; background: linear-gradient(135deg, #f3f0ff 0%, #ede9fe 100%); padding: 8px 18px; border-radius: 20px; color: #7c3aed; font-weight: 600; font-size: 14px; border: 1px solid #ddd6fe;">
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
                 style="display: inline-block; background: linear-gradient(135deg, #7c3aed 0%, #8b5cf6 50%, #a855f7 100%); color: white; text-decoration: none; padding: 14px 36px; border-radius: 25px; font-weight: 600; font-size: 14px; box-shadow: 0 4px 12px rgba(124, 58, 237, 0.3);">
                View Full Calendar
              </a>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background: linear-gradient(135deg, #f8f7ff 0%, #f3f1ff 100%); padding: 20px 24px; text-align: center; border-top: 1px solid #e8e5f0;">
              <div style="color: #7c3aed; font-weight: 600; font-size: 13px; margin-bottom: 4px;">
                Kindora
              </div>
              <div style="color: #888; font-size: 11px;">
                Keeping families connected &amp; organized<br>
                <span style="color: #aaa;">You're receiving this because you have weekly summaries enabled.</span>
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
