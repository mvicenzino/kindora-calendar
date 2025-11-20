import { format, isSameDay, isToday, startOfDay } from "date-fns";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock } from "lucide-react";

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

interface TimelineViewProps {
  events: Event[];
  onEventClick: (event: Event) => void;
}

export default function TimelineView({ events, onEventClick }: TimelineViewProps) {
  const isSometimeTodayEvent = (event: Event) => {
    const hour = event.startTime.getHours();
    const minute = event.startTime.getMinutes();
    return hour === 23 && minute === 58;
  };

  const formatTimeRange = (start: Date, end: Date) => {
    return `${format(start, 'h:mm a')} - ${format(end, 'h:mm a')}`;
  };

  const sortedEvents = [...events].sort((a, b) => 
    a.startTime.getTime() - b.startTime.getTime()
  );

  const groupedEvents: Array<{ date: Date; events: Event[] }> = [];
  
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
    <div className="min-h-screen p-4">
      <div className="max-w-2xl mx-auto space-y-6 pt-4">
        {groupedEvents.map((group, groupIndex) => (
          <div key={groupIndex} className="space-y-3">
            <div 
              className="sticky top-20 z-10 backdrop-blur-md bg-white/10 rounded-full px-4 py-2 inline-block border border-white/20 shadow-lg"
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
                <Card
                  key={event.id}
                  className="bg-card overflow-visible"
                  data-testid={`event-card-${event.id}`}
                >
                  <Button
                    variant="ghost"
                    className="w-full h-auto p-4 text-left justify-start hover-elevate active-elevate-2 overflow-visible"
                    onClick={() => onEventClick(event)}
                    data-testid={`button-event-${event.id}`}
                  >
                    <div className="flex items-start gap-3 w-full">
                      <div className="flex-1 space-y-2">
                        <h3 className="text-white font-semibold" data-testid={`text-event-title-${event.id}`}>
                          {event.title}
                        </h3>
                        
                        <div className="flex items-center gap-2">
                          {isSometimeTodayEvent(event) ? (
                            <span 
                              className="inline-flex items-center gap-1 text-white/70 text-sm bg-white/10 px-3 py-1 rounded-full border border-white/20"
                              data-testid={`text-event-time-allday-${event.id}`}
                            >
                              <Clock className="w-3 h-3" />
                              Sometime today
                            </span>
                          ) : (
                            <span 
                              className="inline-flex items-center gap-1 text-white/70 text-sm"
                              data-testid={`text-event-time-${event.id}`}
                            >
                              <Clock className="w-3 h-3" />
                              {formatTimeRange(event.startTime, event.endTime)}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex -space-x-2">
                        {event.members.map((member) => (
                          <Avatar 
                            key={member.id}
                            className="w-8 h-8 border-2 border-white/20"
                            style={{ borderColor: member.color }}
                            data-testid={`avatar-event-${event.id}-member-${member.id}`}
                          >
                            <AvatarFallback 
                              className="text-white text-xs font-semibold"
                              style={{ backgroundColor: member.color }}
                            >
                              {member.initials}
                            </AvatarFallback>
                          </Avatar>
                        ))}
                      </div>
                    </div>
                  </Button>
                </Card>
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
