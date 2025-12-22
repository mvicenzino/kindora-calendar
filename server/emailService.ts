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
          <td style="background: rgba(255,255,255,0.05); padding: 12px 16px; font-weight: 600; color: rgba(255,255,255,0.9); border-bottom: 1px solid rgba(255,255,255,0.08);">
            ${dateHeader}
          </td>
        </tr>
        <tr>
          <td style="padding: 14px 16px; color: rgba(255,255,255,0.4); font-style: italic; border-bottom: 1px solid rgba(255,255,255,0.05);">
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
          <td style="padding: 14px 16px; border-bottom: 1px solid rgba(255,255,255,0.05);">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="width: 80px; color: #60a5fa; font-size: 13px; font-weight: 500; vertical-align: top;">
                  ${timeStr}
                </td>
                <td style="vertical-align: top;">
                  <div style="font-weight: 600; color: rgba(255,255,255,0.9); margin-bottom: 3px;">${event.title}</div>
                  ${members ? `<div style="font-size: 12px; color: rgba(255,255,255,0.5);">${members}</div>` : ''}
                </td>
              </tr>
            </table>
          </td>
        </tr>
      `;
    }).join('');

    return `
      <tr>
        <td style="background: rgba(255,255,255,0.05); padding: 12px 16px; font-weight: 600; color: rgba(255,255,255,0.9); border-bottom: 1px solid rgba(255,255,255,0.08);">
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
<body style="margin: 0; padding: 0; background-color: #1a1d2e; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #1a1d2e; padding: 24px 0;">
    <tr>
      <td align="center">
        <table width="100%" style="max-width: 600px; background: linear-gradient(180deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.04) 100%); border-radius: 16px; overflow: hidden; border: 1px solid rgba(255,255,255,0.1);">
          <!-- Header with Kindora Branding - matching app header -->
          <tr>
            <td style="background: rgba(0,0,0,0.2); padding: 20px 24px; border-bottom: 1px solid rgba(255,255,255,0.1);">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <table cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="vertical-align: middle;">
                          <!-- Orange Logo Icon -->
                          <div style="width: 40px; height: 40px; background: linear-gradient(135deg, #f97316 0%, #fb923c 100%); border-radius: 10px; display: inline-block; text-align: center; line-height: 40px;">
                            <span style="font-size: 20px;">📅</span>
                          </div>
                        </td>
                        <td style="vertical-align: middle; padding-left: 12px;">
                          <div style="font-size: 22px; font-weight: 800; color: #fdba74; letter-spacing: -0.3px;">
                            Kindora
                          </div>
                          <div style="color: rgba(255,255,255,0.5); font-size: 10px; text-transform: uppercase; letter-spacing: 1.5px; font-weight: 500; margin-top: -2px;">
                            Calendar
                          </div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Greeting -->
          <tr>
            <td style="padding: 24px 24px 12px;">
              <div style="color: rgba(255,255,255,0.9); font-size: 16px; font-weight: 500;">
                Hi ${recipientName},
              </div>
              <div style="color: rgba(255,255,255,0.6); font-size: 14px; margin-top: 8px;">
                Here's your family's agenda for <strong style="color: rgba(255,255,255,0.9);">${weekRange}</strong>
              </div>
            </td>
          </tr>
          
          <!-- Family Name -->
          <tr>
            <td style="padding: 0 24px 20px;">
              <div style="display: inline-block; background: rgba(249, 115, 22, 0.15); padding: 8px 18px; border-radius: 20px; color: #fdba74; font-weight: 600; font-size: 14px; border: 1px solid rgba(249, 115, 22, 0.3);">
                ${familyName}
              </div>
            </td>
          </tr>
          
          <!-- Events Table -->
          <tr>
            <td style="padding: 0 16px 24px;">
              <table width="100%" cellpadding="0" cellspacing="0" style="background: rgba(0,0,0,0.2); border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; overflow: hidden;">
                ${dayRows}
              </table>
            </td>
          </tr>
          
          <!-- CTA Button -->
          <tr>
            <td style="padding: 0 24px 28px; text-align: center;">
              <a href="${process.env.REPLIT_DOMAINS?.split(',')[0] ? `https://${process.env.REPLIT_DOMAINS.split(',')[0]}` : 'https://kindora.replit.app'}" 
                 style="display: inline-block; background: linear-gradient(135deg, #3b82f6 0%, #60a5fa 100%); color: white; text-decoration: none; padding: 14px 36px; border-radius: 25px; font-weight: 600; font-size: 14px; box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);">
                View Full Calendar
              </a>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background: rgba(0,0,0,0.15); padding: 20px 24px; text-align: center; border-top: 1px solid rgba(255,255,255,0.08);">
              <div style="color: #fdba74; font-weight: 600; font-size: 13px; margin-bottom: 4px;">
                Kindora
              </div>
              <div style="color: rgba(255,255,255,0.4); font-size: 11px;">
                Keeping families connected &amp; organized<br>
                <span style="color: rgba(255,255,255,0.3);">You're receiving this because you have weekly summaries enabled.</span>
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
