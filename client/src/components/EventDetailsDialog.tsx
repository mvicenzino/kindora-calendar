import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, Edit2, X, Upload, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useActiveFamily } from "@/contexts/ActiveFamilyContext";
import type { UiEvent } from "@shared/types";

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
      <DialogContent className="sm:max-w-2xl p-0 border-0 overflow-hidden rounded-3xl bg-gradient-to-br from-[#3A4A5A] via-[#4A5A6A] to-[#5A6A7A]">
        <DialogTitle className="sr-only">Event Details</DialogTitle>
        <DialogDescription className="sr-only">
          View event details, photo memories, date and time
        </DialogDescription>
        
        <div className="p-6 space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-white">Event Details</h2>
            <div className="flex gap-2">
              <button
                onClick={onEdit}
                className="w-10 h-10 rounded-full bg-white/15 border border-white/30 flex items-center justify-center text-white hover:bg-white/20 transition-all"
                data-testid="button-edit-event"
              >
                <Edit2 className="w-5 h-5" />
              </button>
              <button
                onClick={onClose}
                className="w-10 h-10 rounded-full bg-white/15 border border-white/30 flex items-center justify-center text-white hover:bg-white/20 transition-all"
                data-testid="button-close-details"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Event Title Card with Members */}
          <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-4">
            <div className="flex items-center gap-4">
              <div className="flex -space-x-2">
                {event.members?.slice(0, 3).map((member) => (
                  <Avatar key={member.id} className="h-12 w-12 border-2 border-white/30">
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
                <h3 className="text-xl font-bold text-white">{event.title}</h3>
                <p className="text-sm text-white/70">
                  Assigned to {memberNames}
                </p>
              </div>
            </div>
          </div>

          {/* Photo Section */}
          <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-4">
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
                  className="absolute top-2 left-2 w-8 h-8 rounded-full bg-red-600 flex items-center justify-center text-white hover:bg-red-700 transition-all"
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
                <div className="flex flex-col items-center justify-center py-12 border-2 border-dashed border-white/30 rounded-lg hover:border-white/50 transition-all">
                  <Upload className="w-12 h-12 text-white/50 mb-3" />
                  <p className="text-white/70 text-sm">
                    {uploading ? 'Uploading...' : 'Click to add a photo memory'}
                  </p>
                </div>
              </label>
            )}
          </div>

          {/* Date and Time Cards */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-2 text-white/70">
                <Calendar className="w-4 h-4" />
                <span className="text-sm font-medium">Date</span>
              </div>
              <p className="text-lg font-bold text-white">
                {format(event.startTime, 'MMMM do, yyyy')}
              </p>
            </div>

            <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-2 text-white/70">
                <Clock className="w-4 h-4" />
                <span className="text-sm font-medium">Time</span>
              </div>
              <p className="text-lg font-bold text-white">
                {format(event.startTime, 'h:mm a')} - {format(event.endTime, 'h:mm a')}
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button
              onClick={onEdit}
              className="flex-1 bg-purple-600 hover:bg-purple-700 text-white border border-white/30 rounded-lg h-12 font-medium"
              data-testid="button-edit-event-bottom"
            >
              Edit Event
            </Button>
            <Button
              onClick={onClose}
              className="flex-1 bg-white/15 hover:bg-white/20 text-white border border-white/30 rounded-lg h-12 font-medium"
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
