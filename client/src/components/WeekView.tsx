import { useState } from "react";
import { format, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, addWeeks } from "date-fns";
import { Plus, ChevronLeft, ChevronRight, Trash2, Check, CheckCircle2 } from "lucide-react";
import type { Message } from "@shared/schema";
import LoveNotePopup from "./LoveNotePopup";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import EventThumbnail from "./EventThumbnail";
import DeleteEventDialog from "./DeleteEventDialog";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";

const COMPLETION_MESSAGES = [
  "Nice job!",
  "You're killing it!",
  "Well done!",
  "Crushing it!",
  "Way to go!",
  "Awesome work!",
  "You nailed it!",
  "Great job!",
  "Keep it up!",
  "Fantastic!",
];

interface FamilyMember {
  id: string;
  name: string;
  color: string;
  initials: string;
}

interface Event {
  id: string;
  title: string;
  startTime: Date;
  endTime: Date;
  members: FamilyMember[];
  categories?: string[];
  photoUrl?: string;
  completed?: boolean;
}

interface WeekViewProps {
  date: Date;
  events: Event[];
  members: FamilyMember[];
  messages: Message[];
  onEventClick: (event: Event) => void;
  onViewChange?: (view: 'day' | 'week' | 'month' | 'timeline') => void;
  onAddEvent?: () => void;
  onDateChange?: (date: Date) => void;
  onWeekChange?: (date: Date) => void;
  onDeleteEvent?: (eventId: string) => void;
}

