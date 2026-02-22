import { useRef, useEffect, useMemo } from "react";
import { format, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, addWeeks, isToday } from "date-fns";
import { Plus, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { UiEvent, UiFamilyMember } from "@shared/types";

interface WeekGridViewProps {
  date: Date;
  events: UiEvent[];
  members: UiFamilyMember[];
  onEventClick: (event: UiEvent) => void;
  onAddEvent?: () => void;
  onAddEventForDate?: (date: Date) => void;
  onDateChange?: (date: Date) => void;
  onWeekChange?: (date: Date) => void;
}

const HOUR_HEIGHT = 44;
const START_HOUR = 0;
const END_HOUR = 24;
const HOURS = Array.from({ length: END_HOUR - START_HOUR }, (_, i) => i + START_HOUR);

function getEventPosition(event: UiEvent) {
  const startHour = event.startTime.getHours() + event.startTime.getMinutes() / 60;
  const endHour = event.endTime.getHours() + event.endTime.getMinutes() / 60;
  const adjustedEnd = endHour <= startHour ? 24 : endHour;
  const top = (startHour - START_HOUR) * HOUR_HEIGHT;
  const height = Math.max((adjustedEnd - startHour) * HOUR_HEIGHT, 18);
  return { top, height };
}

function layoutOverlappingEvents(events: UiEvent[]) {
  const sorted = [...events].sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
  const columns: UiEvent[][] = [];

  sorted.forEach(event => {
    let placed = false;
    for (const col of columns) {
      const last = col[col.length - 1];
      if (event.startTime >= last.endTime) {
        col.push(event);
        placed = true;
        break;
      }
    }
    if (!placed) columns.push([event]);
  });

  const result = new Map<string, { columnIndex: number; totalColumns: number }>();
  const totalCols = columns.length;
  columns.forEach((col, colIdx) => {
    col.forEach(ev => {
      result.set(ev.id, { columnIndex: colIdx, totalColumns: totalCols });
    });
  });
  return result;
}

export default function WeekGridView({ date, events, members, onEventClick, onAddEvent, onAddEventForDate, onDateChange, onWeekChange }: WeekGridViewProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const weekStart = startOfWeek(date);
  const weekEnd = endOfWeek(date);
  const days = eachDayOfInterval({ start: weekStart, end: weekEnd });

  useEffect(() => {
    if (scrollRef.current) {
      const now = new Date();
      const scrollTo = Math.max(now.getHours() - 1, 7);
      scrollRef.current.scrollTop = scrollTo * HOUR_HEIGHT;
    }
  }, [date]);

  const nowOffset = useMemo(() => {
    const now = new Date();
    const todayInWeek = days.find(d => isToday(d));
    if (!todayInWeek) return null;
    const dayIndex = days.indexOf(todayInWeek);
    const hourOffset = (now.getHours() + now.getMinutes() / 60 - START_HOUR) * HOUR_HEIGHT;
    return { dayIndex, hourOffset };
  }, [days]);

  const eventsByDay = useMemo(() => {
    return days.map(day => {
      const dayEvts = events.filter(e => isSameDay(e.startTime, day));
      const layout = layoutOverlappingEvents(dayEvts);
      return { day, events: dayEvts, layout };
    });
  }, [events, days]);

  const handleSlotClick = (day: Date, hour: number) => {
    if (onAddEventForDate) {
      const d = new Date(day);
      d.setHours(hour, 0, 0, 0);
      onAddEventForDate(d);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-3 py-2 border-b border-border/30">
        <div className="flex items-center gap-2">
          {onWeekChange && (
            <>
              <Button size="icon" variant="ghost" onClick={() => onWeekChange(addWeeks(date, -1))} data-testid="button-previous-week">
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button size="icon" variant="ghost" onClick={() => onWeekChange(addWeeks(date, 1))} data-testid="button-next-week">
                <ChevronRight className="w-4 h-4" />
              </Button>
            </>
          )}
          <div>
            <h2 className="text-sm font-semibold text-foreground">
              {format(weekStart, 'MMM d')} - {format(weekEnd, 'MMM d, yyyy')}
            </h2>
          </div>
        </div>
        {onAddEvent && (
          <Button size="icon" onClick={onAddEvent} data-testid="button-add-event" className="rounded-full bg-primary text-primary-foreground">
            <Plus className="w-4 h-4" strokeWidth={2.5} />
          </Button>
        )}
      </div>

      <div className="grid grid-cols-[48px_repeat(7,1fr)] border-b border-border/30">
        <div className="border-r border-border/20" />
        {days.map((day, i) => {
          const isTodayDate = isToday(day);
          return (
            <div
              key={day.toISOString()}
              className={`text-center py-1.5 border-r border-border/20 last:border-r-0 ${isTodayDate ? 'bg-primary/5' : ''}`}
              data-testid={`week-col-header-${format(day, 'yyyy-MM-dd')}`}
            >
              <p className="text-[10px] text-muted-foreground uppercase">{format(day, 'EEE')}</p>
              <p className={`text-sm font-semibold ${isTodayDate ? 'text-primary' : 'text-foreground'}`}>
                {format(day, 'd')}
              </p>
            </div>
          );
        })}
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto overflow-x-hidden">
        <div className="grid grid-cols-[48px_repeat(7,1fr)]" style={{ height: HOURS.length * HOUR_HEIGHT }}>
          <div className="relative border-r border-border/20">
            {HOURS.map(hour => (
              <div
                key={hour}
                className="absolute left-0 right-0 border-b border-border/10"
                style={{ top: (hour - START_HOUR) * HOUR_HEIGHT, height: HOUR_HEIGHT }}
              >
                <span className="absolute left-1 top-0 text-[9px] text-muted-foreground/50 font-mono select-none">
                  {hour === 0 ? '12a' : hour < 12 ? `${hour}a` : hour === 12 ? '12p' : `${hour - 12}p`}
                </span>
              </div>
            ))}
          </div>

          {eventsByDay.map(({ day, events: dayEvts, layout }, dayIdx) => {
            const isTodayDate = isToday(day);
            return (
              <div key={day.toISOString()} className={`relative border-r border-border/10 last:border-r-0 ${isTodayDate ? 'bg-primary/[0.02]' : ''}`}>
                {HOURS.map(hour => (
                  <div
                    key={hour}
                    className="absolute left-0 right-0 border-b border-border/10 cursor-pointer hover:bg-muted/15 transition-colors"
                    style={{ top: (hour - START_HOUR) * HOUR_HEIGHT, height: HOUR_HEIGHT }}
                    onClick={() => handleSlotClick(day, hour)}
                  />
                ))}

                {nowOffset && nowOffset.dayIndex === dayIdx && (
                  <div className="absolute left-0 right-0 z-20 pointer-events-none" style={{ top: nowOffset.hourOffset }}>
                    <div className="h-px bg-red-500 w-full" />
                  </div>
                )}

                <div className="absolute inset-0" style={{ left: 2, right: 2 }}>
                  {dayEvts.map(event => {
                    const pos = getEventPosition(event);
                    const col = layout.get(event.id);
                    const colIdx = col?.columnIndex ?? 0;
                    const totalCols = col?.totalColumns ?? 1;
                    const widthPct = 100 / totalCols;
                    const leftPct = colIdx * widthPct;

                    return (
                      <button
                        key={event.id}
                        onClick={(e) => { e.stopPropagation(); onEventClick(event); }}
                        data-testid={`grid-event-${event.id}`}
                        className="absolute rounded-sm px-1 py-0.5 text-left overflow-hidden transition-all cursor-pointer"
                        style={{
                          top: pos.top + 1,
                          height: pos.height - 2,
                          left: `${leftPct}%`,
                          width: `calc(${widthPct}% - 2px)`,
                          backgroundColor: event.color + '25',
                          boxShadow: `inset 2px 0 0 ${event.color}`,
                        }}
                      >
                        <p className="text-[10px] font-semibold text-foreground truncate leading-tight">{event.title}</p>
                        {pos.height > 25 && (
                          <p className="text-[9px] text-muted-foreground truncate">
                            {format(event.startTime, 'h:mma').toLowerCase()}
                          </p>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
