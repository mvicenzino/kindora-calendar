import { useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { useActiveFamily } from "@/contexts/ActiveFamilyContext";
import { isToday, isTomorrow, differenceInMinutes, format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { ToastAction } from "@/components/ui/toast";
import { Flag, Clock } from "lucide-react";
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
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify([...s]));
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
          const label = window === 0
            ? "Starting now"
            : window === 5
            ? "Starting in 5 min"
            : window === 15
            ? "Starting in 15 min"
            : "Starting in 30 min";

          toast({
            title: event.title,
            description: (
              <span className="flex items-center gap-1.5 text-muted-foreground">
                {event.isImportant && <Flag className="w-3 h-3 text-orange-500 fill-orange-500 flex-shrink-0" />}
                <Clock className="w-3 h-3 flex-shrink-0" />
                <span>{label} · {timeStr}</span>
              </span>
            ),
            duration: window === 0 ? 10000 : 7000,
            action: (
              <ToastAction altText="View calendar" onClick={() => navigate("/")}>
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
