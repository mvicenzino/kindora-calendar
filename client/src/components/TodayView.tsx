import { format, isToday } from "date-fns";
import { Plus } from "lucide-react";
import EventCard from "@/components/EventCard";
import type { UiEvent } from "@shared/types";

interface TodayViewProps {
  date: Date;
  events: UiEvent[];
  tasks: string[];
  onEventClick: (event: UiEvent) => void;
  onViewChange?: (view: 'day' | 'week' | 'month') => void;
  onAddEvent?: () => void;
}

export default function TodayView({ date, events, onEventClick, onViewChange, onAddEvent }: TodayViewProps) {
  const isViewingToday = isToday(date);
  const dayTitle = isViewingToday ? "Today" : format(date, 'EEEE');
  const daySubtitle = isViewingToday ? format(date, 'EEEE, MMMM d, yyyy') : format(date, 'EEEE, MMMM d, yyyy');

  return (
    <div className="min-h-screen p-6">
      <div className="w-full max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-6">
          <div>
            <h1 className="text-5xl font-bold text-white">{dayTitle}</h1>
            <p className="text-lg text-white/70 mt-1">{daySubtitle}</p>
          </div>
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

        {/* Events */}
        {events.length > 0 ? (
          <div className="space-y-3">
            {events.map((event) => (
              <EventCard
                key={event.id}
                event={event}
                member={event.members?.[0]}
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

      </div>
    </div>
  );
}
