import { useMemo, useState, useCallback, useRef } from "react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, startOfWeek, endOfWeek, isSameMonth, addMonths, subMonths, isToday } from "date-fns";
import { useCalendarTextSize } from "@/hooks/useCalendarTextSize";
import { ChevronLeft, ChevronRight } from "lucide-react";
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
  onViewChange?: (view: 'day' | 'week' | 'month' | 'year' | 'timeline') => void;
  onEventDrop?: (event: UiEvent, newStart: Date, newEnd: Date) => void;
}

const MAX_EVENTS_PER_CELL = 3;

interface MonthDragState {
  event: UiEvent;
  originDateStr: string;
  currentDateStr: string | null;
}

export default function MonthGridView({ date, events, members, onEventClick, onAddEvent, onAddEventForDate, onDateChange, onViewChange, onEventDrop }: MonthGridViewProps) {
  const monthStart = startOfMonth(date);
  const monthEnd = endOfMonth(date);
  const { multiplier } = useCalendarTextSize();
  const evTitle = `${Math.round(10 * multiplier)}px`;
  const calendarStart = startOfWeek(monthStart);
  const calendarEnd = endOfWeek(monthEnd);
  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  const [dragState, setDragState] = useState<MonthDragState | null>(null);
  const cellRefs = useRef<Map<string, HTMLDivElement>>(new Map());

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
    if (dragState) return;
    if (onAddEventForDate) {
      onAddEventForDate(day);
    }
  };

  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingTouch = useRef<{ event: UiEvent; dateStr: string } | null>(null);
  const [pendingEventId, setPendingEventId] = useState<string | null>(null);

  const handleEventPointerDown = useCallback((e: React.PointerEvent, event: UiEvent) => {
    if (!onEventDrop) return;
    e.stopPropagation();

    const dateStr = format(event.startTime, 'yyyy-MM-dd');

    if (e.pointerType === 'touch') {
      pendingTouch.current = { event, dateStr };
      setPendingEventId(event.id);
      longPressTimer.current = setTimeout(() => {
        if (pendingTouch.current) {
          setDragState({
            event: pendingTouch.current.event,
            originDateStr: pendingTouch.current.dateStr,
            currentDateStr: pendingTouch.current.dateStr,
          });
          setPendingEventId(null);
          pendingTouch.current = null;
        }
      }, 250);
    } else {
      e.preventDefault();
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      setDragState({ event, originDateStr: dateStr, currentDateStr: dateStr });
    }
  }, [onEventDrop]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (pendingTouch.current && !dragState) {
      if (longPressTimer.current) {
        clearTimeout(longPressTimer.current);
        longPressTimer.current = null;
      }
      pendingTouch.current = null;
      setPendingEventId(null);
      return;
    }
    if (!dragState) return;
    e.preventDefault();

    for (const [dateStr, el] of Array.from(cellRefs.current.entries())) {
      const rect = el.getBoundingClientRect();
      if (e.clientX >= rect.left && e.clientX <= rect.right && e.clientY >= rect.top && e.clientY <= rect.bottom) {
        if (dateStr !== dragState.currentDateStr) {
          setDragState(prev => prev ? { ...prev, currentDateStr: dateStr } : null);
        }
        break;
      }
    }
  }, [dragState]);

  const handlePointerUp = useCallback(() => {
    if (pendingTouch.current && !dragState) {
      if (longPressTimer.current) {
        clearTimeout(longPressTimer.current);
        longPressTimer.current = null;
      }
      pendingTouch.current = null;
      setPendingEventId(null);
      return;
    }

    if (!dragState || !onEventDrop) {
      setDragState(null);
      return;
    }

    if (dragState.currentDateStr && dragState.currentDateStr !== dragState.originDateStr) {
      const targetDay = calendarDays.find(d => format(d, 'yyyy-MM-dd') === dragState.currentDateStr);
      if (targetDay) {
        const event = dragState.event;
        const duration = event.endTime.getTime() - event.startTime.getTime();
        const newStart = new Date(targetDay);
        newStart.setHours(event.startTime.getHours(), event.startTime.getMinutes(), 0, 0);
        const newEnd = new Date(newStart.getTime() + duration);
        onEventDrop(event, newStart, newEnd);
      }
    }

    setDragState(null);
  }, [dragState, onEventDrop, calendarDays]);

  const handlePointerCancel = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    pendingTouch.current = null;
    setPendingEventId(null);
    setDragState(null);
  }, []);

  const setCellRef = useCallback((dateStr: string, el: HTMLDivElement | null) => {
    if (el) {
      cellRefs.current.set(dateStr, el);
    } else {
      cellRefs.current.delete(dateStr);
    }
  }, []);

  return (
    <div
      className="flex flex-col h-full"
      onPointerMove={(dragState || pendingEventId) ? handlePointerMove : undefined}
      onPointerUp={(dragState || pendingEventId) ? handlePointerUp : undefined}
      onPointerCancel={handlePointerCancel}
      onPointerLeave={(dragState || pendingEventId) ? handlePointerCancel : undefined}
      style={dragState ? { cursor: 'grabbing', userSelect: 'none' } : undefined}
    >
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
      </div>

      <div className="grid grid-cols-7 border-b border-border/30 dark:border-white/[0.08]">
        {[
          { short: 'S', full: 'Sun' },
          { short: 'M', full: 'Mon' },
          { short: 'T', full: 'Tue' },
          { short: 'W', full: 'Wed' },
          { short: 'T', full: 'Thu' },
          { short: 'F', full: 'Fri' },
          { short: 'S', full: 'Sat' },
        ].map((day, idx) => (
          <div key={idx} className="text-center py-1 sm:py-1.5 text-[9px] sm:text-[10px] font-medium text-muted-foreground uppercase tracking-wider border-r border-border/30 dark:border-white/[0.08] last:border-r-0">
            <span className="sm:hidden">{day.short}</span>
            <span className="hidden sm:inline">{day.full}</span>
          </div>
        ))}
      </div>

      <div className="flex-1 grid" style={{ gridTemplateRows: `repeat(${weeks.length}, 1fr)` }}>
        {weeks.map((week, weekIdx) => (
          <div key={weekIdx} className="grid grid-cols-7 border-b border-border/30 dark:border-white/[0.06] last:border-b-0 min-h-0">
            {week.map((day) => {
              const dayEvents = getEventsForDay(day);
              const isCurrentMonth = isSameMonth(day, date);
              const isTodayDate = isToday(day);
              const overflow = dayEvents.length - MAX_EVENTS_PER_CELL;
              const dateStr = format(day, 'yyyy-MM-dd');
              const isDropTarget = dragState && dragState.currentDateStr === dateStr && dateStr !== dragState.originDateStr;

              return (
                <div
                  key={day.toISOString()}
                  ref={(el) => setCellRef(dateStr, el)}
                  className={`
                    border-r border-border/30 dark:border-white/[0.06] last:border-r-0 p-0.5 overflow-hidden cursor-pointer
                    transition-colors flex flex-col min-h-0
                    ${!isCurrentMonth ? 'opacity-30' : ''}
                    ${isTodayDate ? 'bg-primary/[0.04]' : ''}
                    ${isDropTarget ? 'bg-primary/10 ring-1 ring-inset ring-primary/30' : 'hover:bg-muted/20'}
                  `}
                  onClick={() => handleDayClick(day)}
                  data-testid={`day-cell-${dateStr}`}
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
                    {dayEvents.slice(0, MAX_EVENTS_PER_CELL).map(event => {
                      const isBeingDragged = dragState?.event.id === event.id;
                      const isPending = pendingEventId === event.id;
                      return (
                        <div
                          key={event.id}
                          onPointerDown={(e) => handleEventPointerDown(e, event)}
                          onClick={(e) => { e.stopPropagation(); if (!dragState && !isPending) onEventClick(event); }}
                          data-testid={`grid-event-${event.id}`}
                          className={`
                            w-full text-left rounded-sm px-1 py-0.5 sm:py-px truncate leading-tight font-medium
                            flex items-center gap-0.5 sm:gap-1 min-h-[18px] sm:min-h-0
                            ${isBeingDragged ? 'opacity-40' : isPending ? 'ring-1 ring-primary/50 scale-[1.03]' : 'cursor-grab'}
                          `}
                          style={{
                            backgroundColor: event.color + '25',
                            color: 'var(--foreground)',
                            touchAction: onEventDrop ? 'none' : undefined,
                            fontSize: evTitle,
                          }}
                        >
                          <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: event.color }} />
                          <span className="truncate">{event.title}</span>
                          {event.googleEventId && (
                            <span className="flex-shrink-0 inline-flex items-center justify-center rounded-full font-bold leading-none" style={{ background: '#4285f4', color: '#fff', fontSize: '5px', width: '9px', height: '9px' }}>G</span>
                          )}
                        </div>
                      );
                    })}

                    {isDropTarget && dragState && (
                      <div
                        className="w-full text-left rounded-sm px-1 py-px truncate text-[10px] leading-tight font-medium flex items-center gap-1 opacity-60"
                        style={{
                          backgroundColor: dragState.event.color + '25',
                          color: 'var(--foreground)',
                        }}
                      >
                        <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: dragState.event.color }} />
                        <span className="truncate">{dragState.event.title}</span>
                      </div>
                    )}

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
