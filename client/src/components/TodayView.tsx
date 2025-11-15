import { format } from "date-fns";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Clock } from "lucide-react";

interface FamilyMember {
  id: string;
  name: string;
  color: string;
  initials: string;
}

interface Event {
  id: string;
  title: string;
  startTime: Date;
  endTime: Date;
  timeOfDay?: string;
  members: FamilyMember[];
  categories?: string[];
  isFocus?: boolean;
}

interface TodayViewProps {
  date: Date;
  events: Event[];
  tasks: string[];
  onEventClick: (event: Event) => void;
}

export default function TodayView({ date, events, tasks, onEventClick }: TodayViewProps) {
  const focusEvents = events.filter(e => e.isFocus);
  const regularEvents = events.filter(e => !e.isFocus);

  const formatTimeRange = (start: Date, end: Date) => {
    return `${format(start, 'h:mm')} ${format(start, 'a')} - ${format(end, 'h:mm')} ${format(end, 'a')}`;
  };

  const getTimeOfDay = (time: Date) => {
    const hour = time.getHours();
    if (hour < 12) return 'Morning';
    if (hour < 17) return 'Afternoon';
    return 'Evening';
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="backdrop-blur-3xl bg-gradient-to-b from-white/15 to-white/10 rounded-[2.5rem] border border-white/20 shadow-2xl p-6 space-y-6">
          {/* Header */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h1 className="text-5xl font-bold text-foreground">Today</h1>
              <div className="flex gap-2">
                {focusEvents.slice(0, 2).flatMap(e => e.members).slice(0, 2).map((member, idx) => (
                  <div
                    key={idx}
                    className="w-10 h-10 rounded-full backdrop-blur-md bg-white/20 flex items-center justify-center border border-white/30"
                  >
                    <span className="text-xs font-semibold text-white">{member.initials}</span>
                  </div>
                ))}
              </div>
            </div>
            <p className="text-lg text-foreground/70">
              {format(date, 'EEEE, MMM d')}
            </p>
          </div>

          {/* Today's Focus */}
          {focusEvents.length > 0 && (
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-foreground/60">
                Today's Focus
              </p>
              {focusEvents.map(event => (
                <button
                  key={event.id}
                  onClick={() => onEventClick(event)}
                  data-testid={`event-${event.id}`}
                  className="w-full backdrop-blur-xl bg-white/10 rounded-3xl p-5 border border-white/20 hover:bg-white/15 transition-all hover-elevate active-elevate-2 text-left"
                >
                  <h3 className="text-xl font-semibold text-foreground mb-2">
                    {event.title}
                  </h3>
                  <p className="text-sm text-foreground/70 mb-3">
                    {formatTimeRange(event.startTime, event.endTime)} • {event.timeOfDay || getTimeOfDay(event.startTime)}
                  </p>
                  <div className="flex items-center gap-2 flex-wrap">
                    {event.members.map(member => (
                      <div key={member.id} className="flex items-center gap-1.5">
                        <div
                          className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-semibold text-white"
                          style={{ backgroundColor: member.color }}
                        >
                          {member.initials}
                        </div>
                      </div>
                    ))}
                    {event.categories?.map((cat, idx) => (
                      <Badge
                        key={idx}
                        variant="secondary"
                        className="bg-white/15 text-foreground/80 border-white/20 text-xs px-2 py-0.5"
                      >
                        {cat}
                      </Badge>
                    ))}
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Regular Events */}
          {regularEvents.length > 0 && (
            <div className="space-y-3">
              {regularEvents.map(event => (
                <button
                  key={event.id}
                  onClick={() => onEventClick(event)}
                  data-testid={`event-${event.id}`}
                  className="w-full backdrop-blur-xl bg-white/10 rounded-3xl p-5 border border-white/20 hover:bg-white/15 transition-all hover-elevate active-elevate-2 text-left"
                >
                  <h3 className="text-xl font-semibold text-foreground mb-2">
                    {event.title}
                  </h3>
                  <p className="text-sm text-foreground/70 mb-3">
                    {formatTimeRange(event.startTime, event.endTime)} • {event.timeOfDay || getTimeOfDay(event.startTime)}
                  </p>
                  <div className="flex items-center gap-2 flex-wrap">
                    {event.members.map(member => (
                      <div key={member.id} className="flex items-center gap-1.5">
                        <div
                          className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-semibold text-white"
                          style={{ backgroundColor: member.color }}
                        >
                          {member.initials}
                        </div>
                      </div>
                    ))}
                    {event.categories?.map((cat, idx) => (
                      <Badge
                        key={idx}
                        variant="secondary"
                        className="bg-white/15 text-foreground/80 border-white/20 text-xs px-2 py-0.5"
                      >
                        {cat}
                      </Badge>
                    ))}
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Sometime Today */}
          {tasks.length > 0 && (
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-foreground/60">
                Sometime Today
              </p>
              <div className="flex flex-wrap gap-2">
                {tasks.map((task, idx) => (
                  <button
                    key={idx}
                    data-testid={`task-${idx}`}
                    className="px-4 py-2 rounded-full backdrop-blur-md bg-white/10 border border-white/20 text-sm text-foreground/80 hover:bg-white/15 transition-all hover-elevate active-elevate-2"
                  >
                    {task}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* View Toggle */}
          <div className="flex gap-3 pt-4">
            <button
              data-testid="button-view-day"
              className="flex-1 py-2.5 rounded-2xl backdrop-blur-md bg-white/20 border border-white/30 text-sm font-medium text-foreground hover:bg-white/25 transition-all hover-elevate active-elevate-2"
            >
              Day
            </button>
            <button
              data-testid="button-view-week"
              className="flex-1 py-2.5 rounded-2xl backdrop-blur-md bg-white/10 border border-white/20 text-sm font-medium text-foreground/70 hover:bg-white/15 transition-all hover-elevate active-elevate-2"
            >
              Week
            </button>
            <button
              data-testid="button-view-month"
              className="flex-1 py-2.5 rounded-2xl backdrop-blur-md bg-white/10 border border-white/20 text-sm font-medium text-foreground/70 hover:bg-white/15 transition-all hover-elevate active-elevate-2"
            >
              Month
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
