import { useState } from "react";
import { format, isToday } from "date-fns";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Clock, Plus, ChevronLeft } from "lucide-react";
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
  const daySubtitle = isViewingToday ? undefined : format(date, 'MMM d, yyyy');

  // Find message with emoji for a given event
  const getEventMessage = (eventId: string) => {
    return messages.find(m => m.eventId === eventId && m.emoji);
  };

  const handleEmojiClick = (e: React.MouseEvent, message: Message) => {
    e.stopPropagation();
    setSelectedMessage(message);
    setLoveNotePopupOpen(true);
  };

  // Separate "Sometime Today" events (23:58-23:59) from timed events
  const isSometimeTodayEvent = (event: Event) => {
    const startHour = event.startTime.getHours();
    const startMinute = event.startTime.getMinutes();
    const endHour = event.endTime.getHours();
    const endMinute = event.endTime.getMinutes();
    return startHour === 23 && startMinute === 58 && endHour === 23 && endMinute === 59;
  };

  const timedEvents = events.filter(e => !isSometimeTodayEvent(e));
  const sometimeTodayEvents = events.filter(e => isSometimeTodayEvent(e));

  const formatTimeRange = (start: Date, end: Date) => {
    return `${format(start, 'h:mm')} ${format(start, 'a')} - ${format(end, 'h:mm')} ${format(end, 'a')}`;
  };

  const getTimeOfDay = (time: Date) => {
    const hour = time.getHours();
    if (hour < 12) return 'Morning';
    if (hour < 17) return 'Afternoon';
    return 'Evening';
  };

  return (
    <div className="min-h-full flex items-center justify-center p-3 sm:p-4 md:p-6">
      <div className="w-full max-w-md space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="px-1 sm:px-2">
          <div className="flex items-start gap-3 sm:gap-6">
            <button
              type="button"
              onClick={() => window.history.back()}
              data-testid="button-back"
              className="w-9 h-9 sm:w-8 sm:h-8 rounded-full backdrop-blur-xl bg-white/20 flex items-center justify-center border border-white/30 hover:bg-white/30 transition-all active:scale-[0.95] mt-2 sm:mt-3 touch-manipulation opacity-60 hover:opacity-100"
              aria-label="Go back"
            >
              <ChevronLeft className="w-5 h-5 text-white" strokeWidth={2} />
            </button>
            <div className="flex-1">
              <h1 className="text-4xl sm:text-5xl font-bold text-white">{dayTitle}</h1>
              {daySubtitle && (
                <p className="text-base sm:text-lg text-white/70 mt-0.5 sm:mt-1">{daySubtitle}</p>
              )}
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

        {/* Timed Events */}
        {timedEvents.length > 0 && (
          <div className="space-y-2 sm:space-y-3">
            {timedEvents.map((event, idx) => {
              const eventColors = [
                '#7A8A7D', // brownish-green for Brunch
                '#5D6D7E', // blue-gray for Meeting
                '#7A8A7D', // brownish-green for Birthday
                '#5D7A8E', // blue for Gym
              ];
              const eventMessage = getEventMessage(event.id);
              
              return (
                <button
                  type="button"
                  key={event.id}
                  onClick={() => onEventClick(event)}
                  data-testid={`event-${event.id}`}
                  className="w-full rounded-2xl sm:rounded-3xl p-4 sm:p-5 border border-white/50 hover:opacity-90 transition-all active:scale-[0.98] text-left touch-manipulation relative"
                  style={{ backgroundColor: eventColors[idx % eventColors.length] }}
                >
                  {/* Love Note Emoji */}
                  {eventMessage && (
                    <button
                      type="button"
                      onClick={(e) => handleEmojiClick(e, eventMessage)}
                      data-testid={`emoji-${event.id}`}
                      className="absolute top-3 right-3 text-2xl hover:scale-110 transition-transform active:scale-95 z-10"
                      aria-label="View love note"
                    >
                      {eventMessage.emoji}
                    </button>
                  )}
                  
                  <div className="flex items-start justify-between mb-1.5 sm:mb-2">
                    <h3 className="text-lg sm:text-xl font-semibold text-white flex-1">
                      {event.title}
                    </h3>
                    <div className="flex items-center gap-2 ml-3">
                      {event.categories && event.categories.length > 0 && (
                        <span className="text-sm text-white/80">
                          {event.categories[0]}
                        </span>
                      )}
                      {event.members.map(member => (
                        <div
                          key={member.id}
                          className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold text-white border border-white/30"
                          style={{ backgroundColor: member.color }}
                        >
                          {member.initials}
                        </div>
                      ))}
                    </div>
                  </div>
                  <p className="text-sm text-white/80">
                    {format(event.startTime, 'h:mm a')}–{format(event.endTime, 'h:mm a')}
                  </p>
                </button>
              );
            })}
          </div>
        )}

        {/* Sometime Today */}
        {sometimeTodayEvents.length > 0 && (
          <div className="space-y-3 pt-6">
            <div className="px-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-white/60">
                Sometime Today
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {sometimeTodayEvents.map((event, idx) => {
                const complementaryColors = [
                  '#9A7A8D', // muted purple-pink
                  '#7A8A9D', // soft blue-gray
                  '#8A9A7D', // sage green
                  '#9D8A7A', // warm taupe
                ];
                const eventMessage = getEventMessage(event.id);
                
                return (
                  <button
                    key={event.id}
                    onClick={() => onEventClick(event)}
                    data-testid={`sometime-event-${event.id}`}
                    className="rounded-2xl p-3 border border-white/40 hover:opacity-90 transition-all active:scale-[0.98] text-left backdrop-blur-md relative"
                    style={{ backgroundColor: complementaryColors[idx % complementaryColors.length] }}
                  >
                    {/* Love Note Emoji */}
                    {eventMessage && (
                      <button
                        type="button"
                        onClick={(e) => handleEmojiClick(e, eventMessage)}
                        data-testid={`emoji-${event.id}`}
                        className="absolute top-2 right-2 text-lg hover:scale-110 transition-transform active:scale-95 z-10"
                        aria-label="View love note"
                      >
                        {eventMessage.emoji}
                      </button>
                    )}
                    
                    <div className="flex items-start justify-between mb-1">
                      <h4 className="text-sm font-semibold text-white flex-1 leading-tight">
                        {event.title}
                      </h4>
                      {event.members.map(member => (
                        <div
                          key={member.id}
                          className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-semibold text-white border border-white/30 ml-1"
                          style={{ backgroundColor: member.color }}
                        >
                          {member.initials}
                        </div>
                      ))}
                    </div>
                    {event.categories && event.categories.length > 0 && (
                      <span className="text-[10px] text-white/70">
                        {event.categories[0]}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* View Toggle */}
        {onViewChange && (
          <div className="flex gap-1.5 sm:gap-2 pt-3 sm:pt-4 rounded-2xl sm:rounded-3xl bg-white/10 backdrop-blur-md p-1.5 sm:p-2">
            <button
              type="button"
              onClick={() => onViewChange('day')}
              data-testid="button-view-day"
              className="flex-1 py-3 sm:py-2.5 rounded-xl sm:rounded-2xl bg-white/20 border border-white/30 text-sm font-medium text-white transition-all active:scale-[0.98] cursor-pointer touch-manipulation md:hover:bg-white/30 md:hover:backdrop-blur-xl md:hover:shadow-lg md:hover:shadow-white/10 md:hover:border-white/40"
            >
              Day
            </button>
            <button
              type="button"
              onClick={() => onViewChange('week')}
              data-testid="button-view-week"
              className="flex-1 py-3 sm:py-2.5 rounded-xl sm:rounded-2xl bg-white/10 border border-white/20 text-sm font-medium text-white/70 transition-all active:scale-[0.98] cursor-pointer touch-manipulation md:hover:bg-white/25 md:hover:backdrop-blur-xl md:hover:shadow-lg md:hover:shadow-white/10 md:hover:border-white/40 md:hover:text-white"
            >
              Week
            </button>
            <button
              type="button"
              onClick={() => onViewChange('month')}
              data-testid="button-view-month"
              className="flex-1 py-3 sm:py-2.5 rounded-xl sm:rounded-2xl bg-white/10 border border-white/20 text-sm font-medium text-white/70 transition-all active:scale-[0.98] cursor-pointer touch-manipulation md:hover:bg-white/25 md:hover:backdrop-blur-xl md:hover:shadow-lg md:hover:shadow-white/10 md:hover:border-white/40 md:hover:text-white"
            >
              Month
            </button>
            <button
              type="button"
              onClick={() => onViewChange('timeline')}
              data-testid="button-view-timeline"
              className="flex-1 py-3 sm:py-2.5 rounded-xl sm:rounded-2xl bg-white/10 border border-white/20 text-sm font-medium text-white/70 transition-all active:scale-[0.98] cursor-pointer touch-manipulation md:hover:bg-white/25 md:hover:backdrop-blur-xl md:hover:shadow-lg md:hover:shadow-white/10 md:hover:border-white/40 md:hover:text-white"
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
