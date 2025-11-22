import { format, isSameDay, isToday, startOfDay } from "date-fns";
import { Plus } from "lucide-react";
import EventCard from "@/components/EventCard";
import type { UiEvent } from "@shared/types";

interface TimelineViewProps {
  events: UiEvent[];
  onEventClick: (event: UiEvent) => void;
  onAddEvent?: () => void;
}

export default function TimelineView({ events, onEventClick, onAddEvent }: TimelineViewProps) {
  const sortedEvents = [...events].sort((a, b) => 
    a.startTime.getTime() - b.startTime.getTime()
  );

  const groupedEvents: Array<{ date: Date; events: UiEvent[] }> = [];
  
  sortedEvents.forEach((event) => {
    const eventDate = startOfDay(event.startTime);
    const existingGroup = groupedEvents.find(g => 
      isSameDay(g.date, eventDate)
    );
    
    if (existingGroup) {
      existingGroup.events.push(event);
    } else {
      groupedEvents.push({
        date: eventDate,
        events: [event]
      });
    }
  });

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-6">
          <div>
            <h1 className="text-5xl font-bold text-white">Timeline</h1>
            <p className="text-lg text-white/70 mt-1">Your events in time</p>
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

        {/* Grouped Events */}
        {groupedEvents.map((group, groupIndex) => (
          <div key={groupIndex} className="space-y-3">
            <div 
              className="sticky top-20 z-10 rounded-full px-4 py-2 inline-block border-2 border-white/40 shadow-lg"
              style={{ backgroundColor: '#8B5CF6' }}
              data-testid={`date-badge-${format(group.date, 'yyyy-MM-dd')}`}
            >
              <span className="text-white font-semibold text-sm">
                {isToday(group.date) 
                  ? 'Today'
                  : format(group.date, 'MMM d')}
              </span>
            </div>
            
            <div className="space-y-3">
              {group.events.map((event) => (
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
          </div>
        ))}

        {events.length === 0 && (
          <div className="text-center py-12">
            <p className="text-white/70 text-lg" data-testid="text-empty-state">No events to display</p>
          </div>
        )}
      </div>
    </div>
  );
}
