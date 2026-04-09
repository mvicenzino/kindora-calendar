import { useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { useActiveFamily } from "@/contexts/ActiveFamilyContext";
import { isToday, isTomorrow, differenceInMinutes, format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { ToastAction } from "@/components/ui/toast";
import { Flag, Clock, AlertCircle, Timer, CalendarClock } from "lucide-react";
import { useLocation } from "wouter";
import type { Event } from "@shared/schema";

// Keys of already-fired toasts, stored in sessionStorage so they reset on tab close
const STORAGE_KEY = "kindora_fired_reminders";

function getFired(): Set<string> {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}

function markFired(key: string) {
  try {
    const s = getFired();
    s.add(key);
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(s)));
  } catch {}
}

function hasFired(key: string): boolean {
  return getFired().has(key);
}

// Windows (in minutes) at which we fire reminders
const REMINDER_WINDOWS = [30, 15, 5, 0] as const;

export default function SmartReminders() {
  const { activeFamilyId } = useActiveFamily();
  const { toast } = useToast();
  const [, navigate] = useLocation();

  const { data: events = [] } = useQuery<Event[]>({
    queryKey: ["/api/events?familyId=" + activeFamilyId],
    enabled: !!activeFamilyId,
  });

  // Keep a stable ref to events so the interval always sees the latest list
  const eventsRef = useRef(events);
  useEffect(() => { eventsRef.current = events; }, [events]);

  const checkAndFire = () => {
    const now = new Date();
    const todayEvents = eventsRef.current.filter((e) => {
      const start = new Date(e.startTime);
      return isToday(start) || isTomorrow(start);
    });

    for (const event of todayEvents) {
      const start = new Date(event.startTime);
      const minutesAway = differenceInMinutes(start, now);

      for (const window of REMINDER_WINDOWS) {
        // Fire if the event falls within ±1 min of the reminder window
        if (minutesAway >= window - 1 && minutesAway <= window + 1) {
          const fireKey = `${event.id}_${window}`;
          if (hasFired(fireKey)) continue;
          markFired(fireKey);

          const timeStr = format(start, "h:mm a");

          type UrgencyConfig = { label: string; badge: string; badgeStyle: React.CSSProperties; Icon: React.ElementType };
          const urgency: UrgencyConfig = window === 0
            ? { label: "Starting now", badge: "Urgent", badgeStyle: { background: 'rgba(239,68,68,0.15)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)' }, Icon: AlertCircle }
            : window === 5
            ? { label: "Starting in 5 min", badge: "Very Soon", badgeStyle: { background: 'rgba(249,115,22,0.15)', color: '#f97316', border: '1px solid rgba(249,115,22,0.3)' }, Icon: Timer }
            : window === 15
            ? { label: "Starting in 15 min", badge: "Coming Up", badgeStyle: { background: 'rgba(234,179,8,0.15)', color: '#ca8a04', border: '1px solid rgba(234,179,8,0.3)' }, Icon: Clock }
            : { label: "Starting in 30 min", badge: "Upcoming", badgeStyle: { background: 'rgba(99,102,241,0.12)', color: '#6366f1', border: '1px solid rgba(99,102,241,0.25)' }, Icon: CalendarClock };

          toast({
            title: event.title,
            description: (
              <span className="flex flex-col gap-1.5">
                <span className="flex items-center gap-1.5">
                  <span
                    className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-md"
                    style={urgency.badgeStyle}
                  >
                    <urgency.Icon className="w-2.5 h-2.5" />
                    {urgency.badge}
                  </span>
                  {event.isImportant && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-md"
                      style={{ background: 'rgba(249,115,22,0.12)', color: '#f97316', border: '1px solid rgba(249,115,22,0.25)' }}>
                      <Flag className="w-2.5 h-2.5 fill-current" />
                      Important
                    </span>
                  )}
                </span>
                <span className="flex items-center gap-1 text-muted-foreground text-xs">
                  <Clock className="w-3 h-3 flex-shrink-0" />
                  {urgency.label} · {timeStr}
                </span>
              </span>
            ),
            duration: window === 0 ? 10000 : 7000,
            action: (
              <ToastAction altText="View calendar" onClick={() => navigate("/calendar")}>
                View
              </ToastAction>
            ),
          });
        }
      }
    }
  };

  // Check immediately when events load, then every 60 seconds
  useEffect(() => {
    if (!activeFamilyId || events.length === 0) return;
    checkAndFire();
    const interval = setInterval(checkAndFire, 60_000);
    return () => clearInterval(interval);
  }, [activeFamilyId, events.length]);

  return null;
}
