import { format, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, addWeeks } from "date-fns";
import { Plus, ChevronLeft, ChevronRight } from "lucide-react";
import EventCard from "@/components/EventCard";
import type { Event as DBEvent } from "@shared/schema";

interface FamilyMember {
  id: string;
  name: string;
  color: string;
  initials: string;
}

interface Event extends DBEvent {
  startTime: Date;
  endTime: Date;
  members: FamilyMember[];
}

interface WeekViewProps {
  date: Date;
  events: Event[];
  members: FamilyMember[];
  onEventClick: (event: Event) => void;
  onViewChange?: (view: 'day' | 'week' | 'month') => void;
  onAddEvent?: () => void;
  onDateChange?: (date: Date) => void;
  onWeekChange?: (date: Date) => void;
}

export default function WeekView({ date, events, members, onEventClick, onViewChange, onAddEvent, onDateChange, onWeekChange }: WeekViewProps) {
  const weekStart = startOfWeek(date);
  const weekEnd = endOfWeek(date);
  const daysInWeek = eachDayOfInterval({ start: weekStart, end: weekEnd });

  const handlePreviousWeek = () => {
    const newDate = addWeeks(date, -1);
    onWeekChange?.(newDate);
  };

  const handleNextWeek = () => {
    const newDate = addWeeks(date, 1);
    onWeekChange?.(newDate);
  };

  const handleDayClick = (day: Date) => {
    onDateChange?.(day);
    onViewChange?.('day');
  };

  // Group events by day
  const eventsByDay = daysInWeek.map(day => ({
    day,
    events: events.filter(e => isSameDay(new Date(e.startTime), day))
  })).filter(group => group.events.length > 0);

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Header */}
        <div className="px-2">
          <div className="flex items-start justify-between gap-6">
            <div>
              <h1 className="text-5xl font-bold text-white">This Week</h1>
              <p className="text-lg text-white/70 mt-1">
                {format(weekStart, 'MMM d')}–{format(weekEnd, 'd')}
              </p>
            </div>
            <div className="flex items-center gap-3 mt-2">
              <button
                onClick={handlePreviousWeek}
                data-testid="button-previous-week"
                className="w-10 h-10 rounded-full backdrop-blur-xl bg-gradient-to-br from-white/40 to-white/10 flex items-center justify-center border-2 border-white/50 shadow-lg shadow-white/20 hover:from-white/50 hover:to-white/20 transition-all active:scale-[0.98]"
              >
                <ChevronLeft className="w-5 h-5 text-white drop-shadow-md" strokeWidth={2.5} />
              </button>
              <button
                onClick={handleNextWeek}
                data-testid="button-next-week"
                className="w-10 h-10 rounded-full backdrop-blur-xl bg-gradient-to-br from-white/40 to-white/10 flex items-center justify-center border-2 border-white/50 shadow-lg shadow-white/20 hover:from-white/50 hover:to-white/20 transition-all active:scale-[0.98]"
              >
                <ChevronRight className="w-5 h-5 text-white drop-shadow-md" strokeWidth={2.5} />
              </button>
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
        </div>

        {/* Mini Week Selector */}
        <div className="flex justify-center gap-3 px-2">
          {daysInWeek.slice(0, 7).map((day) => {
            const dayEvents = events.filter(e => isSameDay(new Date(e.startTime), day));
            const hasEvents = dayEvents.length > 0;
            
            return (
              <button
                key={day.toISOString()}
                onClick={() => handleDayClick(day)}
                data-testid={`button-day-${format(day, 'yyyy-MM-dd')}`}
                className={`
                  w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold transition-all
                  ${hasEvents 
                    ? 'bg-white/20 border-2 border-white/40 text-white' 
                    : 'text-white/50'
                  }
                  hover:opacity-80 active:scale-[0.95]
                `}
              >
                {format(day, 'd')}
              </button>
            );
          })}
        </div>

        {/* Events Grid - 2 Column Layout */}
        {eventsByDay.length > 0 ? (
          <div className="space-y-4">
            {eventsByDay.map((group) => (
              <div key={group.day.toISOString()} className="space-y-3">
                {/* Day Label */}
                <div className="px-2">
                  <p className="text-sm font-semibold text-white/80">
                    {format(group.day, 'EEEE, MMM d')}
                  </p>
                </div>
                
                {/* 2-Column Grid */}
                <div className="grid grid-cols-2 gap-3">
                  {group.events.map((event) => (
                    <EventCard
                      key={event.id}
                      event={event}
                      member={event.members[0]}
                      onClick={() => onEventClick(event)}
                      variant="grid"
                      showTime={true}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-white/70 text-lg">No events this week</p>
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
