import { useState } from "react";
import { format, isSameDay } from "date-fns";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Plus } from "lucide-react";
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
  description?: string;
  startTime: Date;
  endTime: Date;
  members: FamilyMember[];
  categories?: string[];
}

interface TimelineViewProps {
  events: Event[];
  messages: Message[];
  onEventClick: (event: Event) => void;
  onViewChange?: (view: 'day' | 'week' | 'month' | 'timeline') => void;
  onAddEvent?: () => void;
}

export default function TimelineView({ events, messages, onEventClick, onViewChange, onAddEvent }: TimelineViewProps) {
  const [loveNotePopupOpen, setLoveNotePopupOpen] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<Message | undefined>();

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

      <div className="px-4 sm:px-6 py-4 sm:py-6 max-w-4xl mx-auto" style={{ paddingTop: onViewChange ? '7.5rem' : undefined }}>
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
                      className="relative w-full rounded-2xl sm:rounded-3xl p-4 sm:p-5 border border-white/50 hover:opacity-90 transition-all active:scale-[0.98] text-left shadow-xl"
                      style={{ backgroundColor: color }}
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
                        <h3 className="text-lg sm:text-xl font-bold text-white mb-1.5 leading-tight">
                          {event.title}
                        </h3>

                        {event.description && (
                          <p className="text-sm text-white/80 mb-2 line-clamp-2">
                            {event.description}
                          </p>
                        )}

                        {/* Time */}
                        <div className="flex items-center gap-2 text-xs text-white/90 mb-2">
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
                          <div className="inline-block bg-white/20 backdrop-blur-sm rounded-full px-2.5 py-0.5 text-xs font-medium text-white mb-2 md:mb-0">
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
    </div>
  );
}
