import { format, startOfWeek, endOfWeek, addDays, isSameDay } from 'date-fns';
import { storage } from './storage';

// ── Unified email sender (Resend-first, SendGrid fallback) ─────────────────
export async function sendEmail(options: {
  to: string;
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
  fromName?: string;
}): Promise<{ success: boolean; error?: string; provider?: string }> {
  const resendApiKey   = process.env.RESEND_API_KEY;
  const sendgridApiKey = process.env.SENDGRID_API_KEY;
  const fromEmail      = process.env.EMAIL_FROM_ADDRESS || 'noreply@kindora.ai';
  const fromName       = options.fromName || 'Kindora';

  if (resendApiKey) {
    try {
      const body: Record<string, unknown> = {
        from: `${fromName} <${fromEmail}>`,
        to: [options.to],
        subject: options.subject,
        html: options.html,
      };
      if (options.text)    body.text     = options.text;
      if (options.replyTo) body.reply_to = options.replyTo;

      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${resendApiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Resend error:', response.status, errorText);
        let detail = errorText;
        try { const p = JSON.parse(errorText); detail = p.message || p.name || errorText; } catch { /* raw */ }
        return { success: false, error: `Resend ${response.status}: ${detail}` };
      }
      return { success: true, provider: 'resend' };
    } catch (error) {
      console.error('Resend send error:', error);
      return { success: false, error: String(error) };
    }
  }

  if (sendgridApiKey) {
    try {
      const content: { type: string; value: string }[] = [];
      if (options.text) content.push({ type: 'text/plain', value: options.text });
      content.push({ type: 'text/html', value: options.html });

      const body: Record<string, unknown> = {
        personalizations: [{ to: [{ email: options.to }] }],
        from: { email: fromEmail, name: fromName },
        subject: options.subject,
        content,
      };
      if (options.replyTo) body.reply_to = { email: options.replyTo };

      const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${sendgridApiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('SendGrid error:', response.status, errorText);
        let detail = errorText;
        try {
          const p = JSON.parse(errorText);
          const msgs = p?.errors?.map((e: any) => e.message).join('; ');
          if (msgs) detail = msgs;
        } catch { /* raw */ }
        return { success: false, error: `SendGrid ${response.status}: ${detail}` };
      }
      return { success: true, provider: 'sendgrid' };
    } catch (error) {
      console.error('SendGrid send error:', error);
      return { success: false, error: String(error) };
    }
  }

  return { success: false, error: 'No email service configured. Set RESEND_API_KEY or SENDGRID_API_KEY.' };
}

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
  /** IANA timezone the recipient lives in (e.g. "America/New_York"). */
  timezone?: string;
  /** Optional URL for the "View Calendar" button — typically a magic-link
   *  that auto-logs the recipient in. Falls back to the public app URL. */
  calendarUrl?: string;
}

// ─── Timezone-aware formatting helpers ──────────────────────────────────────
// We use native Intl APIs so we don't need date-fns-tz. All "what day is this
// event on" decisions are made in the recipient's timezone, otherwise an
// 11pm event on Sunday in Pacific time would show up under Monday in an
// email rendered server-side in UTC.

export function tzParts(d: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false,
  }).formatToParts(d);
  const get = (t: string) => parts.find(p => p.type === t)?.value ?? "";
  let h = parseInt(get("hour"), 10);
  // Some Intl impls return "24" for midnight; normalize to 0.
  if (h === 24) h = 0;
  return {
    y: parseInt(get("year"), 10),
    mo: parseInt(get("month"), 10),
    d: parseInt(get("day"), 10),
    h,
    mi: parseInt(get("minute"), 10),
    s: parseInt(get("second"), 10),
  };
}

export function tzDayKey(d: Date, timeZone: string): string {
  const { y, mo, d: dd } = tzParts(d, timeZone);
  return `${y}-${String(mo).padStart(2, "0")}-${String(dd).padStart(2, "0")}`;
}

// Returns the offset (in minutes) such that local-time = utc-time + offset
// for the given instant in the given IANA timezone.
function offsetMinutes(date: Date, timeZone: string): number {
  const p = tzParts(date, timeZone);
  const localAsUtc = Date.UTC(p.y, p.mo - 1, p.d, p.h, p.mi, p.s);
  return Math.round((localAsUtc - date.getTime()) / 60000);
}

