import { useState } from "react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, startOfWeek, endOfWeek, isSameMonth, isAfter } from "date-fns";
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
  startTime: Date;
  endTime: Date;
  members: FamilyMember[];
  categories?: string[];
}

interface MonthViewProps {
  date: Date;
  events: Event[];
  members: FamilyMember[];
  messages: Message[];
  onEventClick: (event: Event) => void;
  onViewChange?: (view: 'day' | 'week' | 'month' | 'timeline') => void;
  onAddEvent?: () => void;
}

export default function MonthView({ date, events, members, messages, onEventClick, onViewChange, onAddEvent }: MonthViewProps) {
  const [loveNotePopupOpen, setLoveNotePopupOpen] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<Message | undefined>();
  
  const monthStart = startOfMonth(date);
  const monthEnd = endOfMonth(date);
  const calendarStart = startOfWeek(monthStart);
  const calendarEnd = endOfWeek(monthEnd);
  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  // Get events for a specific day
  const getEventsForDay = (day: Date) => {
    return events.filter(e => isSameDay(new Date(e.startTime), day));
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

  // Get upcoming events (sorted by time, only future events)
  const upcomingEvents = events
    .filter(e => isAfter(new Date(e.startTime), new Date()))
    .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
    .slice(0, 2);

  // Get background color for event day based on event color/category
  const getDayBackgroundColor = (dayEvents: Event[]) => {
    if (dayEvents.length === 0) return 'transparent';
    
    // Use the first event's associated member color with low opacity
    const firstEvent = dayEvents[0];
    if (firstEvent.members.length > 0) {
      return firstEvent.members[0].color + '40'; // Add 40 for 25% opacity
    }
    
    return 'rgba(255, 255, 255, 0.15)';
  };

  return (
    <div className="min-h-full px-4 sm:px-6 py-4 sm:py-6 max-w-2xl mx-auto">
      <div className="w-full space-y-4 sm:space-y-5">
        {/* Header */}
        <div className="px-1 sm:px-2">
          <div className="flex items-center gap-3 sm:gap-6">
            <div className="flex-1">
              <p className="text-xs font-semibold uppercase tracking-wider text-white/60 mb-1">
                MONTH
              </p>
              <h1 className="text-4xl sm:text-5xl font-bold text-white">
                {format(date, 'MMMM yyyy')}
              </h1>
            </div>
            {onAddEvent && (
              <button
                onClick={onAddEvent}
                data-testid="button-add-event"
                className="w-10 h-10 rounded-full backdrop-blur-xl bg-gradient-to-br from-white/40 to-white/10 flex items-center justify-center border-2 border-white/50 shadow-lg shadow-white/20 hover:from-white/50 hover:to-white/20 transition-all active:scale-[0.98] mt-2"
              >
                <Plus className="w-5 h-5 text-white drop-shadow-md" strokeWidth={2.5} />
              </button>
            )}
          </div>
        </div>

        {/* Calendar Grid */}
        <div className="space-y-3">
          {/* Days of week header */}
          <div className="grid grid-cols-7 gap-2 px-2">
            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, idx) => (
              <div key={idx} className="text-center text-sm font-medium text-white/70">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar days */}
          <div className="grid grid-cols-7 gap-2 px-2">
            {calendarDays.map((day) => {
              const dayEvents = getEventsForDay(day);
              const hasEvents = dayEvents.length > 0;
              const isCurrentMonth = isSameMonth(day, date);
              const bgColor = getDayBackgroundColor(dayEvents);

              return (
                <button
                  key={day.toISOString()}
                  onClick={() => hasEvents && onEventClick(dayEvents[0])}
                  data-testid={`day-${format(day, 'yyyy-MM-dd')}`}
                  className="aspect-square rounded-xl backdrop-blur-md border transition-all"
                  style={{
                    backgroundColor: bgColor,
                    borderColor: hasEvents ? 'rgba(255, 255, 255, 0.3)' : 'rgba(255, 255, 255, 0.15)',
                    opacity: isCurrentMonth ? 1 : 0.4,
                    cursor: hasEvents ? 'pointer' : 'default',
                    transform: 'scale(1)',
                  }}
                >
                  {hasEvents && (
                    <span className="text-lg font-semibold text-white">
                      {format(day, 'd')}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Upcoming Events */}
        {upcomingEvents.length > 0 && (
          <div className="space-y-3 pt-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-white/60 px-2">
              UPCOMING
            </p>
            <div className="space-y-2">
              {upcomingEvents.map((event) => {
                const eventMessage = getEventMessage(event.id);
                
                return (
                  <button
                    key={event.id}
                    onClick={() => onEventClick(event)}
                    data-testid={`upcoming-event-${event.id}`}
                    className="w-full rounded-2xl p-4 backdrop-blur-md bg-white/10 border border-white/20 hover:bg-white/15 transition-all active:scale-[0.98] text-left relative"
                  >
                    {/* Love Note Bubble */}
                    {eventMessage && (
                      <button
                        type="button"
                        onClick={(e) => handleEmojiClick(e, eventMessage)}
                        data-testid={`love-note-bubble-${event.id}`}
                        className="absolute top-3 right-3 flex items-center gap-2 px-2.5 py-1.5 rounded-full backdrop-blur-xl bg-white/20 border border-white/30 hover:bg-white/30 hover:scale-105 transition-all active:scale-95 z-10 max-w-[150px]"
                        aria-label="View love note"
                      >
                        <span className="text-base flex-shrink-0">{eventMessage.emoji}</span>
                        <span className="text-[10px] text-white/90 truncate font-medium">
                          {eventMessage.content}
                        </span>
                      </button>
                    )}
                    
                    <div className="flex items-center justify-between pr-40">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-10 h-10 rounded-lg"
                          style={{ backgroundColor: event.members[0]?.color || '#6D7A8E' }}
                        />
                        <span className="text-base font-medium text-white">
                          {event.title}
                        </span>
                      </div>
                      <span className="text-sm text-white/80">
                        {format(event.startTime, 'h:mm a')}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* View Toggle */}
        {onViewChange && (
          <div className="flex items-center gap-1.5 sm:gap-2 rounded-2xl sm:rounded-3xl bg-white/10 backdrop-blur-md p-1.5 sm:p-2">
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
              className="flex-1 py-2.5 sm:py-2 rounded-xl sm:rounded-2xl bg-gradient-to-br from-blue-500/20 to-purple-600/20 border border-white/30 text-sm font-medium text-white shadow-md shadow-blue-500/10 transition-all active:scale-[0.98] cursor-pointer touch-manipulation md:hover:from-blue-500/25 md:hover:to-purple-600/25 md:hover:shadow-lg md:hover:shadow-blue-500/20"
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
        )}
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
