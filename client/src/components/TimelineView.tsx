import { useState, useEffect, useRef } from "react";
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
  const [cardScales, setCardScales] = useState<Record<string, number>>({});
  const containerRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<Record<string, HTMLDivElement>>({});

  // Calculate scale based on distance from viewport center
  useEffect(() => {
    const handleScroll = () => {
      if (!containerRef.current) return;
      
      const viewportCenter = window.innerHeight / 2;
      const newScales: Record<string, number> = {};
      
      Object.entries(cardRefs.current).forEach(([eventId, cardElement]) => {
        if (!cardElement) return;
        
        const rect = cardElement.getBoundingClientRect();
        const cardCenter = rect.top + rect.height / 2;
        const distanceFromCenter = Math.abs(cardCenter - viewportCenter);
        
        // Calculate scale: cards near center get scale 1.0, far cards get 0.92
        // Use a smooth curve for the transition
        const maxDistance = window.innerHeight;
        const normalizedDistance = Math.min(distanceFromCenter / maxDistance, 1);
        const scale = 1 - (normalizedDistance * 0.08); // Scale from 1.0 to 0.92
        
        newScales[eventId] = Math.max(0.92, Math.min(1.0, scale));
      });
      
      setCardScales(newScales);
    };
    
    // Initial calculation
    handleScroll();
    
    // Add scroll listener
    window.addEventListener('scroll', handleScroll);
    window.addEventListener('resize', handleScroll);
    
    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleScroll);
    };
  }, [events]);
  
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

  return (
    <div ref={containerRef} className="min-h-full">
      {/* Fixed View Toggle Below Header */}
      {onViewChange && (
        <div className="fixed top-[4.5rem] left-0 right-0 z-40 px-4 sm:px-6 pt-4 pb-3 backdrop-blur-xl bg-gradient-to-b from-black/40 via-black/30 to-transparent">
          <div className="max-w-3xl mx-auto">
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

      <div className="px-4 sm:px-6 py-4 sm:py-6 max-w-3xl mx-auto" style={{ paddingTop: onViewChange ? '7.5rem' : undefined }}>
        {/* Header */}
        <div className="w-full px-1 sm:px-2 mb-4 sm:mb-6">
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

      {/* Timeline */}
      <div className="flex-1 w-full">
        {/* Events */}
        <div className="space-y-4 sm:space-y-5 pb-20">
          {events.map((event, index) => {
            const color = getEventColor(event);
            const eventMessage = getEventMessage(event.id);
            
            return (
              <div key={event.id} className="space-y-2">
                {/* Date marker */}
                <div className="px-2">
                  <p className="text-xs font-semibold uppercase tracking-wider text-white/60">
                    {format(event.startTime, 'EEEE, MMMM d')}
                  </p>
                </div>

                {/* Event card */}
                <button
                  onClick={() => onEventClick(event)}
                  data-testid={`timeline-event-${event.id}`}
                  className="w-full"
                >
                  <div
                    ref={(el) => {
                      if (el) cardRefs.current[event.id] = el;
                    }}
                    className="rounded-2xl p-4 border border-white/50 backdrop-blur-xl hover:opacity-90 transition-all active:scale-[0.98] text-left shadow-xl relative"
                    style={{ 
                      backgroundColor: color,
                      transform: `scale(${cardScales[event.id] || 0.92})`,
                    }}
                  >
                      {/* Love Note Bubble */}
                      {eventMessage && (
                        <button
                          type="button"
                          onClick={(e) => handleEmojiClick(e, eventMessage)}
                          data-testid={`love-note-bubble-${event.id}`}
                          className="absolute top-3 right-3 flex items-center gap-2 px-3 py-1.5 rounded-full backdrop-blur-xl bg-white/20 border border-white/30 hover:bg-white/30 hover:scale-105 transition-all active:scale-95 z-10 max-w-[180px]"
                          aria-label="View love note"
                        >
                          <span className="text-lg flex-shrink-0">{eventMessage.emoji}</span>
                          <span className="text-xs text-white/90 truncate font-medium">
                            {eventMessage.content}
                          </span>
                        </button>
                      )}
                      {/* Title */}
                      <h3 className="text-xl font-bold text-white mb-1.5 leading-tight pr-48">
                        {event.title}
                      </h3>

                      {/* Description */}
                      {event.description && (
                        <p className="text-sm text-white/80 mb-2 line-clamp-2">
                          {event.description}
                        </p>
                      )}

                      {/* Time */}
                      <div className="flex items-center gap-2 text-xs text-white/90 mb-3">
                        <div className="bg-white/20 backdrop-blur-sm rounded-full px-2.5 py-1">
                          {isSometimeToday(event) ? (
                            "Sometime today"
                          ) : (
                            `${format(event.startTime, 'h:mm a')} - ${format(event.endTime, 'h:mm a')}`
                          )}
                        </div>
                      </div>

                      {/* Bottom row: Category badge and Member avatars */}
                      <div className="flex items-center justify-between gap-2">
                        {/* Category badge */}
                        {event.categories && event.categories.length > 0 ? (
                          <div>
                            <span className="inline-block bg-white/20 backdrop-blur-sm rounded-full px-2.5 py-0.5 text-xs font-medium text-white">
                              {event.categories[0]}
                            </span>
                          </div>
                        ) : (
                          <div />
                        )}

                        {/* Member avatars */}
                        <div className="flex gap-1">
                          {event.members.slice(0, 3).map((member, idx) => (
                            <Avatar 
                              key={member.id} 
                              className="h-7 w-7 ring-2 ring-white/60 shadow-lg"
                              style={{ 
                                '--tw-ring-color': `${member.color}80`
                              } as React.CSSProperties}
                            >
                              <AvatarFallback 
                                className="text-white font-semibold text-[10px]"
                                style={{ backgroundColor: member.color }}
                              >
                                {member.initials}
                              </AvatarFallback>
                            </Avatar>
                          ))}
                        </div>
                      </div>
                    </div>
                  </button>
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
