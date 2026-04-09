import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Clock, Edit3, X, Upload, Trash2, CalendarDays, MapPin, Users, Tag, ChevronRight, Video, ExternalLink } from "lucide-react";
import { format } from "date-fns";
import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useActiveFamily } from "@/contexts/ActiveFamilyContext";
import EventNotesSection from "./EventNotesSection";
import { CATEGORY_CONFIG, type EventCategory } from "@shared/schema";
import type { UiEvent } from "@shared/types";
import type { User } from "@shared/schema";
import { AddressText } from "./AddressText";

// Extract a Zoom / Meet / Teams join URL from an event description
function extractMeetingLink(description?: string | null): { url: string; label: string; color: string } | null {
  if (!description) return null;
  const urlRegex = /https?:\/\/[^\s,)>]+/g;
  const matches = description.match(urlRegex) ?? [];
  for (const url of matches) {
    if (url.includes("zoom.us/j/") || url.includes("zoom.us/w/") || url.includes("zoom.us/s/")) {
      return { url, label: "Join Zoom Meeting", color: "#2D8CFF" };
    }
    if (url.includes("meet.google.com/")) {
      return { url, label: "Join Google Meet", color: "#00832D" };
    }
    if (url.includes("teams.microsoft.com/") || url.includes("teams.live.com/")) {
      return { url, label: "Join Teams Meeting", color: "#6264A7" };
    }
  }
  return null;
}

interface EventDetailsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onEdit?: () => void;
  onDelete?: (eventId: string) => void;
  event: UiEvent;
}

