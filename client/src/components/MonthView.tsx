import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, startOfWeek, endOfWeek, isSameMonth, isAfter, addMonths, subMonths, isToday } from "date-fns";
import { Plus, ChevronLeft, ChevronRight, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import EventCard from "@/components/EventCard";
import type { UiEvent, UiFamilyMember } from "@shared/types";

interface MonthViewProps {
  date: Date;
  events: UiEvent[];
  members: UiFamilyMember[];
  onEventClick: (event: UiEvent) => void;
  onViewChange?: (view: 'day' | 'week' | 'month') => void;
  onAddEvent?: () => void;
  onAddEventForDate?: (date: Date) => void;
  onDateChange?: (date: Date) => void;
}

export default function MonthView({ date, events, members, onEventClick, onViewChange, onAddEvent, onAddEventForDate, onDateChange }: MonthViewProps) {
  const monthStart = startOfMonth(date);
  const monthEnd = endOfMonth(date);
  const calendarStart = startOfWeek(monthStart);
  const calendarEnd = endOfWeek(monthEnd);
  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const getEventsForDay = (day: Date) => {
    return events.filter(e => isSameDay(new Date(e.startTime), day));
  };

  const upcomingEvents = events
    .filter(e => isAfter(new Date(e.startTime), new Date()))
    .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
    .slice(0, 3);

  return (
    <div className="p-4 sm:p-6">
      <div className="w-full max-w-2xl mx-auto space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70 mb-1">
              MONTH
            </p>
            <h1 className="text-4xl sm:text-5xl font-bold text-foreground">
              {format(date, 'MMMM yyyy')}
            </h1>
          </div>
          <div className="flex items-center gap-1.5">
            {onDateChange && (
              <>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => onDateChange(subMonths(date, 1))}
                  data-testid="button-previous-month"
                >
                  <ChevronLeft className="w-5 h-5" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => onDateChange(addMonths(date, 1))}
                  data-testid="button-next-month"
                >
                  <ChevronRight className="w-5 h-5" />
                </Button>
              </>
            )}
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

        <div className="space-y-3">
          <div className="grid grid-cols-7 gap-1 sm:gap-2">
            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, idx) => (
              <div key={idx} className="text-center text-xs font-medium text-muted-foreground">
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1 sm:gap-2">
            {calendarDays.map((day) => {
              const dayEvents = getEventsForDay(day);
              const hasEvents = dayEvents.length > 0;
              const isCurrentMonth = isSameMonth(day, date);
              const isTodayDate = isToday(day);
              const eventColor = dayEvents.length > 0 ? dayEvents[0].color : null;

              const getBgWithAlpha = (hex: string) => {
                const color = hex.replace('#', '');
                const r = parseInt(color.substr(0, 2), 16);
                const g = parseInt(color.substr(2, 2), 16);
                const b = parseInt(color.substr(4, 2), 16);
                return `rgba(${r}, ${g}, ${b}, 0.25)`;
              };

              return (
                <button
                  key={day.toISOString()}
                  onClick={() => {
                    if (onAddEventForDate) {
                      onAddEventForDate(day);
                    } else {
                      onDateChange?.(day);
                      onViewChange?.('day');
                    }
                  }}
                  data-testid={`day-${format(day, 'yyyy-MM-dd')}`}
                  style={hasEvents && eventColor ? { backgroundColor: getBgWithAlpha(eventColor) } : undefined}
                  className={`
                    aspect-square rounded-md flex flex-col items-center justify-center transition-all
                    ${isTodayDate ? 'ring-2 ring-primary ring-offset-1 ring-offset-background' : ''}
                    ${hasEvents ? 'border border-border' : ''}
                    ${!isCurrentMonth ? 'opacity-30' : ''}
                    hover:bg-muted/50
                  `}
                >
                  <span className={`text-sm font-semibold ${isTodayDate ? 'text-primary' : 'text-foreground'}`}>
                    {format(day, 'd')}
                  </span>
                  {hasEvents && (
                    <div className="flex gap-0.5 mt-0.5">
                      {dayEvents.slice(0, 3).map((e, i) => (
                        <div key={i} className="w-1 h-1 rounded-full" style={{ backgroundColor: e.color || 'hsl(var(--primary))' }} />
                      ))}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {upcomingEvents.length > 0 && (
          <div className="space-y-3 pt-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              UPCOMING
            </p>
            <div className="space-y-2">
              {upcomingEvents.map((event) => (
                <button
                  key={event.id}
                  onClick={() => onEventClick(event)}
                  data-testid={`upcoming-event-${event.id}`}
                  className="w-full rounded-xl p-3 bg-card border border-border hover-elevate transition-all text-left flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {event.members?.[0] && (
                      <Avatar className="w-8 h-8 flex-shrink-0">
                        <AvatarFallback
                          className="text-xs font-semibold"
                          style={{ backgroundColor: event.members[0].color + '30', color: event.members[0].color }}
                        >
                          {event.members[0].initials}
                        </AvatarFallback>
                      </Avatar>
                    )}
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {event.title}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {format(event.startTime, 'MMM d')}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {(event.noteCount ?? 0) > 0 && (
                      <span 
                        className="flex items-center gap-0.5 text-muted-foreground"
                        data-testid={`notes-indicator-${event.id}`}
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span className="text-xs">{event.noteCount}</span>
                      </span>
                    )}
                    <span className="text-sm text-muted-foreground">
                      {format(event.startTime, 'h:mm a')}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
