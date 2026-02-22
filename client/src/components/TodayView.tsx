import { format, isToday } from "date-fns";
import { Plus, Users, Sparkles, ArrowUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import EventCard from "@/components/EventCard";
import type { UiEvent, UiFamilyMember } from "@shared/types";

interface TodayViewProps {
  date: Date;
  events: UiEvent[];
  tasks: string[];
  members?: UiFamilyMember[];
  onEventClick: (event: UiEvent) => void;
  onViewChange?: (view: 'day' | 'week' | 'month') => void;
  onAddEvent?: () => void;
}

export default function TodayView({ date, events, members = [], onEventClick, onViewChange, onAddEvent }: TodayViewProps) {
  const isViewingToday = isToday(date);
  const dayTitle = isViewingToday ? "Today" : format(date, 'EEEE');
  const daySubtitle = isViewingToday ? format(date, 'EEEE, MMMM d, yyyy') : format(date, 'EEEE, MMMM d, yyyy');
  
  const hasMembers = members.length > 0;
  const hasEvents = events.length > 0;

  return (
    <div className="p-4 sm:p-6">
      <div className="w-full max-w-2xl mx-auto space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-4xl sm:text-5xl font-bold text-foreground" data-testid="text-day-title">{dayTitle}</h1>
            <p className="text-base sm:text-lg text-muted-foreground mt-1">{daySubtitle}</p>
          </div>
          {onAddEvent && (
            <Button
              size="icon"
              onClick={onAddEvent}
              data-testid="button-add-event"
              className="rounded-full bg-primary text-primary-foreground flex-shrink-0"
            >
              <Plus className="w-5 h-5" strokeWidth={2.5} />
            </Button>
          )}
        </div>

        {hasEvents ? (
          <div className="space-y-3">
            {events.map((event) => (
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
        ) : (
          <div className="relative bg-card border border-border rounded-2xl p-8 md:p-12" data-testid="empty-state">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/3 rounded-2xl" />
            
            <div className="relative z-10">
            {!hasMembers ? (
              <div className="text-center space-y-6">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 border border-primary/20 mb-2">
                  <Users className="w-8 h-8 text-primary" />
                </div>
                
                <div className="space-y-3">
                  <h3 className="text-2xl font-bold text-foreground">
                    Welcome to Your Family Calendar
                  </h3>
                  <p className="text-muted-foreground text-lg leading-relaxed max-w-lg mx-auto">
                    Let's get started by adding the people who matter most. Each family member gets their own color.
                  </p>
                </div>

                <div className="flex items-center justify-center gap-2 text-muted-foreground">
                  <ArrowUp className="w-5 h-5 animate-bounce" />
                  <p className="text-sm font-medium">
                    Use the sidebar to navigate to Family settings and add members
                  </p>
                </div>
              </div>
            ) : (
              <div className="text-center space-y-6">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 border border-primary/20 mb-2">
                  <Sparkles className="w-8 h-8 text-primary" />
                </div>
                
                <div className="space-y-3">
                  <h3 className="text-2xl font-bold text-foreground">
                    Your Calendar Awaits
                  </h3>
                  <p className="text-muted-foreground text-lg leading-relaxed max-w-lg mx-auto">
                    Great, you've added {members.length === 1 ? 'a family member' : `${members.length} family members`}. Now bring your calendar to life with events.
                  </p>
                </div>

                <div className="flex flex-col items-center gap-4">
                  <Button onClick={onAddEvent} className="gap-2" data-testid="button-create-first-event">
                    <Plus className="w-4 h-4" />
                    Create Your First Event
                  </Button>
                  
                  <p className="text-muted-foreground text-sm max-w-md">
                    Events can be anything: doctor appointments, soccer practice, family dinners, or quiet time.
                  </p>
                </div>
              </div>
            )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
