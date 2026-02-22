import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, Edit2, X, Upload, Trash2, Pencil } from "lucide-react";
import { format } from "date-fns";
import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useActiveFamily } from "@/contexts/ActiveFamilyContext";
import EventNotesSection from "./EventNotesSection";
import type { UiEvent } from "@shared/types";
import type { User } from "@shared/schema";

interface EventDetailsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onEdit: () => void;
  event: UiEvent;
}

export default function EventDetailsDialog({ isOpen, onClose, onEdit, event }: EventDetailsDialogProps) {
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();
  const { activeFamilyId } = useActiveFamily();

  const { data: currentUser } = useQuery<User>({
    queryKey: ['/api/auth/user'],
  });

  const uploadPhotoMutation = useMutation({
    mutationFn: async (file: File) => {
      // Get upload URL
      const uploadRes = await apiRequest('POST', '/api/objects/upload');
      const { uploadURL } = await uploadRes.json();

      // Upload file to signed URL
      const uploadFileRes = await fetch(uploadURL, {
        method: 'PUT',
        body: file,
        headers: {
          'Content-Type': file.type,
        },
      });

      if (!uploadFileRes.ok) {
        throw new Error('Failed to upload file');
      }

      // Update event with photo URL
      const updateRes = await apiRequest('PUT', `/api/events/${event.id}/photo`, {
        photoURL: uploadURL,
      });
      return await updateRes.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/events?familyId=' + activeFamilyId] });
      toast({
        title: "Photo added",
        description: "Your memory has been saved to this event.",
      });
    },
    onError: () => {
      toast({
        title: "Upload failed",
        description: "Could not upload photo. Please try again.",
        variant: "destructive",
      });
    },
  });

  const deletePhotoMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('PUT', `/api/events/${event.id}/photo`, {
        photoURL: null,
      });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/events?familyId=' + activeFamilyId] });
      toast({
        title: "Photo removed",
        description: "The photo has been removed from this event.",
      });
    },
  });

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid file",
        description: "Please select an image file.",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    try {
      await uploadPhotoMutation.mutateAsync(file);
    } finally {
      setUploading(false);
    }
  };

  const handleDeletePhoto = () => {
    deletePhotoMutation.mutate();
  };

  const memberNames = event.members?.map(m => m.name).join(', ') || '';

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl p-0 border-0 overflow-hidden rounded-3xl bg-card max-h-[90vh] flex flex-col">
        <DialogTitle className="sr-only">Event Details</DialogTitle>
        <DialogDescription className="sr-only">
          View event details, photo memories, date and time, and notes
        </DialogDescription>
        
        <div className="p-6 space-y-6 overflow-y-auto flex-1">
          {/* Header */}
          <div className="flex items-center justify-between">
            <button
              onClick={onEdit}
              className="flex items-center gap-2 px-3 py-2 rounded-xl bg-muted/50 border border-border text-foreground hover:bg-muted transition-all"
              data-testid="button-edit-event"
            >
              <Pencil className="w-4 h-4" />
              <span className="text-sm font-medium">Edit Details</span>
            </button>
            <button
              onClick={onClose}
              className="w-10 h-10 rounded-full bg-muted/50 border border-border flex items-center justify-center text-foreground hover:bg-muted transition-all"
              data-testid="button-close-details"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Event Title Card with Members */}
          <div className="bg-muted/50 backdrop-blur-md border border-border rounded-2xl p-4">
            <div className="flex items-center gap-4">
              <div className="flex -space-x-2">
                {event.members?.slice(0, 3).map((member) => (
                  <Avatar key={member.id} className="h-12 w-12 border-2 border-border">
                    <AvatarFallback
                      className="text-white font-semibold"
                      style={{ backgroundColor: member.color }}
                    >
                      {member.initials}
                    </AvatarFallback>
                  </Avatar>
                ))}
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-foreground">{event.title}</h3>
                <p className="text-sm text-muted-foreground">
                  Assigned to {memberNames}
                </p>
              </div>
            </div>
          </div>

          {/* Photo Section */}
          <div className="bg-muted/50 backdrop-blur-md border border-border rounded-2xl p-4">
            {event.photoUrl ? (
              <div className="relative">
                <img
                  src={event.photoUrl}
                  alt={event.title}
                  className="w-full rounded-lg object-cover max-h-96"
                  data-testid="event-photo"
                  onError={(e) => {
                    console.error('Failed to load image:', event.photoUrl);
                    e.currentTarget.style.display = 'none';
                  }}
                />
                <button
                  onClick={handleDeletePhoto}
                  className="absolute top-2 left-2 w-8 h-8 rounded-full bg-destructive flex items-center justify-center text-destructive-foreground hover-elevate transition-all"
                  data-testid="button-delete-photo"
                  disabled={deletePhotoMutation.isPending}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            ) : (
              <label className="cursor-pointer">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="hidden"
                  data-testid="input-photo-upload"
                  disabled={uploading}
                />
                <div className="flex flex-col items-center justify-center py-12 border-2 border-dashed border-border rounded-lg hover:border-muted-foreground transition-all">
                  <Upload className="w-12 h-12 text-muted-foreground mb-3" />
                  <p className="text-muted-foreground text-sm">
                    {uploading ? 'Uploading...' : 'Click to add a photo memory'}
                  </p>
                </div>
              </label>
            )}
          </div>

          {/* Date and Time Cards */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-muted/50 backdrop-blur-md border border-border rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-2 text-muted-foreground">
                <Calendar className="w-4 h-4" />
                <span className="text-sm font-medium">Date</span>
              </div>
              <p className="text-lg font-bold text-foreground">
                {format(event.startTime, 'MMMM do, yyyy')}
              </p>
            </div>

            <div className="bg-muted/50 backdrop-blur-md border border-border rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-2 text-muted-foreground">
                <Clock className="w-4 h-4" />
                <span className="text-sm font-medium">Time</span>
              </div>
              <p className="text-lg font-bold text-foreground">
                {format(event.startTime, 'h:mm a')} - {format(event.endTime, 'h:mm a')}
              </p>
            </div>
          </div>

          {/* Notes Section */}
          {event.id && activeFamilyId && (
            <EventNotesSection
              eventId={event.id}
              familyId={activeFamilyId}
              currentUserId={currentUser?.id}
            />
          )}

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button
              onClick={onEdit}
              className="flex-1 bg-primary text-primary-foreground border border-border rounded-lg h-12 font-medium"
              data-testid="button-edit-event-bottom"
            >
              Edit Event
            </Button>
            <Button
              onClick={onClose}
              className="flex-1 bg-muted/50 hover:bg-muted text-foreground border border-border rounded-lg h-12 font-medium"
              data-testid="button-close-bottom"
            >
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
