import { format, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, addDays } from "date-fns";
import { Plus } from "lucide-react";
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
  members: FamilyMember[];
  categories?: string[];
}

interface WeekViewProps {
  date: Date;
  events: Event[];
  members: FamilyMember[];
  onEventClick: (event: Event) => void;
  onViewChange?: (view: 'day' | 'week' | 'month') => void;
  onAddEvent?: () => void;
}

export default function WeekView({ date, events, members, onEventClick, onViewChange, onAddEvent }: WeekViewProps) {
  const weekStart = startOfWeek(date);
  const weekEnd = endOfWeek(date);
  const daysInWeek = eachDayOfInterval({ start: weekStart, end: weekEnd });

  // Event colors based on categories or members
  const getEventColor = (event: Event) => {
    if (event.title.toLowerCase().includes('dinner') || event.title.toLowerCase().includes('emma')) {
      return '#B8836D'; // coral/brownish
    } else if (event.categories?.includes('Family') || event.title.toLowerCase().includes('sebby') || event.title.toLowerCase().includes('zoo')) {
      return '#8B7A6D'; // brownish
    } else if (event.categories?.includes('Work') || event.title.toLowerCase().includes('meeting')) {
      return '#5D7A8E'; // blue
    } else if (event.categories?.includes('Health') || event.title.toLowerCase().includes('workout')) {
      return '#6D8A7D'; // greenish-blue
    } else if (event.title.toLowerCase().includes('grocery')) {
      return '#9B8A7D'; // tan
    } else if (event.title.toLowerCase().includes('pack') || event.title.toLowerCase().includes('pavnity')) {
      return '#8B7A6D'; // brownish
    } else if (event.title.toLowerCase().includes('dr.') || event.title.toLowerCase().includes('doctor')) {
      return '#B8836D'; // coral
    } else if (event.title.toLowerCase().includes('rental') || event.title.toLowerCase().includes('car')) {
      return '#9B8A7D'; // tan
    }
    return '#6D7A8E'; // default blue-gray
  };

  const getCategoryLabel = (event: Event) => {
    if (event.title.toLowerCase().includes('grocery')) return 'PERSONAL';
    if (event.title.toLowerCase().includes('sebby')) return 'W';
    if (event.title.toLowerCase().includes('pack')) return 'Pavnity';
    if (event.title.toLowerCase().includes('rental')) return 'FAMILY';
    if (event.title.toLowerCase().includes('dr.')) return 'M';
    if (event.title.toLowerCase().includes('zoo')) return 'Family';
    return event.categories?.[0];
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-start pt-8 p-4">
      <div className="w-full max-w-md">
        <CalendarBanner />
      </div>
      <div className="w-full max-w-md space-y-6 mt-6">
        {/* Header */}
        <div className="flex items-center justify-between px-2">
          <div>
            <h1 className="text-5xl font-bold text-white">This Week</h1>
            <p className="text-lg text-white/70 mt-1">
              {format(weekStart, 'MMM d')}–{format(weekEnd, 'd')}
            </p>
          </div>
          <div className="flex gap-2">
            {onAddEvent && (
              <button
                onClick={onAddEvent}
                data-testid="button-add-event"
                className="w-10 h-10 rounded-full backdrop-blur-md bg-white/20 flex items-center justify-center border border-white/30 hover:bg-white/30 transition-all active:scale-[0.98]"
              >
                <Plus className="w-5 h-5 text-white" />
              </button>
            )}
            {members.slice(0, 2).map((member) => (
              <div
                key={member.id}
                className="w-10 h-10 rounded-full backdrop-blur-md bg-white/20 flex items-center justify-center border border-white/30"
              >
                <span className="text-xs font-semibold text-white">{member.initials}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Days of Week */}
        <div className="grid grid-cols-7 gap-2 px-2">
          {daysInWeek.map((day) => {
            const dayEvents = events.filter(e => isSameDay(new Date(e.startTime), day));
            const hasEvents = dayEvents.length > 0;
            
            return (
              <div key={day.toISOString()} className="flex flex-col items-center">
                <div className="text-xs font-medium text-white/70 mb-2">
                  {format(day, 'EEEEE')}
                </div>
                {hasEvents && (
                  <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30">
                    <span className="text-sm font-semibold text-white">
                      {format(day, 'd')}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Events Grid */}
        <div className="grid grid-cols-2 gap-3">
          {events.map((event) => {
            const categoryLabel = getCategoryLabel(event);
            
            return (
              <button
                key={event.id}
                onClick={() => onEventClick(event)}
                data-testid={`event-${event.id}`}
                className="rounded-3xl p-4 border border-white/50 hover:opacity-90 transition-all active:scale-[0.98] text-left"
                style={{ backgroundColor: getEventColor(event) }}
              >
                {categoryLabel && (
                  <div className="text-xs font-semibold text-white/80 mb-1">
                    {categoryLabel}
                  </div>
                )}
                <h3 className="text-base font-semibold text-white mb-1 leading-tight">
                  {event.title}
                </h3>
                <p className="text-sm text-white/90">
                  {format(event.startTime, 'h:mm a')}
                </p>
              </button>
            );
          })}
        </div>

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
              className="flex-1 py-2.5 rounded-2xl bg-white/20 border border-white/30 text-sm font-medium text-white transition-all active:scale-[0.98]"
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
