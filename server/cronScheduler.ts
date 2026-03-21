/**
 * Kindora internal cron scheduler.
 * Fires the weekly summary email job every Sunday at 08:00 ET.
 * Runs inside the Express process — no external cron service needed.
 */

const CHECK_INTERVAL_MS = 60 * 1000; // check every minute
let lastFiredDate = ""; // "YYYY-MM-DD" — prevents double-fire on the same day

function getNowInET(): { dayOfWeek: number; hour: number; minute: number; dateStr: string } {
  const now = new Date();
  // Use Intl to convert to America/New_York (handles EST/EDT automatically)
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    weekday: "short",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(now);

  const get = (type: string) => parts.find(p => p.type === type)?.value ?? "";

  const weekdayMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  const dayOfWeek = weekdayMap[get("weekday")] ?? -1;
  const hour = parseInt(get("hour"), 10);
  const minute = parseInt(get("minute"), 10);
  const dateStr = `${get("year")}-${get("month")}-${get("day")}`;

  return { dayOfWeek, hour, minute, dateStr };
}

async function fireWeeklySummary(port: number): Promise<void> {
  const cronSecret = process.env.CRON_SECRET;
  const url = `http://localhost:${port}/api/cron/weekly-summary`;

  console.log("[Cron] Firing weekly summary job…");

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(cronSecret ? { "x-cron-secret": cronSecret } : {}),
      },
    });

    const body = await res.json().catch(() => ({}));

    if (res.ok) {
      console.log(`[Cron] Weekly summary sent successfully:`, JSON.stringify(body));
    } else {
      console.error(`[Cron] Weekly summary failed (${res.status}):`, JSON.stringify(body));
    }
  } catch (err) {
    console.error("[Cron] Weekly summary request error:", err);
  }
}

export function startCronScheduler(port: number): void {
  console.log("[Cron] Scheduler started — weekly summaries fire every Sunday at 08:00 ET");

  setInterval(async () => {
    try {
      const { dayOfWeek, hour, minute, dateStr } = getNowInET();

      // Sunday = 0, 08:00-08:00 ET window (fires within the first minute of 8am)
      const isSunday = dayOfWeek === 0;
      const isFireTime = hour === 8 && minute === 0;
      const notAlreadyFired = lastFiredDate !== dateStr;

      if (isSunday && isFireTime && notAlreadyFired) {
        lastFiredDate = dateStr; // mark first so concurrent checks don't double-fire
        await fireWeeklySummary(port);
      }
    } catch (err) {
      console.error("[Cron] Scheduler tick error:", err);
    }
  }, CHECK_INTERVAL_MS);
}
