import { format, isToday } from "date-fns";
import { Plus, Users, Sparkles, ArrowUp } from "lucide-react";
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
        {hasEvents ? (
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
          <div className="backdrop-blur-xl bg-white/5 border border-white/20 rounded-3xl p-8 md:p-12" data-testid="empty-state">
            {!hasMembers ? (
              <div className="text-center space-y-6">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-purple-500/20 to-teal-500/20 border-2 border-white/30 mb-2">
                  <Users className="w-8 h-8 text-white" />
                </div>
                
                <div className="space-y-3">
                  <h3 className="text-2xl font-bold text-white">
                    Welcome to Your Family Calendar! 🎉
                  </h3>
                  <p className="text-white/80 text-lg leading-relaxed max-w-lg mx-auto">
                    Let's get started by adding the people who matter most. Each family member gets their own color!
                  </p>
                </div>

                <div className="flex items-center justify-center gap-2 text-white/70">
                  <ArrowUp className="w-5 h-5 animate-bounce" />
                  <p className="text-sm font-medium">
                    Click the <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-white/10 border border-white/30 text-white">
                      <Users className="w-3.5 h-3.5" /> profile icon
                    </span> above to add your first family member
                  </p>
                </div>
              </div>
            ) : (
              <div className="text-center space-y-6">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-purple-500/20 to-teal-500/20 border-2 border-white/30 mb-2">
                  <Sparkles className="w-8 h-8 text-white" />
                </div>
                
                <div className="space-y-3">
                  <h3 className="text-2xl font-bold text-white">
                    Your Calendar Awaits! ✨
                  </h3>
                  <p className="text-white/80 text-lg leading-relaxed max-w-lg mx-auto">
                    Great! You've added {members.length === 1 ? 'a family member' : `${members.length} family members`}. Now it's time to bring your calendar to life with events!
                  </p>
                </div>

                <div className="flex flex-col items-center gap-4">
                  <div className="flex items-center gap-2 text-white/70">
                    <ArrowUp className="w-5 h-5 animate-bounce" />
                    <p className="text-sm font-medium">
                      Click the <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-white/10 border border-white/30 text-white">
                        <Plus className="w-3.5 h-3.5" /> plus icon
                      </span> above to create your first event
                    </p>
                  </div>
                  
                  <p className="text-white/60 text-sm max-w-md">
                    💡 Tip: Events can be anything—doctor appointments, soccer practice, family dinners, or even "Me Time"!
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
