import { format, isSameDay, isToday, isTomorrow, startOfDay, isThisWeek, differenceInDays } from "date-fns";
import { Plus, CalendarDays, ChevronDown, Clock, Sparkles, History } from "lucide-react";
import { useState, useMemo } from "react";
import EventCard from "@/components/EventCard";
import type { UiEvent } from "@shared/types";

interface TimelineViewProps {
  events: UiEvent[];
  onEventClick: (event: UiEvent) => void;
  onAddEvent?: () => void;
}

function getDayLabel(date: Date): string {
  if (isToday(date)) return "Today";
  if (isTomorrow(date)) return "Tomorrow";
  const diff = differenceInDays(date, startOfDay(new Date()));
  if (diff > 0 && diff <= 6) return format(date, "EEEE"); // "Monday", "Tuesday"…
  if (diff < 0 && diff >= -6) return format(date, "EEEE"); // recent past
  return format(date, "MMMM d");
}

function getDayBadgeStyle(date: Date, isPastSection: boolean) {
  if (isToday(date)) {
    return {
      bg: "bg-primary",
      text: "text-white",
      label: "Today",
    };
  }
  if (isTomorrow(date)) {
    return {
      bg: "bg-orange-500",
      text: "text-white",
      label: "Tomorrow",
    };
  }
  if (!isPastSection && isThisWeek(date)) {
    return {
      bg: "bg-purple-600",
      text: "text-white",
      label: getDayLabel(date),
    };
  }
  return {
    bg: "bg-muted border border-border",
    text: "text-foreground",
    label: getDayLabel(date),
  };
}

function groupByDay(events: UiEvent[]): Array<{ date: Date; events: UiEvent[] }> {
  const groups: Array<{ date: Date; events: UiEvent[] }> = [];
  events.forEach((event) => {
    const day = startOfDay(event.startTime);
    const existing = groups.find((g) => isSameDay(g.date, day));
    if (existing) {
      existing.events.push(event);
    } else {
      groups.push({ date: day, events: [event] });
    }
  });
  return groups;
}

