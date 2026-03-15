import { format, isSameDay, isToday, startOfDay } from "date-fns";
import { Plus, CalendarDays } from "lucide-react";
import EventCard from "@/components/EventCard";
import type { UiEvent } from "@shared/types";

interface TimelineViewProps {
  events: UiEvent[];
  onEventClick: (event: UiEvent) => void;
  onAddEvent?: () => void;
}

export default function TimelineView({ events, onEventClick, onAddEvent }: TimelineViewProps) {
  // Sort events by most recent first (descending)
  const sortedEvents = [...events].sort((a, b) => 
    b.startTime.getTime() - a.startTime.getTime()
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
    <div className="min-h-screen p-3 sm:p-4">
      <div className="max-w-2xl mx-auto space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold text-foreground">Timeline</h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">Your events in time</p>
          </div>
          {onAddEvent && (
            <button
              onClick={onAddEvent}
              data-testid="button-add-event"
              className="w-10 h-10 rounded-full backdrop-blur-xl bg-muted/50 flex items-center justify-center border-2 border-border shadow-lg hover-elevate transition-all active:scale-[0.98]"
            >
              <Plus className="w-5 h-5 text-foreground drop-shadow-md" strokeWidth={2.5} />
            </button>
          )}
        </div>

        {/* Grouped Events */}
        {groupedEvents.map((group, groupIndex) => (
          <div key={groupIndex} className="space-y-3">
            <div 
              className="sticky top-20 z-10 rounded-full px-4 py-2 inline-block border-2 border-border shadow-lg"
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
                  members={event.members || []}
                  onClick={() => onEventClick(event)}
                  variant="full"
                  showTime={true}
                />
              ))}
            </div>
          </div>
        ))}

        {events.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 px-4 text-center" data-testid="text-empty-state">
            <div className="w-12 h-12 rounded-xl bg-muted/40 flex items-center justify-center mb-4">
              <CalendarDays className="w-6 h-6 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium text-foreground mb-1">Nothing on the timeline yet</p>
            <p className="text-xs text-muted-foreground mb-4">Events you create will appear here in chronological order</p>
            {onAddEvent && (
              <button
                onClick={onAddEvent}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover-elevate px-3 py-1.5 rounded-lg border border-primary/30 bg-primary/5"
                data-testid="button-add-first-event"
              >
                <Plus className="w-3.5 h-3.5" />
                Add your first event
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