// Computes the UTC instant that maps to (year, month, day, hh:mm) local time
// in the given IANA timezone. Iterates twice to handle DST boundaries.
export function instantForLocalDateTime(
  y: number, m: number, d: number, hh: number, mi: number, tz: string,
): Date {
  let utcMs = Date.UTC(y, m - 1, d, hh, mi, 0);
  let off = offsetMinutes(new Date(utcMs), tz);
  utcMs = Date.UTC(y, m - 1, d, hh, mi, 0) - off * 60000;
  off = offsetMinutes(new Date(utcMs), tz);
  utcMs = Date.UTC(y, m - 1, d, hh, mi, 0) - off * 60000;
  return new Date(utcMs);
}

// Returns the recipient-local Sun..Sat week containing `now`, in the given tz.
//   - weekStart: a Date instant corresponding to noon-local on Sunday
//   - weekEnd:   a Date instant corresponding to noon-local on Saturday
//   - dayKeys:   the 7 YYYY-MM-DD strings for Sun..Sat (in tz)
// Anchoring at noon-local (instead of midnight) keeps `addDays(weekStart, i)`
// safely on the same local calendar date even across DST transitions.
export function getLocalWeekInTz(
  now: Date, tz: string,
): { weekStart: Date; weekEnd: Date; dayKeys: string[] } {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    year: "numeric", month: "2-digit", day: "2-digit", weekday: "short",
  });
  const parts = fmt.formatToParts(now);
  const get = (t: string) => parts.find(p => p.type === t)?.value ?? "";
  const y = parseInt(get("year"), 10);
  const m = parseInt(get("month"), 10);
  const d = parseInt(get("day"), 10);
  const wdIdx = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].indexOf(get("weekday"));

  // Walk back wdIdx days to get Sunday's local date. We use UTC arithmetic on
  // a Date built from the local Y/M/D — these objects are only used to compute
  // calendar arithmetic; we never treat them as real instants.
  const todayUtcMs = Date.UTC(y, m - 1, d);
  const dayKeys: string[] = [];
  for (let i = 0; i < 7; i++) {
    const dt = new Date(todayUtcMs + (i - wdIdx) * 86400000);
    dayKeys.push(
      `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, "0")}-${String(dt.getUTCDate()).padStart(2, "0")}`,
    );
  }

  const [sunY, sunM, sunD] = dayKeys[0].split("-").map(Number);
  const [satY, satM, satD] = dayKeys[6].split("-").map(Number);
  const weekStart = instantForLocalDateTime(sunY, sunM, sunD, 12, 0, tz);
  const weekEnd   = instantForLocalDateTime(satY, satM, satD, 12, 0, tz);
  return { weekStart, weekEnd, dayKeys };
}

// True if the given event end-time falls at 23:58 or 23:59 local time in `tz`.
// All-day events created in the app use that end-of-day convention.
export function isAllDayInTz(endTime: Date, tz: string): boolean {
  const { h, mi } = tzParts(endTime, tz);
  return h === 23 && mi >= 58;
}

function fmtTime(d: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone, hour: "numeric", minute: "2-digit", hour12: true,
  }).format(d).toLowerCase().replace(" ", "");
  // e.g. "9:30am" — compact format that matches the existing email aesthetic
}

function fmtTimeWithSpace(d: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone, hour: "numeric", minute: "2-digit", hour12: true,
  }).format(d);
  // e.g. "9:30 AM"
}

function fmtDateHeader(d: Date, timeZone: string): string {
  // "Monday, December 9th"
  const base = new Intl.DateTimeFormat("en-US", {
    timeZone, weekday: "long", month: "long", day: "numeric",
  }).format(d);
  // append ordinal suffix to the day number
  const day = parseInt(new Intl.DateTimeFormat("en-US", { timeZone, day: "numeric" }).format(d), 10);
  const suffix = (() => {
    if (day >= 11 && day <= 13) return "th";
    switch (day % 10) { case 1: return "st"; case 2: return "nd"; case 3: return "rd"; default: return "th"; }
  })();
  return base.replace(String(day), `${day}${suffix}`);
}

