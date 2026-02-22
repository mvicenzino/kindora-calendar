import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { format, isSameDay } from "date-fns";
import { Plus, Clock, CalendarDays, X } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { CATEGORY_CONFIG, type EventCategory } from "@shared/schema";

interface Event {
  id: string;
  title: string;
  startTime: Date;
  endTime: Date;
  color: string;
  category?: string;
  memberId?: string;
  members?: Member[];
  description?: string;
  completed?: boolean;
}

interface Member {
  id: string;
  name: string;
  color: string;
  avatar?: string;
}

interface DayEventsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  date: Date;
  events: Event[];
  members: Member[];
  onEventClick: (event: Event) => void;
  onAddEvent: () => void;
}

export default function DayEventsDialog({
  isOpen,
  onClose,
  date,
  events,
  members,
  onEventClick,
  onAddEvent
}: DayEventsDialogProps) {
  const dayEvents = events
    .filter(e => isSameDay(new Date(e.startTime), date))
    .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

  const formatTime = (startTime: Date, endTime: Date) => {
    const start = new Date(startTime);
    const end = new Date(endTime);
    if (start.getHours() === 23 && start.getMinutes() === 58) {
      return "Anytime";
    }
    const sameAmPm = format(start, 'a') === format(end, 'a');
    return sameAmPm
      ? `${format(start, 'h:mm')} - ${format(end, 'h:mm a')}`
      : `${format(start, 'h:mm a')} - ${format(end, 'h:mm a')}`;
  };

  const handleEventClick = (event: Event) => {
    onClose();
    onEventClick(event);
  };

  const handleAddEvent = () => {
    onClose();
    onAddEvent();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className="sm:max-w-sm p-0 border-0 overflow-hidden rounded-2xl max-h-[80vh] flex flex-col gap-0"
        style={{
          background: 'transparent',
          boxShadow: '0 0 0 1px rgba(255,255,255,0.06), 0 25px 60px -12px rgba(0,0,0,0.5)',
        }}
      >
        <DialogTitle className="sr-only">Events for {format(date, 'MMMM d')}</DialogTitle>
        <DialogDescription className="sr-only">View all events for this day</DialogDescription>

        {/* Header */}
        <div
          className="px-4 pt-3.5 pb-3 relative"
          style={{ borderBottom: '1px solid hsl(var(--border) / 0.4)' }}
        >
          <div className="absolute inset-0 backdrop-blur-2xl" style={{ background: 'hsl(var(--card) / 0.9)' }} />
          <div className="relative flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-primary/15">
                <CalendarDays className="w-3.5 h-3.5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-bold text-foreground">{format(date, 'EEEE')}</p>
                <p className="text-[10px] text-muted-foreground">{format(date, 'MMMM d, yyyy')}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
              style={{ background: 'hsl(var(--muted) / 0.4)' }}
              data-testid="button-close-day-events"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Events list */}
        <div
          className="flex-1 overflow-y-auto"
          style={{ background: 'hsl(var(--card) / 0.92)', backdropFilter: 'blur(40px)' }}
        >
          {dayEvents.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 px-4">
              <div className="w-10 h-10 rounded-xl bg-muted/30 flex items-center justify-center mb-3">
                <CalendarDays className="w-5 h-5 text-muted-foreground" />
              </div>
              <p className="text-xs text-muted-foreground mb-3">No events scheduled</p>
              <Button
                onClick={handleAddEvent}
                size="sm"
                className="h-8 text-xs rounded-lg"
                data-testid="button-add-event-empty"
              >
                <Plus className="w-3 h-3 mr-1.5" />
                Add Event
              </Button>
            </div>
          ) : (
            <div className="px-3 py-2 space-y-1.5">
              {dayEvents.map((event) => {
                const eventColor = event.color || '#64748B';
                const categoryConfig = CATEGORY_CONFIG[(event.category as EventCategory) || 'other'];
                return (
                  <button
                    key={event.id}
                    onClick={() => handleEventClick(event)}
                    data-testid={`day-event-${event.id}`}
                    className="w-full text-left rounded-xl transition-all active:scale-[0.98] overflow-hidden"
                    style={{
                      background: `${eventColor}10`,
                      boxShadow: `inset 0 0 0 1px ${eventColor}20`,
                    }}
                  >
                    <div className="flex items-center gap-3 px-3 py-2.5">
                      <div
                        className="w-1 h-8 rounded-full flex-shrink-0"
                        style={{ backgroundColor: eventColor }}
                      />
                      <div className="flex-1 min-w-0">
                        <p className={`text-xs font-semibold text-foreground truncate ${event.completed ? 'line-through opacity-60' : ''}`}>
                          {event.title}
                        </p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <Clock className="w-2.5 h-2.5 text-muted-foreground" />
                          <span className="text-[10px] text-muted-foreground">{formatTime(event.startTime, event.endTime)}</span>
                          {categoryConfig && (
                            <>
                              <span className="text-muted-foreground/30 text-[10px]">·</span>
                              <span className="text-[10px] text-muted-foreground">{categoryConfig.label}</span>
                            </>
                          )}
                        </div>
                      </div>
                      {event.members && event.members.length > 0 && (
                        <div className="flex -space-x-1 flex-shrink-0">
                          {event.members.slice(0, 2).map((m) => (
                            <Avatar key={m.id} className="h-5 w-5 border border-card">
                              <AvatarFallback
                                className="text-[8px] text-white font-bold"
                                style={{ backgroundColor: m.color }}
                              >
                                {m.name?.[0]}
                              </AvatarFallback>
                            </Avatar>
                          ))}
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Bottom add button */}
        {dayEvents.length > 0 && (
          <div
            className="px-3 py-2.5"
            style={{
              background: 'hsl(var(--card) / 0.95)',
              borderTop: '1px solid hsl(var(--border) / 0.4)',
              backdropFilter: 'blur(20px)',
            }}
          >
            <Button
              onClick={handleAddEvent}
              variant="ghost"
              className="w-full h-8 text-xs rounded-lg"
              data-testid="button-add-event-for-day"
            >
              <Plus className="w-3 h-3 mr-1.5" />
              Add Event
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
