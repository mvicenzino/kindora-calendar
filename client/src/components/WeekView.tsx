import { format, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, addWeeks, isToday } from "date-fns";
import { Plus, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import EventCard from "@/components/EventCard";
import type { UiEvent, UiFamilyMember } from "@shared/types";

interface WeekViewProps {
  date: Date;
  events: UiEvent[];
  members: UiFamilyMember[];
  onEventClick: (event: UiEvent) => void;
  onViewChange?: (view: 'day' | 'week' | 'month') => void;
  onAddEvent?: () => void;
  onAddEventForDate?: (date: Date) => void;
  onDateChange?: (date: Date) => void;
  onWeekChange?: (date: Date) => void;
}

export default function WeekView({ date, events, members, onEventClick, onViewChange, onAddEvent, onAddEventForDate, onDateChange, onWeekChange }: WeekViewProps) {
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
    if (onAddEventForDate) {
      onAddEventForDate(day);
    } else {
      onDateChange?.(day);
      onViewChange?.('day');
    }
  };

  const eventsByDay = daysInWeek.map(day => ({
    day,
    events: events.filter(e => isSameDay(new Date(e.startTime), day))
  })).filter(group => group.events.length > 0);

  return (
    <div className="p-4 sm:p-6">
      <div className="w-full max-w-2xl mx-auto space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-4xl sm:text-5xl font-bold text-foreground">This Week</h1>
            <p className="text-base sm:text-lg text-muted-foreground mt-1">
              {format(weekStart, 'MMM d')} – {format(weekEnd, 'MMM d')}
            </p>
          </div>
          <div className="flex items-center gap-1.5">
            <Button
              size="icon"
              variant="ghost"
              onClick={handlePreviousWeek}
              data-testid="button-previous-week"
            >
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              onClick={handleNextWeek}
              data-testid="button-next-week"
            >
              <ChevronRight className="w-5 h-5" />
            </Button>
            {onAddEvent && (
              <Button
                size="icon"
                onClick={onAddEvent}
                data-testid="button-add-event"
                className="rounded-full bg-primary text-primary-foreground"
              >
                <Plus className="w-5 h-5" strokeWidth={2.5} />
              </Button>
            )}
          </div>
        </div>

        <div className="flex justify-center gap-2 sm:gap-3">
          {daysInWeek.slice(0, 7).map((day) => {
            const dayEvents = events.filter(e => isSameDay(new Date(e.startTime), day));
            const hasEvents = dayEvents.length > 0;
            const isTodayDate = isToday(day);
            
            return (
              <button
                key={day.toISOString()}
                onClick={() => handleDayClick(day)}
                data-testid={`button-day-${format(day, 'yyyy-MM-dd')}`}
                className={`
                  w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-sm font-semibold transition-all
                  ${isTodayDate
                    ? 'bg-primary text-primary-foreground'
                    : hasEvents 
                      ? 'bg-primary/15 border border-primary/30 text-foreground' 
                      : 'text-muted-foreground hover:text-foreground'
                  }
                `}
              >
                {format(day, 'd')}
              </button>
            );
          })}
        </div>

        {eventsByDay.length > 0 ? (
          <div className="space-y-4">
            {eventsByDay.map((group) => (
              <div key={group.day.toISOString()} className="space-y-3">
                <p className="text-sm font-semibold text-muted-foreground">
                  {format(group.day, 'EEEE, MMM d')}
                </p>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {group.events.map((event) => (
                    <EventCard
                      key={event.id}
                      event={event}
                      members={event.members || []}
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
            <p className="text-muted-foreground text-lg">No events this week</p>
          </div>
        )}

      </div>
    </div>
  );
}
