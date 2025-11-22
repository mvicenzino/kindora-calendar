import { format, isToday } from "date-fns";
import { Plus } from "lucide-react";
import EventCard from "@/components/EventCard";
import type { Event as DBEvent } from "@shared/schema";

interface FamilyMember {
  id: string;
  name: string;
  color: string;
  initials: string;
}

interface Event extends DBEvent {
  startTime: Date;
  endTime: Date;
  members: FamilyMember[];
}

interface TodayViewProps {
  date: Date;
  events: Event[];
  tasks: string[];
  onEventClick: (event: Event) => void;
  onViewChange?: (view: 'day' | 'week' | 'month') => void;
  onAddEvent?: () => void;
}

export default function TodayView({ date, events, onEventClick, onViewChange, onAddEvent }: TodayViewProps) {
  const isViewingToday = isToday(date);
  const dayTitle = isViewingToday ? "Today" : format(date, 'EEEE');
  const daySubtitle = isViewingToday ? format(date, 'EEEE, MMMM d, yyyy') : format(date, 'EEEE, MMMM d, yyyy');

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Header */}
        <div className="px-2">
          <div className="flex items-start justify-between gap-6">
            <div>
              <h1 className="text-5xl font-bold text-white">{dayTitle}</h1>
              <p className="text-lg text-white/70 mt-1">{daySubtitle}</p>
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

        {/* Events */}
        {events.length > 0 ? (
          <div className="space-y-3">
            {events.map((event) => (
              <EventCard
                key={event.id}
                event={event}
                member={event.members[0]}
                onClick={() => onEventClick(event)}
                variant="full"
                showTime={true}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-white/70 text-lg">No events today</p>
          </div>
        )}

        {/* View Toggle */}
        {onViewChange && (
          <div className="flex gap-3 pt-4 rounded-3xl bg-white/10 backdrop-blur-md p-2">
            <button
              onClick={() => onViewChange('day')}
              data-testid="button-view-day"
              className="flex-1 py-2.5 rounded-2xl bg-white/20 border border-white/30 text-sm font-medium text-white transition-all active:scale-[0.98]"
            >
              Day
            </button>
            <button
              onClick={() => onViewChange('week')}
              data-testid="button-view-week"
              className="flex-1 py-2.5 rounded-2xl bg-white/10 border border-white/20 text-sm font-medium text-white/70 transition-all active:scale-[0.98]"
            >
              Week
            </button>
            <button
              onClick={() => onViewChange('month')}
              data-testid="button-view-month"
              className="flex-1 py-2.5 rounded-2xl bg-white/10 border border-white/20 text-sm font-medium text-white/70 transition-all active:scale-[0.98]"
            >
              Month
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