function fmtWeekRange(start: Date, end: Date, timeZone: string): string {
  const startStr = new Intl.DateTimeFormat("en-US", {
    timeZone, month: "short", day: "numeric",
  }).format(start);
  const endParts = tzParts(end, timeZone);
  return `${startStr}–${endParts.d}, ${endParts.y}`;
}

function tzShortName(timeZone: string): string {
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone, timeZoneName: "short",
    }).formatToParts(new Date());
    return parts.find(p => p.type === "timeZoneName")?.value ?? "";
  } catch {
    return "";
  }
}

export function generateWeeklySummaryHtml(data: WeeklySummaryData): string {
  const { familyName, weekStart, weekEnd, events, recipientName } = data;
  const tz = data.timezone || "America/New_York";
  const calendarUrl = data.calendarUrl
    || (process.env.REPLIT_DOMAINS?.split(',')[0]
      ? `https://${process.env.REPLIT_DOMAINS.split(',')[0]}`
      : 'https://kindora.replit.app');

  const weekRange = fmtWeekRange(weekStart, weekEnd, tz);
  const tzLabel = tzShortName(tz);

  // Group events by their date in the recipient's timezone, not the server's.
  const eventsByDay = new Map<string, EventSummary[]>();
  for (const ev of events) {
    const key = tzDayKey(new Date(ev.startTime), tz);
    if (!eventsByDay.has(key)) eventsByDay.set(key, []);
    eventsByDay.get(key)!.push(ev);
  }

  const days: { date: Date; events: EventSummary[] }[] = [];
  for (let i = 0; i < 7; i++) {
    const day = addDays(weekStart, i);
    const dayEvents = eventsByDay.get(tzDayKey(day, tz)) ?? [];
    days.push({ date: day, events: dayEvents });
  }

  const dayRows = days.map(({ date, events: dayEvents }) => {
    const dateHeader = fmtDateHeader(date, tz);

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
        : fmtTimeWithSpace(new Date(event.startTime), tz);
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
              <a href="${calendarUrl}" 
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
  const tz = data.timezone || "America/New_York";
  const tzLabel = tzShortName(tz);
  const calendarUrl = data.calendarUrl
    || (process.env.REPLIT_DOMAINS?.split(',')[0]
      ? `https://${process.env.REPLIT_DOMAINS.split(',')[0]}`
      : 'https://kindora.replit.app');

  const weekRange = fmtWeekRange(weekStart, weekEnd, tz);

  // Group by recipient-local day, same as HTML version.
  const eventsByDay = new Map<string, EventSummary[]>();
  for (const ev of events) {
    const key = tzDayKey(new Date(ev.startTime), tz);
    if (!eventsByDay.has(key)) eventsByDay.set(key, []);
    eventsByDay.get(key)!.push(ev);
  }

  let text = `Hi ${recipientName},\n\n`;
  text += `Here's your family's agenda for ${weekRange}\n`;
  text += `Family: ${familyName}\n`;
  if (tzLabel) text += `Times in ${tzLabel}\n`;
  text += `\n${'='.repeat(40)}\n\n`;

  for (let i = 0; i < 7; i++) {
    const day = addDays(weekStart, i);
    const dayEvents = eventsByDay.get(tzDayKey(day, tz)) ?? [];

    text += `${fmtDateHeader(day, tz)}\n`;
    text += `${'-'.repeat(30)}\n`;

    if (dayEvents.length === 0) {
      text += `  No events scheduled\n`;
    } else {
      dayEvents.forEach(event => {
        const timeStr = event.isAllDay
          ? 'All Day'
          : fmtTimeWithSpace(new Date(event.startTime), tz);
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
  text += `View your full calendar: ${calendarUrl}\n`;

  return text;
}

export async function sendWeeklySummaryEmail(
  toEmail: string,
  htmlContent: string,
  textContent: string,
  weekRange: string
): Promise<{ success: boolean; error?: string }> {
  return sendEmail({
    to: toEmail,
    subject: `Your agenda for ${weekRange}`,
    html: htmlContent,
    text: textContent,
    fromName: 'Kindora Calendar',
  });
}

interface EmergencyBridgeEmailData {
  recipientEmail: string;
  recipientName: string;
  familyName: string;
  senderName: string;
  accessLink: string;
  expiresInHours: number;
  label: string;
}

export function generateEmergencyBridgeHtml(data: EmergencyBridgeEmailData): string {
  const { recipientName, familyName, senderName, accessLink, expiresInHours, label } = data;
  
  const durationText = expiresInHours >= 24 
    ? `${Math.floor(expiresInHours / 24)} days` 
    : `${expiresInHours} hours`;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Emergency Access to ${familyName}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #1a1d2e; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #1a1d2e; padding: 24px 0;">
    <tr>
      <td align="center">
        <table width="100%" style="max-width: 600px; background: linear-gradient(180deg, rgba(249,115,22,0.15) 0%, rgba(255,255,255,0.04) 100%); border-radius: 16px; overflow: hidden; border: 1px solid rgba(249,115,22,0.3);">
          <!-- Header -->
          <tr>
            <td style="background: rgba(249,115,22,0.2); padding: 20px 24px; border-bottom: 1px solid rgba(249,115,22,0.3);">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <table cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="vertical-align: middle;">
                          <div style="width: 40px; height: 40px; background: linear-gradient(135deg, #f97316 0%, #fb923c 100%); border-radius: 10px; display: inline-block; text-align: center; line-height: 40px;">
                            <span style="font-size: 20px; color: white;">🛡️</span>
                          </div>
                        </td>
                        <td style="vertical-align: middle; padding-left: 12px;">
                          <div style="font-size: 22px; font-weight: 800; color: #fdba74; letter-spacing: -0.3px;">
                            Emergency Bridge
                          </div>
                          <div style="color: rgba(255,255,255,0.5); font-size: 10px; text-transform: uppercase; letter-spacing: 1.5px; font-weight: 500; margin-top: -2px;">
                            Kindora Calendar
                          </div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 28px 24px;">
              <div style="color: rgba(255,255,255,0.9); font-size: 16px; font-weight: 500; margin-bottom: 16px;">
                Hi ${recipientName || 'there'},
              </div>
              <div style="color: rgba(255,255,255,0.7); font-size: 14px; line-height: 1.6; margin-bottom: 20px;">
                <strong style="color: rgba(255,255,255,0.9);">${senderName}</strong> has shared temporary emergency access to the <strong style="color: #fdba74;">${familyName}</strong> family calendar with you.
              </div>
              
              <div style="background: rgba(249,115,22,0.15); border: 1px solid rgba(249,115,22,0.3); border-radius: 12px; padding: 16px; margin-bottom: 20px;">
                <div style="color: #fdba74; font-weight: 600; font-size: 14px; margin-bottom: 8px;">
                  ${label}
                </div>
                <div style="color: rgba(255,255,255,0.6); font-size: 13px;">
                  ⏱️ This access expires in <strong style="color: rgba(255,255,255,0.9);">${durationText}</strong>
                </div>
              </div>
              
              <div style="color: rgba(255,255,255,0.7); font-size: 14px; line-height: 1.6; margin-bottom: 24px;">
                You can view:
                <ul style="margin: 10px 0; padding-left: 20px; color: rgba(255,255,255,0.8);">
                  <li style="margin-bottom: 6px;">📅 Upcoming schedule & events</li>
                  <li style="margin-bottom: 6px;">💊 Medications and care needs</li>
                  <li style="margin-bottom: 6px;">👨‍👩‍👧‍👦 Family member details & emergency contacts</li>
                  <li>📄 Important care documents</li>
                </ul>
              </div>
            </td>
          </tr>
          
          <!-- CTA Button -->
          <tr>
            <td style="padding: 0 24px 28px; text-align: center;">
              <a href="${accessLink}" 
                 style="display: inline-block; background: linear-gradient(135deg, #f97316 0%, #fb923c 100%); color: white; text-decoration: none; padding: 16px 40px; border-radius: 25px; font-weight: 600; font-size: 15px; box-shadow: 0 4px 12px rgba(249, 115, 22, 0.4);">
                Access Emergency Info
              </a>
            </td>
          </tr>
          
          <!-- Security Note -->
          <tr>
            <td style="padding: 0 24px 24px;">
              <div style="background: rgba(0,0,0,0.2); border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; padding: 14px; text-align: center;">
                <div style="color: rgba(255,255,255,0.5); font-size: 12px;">
                  🔒 This link is private and expires automatically. Do not share with others.
                </div>
              </div>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background: rgba(0,0,0,0.15); padding: 20px 24px; text-align: center; border-top: 1px solid rgba(255,255,255,0.08);">
              <div style="color: #fdba74; font-weight: 600; font-size: 13px; margin-bottom: 4px;">
                Kindora
              </div>
              <div style="color: rgba(255,255,255,0.4); font-size: 11px;">
                Keeping families connected &amp; organized
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

export function generateEmergencyBridgeText(data: EmergencyBridgeEmailData): string {
  const { recipientName, familyName, senderName, accessLink, expiresInHours, label } = data;
  
  const durationText = expiresInHours >= 24 
    ? `${Math.floor(expiresInHours / 24)} days` 
    : `${expiresInHours} hours`;

  return `
Hi ${recipientName || 'there'},

${senderName} has shared temporary emergency access to the ${familyName} family calendar with you.

${label}
This access expires in ${durationText}.

You can view:
- Upcoming schedule & events
- Medications and care needs
- Family member details & emergency contacts
- Important care documents

Access Emergency Info: ${accessLink}

This link is private and expires automatically. Do not share with others.

---
Kindora - Keeping families connected & organized
  `.trim();
}

export async function sendEmergencyBridgeEmail(
  data: EmergencyBridgeEmailData
): Promise<{ success: boolean; error?: string }> {
  return sendEmail({
    to: data.recipientEmail,
    subject: `Emergency access to ${data.familyName} shared with you`,
    html: generateEmergencyBridgeHtml(data),
    text: generateEmergencyBridgeText(data),
    fromName: 'Kindora Calendar',
  });
}

// ── Welcome Email ────────────────────────────────────────────────────────────

function generateWelcomeHtml(firstName: string): string {
  const name = firstName || 'there';
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to Kindora</title>
</head>
<body style="margin: 0; padding: 0; background-color: #1a1d2e; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #1a1d2e; padding: 24px 0;">
    <tr>
      <td align="center">
        <table width="100%" style="max-width: 560px; background: linear-gradient(180deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.04) 100%); border-radius: 16px; overflow: hidden; border: 1px solid rgba(255,255,255,0.1);">

          <!-- Header -->
          <tr>
            <td style="background: rgba(0,0,0,0.2); padding: 20px 28px; border-bottom: 1px solid rgba(255,255,255,0.1);">
              <table cellpadding="0" cellspacing="0">
                <tr>
                  <td style="vertical-align: middle;">
                    <div style="width: 40px; height: 40px; background: linear-gradient(135deg, #f97316 0%, #fb923c 100%); border-radius: 10px; display: inline-block; text-align: center; line-height: 40px; font-size: 20px;">K</div>
                  </td>
                  <td style="vertical-align: middle; padding-left: 12px;">
                    <div style="font-size: 22px; font-weight: 800; color: #fdba74; letter-spacing: -0.3px;">Kindora</div>
                    <div style="color: rgba(255,255,255,0.4); font-size: 10px; text-transform: uppercase; letter-spacing: 1.5px; font-weight: 500; margin-top: -2px;">Family OS</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 32px 28px 28px;">
              <div style="color: rgba(255,255,255,0.9); font-size: 16px; font-weight: 500; margin-bottom: 20px;">
                Hey ${name},
              </div>
              <div style="color: rgba(255,255,255,0.75); font-size: 15px; line-height: 1.7;">
                Just wanted to reach out personally — welcome to Kindora. Really glad you found your way here.
              </div>
              <div style="color: rgba(255,255,255,0.75); font-size: 15px; line-height: 1.7; margin-top: 16px;">
                I built this because managing a family's life across a dozen different apps was driving me crazy, and I figured I couldn't be the only one. The fact that you signed up tells me you probably get it.
              </div>
              <div style="color: rgba(255,255,255,0.75); font-size: 15px; line-height: 1.7; margin-top: 16px;">
                As you poke around, I'd genuinely love to hear what you think — what's clicking, what's confusing, what you wish it did that it doesn't yet. You're early, which means your feedback actually shapes what gets built next.
              </div>
              <div style="color: rgba(255,255,255,0.75); font-size: 15px; line-height: 1.7; margin-top: 16px;">
                Feel free to reply directly to this email. I read every one.
              </div>
              <div style="color: rgba(255,255,255,0.75); font-size: 15px; line-height: 1.7; margin-top: 24px;">
                Thanks for being here at the beginning.
              </div>
              <div style="margin-top: 24px;">
                <div style="color: rgba(255,255,255,0.9); font-size: 15px; font-weight: 600;">— Mike</div>
                <div style="color: rgba(255,255,255,0.45); font-size: 13px; margin-top: 4px;">Founder, Kindora</div>
                <div style="margin-top: 4px;">
                  <a href="https://kindora.ai" style="color: #fdba74; font-size: 13px; text-decoration: none;">kindora.ai</a>
                </div>
              </div>
            </td>
          </tr>

          <!-- CTA -->
          <tr>
            <td style="padding: 0 28px 32px; text-align: center;">
              <a href="https://kindora.ai"
                 style="display: inline-block; background: linear-gradient(135deg, #f97316 0%, #fb923c 100%); color: white; text-decoration: none; padding: 14px 36px; border-radius: 25px; font-weight: 600; font-size: 14px; box-shadow: 0 4px 12px rgba(249,115,22,0.35);">
                Get started with Kindora
              </a>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background: rgba(0,0,0,0.15); padding: 18px 28px; text-align: center; border-top: 1px solid rgba(255,255,255,0.08);">
              <div style="color: rgba(255,255,255,0.3); font-size: 11px;">
                You're receiving this because you created a Kindora account.<br>
                <a href="https://kindora.ai" style="color: rgba(255,255,255,0.3); text-decoration: none;">kindora.ai</a>
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

function generateWelcomeText(firstName: string): string {
  const name = firstName || 'there';
  return `
Hey ${name},

Just wanted to reach out personally — welcome to Kindora. Really glad you found your way here.

I built this because managing a family's life across a dozen different apps was driving me crazy, and I figured I couldn't be the only one. The fact that you signed up tells me you probably get it.

As you poke around, I'd genuinely love to hear what you think — what's clicking, what's confusing, what you wish it did that it doesn't yet. You're early, which means your feedback actually shapes what gets built next.

Feel free to reply directly to this email. I read every one.

Thanks for being here at the beginning.

— Mike
Founder, Kindora
kindora.ai
  `.trim();
}

export async function sendWelcomeEmail(
  userId: string,
  toEmail: string,
  firstName: string
): Promise<{ success: boolean; error?: string; skipped?: boolean }> {
  // Two-phase idempotent send:
  //   1. Atomically CLAIM (set welcomeEmailClaimedAt only if both claimedAt
  //      and sentAt are NULL). Only one concurrent caller can win.
  //   2. Send the email.
  //   3. On success → mark welcomeEmailSentAt.
  //      On failure → release the claim so a future attempt can retry.
  // Fail closed on storage errors: never send if we can't safely claim.
  let claimed = false;
  try {
    claimed = await storage.claimWelcomeEmailSend(userId);
  } catch (err) {
    console.error('[Welcome Email] Failed to claim welcome send (fail-closed):', err);
    return { success: false, error: 'claim_failed', skipped: true };
  }

  if (!claimed) {
    return { success: true, skipped: true };
  }

  const result = await sendEmail({
    to: toEmail,
    subject: 'Welcome to Kindora',
    html: generateWelcomeHtml(firstName),
    text: generateWelcomeText(firstName),
    fromName: 'Mike at Kindora',
    replyTo: 'mike@kindora.ai',
  });

  if (result.success) {
    try {
      await storage.markWelcomeEmailSent(userId);
    } catch (err) {
      console.error('[Welcome Email] Failed to mark welcomeEmailSentAt:', err);
    }
  } else {
    try {
      await storage.releaseWelcomeEmailClaim(userId);
    } catch (err) {
      console.error('[Welcome Email] Failed to release welcome claim:', err);
    }
  }

  return result;
}
