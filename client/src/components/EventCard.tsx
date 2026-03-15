import { useState } from "react";
import { format } from "date-fns";
import { Check, Trash2, Clock, MessageSquare, Repeat } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useActiveFamily } from "@/contexts/ActiveFamilyContext";
import { useAuth } from "@/hooks/useAuth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import NotesModal from "@/components/NotesModal";
import type { UiEvent, UiFamilyMember } from "@shared/types";
import { CATEGORY_CONFIG, type EventCategory } from "@shared/schema";

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
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  const realEventId = event.id.includes('_occ_') ? event.id.split('_occ_')[0] : event.id;

  const toggleCompletionMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest('POST', `/api/events/${realEventId}/toggle-completion`);
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
      return await apiRequest('DELETE', `/api/events/${realEventId}`);
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
    setDeleteConfirmOpen(true);
  };

  const isSometimeToday = () => {
    const hour = event.startTime.getHours();
    const minute = event.startTime.getMinutes();
    return hour === 23 && minute === 58;
  };

  const allMembers = members.length > 0 ? members : member ? [member] : [];
  const categoryConfig = event.category && event.category !== 'other' ? CATEGORY_CONFIG[event.category as EventCategory] : null;

  return (
    <>
      <div
        onClick={onClick}
        data-testid={`event-card-${event.id}`}
        className={`
          relative flex items-center gap-3 rounded-md cursor-pointer
          transition-all duration-200 group
          ${variant === 'compact' ? 'px-2 py-1.5' : 'px-3 py-2'}
          ${className}
        `}
        style={{
          background: `linear-gradient(135deg, ${event.color}30 0%, ${event.color}1c 55%, ${event.color}0e 100%)`,
          backdropFilter: 'blur(8px) saturate(1.2)',
          WebkitBackdropFilter: 'blur(8px) saturate(1.2)',
          border: `1px solid ${event.color}30`,
          boxShadow: [
            `inset 3px 0 0 ${event.color}`,
            'inset 0 1px 0 rgba(255,255,255,0.15)',
            `0 1px 6px ${event.color}22`,
          ].join(', '),
        }}
      >
        <button
          onClick={handleCheckmarkClick}
          data-testid={`button-complete-${event.id}`}
          className={`
            flex-shrink-0 w-5 h-5 flex items-center justify-center rounded-full transition-all border
            ${event.completed
              ? 'bg-green-500 border-green-500 text-white'
              : 'border-muted-foreground/40 text-transparent'
            }
          `}
        >
          <Check className="w-3 h-3" strokeWidth={3} />
        </button>

        <div className="flex-1 min-w-0 flex items-center gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <span
                className={`text-xs font-semibold truncate ${event.completed ? 'line-through text-muted-foreground' : 'text-foreground'}`}
                data-testid={`text-title-${event.id}`}
              >
                {event.title}
              </span>
              {(event.rrule || event.recurringEventId) && (
                <Repeat className="w-3 h-3 text-muted-foreground flex-shrink-0" data-testid={`icon-recurring-${event.id}`} />
              )}
              {categoryConfig && (
                <span
                  className="flex-shrink-0 w-1.5 h-1.5 rounded-full"
                  style={{ backgroundColor: categoryConfig.color }}
                  title={categoryConfig.label}
                  data-testid={`text-category-${event.id}`}
                />
              )}
            </div>

            <div className="flex items-center gap-2 mt-0.5">
              {showTime && (
                <span className="text-[10px] text-muted-foreground whitespace-nowrap" data-testid={`text-time-${event.id}`}>
                  {isSometimeToday() ? (
                    <span className="flex items-center gap-0.5">
                      <Clock className="w-2.5 h-2.5" />
                      Flexible
                    </span>
                  ) : (
                    `${format(event.startTime, 'h:mm a')} – ${format(event.endTime, 'h:mm a')}`
                  )}
                </span>
              )}
              {showDate && (
                <span className="text-[10px] text-muted-foreground" data-testid={`text-date-${event.id}`}>
                  {format(event.startTime, 'MMM d')}
                </span>
              )}
              {event.description && variant === 'full' && (
                <span className="text-[10px] text-muted-foreground/70 truncate hidden sm:inline" data-testid={`text-description-${event.id}`}>
                  {event.description}
                </span>
              )}
            </div>
          </div>

          {(event.noteCount ?? 0) > 0 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setNotesModalOpen(true);
              }}
              className="flex items-center gap-0.5 text-muted-foreground flex-shrink-0"
              data-testid={`notes-indicator-${event.id}`}
            >
              <MessageSquare className="w-3 h-3" />
              <span className="text-[10px]">{event.noteCount}</span>
            </button>
          )}

          {allMembers.length > 0 && (
            <div className="flex items-center -space-x-1.5 flex-shrink-0">
              {allMembers.slice(0, 3).map((m, index) => (
                <Avatar
                  key={m.id}
                  className="w-5 h-5 border border-background"
                  style={{
                    backgroundColor: m.color,
                    zIndex: allMembers.length - index,
                  }}
                  data-testid={`avatar-member-${m.id}`}
                >
                  <AvatarFallback
                    className="text-white text-[8px] font-semibold"
                    style={{ backgroundColor: m.color }}
                  >
                    {m.initials || m.name.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              ))}
              {allMembers.length > 3 && (
                <span className="text-[9px] text-muted-foreground ml-1">+{allMembers.length - 3}</span>
              )}
            </div>
          )}
        </div>

        <button
          onClick={handleDeleteClick}
          data-testid={`button-delete-${event.id}`}
          className="flex-shrink-0 w-5 h-5 flex items-center justify-center rounded-full text-muted-foreground/40 transition-all"
          style={{ visibility: 'hidden' }}
        >
          <Trash2 className="w-3 h-3" />
        </button>
      </div>

      <NotesModal
        open={notesModalOpen}
        onOpenChange={setNotesModalOpen}
        eventId={event.id}
        eventTitle={event.title}
        familyId={activeFamilyId || ''}
        currentUserId={user?.id}
      />

      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete event?</AlertDialogTitle>
            <AlertDialogDescription>
              &ldquo;{event.title}&rdquo; will be permanently removed. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete-event">Cancel</AlertDialogCancel>
            <AlertDialogAction
              data-testid="button-confirm-delete-event"
              className="bg-destructive text-destructive-foreground"
              onClick={() => deleteEventMutation.mutate()}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
