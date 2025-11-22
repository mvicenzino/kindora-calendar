import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, startOfWeek, endOfWeek, isSameMonth, isAfter, addMonths, subMonths, isToday } from "date-fns";
import { Plus, ChevronLeft, ChevronRight } from "lucide-react";
import EventCard from "@/components/EventCard";
import type { UiEvent, UiFamilyMember } from "@shared/types";

interface MonthViewProps {
  date: Date;
  events: UiEvent[];
  members: UiFamilyMember[];
  onEventClick: (event: UiEvent) => void;
  onViewChange?: (view: 'day' | 'week' | 'month') => void;
  onAddEvent?: () => void;
  onDateChange?: (date: Date) => void;
}

export default function MonthView({ date, events, members, onEventClick, onViewChange, onAddEvent, onDateChange }: MonthViewProps) {
  const monthStart = startOfMonth(date);
  const monthEnd = endOfMonth(date);
  const calendarStart = startOfWeek(monthStart);
  const calendarEnd = endOfWeek(monthEnd);
  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  // Get events for a specific day
  const getEventsForDay = (day: Date) => {
    return events.filter(e => isSameDay(new Date(e.startTime), day));
  };

  // Get upcoming events (sorted by time, only future events)
  const upcomingEvents = events
    .filter(e => isAfter(new Date(e.startTime), new Date()))
    .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
    .slice(0, 3);

  return (
    <div className="min-h-screen p-6">
      <div className="w-full max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-white/60 mb-1">
              MONTH
            </p>
            <h1 className="text-5xl font-bold text-white">
              {format(date, 'MMMM yyyy')}
            </h1>
          </div>
          <div className="flex items-center gap-3">
            {onDateChange && (
              <>
                <button
                  onClick={() => onDateChange(subMonths(date, 1))}
                  data-testid="button-previous-month"
                  className="w-10 h-10 rounded-full backdrop-blur-xl bg-gradient-to-br from-white/40 to-white/10 flex items-center justify-center border-2 border-white/50 shadow-lg shadow-white/20 hover:from-white/50 hover:to-white/20 transition-all active:scale-[0.98]"
                >
                  <ChevronLeft className="w-5 h-5 text-white drop-shadow-md" strokeWidth={2.5} />
                </button>
                <button
                  onClick={() => onDateChange(addMonths(date, 1))}
                  data-testid="button-next-month"
                  className="w-10 h-10 rounded-full backdrop-blur-xl bg-gradient-to-br from-white/40 to-white/10 flex items-center justify-center border-2 border-white/50 shadow-lg shadow-white/20 hover:from-white/50 hover:to-white/20 transition-all active:scale-[0.98]"
                >
                  <ChevronRight className="w-5 h-5 text-white drop-shadow-md" strokeWidth={2.5} />
                </button>
              </>
            )}
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
        </div>

        {/* Calendar Grid */}
        <div className="space-y-3">
          {/* Days of week header */}
          <div className="grid grid-cols-7 gap-2">
            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, idx) => (
              <div key={idx} className="text-center text-sm font-medium text-white/70">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar days */}
          <div className="grid grid-cols-7 gap-2">
            {calendarDays.map((day) => {
              const dayEvents = getEventsForDay(day);
              const hasEvents = dayEvents.length > 0;
              const isCurrentMonth = isSameMonth(day, date);
              const isTodayDate = isToday(day);

              return (
                <button
                  key={day.toISOString()}
                  onClick={() => {
                    onDateChange?.(day);
                    onViewChange?.('day');
                  }}
                  data-testid={`day-${format(day, 'yyyy-MM-dd')}`}
                  className={`
                    aspect-square rounded-lg flex flex-col items-center justify-center transition-all
                    ${isCurrentMonth ? 'text-white' : 'text-white/30'}
                    ${isTodayDate ? 'border-2 border-white' : 'border border-white/20'}
                    ${hasEvents ? 'bg-white/10' : 'bg-transparent'}
                    hover:bg-white/15 active:scale-[0.95]
                  `}
                >
                  <span className={`text-sm font-semibold ${isTodayDate ? 'text-white' : ''}`}>
                    {format(day, 'd')}
                  </span>
                  {/* Event indicators */}
                  {hasEvents && (
                    <div className="flex gap-0.5 mt-1">
                      {dayEvents.slice(0, 3).map((event, idx) => (
                        <div
                          key={idx}
                          className="w-1 h-1 rounded-full"
                          style={{ backgroundColor: event.color }}
                        />
                      ))}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Upcoming Events */}
        {upcomingEvents.length > 0 && (
          <div className="space-y-3 pt-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-white/60">
              UPCOMING
            </p>
            <div className="space-y-2">
              {upcomingEvents.map((event) => (
                <div key={event.id}>
                  <button
                    onClick={() => onEventClick(event)}
                    data-testid={`upcoming-event-${event.id}`}
                    className="w-full rounded-2xl p-3 bg-white/10 border border-white/20 hover:bg-white/15 transition-all active:scale-[0.98] text-left flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      {event.members?.[0] && (
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold text-white"
                          style={{ backgroundColor: event.members[0].color }}
                        >
                          {event.members[0].initials}
                        </div>
                      )}
                      <div>
                        <p className="text-sm font-medium text-white">
                          {event.title}
                        </p>
                        <p className="text-xs text-white/70">
                          {format(event.startTime, 'MMM d')}
                        </p>
                      </div>
                    </div>
                    <span className="text-sm text-white/80">
                      {format(event.startTime, 'h:mm a')}
                    </span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
