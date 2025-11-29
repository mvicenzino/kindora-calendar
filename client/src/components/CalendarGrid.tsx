import { 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval, 
  format,
  isSameMonth,
  isToday,
  isSameDay
} from "date-fns";
import { Badge } from "@/components/ui/badge";
import { MessageSquare } from "lucide-react";

interface Event {
  id: string;
  title: string;
  startTime: Date;
  endTime: Date;
  color: string;
  memberId: string;
  noteCount?: number;
}

interface CalendarGridProps {
  currentDate: Date;
  events: Event[];
  onDayClick: (date: Date) => void;
  onEventClick: (event: Event) => void;
  selectedDate?: Date;
}

export default function CalendarGrid({
  currentDate,
  events,
  onDayClick,
  onEventClick,
  selectedDate,
}: CalendarGridProps) {
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarStart = startOfWeek(monthStart);
  const calendarEnd = endOfWeek(monthEnd);
  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const getEventsForDay = (day: Date) => {
    return events.filter(event => 
      isSameDay(new Date(event.startTime), day)
    );
  };

  const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <div className="p-6">
      <div className="grid grid-cols-7 gap-2">
        {weekDays.map(day => (
          <div
            key={day}
            className="text-xs font-medium uppercase tracking-wide text-muted-foreground text-center py-3"
          >
            {day}
          </div>
        ))}
        
        {days.map((day) => {
          const dayEvents = getEventsForDay(day);
          const isCurrentMonth = isSameMonth(day, currentDate);
          const isTodayDate = isToday(day);
          const isSelected = selectedDate && isSameDay(day, selectedDate);

          return (
            <button
              key={day.toISOString()}
              onClick={() => onDayClick(day)}
              data-testid={`day-${format(day, 'yyyy-MM-dd')}`}
              className={`
                rounded-2xl p-4 min-h-[120px] flex flex-col gap-2
                backdrop-blur-lg transition-all duration-300
                hover:scale-[1.02] hover:shadow-lg hover-elevate
                ${isCurrentMonth ? 'bg-card/60 border border-card-border' : 'bg-muted/30 border border-transparent'}
                ${isTodayDate ? 'ring-2 ring-primary' : ''}
                ${isSelected ? 'ring-2 ring-primary/50' : ''}
              `}
            >
              <div className={`
                text-sm font-semibold font-mono
                ${!isCurrentMonth ? 'text-muted-foreground' : ''}
                ${isTodayDate ? 'text-primary' : ''}
              `}>
                {format(day, 'd')}
              </div>
              
              <div className="flex flex-col gap-1">
                {dayEvents.slice(0, 3).map(event => (
                  <Badge
                    key={event.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      onEventClick(event);
                    }}
                    data-testid={`event-badge-${event.id}`}
                    className="text-xs backdrop-blur-md cursor-pointer hover-elevate active-elevate-2 flex items-center gap-1 text-white"
                    style={{ 
                      backgroundColor: event.color,
                      borderColor: `${event.color}`
                    }}
                  >
                    <span className="truncate flex-1">{event.title}</span>
                    {(event.noteCount ?? 0) > 0 && (
                      <span 
                        className="flex items-center gap-0.5 flex-shrink-0 opacity-80"
                        data-testid={`notes-indicator-${event.id}`}
                      >
                        <MessageSquare className="w-3 h-3" />
                        <span className="text-[10px]">{event.noteCount}</span>
                      </span>
                    )}
                  </Badge>
                ))}
                {dayEvents.length > 3 && (
                  <span className="text-xs text-muted-foreground font-medium">
                    +{dayEvents.length - 3} more
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