export default function WeekView({ date, events, members, messages, onEventClick, onViewChange, onAddEvent, onDateChange, onWeekChange, onDeleteEvent }: WeekViewProps) {
  const [loveNotePopupOpen, setLoveNotePopupOpen] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<Message | undefined>();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [eventToDelete, setEventToDelete] = useState<Event | undefined>();
  const isDesktop = useMediaQuery('(min-width: 640px)');
  const { toast } = useToast();
  
  const completeMutation = useMutation({
    mutationFn: async (eventId: string) => {
      const res = await apiRequest('PUT', `/api/events/${eventId}/complete`);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/events'] });
    },
  });
  
  const weekStart = startOfWeek(date, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(date, { weekStartsOn: 1 });
  const daysInWeek = eachDayOfInterval({ start: weekStart, end: weekEnd });

  // Find message with emoji for a given event
  const getEventMessage = (eventId: string) => {
    return messages.find(m => m.eventId === eventId && m.emoji);
  };

  const handleEmojiClick = (e: React.MouseEvent, message: Message) => {
    e.stopPropagation();
    setSelectedMessage(message);
    setLoveNotePopupOpen(true);
  };

  const handleDeleteClick = (e: React.MouseEvent, event: Event) => {
    e.stopPropagation();
    setEventToDelete(event);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = () => {
    if (eventToDelete && onDeleteEvent) {
      onDeleteEvent(eventToDelete.id);
    }
    setDeleteDialogOpen(false);
    setEventToDelete(undefined);
  };

  const handleCompleteClick = (e: React.MouseEvent, event: Event) => {
    e.stopPropagation();
    completeMutation.mutate(event.id);
    
    if (!event.completed) {
      const randomMessage = COMPLETION_MESSAGES[Math.floor(Math.random() * COMPLETION_MESSAGES.length)];
      toast({
        title: randomMessage,
        description: `"${event.title}" is done!`,
        duration: 2000,
      });
    }
  };

  const isEventPast = (event: Event) => {
    return event.endTime < new Date();
  };

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

  // Group events by day and sort - show all days in chronological order (Monday to Sunday)
  const eventsByDay = daysInWeek
    .map(day => {
      const dayEvents = events
        .filter(e => isSameDay(new Date(e.startTime), day))
        .sort((a, b) => b.startTime.getTime() - a.startTime.getTime());
      
      return {
        day,
        events: dayEvents
      };
    }); // Days are now in order: Monday → Sunday

  // Get event color from member
  const getEventColor = (event: Event) => {
    return event.members[0]?.color || '#6D7A8E';
  };

  // Check if day is today
  const isToday = (day: Date) => {
    const today = new Date();
    return isSameDay(day, today);
  };

  return (
    <div className="min-h-full">
      {/* Fixed View Toggle Below Header */}
      {onViewChange && (
        <div className="fixed top-[4.5rem] left-0 right-0 z-40 px-4 sm:px-6 pt-4 pb-3 backdrop-blur-xl bg-gradient-to-b from-black/40 via-black/30 to-transparent">
          <div className="max-w-2xl mx-auto">
            <div className="flex items-center gap-1.5 sm:gap-2 rounded-2xl sm:rounded-3xl bg-white/10 backdrop-blur-md p-1.5 sm:p-2 shadow-lg shadow-black/20">
              <button
                type="button"
                onClick={() => onViewChange('day')}
                data-testid="button-view-day"
                className="flex-1 py-2.5 sm:py-2 rounded-xl sm:rounded-2xl bg-white/10 border border-white/20 text-sm font-medium text-white/70 transition-all active:scale-[0.98] cursor-pointer touch-manipulation md:hover:bg-white/25 md:hover:backdrop-blur-xl md:hover:border-white/40 md:hover:text-white"
              >
                Day
              </button>
              <button
                type="button"
                onClick={() => onViewChange('week')}
                data-testid="button-view-week"
                className="flex-1 py-2.5 sm:py-2 rounded-xl sm:rounded-2xl bg-white/15 border border-white/40 text-sm font-medium text-white transition-all active:scale-[0.98] cursor-pointer touch-manipulation md:hover:bg-white/20 md:hover:border-white/50"
              >
                Week
              </button>
              <button
                type="button"
                onClick={() => onViewChange('month')}
                data-testid="button-view-month"
                className="flex-1 py-2.5 sm:py-2 rounded-xl sm:rounded-2xl bg-white/10 border border-white/20 text-sm font-medium text-white/70 transition-all active:scale-[0.98] cursor-pointer touch-manipulation md:hover:bg-white/25 md:hover:backdrop-blur-xl md:hover:border-white/40 md:hover:text-white"
              >
                Month
              </button>
              <button
                type="button"
                onClick={() => onViewChange('timeline')}
                data-testid="button-view-timeline"
                className="flex-1 py-2.5 sm:py-2 rounded-xl sm:rounded-2xl bg-white/10 border border-white/20 text-sm font-medium text-white/70 transition-all active:scale-[0.98] cursor-pointer touch-manipulation md:hover:bg-white/25 md:hover:backdrop-blur-xl md:hover:border-white/40 md:hover:text-white"
              >
                Timeline
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="px-4 sm:px-6 py-4 sm:py-6 max-w-2xl mx-auto" style={{ paddingTop: onViewChange ? '10rem' : undefined }}>
        <div className="w-full space-y-4 sm:space-y-5">
          {/* Header */}
          <div className="px-1 sm:px-2">
          <div className="flex items-start justify-between gap-3 sm:gap-6">
            <div className="flex-1">
              <h1 className="text-4xl sm:text-5xl font-bold text-white">This Week</h1>
              <p className="text-base sm:text-lg text-white/70 mt-0.5 sm:mt-1">
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

        {/* Days of Week */}
        <div className="grid grid-cols-7 gap-2 px-2">
          {daysInWeek.map((day) => {
            const dayEvents = events.filter(e => isSameDay(new Date(e.startTime), day));
            const hasEvents = dayEvents.length > 0;
            
            return (
              <button
                key={day.toISOString()}
                onClick={() => handleDayClick(day)}
                data-testid={`button-day-${format(day, 'yyyy-MM-dd')}`}
                className="flex flex-col items-center hover:opacity-80 transition-opacity active:scale-[0.95]"
              >
                <div className="text-xs font-medium text-white/70 mb-2">
                  {format(day, 'EEEEE')}
                </div>
                {hasEvents && (
                  <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30">
                    <span className="text-sm font-semibold text-white">
                      {format(day, 'd')}
                    </span>
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Events by Day */}
        <div className="space-y-6">
          {eventsByDay.map(({ day, events: dayEvents }) => (
            <div key={day.toISOString()} className="space-y-3">
              {/* Day Header */}
              <div className="px-2">
                <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full backdrop-blur-md ${isToday(day) ? 'bg-white/20 border border-white/40' : 'bg-white/10 border border-white/20'}`}>
                  <span className={`text-sm font-semibold ${isToday(day) ? 'text-white' : 'text-white/80'}`}>
                    {format(day, 'EEEE, MMM d')}
                  </span>
                  {isToday(day) && (
                    <span className="text-xs font-medium text-white/90 bg-white/20 px-2 py-0.5 rounded-full">
                      Today
                    </span>
                  )}
                </div>
              </div>

              {/* Events Grid for this day */}
              {dayEvents.length > 0 ? (
                <div className="grid grid-cols-2 gap-3 sm:gap-4">
                  {dayEvents.map((event) => {
                  const eventMessage = getEventMessage(event.id);
                  
                  return (
                    <button
                      key={event.id}
                      onClick={() => onEventClick(event)}
                      data-testid={`event-${event.id}`}
                      className={`rounded-2xl sm:rounded-3xl p-4 sm:p-5 border border-white/50 hover:opacity-90 transition-all active:scale-[0.98] text-left relative min-h-[110px] ${
                        event.completed ? 'opacity-50 grayscale' : ''
                      }`}
                      style={{ backgroundColor: getEventColor(event) }}
                    >
                      {/* Action Icons - top right */}
                      <div className="absolute top-3 right-3 flex items-center gap-2 z-20">
                        {/* Complete Icon - only for past events */}
                        {isEventPast(event) && (
                          <div
                            onClick={(e) => handleCompleteClick(e, event)}
                            data-testid={`complete-event-${event.id}`}
                            className={`w-8 h-8 rounded-full backdrop-blur-xl flex items-center justify-center transition-all active:scale-90 cursor-pointer ${
                              event.completed
                                ? 'bg-green-500/40 border border-green-400/60 hover:bg-green-500/50'
                                : 'bg-white/10 border border-white/20 hover:bg-green-500/30 hover:border-green-400/50'
                            }`}
                            role="button"
                            aria-label={event.completed ? "Mark as incomplete" : "Mark as complete"}
                            tabIndex={0}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                handleCompleteClick(e as any, event);
                              }
                            }}
                          >
                            {event.completed ? (
                              <CheckCircle2 className="w-4 h-4 text-green-300" strokeWidth={2.5} />
                            ) : (
                              <Check className="w-4 h-4 text-white/70 hover:text-green-300" strokeWidth={2.5} />
                            )}
                          </div>
                        )}
                        
                        {/* Delete Icon */}
                        {onDeleteEvent && (
                          <div
                            onClick={(e) => handleDeleteClick(e, event)}
                            data-testid={`delete-event-${event.id}`}
                            className="w-8 h-8 rounded-full backdrop-blur-xl bg-white/10 border border-white/20 flex items-center justify-center hover:bg-red-500/30 hover:border-red-400/50 transition-all active:scale-90 cursor-pointer"
                            role="button"
                            aria-label="Delete event"
                            tabIndex={0}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                handleDeleteClick(e as any, event);
                              }
                            }}
                          >
                            <Trash2 className="w-4 h-4 text-white/70 hover:text-red-300" strokeWidth={2} />
                          </div>
                        )}
                      </div>

                      {/* Love Note Bubble - moved to bottom-left */}
                      {eventMessage && (
                        isDesktop ? (
                          <div
                            onClick={(e) => handleEmojiClick(e, eventMessage)}
                            data-testid={`love-note-bubble-${event.id}`}
                            className="absolute bottom-3 left-3 flex items-center gap-1.5 px-2.5 py-1.5 rounded-full backdrop-blur-xl bg-white/20 border border-white/30 hover:bg-white/30 hover:scale-105 transition-all active:scale-95 z-20 max-w-[120px] cursor-pointer"
                            role="button"
                            tabIndex={0}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                handleEmojiClick(e as any, eventMessage);
                              }
                            }}
                            aria-label="View love note"
                          >
                            <span className="text-base flex-shrink-0">{eventMessage.emoji}</span>
                            <span className="text-[10px] text-white/90 truncate font-medium max-w-[80px]">
                              {eventMessage.content}
                            </span>
                          </div>
                        ) : (
                          <div
                            onClick={(e) => handleEmojiClick(e, eventMessage)}
                            data-testid={`love-note-bubble-${event.id}`}
                            className="absolute bottom-3 left-3 w-7 h-7 flex items-center justify-center rounded-full backdrop-blur-xl bg-white/20 border border-white/30 hover:bg-white/30 hover:scale-105 transition-all active:scale-95 z-20 cursor-pointer"
                            role="button"
                            tabIndex={0}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                handleEmojiClick(e as any, eventMessage);
                              }
                            }}
                            aria-label="View love note"
                          >
                            <span className="text-sm">{eventMessage.emoji}</span>
                          </div>
                        )
                      )}
                      
                      {/* Member avatars - horizontal layout */}
                      <div className="absolute right-3 bottom-3 flex flex-row-reverse -space-x-2 space-x-reverse">
                        {event.members.map((member) => (
                          <div
                            key={member.id}
                            className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-semibold text-white border-2 border-white/40"
                            style={{ backgroundColor: member.color }}
                          >
                            {member.initials}
                          </div>
                        ))}
                      </div>
                      
                      <div className="pr-14 sm:pr-16">
                        <div className="flex items-start gap-2 mb-2">
                          <EventThumbnail photoUrl={event.photoUrl} />
                          <h3 className="text-base font-semibold text-white line-clamp-2 leading-snug flex-1">
                            {event.title}
                          </h3>
                        </div>
                        <p className="text-sm text-white/90 mt-2 mb-12">
                          {format(event.startTime, 'h:mm a')}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
              ) : (
                <div className="px-2 py-6 text-center">
                  <p className="text-sm text-white/50">No events scheduled</p>
                </div>
              )}
            </div>
          ))}
        </div>
        </div>
      </div>
      
      {/* Love Note Popup */}
      <LoveNotePopup
        isOpen={loveNotePopupOpen}
        onClose={() => setLoveNotePopupOpen(false)}
        message={selectedMessage}
      />

      {/* Delete Confirmation Dialog */}
      <DeleteEventDialog
        isOpen={deleteDialogOpen}
        onClose={() => {
          setDeleteDialogOpen(false);
          setEventToDelete(undefined);
        }}
        onConfirm={handleConfirmDelete}
        eventTitle={eventToDelete?.title || ""}
      />
    </div>
  );
}
