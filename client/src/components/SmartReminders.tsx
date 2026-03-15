import { useState, useEffect, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { useActiveFamily } from "@/contexts/ActiveFamilyContext";
import { format, isToday, isTomorrow, isPast } from "date-fns";
import { Flag, X, Bell, ChevronDown, ChevronUp, Clock } from "lucide-react";
import type { Event } from "@shared/schema";

const DISMISSED_KEY = "kindora_dismissed_reminders";
const PANEL_COLLAPSED_KEY = "kindora_reminders_collapsed";

function getDismissed(): Set<string> {
  try {
    const raw = localStorage.getItem(DISMISSED_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}

function saveDismissed(ids: Set<string>) {
  const arr = [...ids].slice(-200);
  localStorage.setItem(DISMISSED_KEY, JSON.stringify(arr));
}

export default function SmartReminders() {
  const { activeFamilyId } = useActiveFamily();
  const [dismissed, setDismissed] = useState<Set<string>>(getDismissed);
  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem(PANEL_COLLAPSED_KEY) === "true"; } catch { return false; }
  });

  const { data: events = [] } = useQuery<Event[]>({
    queryKey: ["/api/events?familyId=" + activeFamilyId],
    enabled: !!activeFamilyId,
  });

  const now = new Date();

  const upcoming = events.filter((e) => {
    // Only show events flagged as important
    if (!e.isImportant) return false;

    const start = new Date(e.startTime);

    // Only today or tomorrow
    if (!isToday(start) && !isTomorrow(start)) return false;

    // Skip today's events that have already ended
    if (isToday(start) && isPast(new Date(e.endTime))) return false;

    // Skip dismissed
    if (dismissed.has(e.id)) return false;

    return true;
  }).sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

  // Prune dismissed IDs when event list changes
  useEffect(() => {
    const validIds = new Set(events.map(e => e.id));
    setDismissed(prev => {
      const pruned = new Set([...prev].filter(id => validIds.has(id)));
      saveDismissed(pruned);
      return pruned;
    });
  }, [events.length]);

  const dismiss = useCallback((id: string) => {
    setDismissed(prev => {
      const next = new Set(prev);
      next.add(id);
      saveDismissed(next);
      return next;
    });
  }, []);

  const dismissAll = useCallback(() => {
    const ids = upcoming.map(e => e.id);
    setDismissed(prev => {
      const next = new Set([...prev, ...ids]);
      saveDismissed(next);
      return next;
    });
  }, [upcoming]);

  const toggleCollapsed = useCallback(() => {
    setCollapsed(prev => {
      const next = !prev;
      try { localStorage.setItem(PANEL_COLLAPSED_KEY, String(next)); } catch {}
      return next;
    });
  }, []);

  // Only render if there are important upcoming events
  if (upcoming.length === 0) return null;

  return (
    <div
      className="fixed top-[3.5rem] right-3 z-[200] w-72 max-w-[calc(100vw-1.5rem)] pointer-events-auto"
      data-testid="smart-reminders-panel"
      style={{ filter: "drop-shadow(0 8px 32px rgba(0,0,0,0.22))" }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between gap-2 px-3 py-2 cursor-pointer select-none"
        style={{
          background: "rgba(249,115,22,0.15)",
          backdropFilter: "blur(20px) saturate(180%)",
          WebkitBackdropFilter: "blur(20px) saturate(180%)",
          border: "1px solid rgba(249,115,22,0.30)",
          borderBottom: collapsed ? undefined : "1px solid rgba(249,115,22,0.18)",
          borderRadius: collapsed ? "1rem" : "1rem 1rem 0 0",
        }}
        onClick={toggleCollapsed}
        data-testid="button-reminders-toggle"
      >
        <div className="flex items-center gap-2">
          <div className="relative">
            <Flag className="w-3.5 h-3.5 text-orange-500 fill-orange-500" />
          </div>
          <span className="text-sm font-semibold text-foreground">
            {upcoming.length} important reminder{upcoming.length !== 1 ? "s" : ""}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={(ev) => { ev.stopPropagation(); dismissAll(); }}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors px-1.5 py-0.5 rounded-md hover:bg-black/10 dark:hover:bg-white/10"
            data-testid="button-dismiss-all-reminders"
          >
            Clear all
          </button>
          {collapsed
            ? <ChevronDown className="w-4 h-4 text-muted-foreground" />
            : <ChevronUp className="w-4 h-4 text-muted-foreground" />
          }
        </div>
      </div>

      {/* Reminder cards */}
      {!collapsed && (
        <div
          className="flex flex-col gap-px overflow-hidden rounded-b-2xl"
          style={{
            background: "rgba(var(--card-rgb, 255,255,255), 0.35)",
            backdropFilter: "blur(20px) saturate(180%)",
            WebkitBackdropFilter: "blur(20px) saturate(180%)",
            border: "1px solid rgba(249,115,22,0.22)",
            borderTop: "none",
          }}
        >
          {upcoming.map((event, idx) => {
            const start = new Date(event.startTime);
            const isLast = idx === upcoming.length - 1;
            const dayLabel = isToday(start) ? "Today" : "Tomorrow";

            return (
              <div
                key={event.id}
                data-testid={`reminder-item-${event.id}`}
                className="relative"
                style={{
                  background: "linear-gradient(135deg, rgba(249,115,22,0.14) 0%, rgba(234,88,12,0.07) 100%)",
                  borderBottom: isLast ? "none" : "1px solid rgba(249,115,22,0.14)",
                }}
              >
                {/* shimmer */}
                <div
                  className="absolute inset-0 pointer-events-none"
                  style={{
                    background: "linear-gradient(120deg, rgba(255,255,255,0.12) 0%, transparent 70%)",
                    borderRadius: isLast ? "0 0 1rem 1rem" : "0",
                  }}
                />
                <div className="flex items-start gap-2.5 px-3 py-2.5 relative">
                  <Flag className="mt-0.5 w-3.5 h-3.5 text-orange-500 fill-orange-500 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-orange-500">
                      {dayLabel}
                    </span>
                    <p className="text-sm font-semibold text-foreground leading-snug truncate">{event.title}</p>
                    <div className="flex items-center gap-1 mt-0.5">
                      <Clock className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                      <span className="text-xs text-muted-foreground">
                        {format(start, "h:mm a")} – {format(new Date(event.endTime), "h:mm a")}
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => dismiss(event.id)}
                    className="flex-shrink-0 mt-0.5 p-0.5 rounded-full text-muted-foreground hover:text-foreground hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
                    data-testid={`button-dismiss-reminder-${event.id}`}
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
