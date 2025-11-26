import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, Edit2, X, Upload, Trash2, RotateCcw } from "lucide-react";
import { format } from "date-fns";
import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useUserRole } from "@/hooks/useUserRole";
import { useActiveFamily } from "@/contexts/ActiveFamilyContext";
import EventNotesSection from "./EventNotesSection";
import type { UiEvent } from "@shared/types";
import type { User } from "@shared/schema";

interface FlipCardEventDetailsProps {
  isOpen: boolean;
  onClose: () => void;
  onEdit: () => void;
  event: UiEvent;
}

export default function FlipCardEventDetails({ isOpen, onClose, onEdit, event }: FlipCardEventDetailsProps) {
  const [isFlipped, setIsFlipped] = useState(false);
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();
  const { isCaregiver, isLoading: roleLoading } = useUserRole();
  const { activeFamilyId } = useActiveFamily();
  const isReadOnly = roleLoading || isCaregiver;

  const { data: currentUser } = useQuery<User>({
    queryKey: ['/api/auth/user'],
  });

  // Defensive wrapper for onEdit to prevent programmatic invocation by caregivers
  const handleEdit = () => {
    if (isReadOnly) return;
    onEdit();
  };

  const uploadPhotoMutation = useMutation({
    mutationFn: async (file: File) => {
      const uploadRes = await apiRequest('POST', '/api/objects/upload');
      const { uploadURL } = await uploadRes.json();

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
    if (isReadOnly) return;
    
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
    if (isReadOnly) return;
    deletePhotoMutation.mutate();
  };

  const handleFlip = () => {
    setIsFlipped(!isFlipped);
  };

  const memberNames = event.members?.map(m => m.name).join(', ') || '';

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 animate-in fade-in duration-200" onClick={onClose}>
      <div 
        className="relative w-full max-w-2xl max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Simple transition between front and back - no 3D transforms */}
        <div className="relative w-full">
          {/* Front Side - Event Summary */}
          <div 
            className={`w-full rounded-3xl overflow-hidden shadow-2xl transition-opacity duration-300 ${isFlipped ? 'opacity-0 pointer-events-none absolute inset-0' : 'opacity-100'}`}
          >
            <div 
              className="relative h-full p-8 flex flex-col justify-between"
              style={{ backgroundColor: event.color }}
            >
              {/* Photo Background (if exists) */}
              {event.photoUrl && (
                <div 
                  className="absolute inset-0 bg-cover bg-center opacity-30"
                  style={{ backgroundImage: `url(${event.photoUrl})` }}
                />
              )}

              <div className="relative z-10">
                {/* Top Row: Flip and Close */}
                <div className="flex justify-between mb-6">
                  <button
                    onClick={handleFlip}
                    className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm border border-white/40 flex items-center justify-center text-white hover:bg-white/30 transition-all"
                    data-testid="button-flip-card"
                  >
                    <RotateCcw className="w-5 h-5" />
                  </button>
                  <button
                    onClick={onClose}
                    className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm border border-white/40 flex items-center justify-center text-white hover:bg-white/30 transition-all"
                    data-testid="button-close-details"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>

                {/* Title */}
                <h2 className="text-4xl font-bold text-white mb-4">{event.title}</h2>

                {/* Time */}
                <div className="flex items-center gap-2 text-white/90 mb-4">
                  <Clock className="w-5 h-5" />
                  <span className="text-lg">
                    {format(event.startTime, 'h:mm a')} - {format(event.endTime, 'h:mm a')}
                  </span>
                </div>

                {/* Date */}
                <div className="flex items-center gap-2 text-white/90 mb-6">
                  <Calendar className="w-5 h-5" />
                  <span className="text-lg">{format(event.startTime, 'EEEE, MMMM d, yyyy')}</span>
                </div>

                {/* Description Preview */}
                {event.description && (
                  <p className="text-white/90 text-lg line-clamp-3 mb-6">{event.description}</p>
                )}
              </div>

              {/* Bottom: Members */}
              <div className="relative z-10">
                <div className="flex items-center gap-3">
                  <div className="flex -space-x-3">
                    {event.members?.slice(0, 4).map((member) => (
                      <Avatar key={member.id} className="h-12 w-12 border-3 border-white">
                        <AvatarFallback
                          className="text-white font-semibold"
                          style={{ backgroundColor: member.color }}
                        >
                          {member.initials}
                        </AvatarFallback>
                      </Avatar>
                    ))}
                  </div>
                  <p className="text-white font-medium">{memberNames}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Back Side - Full Details */}
          <div 
            className={`w-full rounded-3xl shadow-2xl bg-gradient-to-br from-[#3A4A5A] via-[#4A5A6A] to-[#5A6A7A] p-4 md:p-6 space-y-4 md:space-y-6 overflow-y-auto max-h-[90vh] transition-opacity duration-300 ${isFlipped ? 'opacity-100' : 'opacity-0 pointer-events-none absolute inset-0'}`}
          >
              {/* Header */}
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-xl md:text-2xl font-bold text-white">Event Details</h2>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={handleFlip}
                    className="w-10 h-10 rounded-full bg-white/15 border border-white/30 flex items-center justify-center text-white hover:bg-white/20 transition-all flex-shrink-0"
                    data-testid="button-flip-back"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>
                  {!isReadOnly && (
                    <button
                      onClick={handleEdit}
                      className="w-10 h-10 rounded-full bg-white/15 border border-white/30 flex items-center justify-center text-white hover:bg-white/20 transition-all flex-shrink-0"
                      data-testid="button-edit-event"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    onClick={onClose}
                    className="w-10 h-10 rounded-full bg-white/15 border border-white/30 flex items-center justify-center text-white hover:bg-white/20 transition-all flex-shrink-0"
                    data-testid="button-close-back"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Event Title Card with Members */}
              <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-4">
                <div className="flex items-center gap-3">
                  <div className="flex -space-x-2 flex-shrink-0">
                    {event.members?.slice(0, 3).map((member) => (
                      <Avatar key={member.id} className="h-10 w-10 border-2 border-white/40">
                        <AvatarFallback
                          className="text-white font-semibold text-xs"
                          style={{ backgroundColor: member.color }}
                        >
                          {member.initials}
                        </AvatarFallback>
                      </Avatar>
                    ))}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg md:text-xl font-bold text-white mb-1 truncate">{event.title}</h3>
                    <p className="text-xs md:text-sm text-white/70 truncate">
                      {memberNames}
                    </p>
                  </div>
                </div>
              </div>

              {/* Photo Section */}
              {event.photoUrl ? (
                <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-3 overflow-hidden">
                  <div className="relative">
                    <img
                      src={event.photoUrl}
                      alt={event.title}
                      className="w-full rounded-xl object-cover max-h-80"
                      data-testid="event-photo"
                    />
                    {!isReadOnly && (
                      <button
                        onClick={handleDeletePhoto}
                        className="absolute top-3 right-3 w-9 h-9 rounded-full bg-red-500/95 border border-white/40 flex items-center justify-center text-white hover:bg-red-600 transition-all shadow-lg"
                        data-testid="button-delete-photo"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ) : !isReadOnly ? (
                <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-6 text-center">
                  <Upload className="w-10 h-10 text-white/40 mx-auto mb-3" />
                  <p className="text-white/70 mb-4 text-sm">Add a photo to create a memory</p>
                  <label className="cursor-pointer">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileSelect}
                      className="hidden"
                      data-testid="input-photo-upload"
                    />
                    <span className="inline-flex items-center gap-2 px-5 py-2.5 bg-purple-500 text-white rounded-xl hover:bg-purple-600 transition-all font-medium text-sm shadow-lg">
                      <Upload className="w-4 h-4" />
                      {uploading ? 'Uploading...' : 'Upload Photo'}
                    </span>
                  </label>
                </div>
              ) : null}

              {/* Date & Time */}
              <div className="grid grid-cols-2 gap-2 md:gap-3">
                <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-3 md:p-4">
                  <div className="flex items-center gap-2 text-white/60 mb-1 md:mb-2">
                    <Calendar className="w-4 h-4" />
                    <span className="text-xs font-medium uppercase tracking-wide">Date</span>
                  </div>
                  <p className="text-white font-semibold text-sm md:text-base">{format(event.startTime, 'MMM d, yyyy')}</p>
                </div>
                <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-3 md:p-4">
                  <div className="flex items-center gap-2 text-white/60 mb-1 md:mb-2">
                    <Clock className="w-4 h-4" />
                    <span className="text-xs font-medium uppercase tracking-wide">Time</span>
                  </div>
                  <p className="text-white font-semibold text-sm md:text-base">
                    {format(event.startTime, 'h:mm a')} - {format(event.endTime, 'h:mm a')}
                  </p>
                </div>
              </div>

              {/* Description */}
              {event.description && (
                <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-4">
                  <h4 className="text-xs font-medium text-white/60 mb-2 uppercase tracking-wide">Description</h4>
                  <p className="text-white/95 leading-relaxed text-sm md:text-base">{event.description}</p>
                </div>
              )}

              {/* Notes Section */}
              {event.id && activeFamilyId && (
                <EventNotesSection
                  eventId={event.id}
                  familyId={activeFamilyId}
                  currentUserId={currentUser?.id}
                />
              )}

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-2 md:gap-3 pt-2">
                {!isReadOnly && (
                  <Button
                    onClick={handleEdit}
                    className="flex-1 bg-purple-500 hover:bg-purple-600 text-white shadow-lg"
                    data-testid="button-edit-bottom"
                  >
                    <Edit2 className="w-4 h-4 mr-2" />
                    Edit Event
                  </Button>
                )}
                <Button
                  onClick={onClose}
                  variant="outline"
                  className={`${!isReadOnly ? 'flex-1' : 'w-full'} border-white/40 text-white hover:bg-white/10 bg-white/5`}
                  data-testid="button-close-bottom"
                >
                  Close
                </Button>
              </div>
          </div>
        </div>
      </div>
    </div>
  );
}
