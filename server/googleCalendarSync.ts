import { storage } from "./storage";
import { format, addDays } from "date-fns";

const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GCAL_API = "https://www.googleapis.com/calendar/v3";

export interface GCalCalendar {
  id: string;
  summary: string;
  description?: string;
  backgroundColor?: string;
  primary?: boolean;
  selected?: boolean;
}

export interface GCalEvent {
  id: string;
  summary?: string;
  description?: string;
  start: { dateTime?: string; date?: string; timeZone?: string };
  end: { dateTime?: string; date?: string; timeZone?: string };
  status?: string;
  recurrence?: string[];
}

// Resolve the calendar-specific callback URL
export function resolveCalendarCallbackURL(): string {
  if (process.env.GOOGLE_CALENDAR_CALLBACK_URL) return process.env.GOOGLE_CALENDAR_CALLBACK_URL;
  if (process.env.NODE_ENV === "production") return "https://kindora.ai/api/google-calendar/callback";
  const domain = (process.env.REPLIT_DOMAINS || "").split(",")[0].trim();
  return domain
    ? `https://${domain}/api/google-calendar/callback`
    : "http://localhost:5000/api/google-calendar/callback";
}

// Get a valid access token, refreshing if needed
export async function getValidAccessToken(userId: string): Promise<string> {
  const conn = await storage.getGoogleCalendarConnection(userId);
  if (!conn) throw new Error("No Google Calendar connection found");

  const now = new Date();
  // Use cached token if still valid (with 60s buffer)
  if (conn.accessToken && conn.accessTokenExpiresAt && conn.accessTokenExpiresAt > new Date(now.getTime() + 60_000)) {
    return conn.accessToken;
  }

  // Refresh the token
  const body = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    client_secret: process.env.GOOGLE_CLIENT_SECRET!,
    refresh_token: conn.refreshToken,
    grant_type: "refresh_token",
  });

  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  const data = await res.json() as any;
  if (!res.ok || !data.access_token) {
    throw new Error(`Token refresh failed: ${JSON.stringify(data)}`);
  }

  const expiresAt = new Date(now.getTime() + (data.expires_in ?? 3600) * 1000);
  await storage.updateGoogleCalendarConnection(userId, {
    accessToken: data.access_token,
    accessTokenExpiresAt: expiresAt,
  });

  return data.access_token;
}

// List all calendars for the user
export async function listCalendars(accessToken: string): Promise<GCalCalendar[]> {
  const res = await fetch(`${GCAL_API}/users/me/calendarList?maxResults=250`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const data = await res.json() as any;
  if (!res.ok) throw new Error(`Failed to list calendars: ${JSON.stringify(data)}`);
  return (data.items ?? []).map((c: any) => ({
    id: c.id,
    summary: c.summary,
    description: c.description,
    backgroundColor: c.backgroundColor,
    primary: c.primary ?? false,
    selected: c.selected ?? false,
  }));
}

// Fetch events from a single Google Calendar
async function fetchCalendarEvents(accessToken: string, calendarId: string): Promise<GCalEvent[]> {
  // Sync 90 days back and 365 days forward
  const timeMin = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
  const timeMax = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();

  const params = new URLSearchParams({
    maxResults: "500",
    singleEvents: "true", // Expand recurring events into individual instances
    orderBy: "startTime",
    timeMin,
    timeMax,
  });

  const res = await fetch(`${GCAL_API}/calendars/${encodeURIComponent(calendarId)}/events?${params}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const data = await res.json() as any;
  if (!res.ok) {
    console.error(`[GCalSync] Failed to fetch events for ${calendarId}:`, data);
    return [];
  }
  return (data.items ?? []).filter((e: any) => e.status !== "cancelled");
}

// Map a Google Calendar event to a Kindora event payload
function mapGCalEvent(gEvent: GCalEvent, familyId: string, color: string) {
  const startRaw = gEvent.start.dateTime ?? gEvent.start.date;
  const endRaw = gEvent.end.dateTime ?? gEvent.end.date;

  if (!startRaw) return null;

  let startTime: Date;
  let endTime: Date;

  // All-day events have date-only strings (no time)
  if (gEvent.start.dateTime) {
    startTime = new Date(startRaw);
    endTime = endRaw ? new Date(endRaw) : new Date(startTime.getTime() + 60 * 60 * 1000);
  } else {
    // All-day: parse as midnight UTC
    startTime = new Date(startRaw + "T00:00:00Z");
    endTime = endRaw
      ? new Date(endRaw + "T00:00:00Z")
      : new Date(startTime.getTime() + 24 * 60 * 60 * 1000);
  }

  if (isNaN(startTime.getTime())) return null;

  return {
    familyId,
    title: gEvent.summary || "(No title)",
    description: gEvent.description ?? null,
    startTime,
    endTime,
    memberIds: [] as string[],
    color,
    category: "other" as const,
    completed: false,
    isImportant: false,
    googleEventId: gEvent.id,
  };
}

// Palette to assign a distinct color per calendar
const CALENDAR_COLORS = [
  "#4285f4", "#ea4335", "#fbbc04", "#34a853",
  "#ff6d00", "#46bdc6", "#7986cb", "#d50000",
];

// Main sync function: pull selected calendars into Kindora
export async function syncGoogleCalendars(userId: string, familyId: string): Promise<{
  created: number; updated: number; skipped: number; errors: string[];
}> {
  const conn = await storage.getGoogleCalendarConnection(userId);
  if (!conn || conn.selectedCalendarIds.length === 0) {
    return { created: 0, updated: 0, skipped: 0, errors: ["No calendars selected"] };
  }

  const accessToken = await getValidAccessToken(userId);
  let created = 0;
  let updated = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (let i = 0; i < conn.selectedCalendarIds.length; i++) {
    const calId = conn.selectedCalendarIds[i];
    const color = CALENDAR_COLORS[i % CALENDAR_COLORS.length];

    try {
      const gEvents = await fetchCalendarEvents(accessToken, calId);

      for (const gEvent of gEvents) {
        const payload = mapGCalEvent(gEvent, familyId, color);
        if (!payload) { skipped++; continue; }

        try {
          // Check if we already have this event (by Google event ID)
          const existing = await storage.getEventByGoogleId(familyId, gEvent.id);
          if (existing) {
            // Update title/times in case they changed
            await storage.updateEvent(existing.id, familyId, {
              title: payload.title,
              description: payload.description,
              startTime: payload.startTime,
              endTime: payload.endTime,
            });
            updated++;
          } else {
            await storage.createEvent(familyId, payload);
            created++;
          }
        } catch (err) {
          console.error(`[GCalSync] Error processing event ${gEvent.id}:`, err);
          errors.push(`Event "${gEvent.summary}": ${String(err)}`);
        }
      }
    } catch (err) {
      console.error(`[GCalSync] Error fetching calendar ${calId}:`, err);
      errors.push(`Calendar ${calId}: ${String(err)}`);
    }
  }

  // Update last synced timestamp
  await storage.updateGoogleCalendarConnection(userId, { lastSyncedAt: new Date() });

  console.log(`[GCalSync] Done — created=${created} updated=${updated} skipped=${skipped} errors=${errors.length}`);
  return { created, updated, skipped, errors };
}
