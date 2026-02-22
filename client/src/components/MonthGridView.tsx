import { useMemo } from "react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, startOfWeek, endOfWeek, isSameMonth, addMonths, subMonths, isToday } from "date-fns";
import { Plus, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { UiEvent, UiFamilyMember } from "@shared/types";

interface MonthGridViewProps {
  date: Date;
  events: UiEvent[];
  members: UiFamilyMember[];
  onEventClick: (event: UiEvent) => void;
  onAddEvent?: () => void;
  onAddEventForDate?: (date: Date) => void;
  onDateChange?: (date: Date) => void;
  onViewChange?: (view: 'day' | 'week' | 'month' | 'timeline') => void;
}

const MAX_EVENTS_PER_CELL = 3;

export default function MonthGridView({ date, events, members, onEventClick, onAddEvent, onAddEventForDate, onDateChange, onViewChange }: MonthGridViewProps) {
  const monthStart = startOfMonth(date);
  const monthEnd = endOfMonth(date);
  const calendarStart = startOfWeek(monthStart);
  const calendarEnd = endOfWeek(monthEnd);
  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const weeks = useMemo(() => {
    const result: Date[][] = [];
    for (let i = 0; i < calendarDays.length; i += 7) {
      result.push(calendarDays.slice(i, i + 7));
    }
    return result;
  }, [calendarDays]);

  const getEventsForDay = (day: Date) => {
    return events
      .filter(e => isSameDay(e.startTime, day))
      .sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
  };

  const handleDayClick = (day: Date) => {
    if (onAddEventForDate) {
      onAddEventForDate(day);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-3 py-2 border-b border-border/30">
        <div className="flex items-center gap-2">
          {onDateChange && (
            <>
              <Button size="icon" variant="ghost" onClick={() => onDateChange(subMonths(date, 1))} data-testid="button-previous-month">
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button size="icon" variant="ghost" onClick={() => onDateChange(addMonths(date, 1))} data-testid="button-next-month">
                <ChevronRight className="w-4 h-4" />
              </Button>
            </>
          )}
          <h2 className="text-sm font-semibold text-foreground" data-testid="text-month-grid-title">
            {format(date, 'MMMM yyyy')}
          </h2>
        </div>
        {onAddEvent && (
          <Button size="icon" onClick={onAddEvent} data-testid="button-add-event" className="rounded-full bg-primary text-primary-foreground">
            <Plus className="w-4 h-4" strokeWidth={2.5} />
          </Button>
        )}
      </div>

      <div className="grid grid-cols-7 border-b border-border/20">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, idx) => (
          <div key={idx} className="text-center py-1.5 text-[10px] font-medium text-muted-foreground uppercase tracking-wider border-r border-border/10 last:border-r-0">
            {day}
          </div>
        ))}
      </div>

      <div className="flex-1 grid" style={{ gridTemplateRows: `repeat(${weeks.length}, 1fr)` }}>
        {weeks.map((week, weekIdx) => (
          <div key={weekIdx} className="grid grid-cols-7 border-b border-border/10 last:border-b-0 min-h-0">
            {week.map((day) => {
              const dayEvents = getEventsForDay(day);
              const isCurrentMonth = isSameMonth(day, date);
              const isTodayDate = isToday(day);
              const overflow = dayEvents.length - MAX_EVENTS_PER_CELL;

              return (
                <div
                  key={day.toISOString()}
                  className={`
                    border-r border-border/10 last:border-r-0 p-0.5 overflow-hidden cursor-pointer
                    hover:bg-muted/20 transition-colors flex flex-col min-h-0
                    ${!isCurrentMonth ? 'opacity-30' : ''}
                    ${isTodayDate ? 'bg-primary/[0.04]' : ''}
                  `}
                  onClick={() => handleDayClick(day)}
                  data-testid={`day-cell-${format(day, 'yyyy-MM-dd')}`}
                >
                  <div className="flex items-center justify-center py-0.5">
                    <span
                      className={`
                        text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full
                        ${isTodayDate ? 'bg-primary text-primary-foreground' : 'text-foreground'}
                      `}
                    >
                      {format(day, 'd')}
                    </span>
                  </div>

                  <div className="flex-1 space-y-px overflow-hidden min-h-0">
                    {dayEvents.slice(0, MAX_EVENTS_PER_CELL).map(event => (
                      <button
                        key={event.id}
                        onClick={(e) => { e.stopPropagation(); onEventClick(event); }}
                        data-testid={`grid-event-${event.id}`}
                        className="w-full text-left rounded-sm px-1 py-px truncate text-[10px] leading-tight font-medium transition-all flex items-center gap-1"
                        style={{
                          backgroundColor: event.color + '25',
                          color: 'var(--foreground)',
                        }}
                      >
                        <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: event.color }} />
                        <span className="truncate">{event.title}</span>
                      </button>
                    ))}
                    {overflow > 0 && (
                      <p className="text-[9px] text-muted-foreground text-center font-medium">
                        +{overflow} more
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
