import { useState } from "react";
import { format, isToday } from "date-fns";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Clock, Plus } from "lucide-react";
import type { Message } from "@shared/schema";
import LoveNotePopup from "./LoveNotePopup";

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
  timeOfDay?: string;
  members: FamilyMember[];
  categories?: string[];
  isFocus?: boolean;
}

interface TodayViewProps {
  date: Date;
  events: Event[];
  tasks: string[];
  messages: Message[];
  onEventClick: (event: Event) => void;
  onViewChange?: (view: 'day' | 'week' | 'month' | 'timeline') => void;
  onAddEvent?: () => void;
}

export default function TodayView({ date, events, tasks, messages, onEventClick, onViewChange, onAddEvent }: TodayViewProps) {
  const [loveNotePopupOpen, setLoveNotePopupOpen] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<Message | undefined>();
  
  const isViewingToday = isToday(date);
  const dayTitle = isViewingToday ? "Today" : format(date, 'EEEE');
  const daySubtitle = format(date, 'EEEE, MMMM d, yyyy');

  // Find message with emoji for a given event
  const getEventMessage = (eventId: string) => {
    return messages.find(m => m.eventId === eventId && m.emoji);
  };

  const handleEmojiClick = (e: React.MouseEvent, message: Message) => {
    e.stopPropagation();
    setSelectedMessage(message);
    setLoveNotePopupOpen(true);
  };

  // Check if event is "Sometime Today" (23:58-23:59)
  const isSometimeTodayEvent = (event: Event) => {
    const startHour = event.startTime.getHours();
    const startMinute = event.startTime.getMinutes();
    const endHour = event.endTime.getHours();
    const endMinute = event.endTime.getMinutes();
    return startHour === 23 && startMinute === 58 && endHour === 23 && endMinute === 59;
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
                className="flex-1 py-2.5 sm:py-2 rounded-xl sm:rounded-2xl bg-white/15 border border-white/40 text-sm font-medium text-white transition-all active:scale-[0.98] cursor-pointer touch-manipulation md:hover:bg-white/20 md:hover:border-white/50"
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
                className="flex-1 py-2.5 sm:py-2 rounded-xl sm:rounded-2xl bg-white/10 border border-white/20 text-sm font-medium text-white/70 transition-all active:scale-[0.98] cursor-pointer touch-manipulation md:hover:bg-white/25 md:hover:backdrop-blur-xl md:hover:border-white/40 md:hover:text-white"
              >
                Timeline
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="px-4 sm:px-6 py-4 sm:py-6 max-w-2xl mx-auto" style={{ paddingTop: onViewChange ? '7.5rem' : undefined }}>
        <div className="w-full space-y-4 sm:space-y-5">
          {/* Header */}
          <div className="px-1 sm:px-2">
            <div className="flex items-start gap-3 sm:gap-6">
              <div className="flex-1">
                <h1 className="text-4xl sm:text-5xl font-bold text-white">{dayTitle}</h1>
                <p className="text-base sm:text-lg text-white/70 mt-0.5 sm:mt-1">{daySubtitle}</p>
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

        {/* All Events */}
        {events.length > 0 && (
          <div className="space-y-2 sm:space-y-3">
            {events.map((event: Event) => {
              const eventMessage = getEventMessage(event.id);
              const eventColor = event.members[0]?.color || '#6D7A8E';
              const isSometime = isSometimeTodayEvent(event);
              
              return (
                <button
                  type="button"
                  key={event.id}
                  onClick={() => onEventClick(event)}
                  data-testid={`event-${event.id}`}
                  className="w-full rounded-2xl sm:rounded-3xl p-4 sm:p-5 border border-white/50 hover:opacity-90 transition-all active:scale-[0.98] text-left touch-manipulation relative"
                  style={{ backgroundColor: eventColor }}
                >
                  {/* Love Note Bubble */}
                  {eventMessage && (
                    <div
                      onClick={(e) => handleEmojiClick(e, eventMessage)}
                      data-testid={`love-note-bubble-${event.id}`}
                      className="absolute top-3 right-3 flex items-center gap-2 px-3 py-1.5 rounded-full backdrop-blur-xl bg-white/20 border border-white/30 hover:bg-white/30 hover:scale-105 transition-all active:scale-95 z-20 max-w-[150px] cursor-pointer"
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
                      <span className="text-lg flex-shrink-0">{eventMessage.emoji}</span>
                      <span className="text-xs text-white/90 truncate font-medium">
                        {eventMessage.content}
                      </span>
                    </div>
                  )}
                  
                  {/* Member avatars - positioned at far right */}
                  <div className="absolute right-3 bottom-3 flex flex-col gap-2">
                    {event.members.map((member: FamilyMember) => (
                      <div
                        key={member.id}
                        className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold text-white border-2 border-white/40 ring-2 ring-white/20"
                        style={{ backgroundColor: member.color }}
                      >
                        {member.initials}
                      </div>
                    ))}
                  </div>
                  
                  <div className="pr-14">
                    <h3 className="text-lg sm:text-xl font-semibold text-white mb-1.5 sm:mb-2">
                      {event.title}
                    </h3>
                    <p className="text-sm text-white/80">
                      {isSometime ? 'Sometime today' : `${format(event.startTime, 'h:mm a')}–${format(event.endTime, 'h:mm a')}`}
                    </p>
                  </div>
                </button>
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
    </div>
  );
}
