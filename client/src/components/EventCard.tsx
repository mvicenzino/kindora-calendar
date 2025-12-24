import { useState } from "react";
import { format } from "date-fns";
import { Check, Trash2, Clock, Image as ImageIcon, MessageSquare } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useActiveFamily } from "@/contexts/ActiveFamilyContext";
import { useAuth } from "@/hooks/useAuth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import NotesModal from "@/components/NotesModal";
import type { UiEvent, UiFamilyMember } from "@shared/types";

interface EventCardProps {
  event: UiEvent;
  member?: UiFamilyMember;
  members?: UiFamilyMember[];
  onClick?: () => void;
  variant?: 'full' | 'compact' | 'grid';
  showTime?: boolean;
  showDate?: boolean;
  className?: string;
}

export default function EventCard({ 
  event, 
  member,
  members = [],
  onClick, 
  variant = 'full',
  showTime = true,
  showDate = false,
  className = ''
}: EventCardProps) {
  const { toast } = useToast();
  const { activeFamilyId } = useActiveFamily();
  const { user } = useAuth();
  const [notesModalOpen, setNotesModalOpen] = useState(false);

  const toggleCompletionMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest('POST', `/api/events/${event.id}/toggle-completion`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/events?familyId=' + activeFamilyId] });
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
      queryClient.invalidateQueries({ queryKey: ['/api/events?familyId=' + activeFamilyId] });
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

  const photoOpacity = variant === 'grid' ? 'opacity-50' : 'opacity-35';

  const isLightColor = (hex: string) => {
    const color = hex.replace('#', '');
    const r = parseInt(color.substr(0, 2), 16);
    const g = parseInt(color.substr(2, 2), 16);
    const b = parseInt(color.substr(4, 2), 16);
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    // Only use dark text for very light colors (yellow, light pink, white, etc.)
    return luminance > 0.75;
  };

  const needsDarkText = !event.photoUrl && isLightColor(event.color);

  return (
    <div
      onClick={onClick}
      data-testid={`event-card-${event.id}`}
      className={cardClasses}
      style={{ backgroundColor: event.color }}
    >
      {/* Dark overlay for light colors to ensure text readability - only without photos */}
      {needsDarkText && (
        <div className="absolute inset-0 bg-black/15 pointer-events-none" />
      )}
      {/* Photo Background (if exists) */}
      {event.photoUrl && (
        <div 
          className={`absolute inset-0 bg-cover bg-center ${photoOpacity}`}
          style={{ backgroundImage: `url(${event.photoUrl})` }}
          data-testid={`photo-bg-${event.id}`}
        />
      )}

      {/* Content */}
      <div className="relative z-10">
        {/* Top Row: Checkmark and Delete */}
        <div className="flex items-start justify-between mb-2">
          {/* Checkmark Button - min 44px touch target */}
          <button
            onClick={handleCheckmarkClick}
            data-testid={`button-complete-${event.id}`}
            className={`
              w-8 h-8 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full transition-all
              ${event.completed 
                ? 'bg-green-500 text-white shadow-lg shadow-green-500/30'
                : needsDarkText 
                  ? 'bg-white/80 border-2 border-gray-400 text-gray-400 hover:border-green-500 hover:text-green-500'
                  : 'bg-white/30 border-2 border-white/80 text-white/60 hover:border-green-400 hover:text-green-400'
              }
            `}
          >
            <Check className={`w-4 h-4 ${event.completed ? '' : 'opacity-50'}`} strokeWidth={3} />
          </button>

          {/* Delete Button - min 44px touch target */}
          <button
            onClick={handleDeleteClick}
            data-testid={`button-delete-${event.id}`}
            className={`w-8 h-8 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full transition-all ${needsDarkText ? 'bg-black/10 border border-black/20 hover:bg-black/20' : 'bg-white/20 border border-white/40 hover:bg-white/30'}`}
          >
            <Trash2 className={`w-4 h-4 ${needsDarkText ? 'text-gray-800' : 'text-white'}`} />
          </button>
        </div>

        {/* Title */}
        <h3 
          className={`font-semibold mb-2 ${variant === 'grid' ? 'text-base' : 'text-xl'} ${needsDarkText ? 'text-gray-900' : 'text-white'}`}
          data-testid={`text-title-${event.id}`}
        >
          {event.title}
        </h3>

        {/* Time/Description */}
        {showTime && (
          <div className="mb-3">
            {isSometimeToday() ? (
              <span 
                className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm border ${needsDarkText ? 'bg-black/10 text-gray-800 border-black/20' : 'bg-white/20 text-white border-white/30'}`}
                data-testid={`text-time-${event.id}`}
              >
                <Clock className="w-3 h-3" />
                Sometime today
              </span>
            ) : (
              <p className={`text-sm ${needsDarkText ? 'text-gray-800' : 'text-white/90'}`} data-testid={`text-time-${event.id}`}>
                {format(event.startTime, 'h:mm a')} - {format(event.endTime, 'h:mm a')}
              </p>
            )}
          </div>
        )}

        {showDate && (
          <p className={`text-sm mb-3 ${needsDarkText ? 'text-gray-700' : 'text-white/80'}`} data-testid={`text-date-${event.id}`}>
            {format(event.startTime, 'MMM d, yyyy')}
          </p>
        )}

        {/* Description */}
        {event.description && variant === 'full' && (
          <p className={`text-sm mb-3 ${needsDarkText ? 'text-gray-700' : 'text-white/80'}`} data-testid={`text-description-${event.id}`}>
            {event.description}
          </p>
        )}

        {/* Latest Note Preview - only in full and compact variants (not grid/calendar) */}
        {event.latestNote && variant !== 'grid' && (
          <div 
            className={`text-xs mb-3 p-2 rounded-lg ${needsDarkText ? 'bg-black/10 border border-black/10' : 'bg-white/15 border border-white/20'}`}
            data-testid={`note-preview-${event.id}`}
          >
            <div className={`flex items-center gap-1 mb-1 ${needsDarkText ? 'text-gray-600' : 'text-white/60'}`}>
              <MessageSquare className="w-3 h-3" />
              <span className="font-medium">{event.latestNote.authorName}</span>
            </div>
            <p className={`line-clamp-2 ${needsDarkText ? 'text-gray-700' : 'text-white/80'}`}>
              {event.latestNote.content}
            </p>
          </div>
        )}

        {/* Bottom Row: Notes Indicator (left) and Member Avatars (right) */}
        <div className="flex justify-between items-center gap-2">
          {/* Notes Indicator - Lower Left (Clickable) - min 44px touch target */}
          {(event.noteCount ?? 0) > 0 ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setNotesModalOpen(true);
              }}
              className={`flex items-center gap-1 rounded-full px-3 py-1.5 min-h-[44px] transition-all ${needsDarkText ? 'text-gray-700 hover:text-gray-900 hover:bg-black/10' : 'text-white/80 hover:text-white hover:bg-white/20'}`}
              data-testid={`notes-indicator-${event.id}`}
            >
              <MessageSquare className="w-4 h-4" />
              <span className="text-sm font-medium">{event.noteCount}</span>
            </button>
          ) : (
            <div />
          )}

          {/* Member Avatars - Lower Right */}
          {members.length > 0 ? (
            <div className="flex items-center -space-x-2">
              {members.map((m, index) => (
                <Avatar
                  key={m.id}
                  className="w-8 h-8 border-2 border-white/50"
                  style={{ 
                    backgroundColor: m.color,
                    zIndex: members.length - index 
                  }}
                  data-testid={`avatar-member-${m.id}`}
                >
                  <AvatarFallback 
                    className="text-white text-xs font-semibold"
                    style={{ backgroundColor: m.color }}
                  >
                    {m.initials || m.name.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              ))}
            </div>
          ) : member && (
            <Avatar
              className="w-8 h-8 border-2 border-white/50"
              style={{ backgroundColor: member.color }}
              data-testid={`avatar-member-${member.id}`}
            >
              <AvatarFallback 
                className="text-white text-xs font-semibold"
                style={{ backgroundColor: member.color }}
              >
                {member.initials || member.name.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          )}
        </div>
      </div>

      {/* Notes Modal */}
      <NotesModal
        open={notesModalOpen}
        onOpenChange={setNotesModalOpen}
        eventId={event.id}
        eventTitle={event.title}
        familyId={activeFamilyId || ''}
        currentUserId={user?.id}
      />
    </div>
  );
}