export default function EventDetailsDialog({ isOpen, onClose, onEdit, onDelete, event }: EventDetailsDialogProps) {
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();
  const { activeFamilyId } = useActiveFamily();

  const { data: currentUser } = useQuery<User>({
    queryKey: ['/api/auth/user'],
  });

  const categoryConfig = CATEGORY_CONFIG[(event.category as EventCategory) || 'other'];
  const eventColor = categoryConfig?.color || '#64748B';

  const uploadPhotoMutation = useMutation({
    mutationFn: async (file: File) => {
      const uploadRes = await apiRequest('POST', '/api/objects/upload');
      const { uploadURL } = await uploadRes.json();
      const uploadFileRes = await fetch(uploadURL, {
        method: 'PUT',
        body: file,
        headers: { 'Content-Type': file.type },
      });
      if (!uploadFileRes.ok) throw new Error('Failed to upload file');
      const updateRes = await apiRequest('PUT', `/api/events/${event.id}/photo`, { photoURL: uploadURL });
      return await updateRes.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/events?familyId=' + activeFamilyId] });
      toast({ title: "Photo added", description: "Your memory has been saved to this event." });
    },
    onError: () => {
      toast({ title: "Upload failed", description: "Could not upload photo. Please try again.", variant: "destructive" });
    },
  });

  const deletePhotoMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('PUT', `/api/events/${event.id}/photo`, { photoURL: null });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/events?familyId=' + activeFamilyId] });
      toast({ title: "Photo removed", description: "The photo has been removed from this event." });
    },
  });

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast({ title: "Invalid file", description: "Please select an image file.", variant: "destructive" });
      return;
    }
    setUploading(true);
    try {
      await uploadPhotoMutation.mutateAsync(file);
    } finally {
      setUploading(false);
    }
  };

  const isMultiDay = format(event.startTime, 'yyyy-MM-dd') !== format(event.endTime, 'yyyy-MM-dd');
  const isSameAmPm = format(event.startTime, 'a') === format(event.endTime, 'a');

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        className="w-[calc(100vw-1.5rem)] max-w-[calc(100vw-1.5rem)] sm:max-w-md p-0 border-0 overflow-hidden rounded-2xl max-h-[85vh] flex flex-col gap-0"
        style={{
          background: 'transparent',
          boxShadow: `0 0 0 1px rgba(255,255,255,0.06), 0 25px 60px -12px rgba(0,0,0,0.5), 0 0 40px -8px ${eventColor}15`,
        }}
      >
        <DialogTitle className="sr-only">Event Details</DialogTitle>
        <DialogDescription className="sr-only">View and manage event details</DialogDescription>

        {/* Color accent header bar */}
        <div
          className="relative px-4 pt-3.5 pb-3"
          style={{
            background: `linear-gradient(135deg, ${eventColor}18, ${eventColor}08)`,
            borderBottom: `1px solid ${eventColor}20`,
          }}
        >
          <div
            className="absolute inset-0 backdrop-blur-2xl"
            style={{ background: 'hsl(var(--card) / 0.85)' }}
          />
          <div className="relative flex items-center justify-between gap-3">
            {onEdit && <button
              onClick={onEdit}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all"
              style={{
                background: `${eventColor}18`,
                color: eventColor,
                border: `1px solid ${eventColor}25`,
              }}
              data-testid="button-edit-event"
            >
              <Edit3 className="w-3 h-3" />
              Edit
            </button>}

            <div className="flex items-center gap-2">
              <div
                className="flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] font-semibold uppercase tracking-wider"
                style={{ color: eventColor, background: `${eventColor}12` }}
              >
                <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: eventColor }} />
                {categoryConfig?.label || 'Event'}
              </div>
              <button
                onClick={onClose}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                style={{ background: 'hsl(var(--muted) / 0.4)' }}
                data-testid="button-close-details"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Main content */}
        <div
          className="flex-1 overflow-y-auto"
          style={{ background: 'hsl(var(--card) / 0.92)', backdropFilter: 'blur(40px)' }}
        >
          {/* Title section */}
          <div className="px-4 pt-4 pb-3">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base font-bold text-foreground leading-snug">{event.title}</h3>
              {event.googleEventId && (
                <span
                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-white font-semibold"
                  style={{ background: '#4285f4', fontSize: '9px', letterSpacing: '0.02em' }}
                  title="Synced from Google Calendar"
                >
                  <span>G</span>
                  <span>Google</span>
                </span>
              )}
            </div>
            {event.description && (
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed whitespace-pre-line">
                <AddressText text={event.description} />
              </p>
            )}
          </div>

          {/* Info grid */}
          <div className="px-4 pb-3">
            <div
              className="rounded-xl overflow-hidden"
              style={{
                background: 'hsl(var(--muted) / 0.3)',
                border: '1px solid hsl(var(--border) / 0.5)',
              }}
            >
              {/* Meeting link row (Zoom / Meet / Teams) */}
              {(() => {
                const meeting = extractMeetingLink(event.description);
                if (!meeting) return null;
                return (
                  <a
                    href={meeting.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 px-3 py-2.5 hover-elevate"
                    style={{ borderBottom: '1px solid hsl(var(--border) / 0.3)', textDecoration: 'none' }}
                    data-testid="link-meeting-join"
                  >
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${meeting.color}20` }}>
                      <Video className="w-3.5 h-3.5" style={{ color: meeting.color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] uppercase tracking-wider font-medium" style={{ color: meeting.color }}>Video Meeting</p>
                      <p className="text-sm font-semibold" style={{ color: meeting.color }}>{meeting.label}</p>
                    </div>
                    <ExternalLink className="w-3.5 h-3.5 flex-shrink-0" style={{ color: meeting.color }} />
                  </a>
                );
              })()}
              {/* Date row */}
              <div className="flex items-center gap-3 px-3 py-2.5" style={{ borderBottom: '1px solid hsl(var(--border) / 0.3)' }}>
                <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${eventColor}15` }}>
                  <CalendarDays className="w-3.5 h-3.5" style={{ color: eventColor }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Date</p>
                  <p className="text-sm font-semibold text-foreground">
                    {format(event.startTime, 'EEE, MMM d, yyyy')}
                  </p>
                </div>
              </div>

              {/* Time row */}
              <div className="flex items-center gap-3 px-3 py-2.5" style={{ borderBottom: '1px solid hsl(var(--border) / 0.3)' }}>
                <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${eventColor}15` }}>
                  <Clock className="w-3.5 h-3.5" style={{ color: eventColor }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Time</p>
                  <p className="text-sm font-semibold text-foreground">
                    {isSameAmPm
                      ? `${format(event.startTime, 'h:mm')} - ${format(event.endTime, 'h:mm a')}`
                      : `${format(event.startTime, 'h:mm a')} - ${format(event.endTime, 'h:mm a')}`
                    }
                  </p>
                </div>
              </div>

              {/* Members row */}
              {event.members && event.members.length > 0 && (
                <div className="flex items-center gap-3 px-3 py-2.5">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${eventColor}15` }}>
                    <Users className="w-3.5 h-3.5" style={{ color: eventColor }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">With</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <div className="flex -space-x-1.5">
                        {event.members.slice(0, 4).map((member) => (
                          <Avatar key={member.id} className="h-5 w-5 border border-card">
                            <AvatarFallback
                              className="text-[9px] text-white font-bold"
                              style={{ backgroundColor: member.color }}
                            >
                              {member.initials?.[0] || member.name?.[0]}
                            </AvatarFallback>
                          </Avatar>
                        ))}
                      </div>
                      <span className="text-xs text-foreground font-medium truncate">
                        {event.members.map(m => m.name).join(', ')}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Photo section */}
          <div className="px-4 pb-3">
            {event.photoUrl ? (
              <div className="relative rounded-xl overflow-hidden" style={{ border: '1px solid hsl(var(--border) / 0.5)' }}>
                <img
                  src={event.photoUrl}
                  alt={event.title}
                  className="w-full object-cover max-h-48"
                  data-testid="event-photo"
                  onError={(e) => { e.currentTarget.style.display = 'none'; }}
                />
                <button
                  onClick={() => deletePhotoMutation.mutate()}
                  className="absolute top-2 right-2 w-6 h-6 rounded-md bg-black/50 backdrop-blur-sm flex items-center justify-center text-white/80 hover:text-white transition-colors"
                  data-testid="button-delete-photo"
                  disabled={deletePhotoMutation.isPending}
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ) : (
              <label className="cursor-pointer block">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="hidden"
                  data-testid="input-photo-upload"
                  disabled={uploading}
                />
                <div
                  className="flex items-center gap-3 px-3 py-3 rounded-xl transition-all"
                  style={{
                    background: 'hsl(var(--muted) / 0.25)',
                    border: '1px dashed hsl(var(--border) / 0.6)',
                  }}
                >
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${eventColor}12` }}>
                    <Upload className="w-3.5 h-3.5" style={{ color: eventColor }} />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-foreground">
                      {uploading ? 'Uploading...' : 'Add a photo memory'}
                    </p>
                    <p className="text-[10px] text-muted-foreground">Tap to capture this moment</p>
                  </div>
                </div>
              </label>
            )}
          </div>

          {/* Notes Section */}
          {event.id && activeFamilyId && (
            <div className="px-4 pb-3">
              <EventNotesSection
                eventId={event.id}
                familyId={activeFamilyId}
                currentUserId={currentUser?.id}
              />
            </div>
          )}
        </div>

        {/* Bottom action bar */}
        <div
          className="px-4 py-3 flex gap-2"
          style={{
            background: 'hsl(var(--card) / 0.95)',
            borderTop: '1px solid hsl(var(--border) / 0.4)',
            backdropFilter: 'blur(20px)',
          }}
        >
          {onEdit && <Button
            onClick={onEdit}
            className="flex-1 h-9 rounded-lg text-xs font-semibold"
            style={{
              background: eventColor,
              color: '#fff',
              border: `1px solid ${eventColor}`,
            }}
            data-testid="button-edit-event-bottom"
          >
            <Edit3 className="w-3 h-3 mr-1.5" />
            Edit Event
          </Button>}
          {onDelete && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="ghost"
                  className="h-9 rounded-lg text-xs font-semibold text-destructive hover:text-destructive"
                  data-testid="button-delete-event-details"
                >
                  <Trash2 className="w-3 h-3 mr-1.5" />
                  Delete
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Event</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to delete "{event.title}"? This cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel data-testid="button-delete-cancel">Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => { onDelete(event.id); onClose(); }}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    data-testid="button-delete-confirm"
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
          <Button
            variant="ghost"
            onClick={onClose}
            className="h-9 rounded-lg text-xs font-semibold"
            data-testid="button-close-bottom"
          >
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
