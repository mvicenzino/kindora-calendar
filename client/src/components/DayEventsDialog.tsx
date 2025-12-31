import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format, isSameDay } from "date-fns";
import { Plus, Calendar, Clock } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface Event {
  id: string;
  title: string;
  startTime: Date;
  endTime: Date;
  color: string;
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

  const getMember = (event: Event) => {
    if (event.members && event.members.length > 0) {
      return event.members[0];
    }
    if (event.memberId) {
      return members.find(m => m.id === event.memberId);
    }
    return undefined;
  };

  const formatTime = (startTime: Date, endTime: Date) => {
    const start = new Date(startTime);
    const end = new Date(endTime);
    if (start.getHours() === 23 && start.getMinutes() === 58) {
      return "Anytime";
    }
    return `${format(start, 'h:mm a')} - ${format(end, 'h:mm a')}`;
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
      <DialogContent className="bg-gradient-to-br from-[#3A4550] via-[#4A5560] to-[#5A6570] border-white/20 text-white max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white text-xl">
            <Calendar className="w-5 h-5" />
            {format(date, 'EEEE, MMMM d')}
          </DialogTitle>
        </DialogHeader>

        <div className="mt-2">
          {dayEvents.length === 0 ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center mx-auto mb-4">
                <Calendar className="w-8 h-8 text-white/40" />
              </div>
              <p className="text-white/60 mb-4">No events scheduled</p>
              <Button
                onClick={handleAddEvent}
                className="bg-purple-500 hover:bg-purple-600 text-white"
                data-testid="button-add-event-empty"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Event
              </Button>
            </div>
          ) : (
            <>
              <ScrollArea className="max-h-[400px] pr-2">
                <div className="space-y-2">
                  {dayEvents.map((event) => {
                    const member = getMember(event);
                    return (
                      <button
                        key={event.id}
                        onClick={() => handleEventClick(event)}
                        data-testid={`day-event-${event.id}`}
                        className="w-full text-left p-3 rounded-xl transition-all hover:scale-[1.02] active:scale-[0.98]"
                        style={{ 
                          backgroundColor: `${event.color}CC`,
                          borderLeft: `4px solid ${event.color}`
                        }}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <h3 className={`font-semibold text-white truncate ${event.completed ? 'line-through opacity-70' : ''}`}>
                              {event.title}
                            </h3>
                            <div className="flex items-center gap-2 mt-1 text-white/80 text-sm">
                              <Clock className="w-3 h-3" />
                              <span>{formatTime(event.startTime, event.endTime)}</span>
                            </div>
                          </div>
                          {member && (
                            <Avatar className="w-8 h-8 border-2 border-white/30 flex-shrink-0">
                              <AvatarFallback 
                                style={{ backgroundColor: member.color }}
                                className="text-white text-xs font-bold"
                              >
                                {member.name.charAt(0)}
                              </AvatarFallback>
                            </Avatar>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </ScrollArea>

              <div className="mt-4 pt-4 border-t border-white/20">
                <Button
                  onClick={handleAddEvent}
                  className="w-full bg-white/10 hover:bg-white/20 text-white border border-white/20"
                  data-testid="button-add-event-for-day"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Event
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
