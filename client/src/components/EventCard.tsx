import { format } from "date-fns";
import { Check, Trash2, Clock } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface FamilyMember {
  id: string;
  name: string;
  color: string;
  initials?: string;
}

interface Event {
  id: string;
  title: string;
  description?: string;
  startTime: Date;
  endTime: Date;
  memberId: string;
  color: string;
  photoUrl?: string;
  completed: boolean;
  completedAt?: Date;
}

interface EventCardProps {
  event: Event;
  member?: FamilyMember;
  onClick?: () => void;
  variant?: 'full' | 'compact' | 'grid';
  showTime?: boolean;
  showDate?: boolean;
  className?: string;
}

export default function EventCard({ 
  event, 
  member,
  onClick, 
  variant = 'full',
  showTime = true,
  showDate = false,
  className = ''
}: EventCardProps) {
  const { toast } = useToast();

  const toggleCompletionMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest('POST', `/api/events/${event.id}/toggle-completion`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/events'] });
      toast({
        title: event.completed ? "Event marked incomplete" : "Event completed!",
        duration: 2000,
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update event",
        variant: "destructive",
      });
    },
  });

  const deleteEventMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest('DELETE', `/api/events/${event.id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/events'] });
      toast({
        title: "Event deleted",
        duration: 2000,
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete event",
        variant: "destructive",
      });
    },
  });

  const handleCheckmarkClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleCompletionMutation.mutate();
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Delete this event?')) {
      deleteEventMutation.mutate();
    }
  };

  const isSometimeToday = () => {
    const hour = event.startTime.getHours();
    const minute = event.startTime.getMinutes();
    return hour === 23 && minute === 58;
  };

  const formatTimeRange = () => {
    if (isSometimeToday()) {
      return 'Sometime today';
    }
    return `${format(event.startTime, 'h:mm a')} - ${format(event.endTime, 'h:mm a')}`;
  };

  const cardClasses = `
    relative rounded-3xl overflow-hidden text-left transition-all hover:opacity-90 active:scale-[0.98] cursor-pointer border border-white/50
    ${variant === 'compact' ? 'p-3' : variant === 'grid' ? 'p-4' : 'p-5'}
    ${className}
  `;

  return (
    <div
      onClick={onClick}
      data-testid={`event-card-${event.id}`}
      className={cardClasses}
      style={{ backgroundColor: event.color }}
    >
      {/* Photo Background (if exists) */}
      {event.photoUrl && (
        <div 
          className="absolute inset-0 bg-cover bg-center opacity-30"
          style={{ backgroundImage: `url(${event.photoUrl})` }}
        />
      )}

      {/* Content */}
      <div className="relative z-10">
        {/* Top Row: Checkmark and Delete */}
        <div className="flex items-start justify-between mb-2">
          {/* Checkmark Button */}
          <button
            onClick={handleCheckmarkClick}
            data-testid={`button-complete-${event.id}`}
            className={`
              w-7 h-7 rounded-full flex items-center justify-center transition-all
              ${event.completed 
                ? 'bg-white text-purple-600' 
                : 'bg-white/20 border-2 border-white/60 text-white hover:bg-white/30'
              }
            `}
          >
            {event.completed && <Check className="w-4 h-4" strokeWidth={3} />}
          </button>

          {/* Delete Button */}
          <button
            onClick={handleDeleteClick}
            data-testid={`button-delete-${event.id}`}
            className="w-7 h-7 rounded-full bg-white/20 border border-white/40 flex items-center justify-center hover:bg-white/30 transition-all"
          >
            <Trash2 className="w-4 h-4 text-white" />
          </button>
        </div>

        {/* Title */}
        <h3 
          className={`font-semibold text-white mb-2 ${variant === 'grid' ? 'text-base' : 'text-xl'}`}
          data-testid={`text-title-${event.id}`}
        >
          {event.title}
        </h3>

        {/* Time/Description */}
        {showTime && (
          <div className="mb-3">
            {isSometimeToday() ? (
              <span 
                className="inline-flex items-center gap-1 px-3 py-1 bg-white/20 rounded-full text-sm text-white border border-white/30"
                data-testid={`text-time-${event.id}`}
              >
                <Clock className="w-3 h-3" />
                Sometime today
              </span>
            ) : (
              <p className="text-sm text-white/90" data-testid={`text-time-${event.id}`}>
                {format(event.startTime, 'h:mm a')} - {format(event.endTime, 'h:mm a')}
              </p>
            )}
          </div>
        )}

        {showDate && (
          <p className="text-sm text-white/80 mb-3" data-testid={`text-date-${event.id}`}>
            {format(event.startTime, 'MMM d, yyyy')}
          </p>
        )}

        {/* Description */}
        {event.description && variant === 'full' && (
          <p className="text-sm text-white/80 mb-3" data-testid={`text-description-${event.id}`}>
            {event.description}
          </p>
        )}

        {/* Bottom Row: Member Avatar */}
        <div className="flex justify-end">
          {member && (
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold text-white border-2 border-white/30"
              style={{ backgroundColor: member.color }}
              data-testid={`avatar-member-${member.id}`}
            >
              {member.initials || member.name.charAt(0).toUpperCase()}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
