import { format, isSameDay } from "date-fns";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Plus } from "lucide-react";

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
  onEventClick: (event: Event) => void;
  onViewChange?: (view: 'day' | 'week' | 'month' | 'timeline') => void;
  onAddEvent?: () => void;
}

export default function TimelineView({ events, onEventClick, onViewChange, onAddEvent }: TimelineViewProps) {
  const isSometimeToday = (event: Event) => {
    const startHour = event.startTime.getHours();
    const startMinute = event.startTime.getMinutes();
    const endHour = event.endTime.getHours();
    const endMinute = event.endTime.getMinutes();
    return startHour === 23 && startMinute === 58 && endHour === 23 && endMinute === 59;
  };

  const getEventColor = (index: number) => {
    const colors = [
      '#8B7A9D', // soft purple
      '#7A9D8B', // sage green
      '#9D8B7A', // warm taupe
      '#7A8B9D', // soft blue
      '#9D7A8B', // dusty rose
      '#8B9D7A', // olive green
    ];
    return colors[index % colors.length];
  };

  return (
    <div className="min-h-screen flex flex-col p-4">
      {/* Header */}
      <div className="w-full max-w-3xl mx-auto px-2 mb-8">
        <div className="flex items-start justify-between gap-6">
          <div>
            <h1 className="text-5xl font-bold text-white">Timeline</h1>
            <p className="text-lg text-white/70 mt-1">Your events in time</p>
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

      {/* Timeline */}
      <div className="flex-1 w-full max-w-3xl mx-auto relative">
        {/* Center line */}
        <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-gradient-to-b from-white/40 via-white/20 to-white/40 -translate-x-1/2" />

        {/* Events */}
        <div className="space-y-12 pb-20">
          {events.map((event, index) => {
            const isLeft = index % 2 === 0;
            const color = getEventColor(index);
            
            return (
              <div key={event.id} className="relative">
                {/* Date marker on timeline */}
                <div className="absolute left-1/2 top-8 -translate-x-1/2 z-10">
                  <div className="bg-gradient-to-br from-white/50 to-white/30 backdrop-blur-xl rounded-full px-4 py-2 border-2 border-white/60 shadow-lg">
                    <p className="text-xs font-semibold text-white whitespace-nowrap">
                      {format(event.startTime, 'MMM d')}
                    </p>
                  </div>
                </div>

                {/* Event card */}
                <div className={`flex ${isLeft ? 'justify-start pr-[52%]' : 'justify-end pl-[52%]'}`}>
                  <button
                    onClick={() => onEventClick(event)}
                    data-testid={`timeline-event-${event.id}`}
                    className="group relative w-full"
                  >
                    {/* Connecting line to center */}
                    <div 
                      className={`absolute top-10 w-8 h-0.5 bg-gradient-to-r ${
                        isLeft 
                          ? 'right-0 translate-x-full from-white/40 to-transparent' 
                          : 'left-0 -translate-x-full from-transparent to-white/40'
                      }`}
                    />

                    {/* Member avatars floating around card */}
                    <div className={`absolute ${isLeft ? '-right-6' : '-left-6'} top-12 flex flex-col gap-2`}>
                      {event.members.slice(0, 3).map((member, idx) => (
                        <Avatar 
                          key={member.id} 
                          className="h-12 w-12 ring-2 ring-white/40 shadow-lg"
                          style={{ 
                            '--tw-ring-color': `${member.color}60`,
                            transform: `translateY(${idx * -8}px)`
                          } as React.CSSProperties}
                        >
                          <AvatarFallback 
                            className="text-white font-semibold text-sm"
                            style={{ backgroundColor: member.color }}
                          >
                            {member.initials}
                          </AvatarFallback>
                        </Avatar>
                      ))}
                    </div>

                    {/* Event card */}
                    <div
                      className="rounded-3xl p-6 border-2 border-white/50 backdrop-blur-xl hover:scale-[1.02] transition-all active:scale-[0.98] text-left shadow-xl"
                      style={{ backgroundColor: color }}
                    >
                      {/* Title */}
                      <h3 className="text-2xl font-bold text-white mb-2 leading-tight">
                        {event.title}
                      </h3>

                      {/* Description */}
                      {event.description && (
                        <p className="text-sm text-white/80 mb-3 line-clamp-2">
                          {event.description}
                        </p>
                      )}

                      {/* Time */}
                      <div className="flex items-center gap-2 text-sm text-white/90">
                        <div className="bg-white/20 backdrop-blur-sm rounded-full px-3 py-1">
                          {isSometimeToday(event) ? (
                            "Sometime today"
                          ) : (
                            `${format(event.startTime, 'h:mm a')} - ${format(event.endTime, 'h:mm a')}`
                          )}
                        </div>
                      </div>

                      {/* Category badge if exists */}
                      {event.categories && event.categories.length > 0 && (
                        <div className="mt-3">
                          <span className="inline-block bg-white/20 backdrop-blur-sm rounded-full px-3 py-1 text-xs font-medium text-white">
                            {event.categories[0]}
                          </span>
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

      {/* View Toggle */}
      {onViewChange && (
        <div className="w-full max-w-3xl mx-auto mt-8">
          <div className="flex gap-3 rounded-3xl bg-white/10 backdrop-blur-md p-2">
            <button
              type="button"
              onClick={() => onViewChange('day')}
              data-testid="button-view-day"
              className="flex-1 py-2.5 rounded-2xl bg-white/10 border border-white/20 text-sm font-medium text-white/70 transition-all active:scale-[0.98] cursor-pointer"
            >
              Day
            </button>
            <button
              type="button"
              onClick={() => onViewChange('week')}
              data-testid="button-view-week"
              className="flex-1 py-2.5 rounded-2xl bg-white/10 border border-white/20 text-sm font-medium text-white/70 transition-all active:scale-[0.98] cursor-pointer"
            >
              Week
            </button>
            <button
              type="button"
              onClick={() => onViewChange('month')}
              data-testid="button-view-month"
              className="flex-1 py-2.5 rounded-2xl bg-white/10 border border-white/20 text-sm font-medium text-white/70 transition-all active:scale-[0.98] cursor-pointer"
            >
              Month
            </button>
            <button
              type="button"
              onClick={() => onViewChange('timeline')}
              data-testid="button-view-timeline"
              className="flex-1 py-2.5 rounded-2xl bg-white/20 border border-white/30 text-sm font-medium text-white transition-all active:scale-[0.98] cursor-pointer"
            >
              Timeline
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
