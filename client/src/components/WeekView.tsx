import { useState } from "react";
import { format, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, addWeeks } from "date-fns";
import { Plus, ChevronLeft, ChevronRight } from "lucide-react";
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
}

export default function WeekView({ date, events, members, messages, onEventClick, onViewChange, onAddEvent, onDateChange, onWeekChange }: WeekViewProps) {
  const [loveNotePopupOpen, setLoveNotePopupOpen] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<Message | undefined>();
  
  const weekStart = startOfWeek(date);
  const weekEnd = endOfWeek(date);
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

  // Event colors based on categories or members
  const getEventColor = (event: Event) => {
    if (event.title.toLowerCase().includes('dinner') || event.title.toLowerCase().includes('emma')) {
      return '#B8836D'; // coral/brownish
    } else if (event.categories?.includes('Family') || event.title.toLowerCase().includes('sebby') || event.title.toLowerCase().includes('zoo')) {
      return '#8B7A6D'; // brownish
    } else if (event.categories?.includes('Work') || event.title.toLowerCase().includes('meeting')) {
      return '#5D7A8E'; // blue
    } else if (event.categories?.includes('Health') || event.title.toLowerCase().includes('workout')) {
      return '#6D8A7D'; // greenish-blue
    } else if (event.title.toLowerCase().includes('grocery')) {
      return '#9B8A7D'; // tan
    } else if (event.title.toLowerCase().includes('pack') || event.title.toLowerCase().includes('pavnity')) {
      return '#8B7A6D'; // brownish
    } else if (event.title.toLowerCase().includes('dr.') || event.title.toLowerCase().includes('doctor')) {
      return '#B8836D'; // coral
    } else if (event.title.toLowerCase().includes('rental') || event.title.toLowerCase().includes('car')) {
      return '#9B8A7D'; // tan
    }
    return '#6D7A8E'; // default blue-gray
  };

  const getCategoryLabel = (event: Event) => {
    if (event.title.toLowerCase().includes('grocery')) return 'PERSONAL';
    if (event.title.toLowerCase().includes('sebby')) return 'W';
    if (event.title.toLowerCase().includes('pack')) return 'Pavnity';
    if (event.title.toLowerCase().includes('rental')) return 'FAMILY';
    if (event.title.toLowerCase().includes('dr.')) return 'M';
    if (event.title.toLowerCase().includes('zoo')) return 'Family';
    return event.categories?.[0];
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Header */}
        <div className="px-2">
          <div className="flex items-start justify-between gap-6">
            <div className="flex items-start gap-3">
              <button
                type="button"
                onClick={() => window.history.back()}
                data-testid="button-back"
                className="w-8 h-8 rounded-full backdrop-blur-xl bg-white/20 flex items-center justify-center border border-white/30 hover:bg-white/30 transition-all active:scale-[0.95] mt-3 touch-manipulation opacity-60 hover:opacity-100"
                aria-label="Go back"
              >
                <ChevronLeft className="w-5 h-5 text-white" strokeWidth={2} />
              </button>
              <div>
                <h1 className="text-5xl font-bold text-white">This Week</h1>
                <p className="text-lg text-white/70 mt-1">
                  {format(weekStart, 'MMM d')}–{format(weekEnd, 'd')}
                </p>
              </div>
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

        {/* Events Grid */}
        <div className="grid grid-cols-2 gap-3">
          {events.map((event) => {
            const categoryLabel = getCategoryLabel(event);
            const eventMessage = getEventMessage(event.id);
            
            return (
              <button
                key={event.id}
                onClick={() => onEventClick(event)}
                data-testid={`event-${event.id}`}
                className="rounded-3xl p-4 border border-white/50 hover:opacity-90 transition-all active:scale-[0.98] text-left relative"
                style={{ backgroundColor: getEventColor(event) }}
              >
                {/* Love Note Emoji */}
                {eventMessage && (
                  <button
                    type="button"
                    onClick={(e) => handleEmojiClick(e, eventMessage)}
                    data-testid={`emoji-${event.id}`}
                    className="absolute top-3 right-3 text-xl hover:scale-110 transition-transform active:scale-95 z-10"
                    aria-label="View love note"
                  >
                    {eventMessage.emoji}
                  </button>
                )}
                
                {categoryLabel && (
                  <div className="text-xs font-semibold text-white/80 mb-1">
                    {categoryLabel}
                  </div>
                )}
                <h3 className="text-base font-semibold text-white mb-1 leading-tight">
                  {event.title}
                </h3>
                <p className="text-sm text-white/90">
                  {format(event.startTime, 'h:mm a')}
                </p>
              </button>
            );
          })}
        </div>

        {/* View Toggle */}
        {onViewChange && (
          <div className="flex gap-1.5 sm:gap-2 pt-3 sm:pt-4 rounded-2xl sm:rounded-3xl bg-white/10 backdrop-blur-md p-1.5 sm:p-2">
            <button
              type="button"
              onClick={() => onViewChange('day')}
              data-testid="button-view-day"
              className="flex-1 py-3 sm:py-2.5 rounded-xl sm:rounded-2xl bg-white/10 border border-white/20 text-sm font-medium text-white/70 transition-all active:scale-[0.98] cursor-pointer touch-manipulation"
            >
              Day
            </button>
            <button
              type="button"
              onClick={() => onViewChange('week')}
              data-testid="button-view-week"
              className="flex-1 py-3 sm:py-2.5 rounded-xl sm:rounded-2xl bg-white/20 border border-white/30 text-sm font-medium text-white transition-all active:scale-[0.98] cursor-pointer touch-manipulation"
            >
              Week
            </button>
            <button
              type="button"
              onClick={() => onViewChange('month')}
              data-testid="button-view-month"
              className="flex-1 py-3 sm:py-2.5 rounded-xl sm:rounded-2xl bg-white/10 border border-white/20 text-sm font-medium text-white/70 transition-all active:scale-[0.98] cursor-pointer touch-manipulation"
            >
              Month
            </button>
            <button
              type="button"
              onClick={() => onViewChange('timeline')}
              data-testid="button-view-timeline"
              className="flex-1 py-3 sm:py-2.5 rounded-xl sm:rounded-2xl bg-white/10 border border-white/20 text-sm font-medium text-white/70 transition-all active:scale-[0.98] cursor-pointer touch-manipulation"
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