export default function TimelineView({ events, onEventClick, onAddEvent }: TimelineViewProps) {
  const [pastExpanded, setPastExpanded] = useState(false);

  const today = startOfDay(new Date());

  const { upcoming, past } = useMemo(() => {
    const upcoming: UiEvent[] = [];
    const past: UiEvent[] = [];
    events.forEach((e) => {
      if (startOfDay(e.startTime) >= today) {
        upcoming.push(e);
      } else {
        past.push(e);
      }
    });
    upcoming.sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
    past.sort((a, b) => b.startTime.getTime() - a.startTime.getTime());
    return { upcoming, past };
  }, [events]);

  const upcomingGroups = useMemo(() => groupByDay(upcoming), [upcoming]);
  const pastGroups = useMemo(() => groupByDay(past), [past]);

  const hasNoEvents = events.length === 0;

  return (
    <div className="min-h-screen pb-8">
      <div className="max-w-2xl mx-auto px-3 sm:px-4 pt-4 space-y-1">

        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold text-foreground flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              Upcoming
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              {upcoming.length === 0
                ? "No upcoming events — add one to get started"
                : `${upcoming.length} event${upcoming.length !== 1 ? "s" : ""} scheduled`}
            </p>
          </div>
          {onAddEvent && (
            <button
              onClick={onAddEvent}
              data-testid="button-add-event"
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-primary/10 border border-primary/20 text-primary text-xs font-medium hover-elevate transition-all"
            >
              <Plus className="w-3.5 h-3.5" strokeWidth={2.5} />
              Add event
            </button>
          )}
        </div>

        {/* Empty state */}
        {hasNoEvents && (
          <div className="flex flex-col items-center justify-center py-16 px-4 text-center" data-testid="text-empty-state">
            <div className="w-12 h-12 rounded-xl bg-muted/40 flex items-center justify-center mb-4">
              <CalendarDays className="w-6 h-6 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium text-foreground mb-1">Nothing on the timeline yet</p>
            <p className="text-xs text-muted-foreground mb-4">Events you create will appear here in chronological order</p>
            {onAddEvent && (
              <button
                onClick={onAddEvent}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover-elevate px-3 py-1.5 rounded-lg border border-primary/30 bg-primary/5"
                data-testid="button-add-first-event"
              >
                <Plus className="w-3.5 h-3.5" />
                Add your first event
              </button>
            )}
          </div>
        )}

        {/* Upcoming events */}
        {upcomingGroups.length === 0 && !hasNoEvents && (
          <div className="rounded-xl border border-dashed border-border bg-muted/20 p-6 text-center mb-4">
            <Clock className="w-6 h-6 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground font-medium">No upcoming events</p>
            <p className="text-xs text-muted-foreground mt-1">Your past events are shown below</p>
          </div>
        )}

        {upcomingGroups.map((group) => {
          const badge = getDayBadgeStyle(group.date, false);
          const isCurrentDay = isToday(group.date);
          return (
            <div key={group.date.toISOString()} className="relative">
              {/* Timeline spine */}
              <div className="absolute left-[19px] top-8 bottom-0 w-px bg-border/50 pointer-events-none" />

              {/* Day header */}
              <div className="flex items-center gap-3 mb-2">
                <div className={`relative z-10 flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${isCurrentDay ? 'ring-2 ring-primary ring-offset-2 ring-offset-background' : ''} ${badge.bg} shadow-sm`}>
                  <span className={`text-xs font-bold ${badge.text}`}>
                    {format(group.date, 'd')}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap gap-y-0.5">
                    <span className={`text-sm font-semibold ${isCurrentDay ? 'text-primary' : 'text-foreground'}`}>
                      {badge.label}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {format(group.date, isCurrentDay ? "MMMM d, yyyy" : "EEE, MMM d")}
                    </span>
                    {isCurrentDay && (
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-primary bg-primary/10 px-1.5 py-0.5 rounded-full">
                        Now
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Events for this day */}
              <div className="ml-[52px] space-y-2 mb-4">
                {group.events.map((event) => (
                  <EventCard
                    key={event.id}
                    event={event}
                    members={event.members || []}
                    onClick={() => onEventClick(event)}
                    variant="full"
                    showTime={true}
                  />
                ))}
              </div>
            </div>
          );
        })}

        {/* Past Events section */}
        {pastGroups.length > 0 && (
          <div className="pt-2">
            <button
              onClick={() => setPastExpanded((v) => !v)}
              className="w-full flex items-center gap-2 py-3 px-4 rounded-xl bg-muted/30 border border-border/50 hover-elevate transition-all group"
              data-testid="button-toggle-past-events"
            >
              <History className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium text-muted-foreground flex-1 text-left">
                Past events ({past.length})
              </span>
              <ChevronDown
                className={`w-4 h-4 text-muted-foreground transition-transform duration-200 ${pastExpanded ? "rotate-180" : ""}`}
              />
            </button>

            {pastExpanded && (
              <div className="mt-3 space-y-1">
                {pastGroups.map((group) => {
                  const badge = getDayBadgeStyle(group.date, true);
                  return (
                    <div key={group.date.toISOString()} className="relative">
                      <div className="absolute left-[19px] top-8 bottom-0 w-px bg-border/30 pointer-events-none" />

                      <div className="flex items-center gap-3 mb-2">
                        <div className={`relative z-10 flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${badge.bg} opacity-70 shadow-sm`}>
                          <span className={`text-xs font-bold ${badge.text}`}>
                            {format(group.date, 'd')}
                          </span>
                        </div>
                        <div>
                          <span className="text-sm font-medium text-muted-foreground">
                            {badge.label}
                          </span>
                          <span className="text-xs text-muted-foreground ml-2">
                            {format(group.date, "EEE, MMM d")}
                          </span>
                        </div>
                      </div>

                      <div className="ml-[52px] space-y-2 mb-4 opacity-60">
                        {group.events.map((event) => (
                          <EventCard
                            key={event.id}
                            event={event}
                            members={event.members || []}
                            onClick={() => onEventClick(event)}
                            variant="full"
                            showTime={true}
                          />
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
