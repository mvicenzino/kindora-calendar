import { useState } from "react";
import { format } from "date-fns";
import { X, Plus } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import type { Message } from "@shared/schema";
import LoveNotePopup from "./LoveNotePopup";
import EventThumbnail from "./EventThumbnail";

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
}

interface DayTimelineModalProps {
  isOpen: boolean;
  onClose: () => void;
  date: Date;
  events: Event[];
  messages: Message[];
  onEventClick: (event: Event) => void;
  onAddEvent?: () => void;
}

export default function DayTimelineModal({
  isOpen,
  onClose,
  date,
  events,
  messages,
  onEventClick,
  onAddEvent,
}: DayTimelineModalProps) {
  const [loveNotePopupOpen, setLoveNotePopupOpen] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<Message | undefined>();

  if (!isOpen) return null;

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

  const getEventMessage = (eventId: string) => {
    return messages.find(m => m.eventId === eventId && m.emoji);
  };

  const handleEmojiClick = (e: React.MouseEvent, message: Message) => {
    e.stopPropagation();
    setSelectedMessage(message);
    setLoveNotePopupOpen(true);
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50"
        onClick={onClose}
        data-testid="day-timeline-backdrop"
      />

      {/* Modal Panel */}
      <div className="fixed inset-y-0 right-0 w-full sm:w-[500px] md:w-[600px] bg-gradient-to-br from-[#4A5A6A]/95 via-[#5A6A7A]/95 to-[#6A7A8A]/95 backdrop-blur-xl shadow-2xl z-50 overflow-y-auto">
        <div className="sticky top-0 z-10 px-4 sm:px-6 py-4 backdrop-blur-xl bg-gradient-to-b from-black/40 via-black/30 to-transparent border-b border-white/10">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <h2 className="text-2xl sm:text-3xl font-bold text-white">
                {format(date, 'EEEE')}
              </h2>
              <p className="text-sm sm:text-base text-white/70 mt-0.5">
                {format(date, 'MMMM d, yyyy')}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {onAddEvent && (
                <button
                  onClick={onAddEvent}
                  data-testid="button-add-event-timeline"
                  className="w-9 h-9 rounded-full backdrop-blur-xl bg-gradient-to-br from-white/40 to-white/10 flex items-center justify-center border-2 border-white/50 shadow-lg shadow-white/20 hover:from-white/50 hover:to-white/20 transition-all active:scale-[0.98]"
                  aria-label="Add event"
                >
                  <Plus className="w-4 h-4 text-white drop-shadow-md" strokeWidth={2.5} />
                </button>
              )}
              <button
                onClick={onClose}
                data-testid="button-close-timeline"
                className="w-9 h-9 rounded-full backdrop-blur-xl bg-white/10 flex items-center justify-center border border-white/20 hover:bg-white/20 transition-all active:scale-[0.98]"
                aria-label="Close"
              >
                <X className="w-4 h-4 text-white" />
              </button>
            </div>
          </div>
        </div>

        <div className="px-4 sm:px-6 py-6">
          {events.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="w-16 h-16 rounded-full backdrop-blur-md bg-white/10 border border-white/20 flex items-center justify-center mb-4">
                <span className="text-3xl">📅</span>
              </div>
              <p className="text-white/70 text-center">No events scheduled for this day</p>
              {onAddEvent && (
                <button
                  onClick={onAddEvent}
                  className="mt-4 px-4 py-2 rounded-full backdrop-blur-xl bg-white/20 border border-white/30 text-white text-sm font-medium hover:bg-white/30 transition-all active:scale-[0.98]"
                  data-testid="button-add-first-event"
                >
                  Add Event
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              {events.map((event, index) => {
                const eventMessage = getEventMessage(event.id);
                const color = getEventColor(event);

                return (
                  <div key={event.id} className="relative">
                    <button
                      onClick={() => onEventClick(event)}
                      data-testid={`day-timeline-event-${event.id}`}
                      className="w-full rounded-2xl sm:rounded-3xl p-4 sm:p-5 border border-white/50 hover:opacity-90 transition-all active:scale-[0.98] text-left shadow-xl min-h-[120px]"
                      style={{ backgroundColor: color }}
                    >
                      {/* Love Note Bubble */}
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

                      {/* Member avatars */}
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
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Love Note Popup */}
      <LoveNotePopup
        isOpen={loveNotePopupOpen}
        onClose={() => setLoveNotePopupOpen(false)}
        message={selectedMessage}
      />
    </>
  );
}
