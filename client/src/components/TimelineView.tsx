import { useState } from "react";
import { format, isSameDay } from "date-fns";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Plus, Trash2, Check, CheckCircle2 } from "lucide-react";
import type { Message } from "@shared/schema";
import LoveNotePopup from "./LoveNotePopup";
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
  description?: string;
  startTime: Date;
  endTime: Date;
  members: FamilyMember[];
  categories?: string[];
  photoUrl?: string;
  completed?: boolean;
}

interface TimelineViewProps {
  events: Event[];
  messages: Message[];
  onEventClick: (event: Event) => void;
  onViewChange?: (view: 'day' | 'week' | 'month' | 'timeline') => void;
  onAddEvent?: () => void;
  onDeleteEvent?: (eventId: string) => void;
}

export default function TimelineView({ events, messages, onEventClick, onViewChange, onAddEvent, onDeleteEvent }: TimelineViewProps) {
  const [loveNotePopupOpen, setLoveNotePopupOpen] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<Message | undefined>();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [eventToDelete, setEventToDelete] = useState<Event | undefined>();
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

  const isSometimeToday = (event: Event) => {
    const startHour = event.startTime.getHours();
    const startMinute = event.startTime.getMinutes();
    const endHour = event.endTime.getHours();
    const endMinute = event.endTime.getMinutes();
    return startHour === 23 && startMinute === 58 && endHour === 23 && endMinute === 59;
  };

  const getEventColor = (event: Event) => {
    return event.members[0]?.color || '#6D7A8E';
  };

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

  // Track which events are first of their date for overlay pills
  const eventsWithDateInfo = events.map((event, index) => {
    const dateKey = format(event.startTime, 'MMM d');
    const isFirstOfDate = index === 0 || format(events[index - 1].startTime, 'MMM d') !== dateKey;
    return {
      event,
      index,
      dateLabel: isFirstOfDate ? dateKey : null
    };
  });

  return (
    <div className="min-h-full">
      {/* Fixed View Toggle Below Header */}
      {onViewChange && (
        <div className="fixed top-[4.5rem] left-0 right-0 z-40 px-4 sm:px-6 pt-4 pb-3 backdrop-blur-xl bg-gradient-to-b from-black/40 via-black/30 to-transparent">
          <div className="max-w-4xl mx-auto">
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
                className="flex-1 py-2.5 sm:py-2 rounded-xl sm:rounded-2xl bg-white/10 border border-white/20 text-sm font-medium text-white/70 transition-all active:scale-[0.98] cursor-pointer touch-manipulation md:hover:bg-white/25 md:hover:backdrop-blur-xl md:hover:border-white/40 md:hover:text-white"
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
                className="flex-1 py-2.5 sm:py-2 rounded-xl sm:rounded-2xl bg-white/15 border border-white/40 text-sm font-medium text-white transition-all active:scale-[0.98] cursor-pointer touch-manipulation md:hover:bg-white/20 md:hover:border-white/50"
              >
                Timeline
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="px-4 sm:px-6 py-4 sm:py-6 max-w-4xl mx-auto" style={{ paddingTop: onViewChange ? '10rem' : undefined }}>
        {/* Header */}
        <div className="w-full px-1 sm:px-2 mb-6 sm:mb-8">
          <div className="flex items-start justify-between gap-3 sm:gap-6">
            <div className="flex-1">
              <h1 className="text-4xl sm:text-5xl font-bold text-white">Timeline</h1>
              <p className="text-base sm:text-lg text-white/70 mt-0.5 sm:mt-1">Your events in time</p>
            </div>
            {onAddEvent && (
              <button
                type="button"
                onClick={onAddEvent}
                data-testid="button-add-event"
                className="w-11 h-11 sm:w-10 sm:h-10 rounded-full backdrop-blur-xl bg-gradient-to-br from-white/40 to-white/10 flex items-center justify-center border-2 border-white/50 shadow-lg shadow-white/20 hover:from-white/50 hover:to-white/20 transition-all active:scale-[0.98] mt-1 sm:mt-2 touch-manipulation"
                aria-label="Add event"
              >
                <Plus className="w-5 h-5 text-white drop-shadow-md" strokeWidth={2.5} />
              </button>
            )}
          </div>
        </div>

        {/* Timeline with alternating events */}
        <div className="relative pb-20">
          {/* Central vertical line - hidden on mobile for single column */}
          <div className="hidden md:block absolute left-1/2 top-0 bottom-0 w-0.5 bg-gradient-to-b from-white/30 via-white/20 to-white/10 transform -translate-x-1/2" />

          {/* Timeline items */}
          <div className="space-y-6 md:space-y-12">
            {eventsWithDateInfo.map(({ event, index, dateLabel }) => {
              const isLeft = index % 2 === 0;
              const eventMessage = getEventMessage(event.id);
              const color = getEventColor(event);

              return (
                <div key={event.id} className="relative">
                  {/* Date pill overlay - appears on first event of each date */}
                  {dateLabel && (
                    <div className="absolute left-1/2 transform -translate-x-1/2 -top-3 z-30">
                      <div className="px-4 py-1.5 rounded-full backdrop-blur-2xl bg-white/8 border border-white/20 shadow-lg">
                        <span className="text-xs font-semibold text-white/90">{dateLabel}</span>
                      </div>
                    </div>
                  )}

                  {/* Event card container - single column on mobile, alternating on desktop */}
                  <div className={`relative flex ${isLeft ? 'md:justify-start md:pr-[52%]' : 'md:justify-end md:pl-[52%]'}`}>
                    {/* Connector dot on timeline - desktop only */}
                    <div className="hidden md:block absolute left-1/2 top-8 transform -translate-x-1/2 w-3 h-3 rounded-full bg-white/40 border-2 border-white/60 backdrop-blur-sm z-10" />

                    {/* Event card */}
                    <button
                      onClick={() => onEventClick(event)}
                      data-testid={`timeline-event-${event.id}`}
                      className={`relative w-full rounded-2xl sm:rounded-3xl p-4 sm:p-5 border border-white/50 hover:opacity-90 transition-all active:scale-[0.98] text-left shadow-xl min-h-[120px] ${
                        event.completed ? 'opacity-50 grayscale' : ''
                      }`}
                      style={{ backgroundColor: color }}
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
                        <div
                          onClick={(e) => handleEmojiClick(e, eventMessage)}
                          data-testid={`love-note-bubble-${event.id}`}
                          className="absolute bottom-3 left-3 flex items-center gap-2 px-3 py-1.5 rounded-full backdrop-blur-xl bg-white/20 border border-white/30 hover:bg-white/30 hover:scale-105 transition-all active:scale-95 z-20 max-w-[160px] cursor-pointer"
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
                          <span className="text-base sm:text-lg flex-shrink-0">{eventMessage.emoji}</span>
                          <span className="hidden sm:inline text-xs text-white/90 truncate font-medium">
                            {eventMessage.content}
                          </span>
                        </div>
                      )}

                      {/* Member avatars - horizontal layout */}
                      <div className="absolute right-3 bottom-3 flex flex-row-reverse -space-x-2 space-x-reverse">
                        {event.members.slice(0, 3).map((member) => (
                          <Avatar
                            key={member.id}
                            className="h-8 w-8 ring-2 ring-white/40 shadow-lg"
                          >
                            <AvatarFallback
                              className="text-white font-semibold text-[10px]"
                              style={{ backgroundColor: member.color }}
                            >
                              {member.initials}
                            </AvatarFallback>
                          </Avatar>
                        ))}
                        {event.members.length > 3 && (
                          <div className="h-8 w-8 rounded-full bg-white/20 backdrop-blur-md border-2 border-white/40 flex items-center justify-center">
                            <span className="text-[10px] font-semibold text-white">
                              +{event.members.length - 3}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Event content */}
                      <div className="pr-14 sm:pr-16">
                        <div className="flex items-start gap-2 mb-2">
                          <EventThumbnail photoUrl={event.photoUrl} />
                          <h3 className="text-lg sm:text-xl font-bold text-white line-clamp-2 leading-snug flex-1">
                            {event.title}
                          </h3>
                        </div>

                        {event.description && (
                          <p className="text-sm text-white/80 mb-3 line-clamp-2 leading-relaxed">
                            {event.description}
                          </p>
                        )}

                        {/* Time */}
                        <div className="flex items-center gap-2 text-xs text-white/90 mt-3 mb-12">
                          <div className="bg-white/20 backdrop-blur-sm rounded-full px-2.5 py-1">
                            {isSometimeToday(event) ? (
                              "Sometime today"
                            ) : (
                              `${format(event.startTime, 'h:mm a')} - ${format(event.endTime, 'h:mm a')}`
                            )}
                          </div>
                        </div>

                        {/* Category badge */}
                        {event.categories && event.categories.length > 0 && (
                          <div className="inline-block bg-white/20 backdrop-blur-sm rounded-full px-2.5 py-0.5 text-xs font-medium text-white mt-2">
                            {event.categories[0]}
                          </div>
                        )}
                      </div>
                    </button>
                  </div>
                </div>
              );
            })}
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
