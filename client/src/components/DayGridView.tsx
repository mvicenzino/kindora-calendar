import { useRef, useEffect, useMemo, useCallback, useState } from "react";
import { format, isToday, isSameDay, addDays, subDays } from "date-fns";
import { useCalendarTextSize } from "@/hooks/useCalendarTextSize";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useEventDrag } from "@/hooks/useEventDrag";
import type { UiEvent, UiFamilyMember } from "@shared/types";

import { X } from "lucide-react";

interface DayGridViewProps {
  date: Date;
  events: UiEvent[];
  members?: UiFamilyMember[];
  onEventClick: (event: UiEvent) => void;
  onAddEvent?: () => void;
  onAddEventForDate?: (date: Date) => void;
  onDateChange?: (date: Date) => void;
  onEventDrop?: (event: UiEvent, newStart: Date, newEnd: Date) => void;
  onEventDelete?: (eventId: string) => void;
}

const HOUR_HEIGHT = 48;
const START_HOUR = 0;
const END_HOUR = 24;
const HOURS = Array.from({ length: END_HOUR - START_HOUR }, (_, i) => i + START_HOUR);

function getEventPosition(event: UiEvent) {
  const startHour = event.startTime.getHours() + event.startTime.getMinutes() / 60;
  const endHour = event.endTime.getHours() + event.endTime.getMinutes() / 60;
  const adjustedEnd = endHour <= startHour ? 24 : endHour;
  const top = (startHour - START_HOUR) * HOUR_HEIGHT;
  const height = Math.max((adjustedEnd - startHour) * HOUR_HEIGHT, 20);
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

export default function DayGridView({ date, events, members = [], onEventClick, onAddEvent, onAddEventForDate, onDateChange, onEventDrop, onEventDelete }: DayGridViewProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const isTodayDate = isToday(date);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const { multiplier } = useCalendarTextSize();
  const evTitle = `${Math.round(11 * multiplier)}px`;
  const evMeta  = `${Math.round(10 * multiplier)}px`;

  const handleDrop = useCallback((event: UiEvent, newStart: Date, newEnd: Date) => {
    if (onEventDrop) onEventDrop(event, newStart, newEnd);
  }, [onEventDrop]);

  const { dragState, isDragging, justDraggedRef, pendingEventId, justDroppedEventId, startDrag, onPointerMove, endDrag, cancelDrag } = useEventDrag({
    hourHeight: HOUR_HEIGHT,
    startHour: START_HOUR,
    snapMinutes: 15,
    onDrop: handleDrop,
  });

  const dayEvents = useMemo(() =>
    events.filter(e => isSameDay(e.startTime, date)).sort((a, b) => a.startTime.getTime() - b.startTime.getTime()),
    [events, date]
  );

  const layout = useMemo(() => layoutOverlappingEvents(dayEvents), [dayEvents]);

  useEffect(() => {
    if (scrollRef.current) {
      const scrollTo = isTodayDate ? Math.max(new Date().getHours() - 1, 7) : 7;
      scrollRef.current.scrollTop = scrollTo * HOUR_HEIGHT;
    }
  }, [date, isTodayDate]);

  const nowOffset = useMemo(() => {
    if (!isTodayDate) return null;
    const now = new Date();
    return (now.getHours() + now.getMinutes() / 60 - START_HOUR) * HOUR_HEIGHT;
  }, [isTodayDate]);

  const handleSlotClick = (e: React.MouseEvent, hour: number) => {
    if (isDragging) return;
    if (onAddEventForDate) {
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      const yInSlot = e.clientY - rect.top;
      const fractionOfHour = yInSlot / HOUR_HEIGHT;
      const minuteOffset = Math.floor(fractionOfHour * 4) * 15;
      const d = new Date(date);
      d.setHours(hour, Math.min(minuteOffset, 45), 0, 0);
      onAddEventForDate(d);
    }
  };

  const handlePointerUp = useCallback(() => {
    if (isDragging || pendingEventId) endDrag(date);
  }, [isDragging, pendingEventId, endDrag, date]);

  const handlePointerCancel = useCallback(() => {
    if (isDragging || pendingEventId) cancelDrag();
  }, [isDragging, pendingEventId, cancelDrag]);

  const formatDragTime = (topPx: number, heightPx: number) => {
    const startMinutes = (topPx / HOUR_HEIGHT + START_HOUR) * 60;
    const endMinutes = startMinutes + (heightPx / HOUR_HEIGHT) * 60;
    const sh = Math.floor(startMinutes / 60);
    const sm = Math.round(startMinutes % 60);
    const eh = Math.floor(endMinutes / 60);
    const em = Math.round(endMinutes % 60);
    const fmtTime = (h: number, m: number) => {
      const period = h >= 12 ? 'PM' : 'AM';
      const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
      return `${h12}:${m.toString().padStart(2, '0')} ${period}`;
    };
    return `${fmtTime(sh, sm)} – ${fmtTime(eh, em)}`;
  };

  return (
    <>
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-3 py-2 border-b border-border/30">
        <div className="flex items-center gap-2">
          {onDateChange && (
            <>
              <Button size="icon" variant="ghost" onClick={() => onDateChange(subDays(date, 1))} data-testid="button-previous-day">
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button size="icon" variant="ghost" onClick={() => onDateChange(addDays(date, 1))} data-testid="button-next-day">
                <ChevronRight className="w-4 h-4" />
              </Button>
            </>
          )}
          <div>
            <h2 className="text-sm font-semibold text-foreground" data-testid="text-day-grid-title">
              {isTodayDate ? "Today" : format(date, 'EEEE')}
            </h2>
            <p className="text-[11px] text-muted-foreground">{format(date, 'MMMM d, yyyy')}</p>
          </div>
        </div>
      </div>

      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto overflow-x-hidden"
        onPointerMove={(isDragging || pendingEventId) ? onPointerMove : undefined}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
        onPointerLeave={handlePointerCancel}
        style={isDragging ? { cursor: 'grabbing', userSelect: 'none' } : undefined}
      >
        <div className="relative" style={{ height: HOURS.length * HOUR_HEIGHT }}>
          {HOURS.map(hour => (
            <div
              key={hour}
              className="absolute left-0 right-0 border-b border-border/40 dark:border-white/[0.06] cursor-pointer hover:bg-muted/20 transition-colors"
              style={{ top: (hour - START_HOUR) * HOUR_HEIGHT, height: HOUR_HEIGHT }}
              onClick={(e) => handleSlotClick(e, hour)}
              data-testid={`time-slot-${hour}`}
            >
              <span className="absolute left-1 sm:left-2 top-0.5 text-[9px] sm:text-[10px] text-muted-foreground/60 font-mono select-none">
                <span className="sm:hidden">{hour === 0 ? '12a' : hour < 12 ? `${hour}a` : hour === 12 ? '12p' : `${hour - 12}p`}</span>
                <span className="hidden sm:inline">{hour === 0 ? '12 AM' : hour < 12 ? `${hour} AM` : hour === 12 ? '12 PM' : `${hour - 12} PM`}</span>
              </span>
            </div>
          ))}

          {nowOffset !== null && (
            <div className="absolute left-12 right-0 z-20 pointer-events-none" style={{ top: nowOffset }}>
              <div className="flex items-center">
                <div className="w-2 h-2 rounded-full bg-red-500 -ml-1" />
                <div className="flex-1 h-px bg-red-500" />
              </div>
            </div>
          )}

          <div className="absolute left-10 sm:left-14 right-1 sm:right-2 top-0 bottom-0 pointer-events-none">
            {dayEvents.map(event => {
              const pos = getEventPosition(event);
              const col = layout.get(event.id);
              const colIdx = col?.columnIndex ?? 0;
              const totalCols = col?.totalColumns ?? 1;
              const widthPct = 100 / totalCols;
              const leftPct = colIdx * widthPct;

              const isBeingDragged = dragState?.eventId === event.id;
              const isPending = pendingEventId === event.id;
              const isJustDropped = justDroppedEventId === event.id;
              const displayTop = isBeingDragged ? dragState.currentTop : pos.top;
              const displayHeight = isBeingDragged ? dragState.currentHeight : pos.height;

              return (
                <div
                  key={event.id}
                  className={`absolute rounded-sm text-left overflow-visible pointer-events-auto group ${isBeingDragged ? 'z-30' : isPending ? 'z-20' : 'cursor-grab'}`}
                  style={{
                    top: displayTop + 1,
                    height: displayHeight - 2,
                    left: `${leftPct}%`,
                    width: `calc(${widthPct}% - 4px)`,
                    background: isPending
                      ? `linear-gradient(160deg, ${event.color}55 0%, ${event.color}38 50%, ${event.color}20 100%)`
                      : `linear-gradient(160deg, ${event.color}38 0%, ${event.color}22 50%, ${event.color}12 100%)`,
                    backdropFilter: 'blur(6px) saturate(1.2)',
                    WebkitBackdropFilter: 'blur(6px) saturate(1.2)',
                    border: isPending
                      ? `1px solid ${event.color}70`
                      : `1px solid ${event.color}35`,
                    boxShadow: isBeingDragged
                      ? `inset 3px 0 0 ${event.color}, inset 0 1px 0 rgba(255,255,255,0.25), 0 16px 40px rgba(0,0,0,0.38), 0 6px 16px ${event.color}50`
                      : isPending
                      ? `inset 3px 0 0 ${event.color}, inset 0 1px 0 rgba(255,255,255,0.22), 0 4px 14px ${event.color}40`
                      : `inset 3px 0 0 ${event.color}, inset 0 1px 0 rgba(255,255,255,0.18), 0 2px 8px ${event.color}22`,
                    transform: isBeingDragged
                      ? 'scale(1.04) rotate(0.6deg)'
                      : isPending
                      ? 'scale(0.97)'
                      : 'scale(1)',
                    transition: isBeingDragged
                      ? 'none'
                      : isJustDropped
                      ? 'top 0.4s cubic-bezier(0.34,1.56,0.64,1), height 0.4s cubic-bezier(0.34,1.56,0.64,1), transform 0.4s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.3s ease'
                      : isPending
                      ? 'transform 0.08s ease-in, box-shadow 0.08s ease-in, background 0.08s ease-in, border-color 0.08s ease-in'
                      : 'top 0.15s ease, height 0.15s ease, transform 0.2s ease-out, box-shadow 0.2s ease',
                    willChange: (isBeingDragged || isJustDropped) ? 'transform, box-shadow' : undefined,
                  }}
                  data-testid={`grid-event-${event.id}`}
                >
                  <div
                    className="absolute inset-0 px-2 py-1 cursor-grab active:cursor-grabbing"
                    style={{ bottom: '6px', touchAction: onEventDrop ? 'none' : undefined }}
                    onPointerDown={(e) => {
                      if (onEventDrop) startDrag(e, event, 'move', pos.top, pos.height);
                    }}
                    onClick={(e) => { e.stopPropagation(); if (!isDragging && !justDraggedRef.current) onEventClick(event); }}
                  >
                    <p className="font-semibold text-foreground truncate leading-tight pr-4 flex items-center gap-1" style={{ fontSize: evTitle }}>
                      <span className="truncate">{event.title}</span>
                      {event.googleEventId && (
                        <span className="flex-shrink-0 inline-flex items-center justify-center rounded-full font-bold leading-none" style={{ background: '#4285f4', color: '#fff', fontSize: '8px', width: '13px', height: '13px' }}>G</span>
                      )}
                    </p>
                    {displayHeight > 30 && (
                      <p className="text-muted-foreground truncate" style={{ fontSize: evMeta }}>
                        {isBeingDragged ? formatDragTime(displayTop, displayHeight) : format(event.startTime, 'h:mm a')}
                      </p>
                    )}
                    {displayHeight > 50 && event.members && event.members.length > 0 && !isBeingDragged && (
                      <div className="flex gap-0.5 mt-0.5">
                        {event.members.slice(0, 3).map(m => (
                          <div key={m.id} className="w-3 h-3 rounded-full text-[7px] font-bold flex items-center justify-center text-white" style={{ backgroundColor: m.color }}>
                            {m.initials?.[0]}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {onEventDelete && !isBeingDragged && (
                    <button
                      className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 hover:!opacity-100 transition-opacity z-10"
                      style={{ background: 'hsl(var(--destructive) / 0.9)', color: '#fff' }}
                      onClick={(e) => { e.stopPropagation(); setPendingDeleteId(event.id); }}
                      data-testid={`button-delete-event-${event.id}`}
                    >
                      <X className="w-2.5 h-2.5" />
                    </button>
                  )}

                  {onEventDrop && (
                    <div
                      className="absolute bottom-0 left-0 right-0 h-[6px] cursor-s-resize z-10"
                      style={{ touchAction: 'none' }}
                      onPointerDown={(e) => startDrag(e, event, 'resize', pos.top, pos.height)}
                      data-testid={`resize-handle-${event.id}`}
                    >
                      <div className="mx-auto w-6 h-1 rounded-full bg-foreground/20 mt-1" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>

    <AlertDialog open={pendingDeleteId !== null} onOpenChange={(open) => { if (!open) setPendingDeleteId(null); }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Event</AlertDialogTitle>
          <AlertDialogDescription>Are you sure you want to delete this event? This action cannot be undone.</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel data-testid="button-cancel-delete-event">Cancel</AlertDialogCancel>
          <AlertDialogAction
            data-testid="button-confirm-delete-event"
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            onClick={() => { if (pendingDeleteId && onEventDelete) { onEventDelete(pendingDeleteId); } setPendingDeleteId(null); }}
          >Delete</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  );
}
