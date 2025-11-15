import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, startOfWeek, endOfWeek, isSameMonth, isAfter } from "date-fns";

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
  members: FamilyMember[];
  categories?: string[];
}

interface MonthViewProps {
  date: Date;
  events: Event[];
  members: FamilyMember[];
  onEventClick: (event: Event) => void;
  onViewChange?: (view: 'day' | 'week' | 'month') => void;
}

export default function MonthView({ date, events, members, onEventClick, onViewChange }: MonthViewProps) {
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
    .slice(0, 2);

  // Get background color for event day based on event color/category
  const getDayBackgroundColor = (dayEvents: Event[]) => {
    if (dayEvents.length === 0) return 'transparent';
    
    // Use the first event's associated member color with low opacity
    const firstEvent = dayEvents[0];
    if (firstEvent.members.length > 0) {
      return firstEvent.members[0].color + '40'; // Add 40 for 25% opacity
    }
    
    return 'rgba(255, 255, 255, 0.15)';
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Header */}
        <div className="text-center">
          <p className="text-xs font-semibold uppercase tracking-wider text-white/60 mb-2">
            MONTH
          </p>
          <h1 className="text-4xl font-bold text-white">
            {format(date, 'MMMM yyyy')}
          </h1>
        </div>

        {/* Calendar Grid */}
        <div className="space-y-3">
          {/* Days of week header */}
          <div className="grid grid-cols-7 gap-2 px-2">
            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, idx) => (
              <div key={idx} className="text-center text-sm font-medium text-white/70">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar days */}
          <div className="grid grid-cols-7 gap-2 px-2">
            {calendarDays.map((day) => {
              const dayEvents = getEventsForDay(day);
              const hasEvents = dayEvents.length > 0;
              const isCurrentMonth = isSameMonth(day, date);
              const bgColor = getDayBackgroundColor(dayEvents);

              return (
                <button
                  key={day.toISOString()}
                  onClick={() => hasEvents && onEventClick(dayEvents[0])}
                  data-testid={`day-${format(day, 'yyyy-MM-dd')}`}
                  className="aspect-square rounded-xl backdrop-blur-md border transition-all"
                  style={{
                    backgroundColor: bgColor,
                    borderColor: hasEvents ? 'rgba(255, 255, 255, 0.3)' : 'rgba(255, 255, 255, 0.15)',
                    opacity: isCurrentMonth ? 1 : 0.4,
                    cursor: hasEvents ? 'pointer' : 'default',
                    transform: 'scale(1)',
                  }}
                >
                  {hasEvents && (
                    <span className="text-lg font-semibold text-white">
                      {format(day, 'd')}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Upcoming Events */}
        {upcomingEvents.length > 0 && (
          <div className="space-y-3 pt-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-white/60 px-2">
              UPCOMING
            </p>
            <div className="space-y-2">
              {upcomingEvents.map((event) => (
                <button
                  key={event.id}
                  onClick={() => onEventClick(event)}
                  data-testid={`upcoming-event-${event.id}`}
                  className="w-full rounded-2xl p-4 backdrop-blur-md bg-white/10 border border-white/20 hover:bg-white/15 transition-all active:scale-[0.98] text-left"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-lg"
                        style={{ backgroundColor: event.members[0]?.color || '#6D7A8E' }}
                      />
                      <span className="text-base font-medium text-white">
                        {event.title}
                      </span>
                    </div>
                    <span className="text-sm text-white/80">
                      {format(event.startTime, 'h:mm a')}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* View Toggle */}
        {onViewChange && (
          <div className="flex gap-3 pt-4 rounded-3xl bg-white/10 backdrop-blur-md p-2">
            <button
              onClick={() => onViewChange('day')}
              data-testid="button-view-day"
              className="flex-1 py-2.5 rounded-2xl bg-white/10 border border-white/20 text-sm font-medium text-white/70 transition-all active:scale-[0.98]"
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
              className="flex-1 py-2.5 rounded-2xl bg-white/20 border border-white/30 text-sm font-medium text-white transition-all active:scale-[0.98]"
            >
              Month
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
