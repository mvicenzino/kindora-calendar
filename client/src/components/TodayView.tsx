import { format } from "date-fns";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Clock, Plus } from "lucide-react";
import CalendarBanner from "@/components/CalendarBanner";

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
  onViewChange?: (view: 'day' | 'week' | 'month') => void;
  onAddEvent?: () => void;
}

export default function TodayView({ date, events, tasks, onEventClick, onViewChange, onAddEvent }: TodayViewProps) {
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
    <div className="min-h-screen flex flex-col items-center justify-start pt-8 p-4">
      <div className="w-full max-w-md">
        <CalendarBanner />
      </div>
      <div className="w-full max-w-md space-y-6 mt-6">
        {/* Header */}
        <div className="flex items-center justify-between px-2">
          <div className="flex items-center gap-6">
            <h1 className="text-5xl font-bold text-white">Today</h1>
            {onAddEvent && (
              <button
                onClick={onAddEvent}
                data-testid="button-add-event"
                className="w-10 h-10 rounded-full backdrop-blur-xl bg-gradient-to-br from-white/40 to-white/10 flex items-center justify-center border-2 border-white/50 shadow-lg shadow-white/20 hover:from-white/50 hover:to-white/20 transition-all active:scale-[0.98]"
              >
                <Plus className="w-5 h-5 text-white drop-shadow-md" strokeWidth={2.5} />
              </button>
            )}
          </div>
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

        {/* Today's Focus */}
        {focusEvents.length > 0 && (
          <div className="space-y-3">
            {focusEvents.map(event => (
              <button
                key={event.id}
                onClick={() => onEventClick(event)}
                data-testid={`event-${event.id}`}
                className="w-full bg-[#B8836D] rounded-3xl p-6 border border-white/50 hover:opacity-90 transition-all active:scale-[0.98] text-left"
              >
                <p className="text-xs font-semibold uppercase tracking-wider text-white/70 mb-3">
                  Today's Focus
                </p>
                <h3 className="text-2xl font-semibold text-white mb-3">
                  {event.title}
                </h3>
                <div className="flex items-center justify-between">
                  <p className="text-base text-white/90">
                    {format(event.startTime, 'h:mm a')}
                  </p>
                  <div className="flex gap-1.5">
                    {event.members.map(member => (
                      <div
                        key={member.id}
                        className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-semibold text-white border-2 border-white/30"
                        style={{ backgroundColor: member.color }}
                      >
                        {member.initials}
                      </div>
                    ))}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Regular Events */}
        {regularEvents.length > 0 && (
          <div className="space-y-3">
            {regularEvents.map((event, idx) => {
              const eventColors = [
                '#7A8A7D', // brownish-green for Brunch
                '#5D6D7E', // blue-gray for Meeting
                '#7A8A7D', // brownish-green for Birthday
                '#5D7A8E', // blue for Gym
              ];
              return (
                <button
                  key={event.id}
                  onClick={() => onEventClick(event)}
                  data-testid={`event-${event.id}`}
                  className="w-full rounded-3xl p-5 border border-white/50 hover:opacity-90 transition-all active:scale-[0.98] text-left"
                  style={{ backgroundColor: eventColors[idx % eventColors.length] }}
                >
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="text-xl font-semibold text-white flex-1">
                      {event.title}
                    </h3>
                    {event.categories && event.categories.length > 0 && (
                      <span className="text-sm text-white/80 ml-3">
                        {event.categories[0]}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-white/80">
                    {format(event.startTime, 'h:mm a')}–{format(event.endTime, 'h:mm a')}
                  </p>
                </button>
              );
            })}
          </div>
        )}

        {/* Sometime Today */}
        <div className="px-2 pt-6">
          <p className="text-xs font-semibold uppercase tracking-wider text-white/60">
            Sometime Today
          </p>
        </div>

        {/* View Toggle */}
        {onViewChange && (
          <div className="flex gap-3 pt-4 rounded-3xl bg-white/10 backdrop-blur-md p-2">
            <button
              onClick={() => onViewChange('day')}
              data-testid="button-view-day"
              className="flex-1 py-2.5 rounded-2xl bg-white/20 border border-white/30 text-sm font-medium text-white transition-all active:scale-[0.98]"
            >
              Day
            </button>
            <button
              onClick={() => onViewChange('week')}
              data-testid="button-view-week"
              className="flex-1 py-2.5 rounded-2xl bg-white/10 border border-white/20 text-sm font-medium text-white/70 transition-all active:scale-[0.98]"
            >
              Week
            </button>
            <button
              onClick={() => onViewChange('month')}
              data-testid="button-view-month"
              className="flex-1 py-2.5 rounded-2xl bg-white/10 border border-white/20 text-sm font-medium text-white/70 transition-all active:scale-[0.98]"
            >
              Month
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
