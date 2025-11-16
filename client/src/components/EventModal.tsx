import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar, Clock, Users, Trash2, UserPlus, Image as ImageIcon, X } from "lucide-react";
import { format } from "date-fns";
import { useState, useEffect } from 'react';
import { ObjectUploader } from "./ObjectUploader";
import type { UploadResult } from "@uppy/core";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface FamilyMember {
  id: string;
  name: string;
  color: string;
}

interface Event {
  id?: string;
  title: string;
  description?: string;
  startTime: Date;
  endTime: Date;
  memberIds: string[];
  photoUrl?: string;
}

interface EventModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (event: Event) => void;
  onDelete?: (eventId: string) => void;
  event?: Event;
  members: FamilyMember[];
  selectedDate?: Date;
  onAddMember?: () => void;
}

// Helper function to get current time rounded to nearest 15 minutes
const getCurrentTimeRounded = () => {
  const now = new Date();
  const minutes = now.getMinutes();
  const roundedMinutes = Math.round(minutes / 15) * 15;
  now.setMinutes(roundedMinutes);
  now.setSeconds(0);
  now.setMilliseconds(0);
  return format(now, 'HH:mm');
};

// Helper function to add hours to a time string
const addHoursToTime = (timeStr: string, hours: number) => {
  const [h, m] = timeStr.split(':').map(Number);
  const date = new Date();
  date.setHours(h + hours, m, 0, 0);
  return format(date, 'HH:mm');
};

export default function EventModal({
  isOpen,
  onClose,
  onSave,
  onDelete,
  event,
  members,
  selectedDate,
  onAddMember,
}: EventModalProps) {
  const defaultDate = selectedDate || new Date();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [memberIds, setMemberIds] = useState<string[]>([]);
  const [startDate, setStartDate] = useState(format(defaultDate, 'yyyy-MM-dd'));
  const [startTime, setStartTime] = useState(() => getCurrentTimeRounded());
  const [endTime, setEndTime] = useState(() => addHoursToTime(getCurrentTimeRounded(), 1));
  const [isSometimeToday, setIsSometimeToday] = useState(false);
  const [photoUrl, setPhotoUrl] = useState<string>("");
  const [uploadedEventId, setUploadedEventId] = useState<string>("");
  const { toast } = useToast();

  const attachPhotoMutation = useMutation({
    mutationFn: async ({ eventId, photoUrl }: { eventId: string; photoUrl: string }) => {
      const res = await apiRequest('PUT', '/api/event-photos', { eventId, photoUrl });
      return await res.json();
    },
    onSuccess: () => {
      toast({
        description: "Photo added to event!",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to attach photo. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Update form state when event prop changes
  useEffect(() => {
    if (event) {
      setTitle(event.title || "");
      setDescription(event.description || "");
      setMemberIds(event.memberIds || (members[0] ? [members[0].id] : []));
      setStartDate(format(event.startTime, 'yyyy-MM-dd'));
      setStartTime(format(event.startTime, 'HH:mm'));
      setEndTime(format(event.endTime, 'HH:mm'));
      setIsSometimeToday(false);
      setPhotoUrl(event.photoUrl || "");
      setUploadedEventId(event.id || "");
    } else {
      // Reset form for new event
      setTitle("");
      setDescription("");
      setMemberIds(members[0] ? [members[0].id] : []);
      setStartDate(selectedDate ? format(selectedDate, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'));
      const currentTime = getCurrentTimeRounded();
      setStartTime(currentTime);
      setEndTime(addHoursToTime(currentTime, 1));
      setIsSometimeToday(false);
      setPhotoUrl("");
      setUploadedEventId("");
    }
  }, [event, members, selectedDate]);

  const handleMemberToggle = (memberId: string) => {
    setMemberIds(prev => 
      prev.includes(memberId)
        ? prev.filter(id => id !== memberId)
        : [...prev, memberId]
    );
  };

  const handleSave = () => {
    // If "Sometime Today", use end of day times
    const actualStartTime = isSometimeToday ? '23:58' : startTime;
    const actualEndTime = isSometimeToday ? '23:59' : endTime;
    
    const startDateTime = new Date(`${startDate}T${actualStartTime}`);
    const endDateTime = new Date(`${startDate}T${actualEndTime}`);

    onSave({
      ...(event?.id && { id: event.id }),
      title,
      description,
      startTime: startDateTime,
      endTime: endDateTime,
      memberIds,
      ...(photoUrl && { photoUrl }),
    });
    onClose();
  };

  const handleGetUploadParameters = async () => {
    const res = await apiRequest('POST', '/api/objects/upload', {});
    const data = await res.json();
    return {
      method: 'PUT' as const,
      url: data.uploadURL,
    };
  };

  const handleUploadComplete = (result: UploadResult<Record<string, unknown>, Record<string, unknown>>) => {
    if (result.successful && result.successful.length > 0) {
      const uploadURL = result.successful[0].uploadURL;
      if (uploadURL) {
        setPhotoUrl(uploadURL);
        
        if (uploadedEventId) {
          attachPhotoMutation.mutate({ eventId: uploadedEventId, photoUrl: uploadURL });
        }
      }
    }
  };

  const handleRemovePhoto = () => {
    setPhotoUrl("");
  };

  const selectedMembers = members.filter(m => memberIds.includes(m.id));

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl backdrop-blur-3xl bg-gradient-to-br from-slate-800/95 via-slate-700/95 to-slate-800/95 border-2 border-white/20 rounded-3xl shadow-2xl">
        <DialogHeader className="pb-4 border-b border-white/10 relative">
          <DialogTitle className="text-2xl font-bold text-white pr-10">
            {event?.id ? 'Edit Event' : 'Create New Event'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-4">
          <div className="space-y-2">
            <Label htmlFor="title" className="text-sm font-medium text-white/80">Event Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Team meeting, Soccer practice..."
              data-testid="input-event-title"
              className="backdrop-blur-md bg-white/10 border-white/20 rounded-xl text-white placeholder:text-white/50"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description" className="text-sm font-medium text-white/80">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add event details..."
              data-testid="input-event-description"
              className="backdrop-blur-md bg-white/10 border-white/20 rounded-xl resize-none text-white placeholder:text-white/50"
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium flex items-center gap-2 text-white/80">
              <ImageIcon className="h-4 w-4" />
              Event Photo (Optional)
            </Label>
            {photoUrl ? (
              <div className="relative rounded-xl overflow-hidden backdrop-blur-md bg-white/10 border border-white/20">
                <img 
                  src={photoUrl} 
                  alt="Event" 
                  className="w-full h-48 object-cover"
                  data-testid="img-event-photo-preview"
                />
                <Button
                  type="button"
                  size="icon"
                  variant="destructive"
                  onClick={handleRemovePhoto}
                  className="absolute top-2 right-2 hover-elevate active-elevate-2"
                  data-testid="button-remove-photo"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <ObjectUploader
                maxNumberOfFiles={1}
                maxFileSize={10485760}
                onGetUploadParameters={handleGetUploadParameters}
                onComplete={handleUploadComplete}
                buttonClassName="w-full backdrop-blur-md bg-white/10 border border-white/20 hover-elevate active-elevate-2"
              >
                <div className="flex items-center justify-center gap-2">
                  <ImageIcon className="h-5 w-5" />
                  <span>Add Photo</span>
                </div>
              </ObjectUploader>
            )}
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium flex items-center gap-2 text-white/80">
              <Calendar className="h-4 w-4" />
              Date
            </Label>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              data-testid="input-event-date"
              className="backdrop-blur-md bg-white/10 border-white/20 rounded-xl text-white"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium flex items-center gap-2 text-white/80">
              <Users className="h-4 w-4" />
              Family Members
            </Label>
            {members.length === 0 ? (
              <div className="p-6 rounded-xl backdrop-blur-md bg-white/10 border border-white/20 text-center space-y-3">
                <div className="flex justify-center">
                  <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
                    <UserPlus className="w-6 h-6 text-white/70" />
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-white">No family members yet</p>
                  <p className="text-xs text-white/60">Add family members to assign events</p>
                </div>
                {onAddMember && (
                  <Button
                    type="button"
                    onClick={() => {
                      onClose();
                      onAddMember();
                    }}
                    data-testid="button-add-member-from-event"
                    className="w-full hover-elevate active-elevate-2"
                  >
                    <UserPlus className="w-4 h-4 mr-2" />
                    Add Family Member
                  </Button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {members.map(member => (
                  <div
                    key={member.id}
                    className="flex items-center gap-3 p-3 rounded-xl backdrop-blur-md bg-white/10 border border-white/20 hover-elevate cursor-pointer"
                    onClick={() => handleMemberToggle(member.id)}
                    data-testid={`checkbox-member-${member.id}`}
                  >
                    <Checkbox
                      checked={memberIds.includes(member.id)}
                      onCheckedChange={() => handleMemberToggle(member.id)}
                      className="border-white/30"
                    />
                    <Avatar className="h-7 w-7 ring-1 ring-white/30">
                      <AvatarFallback 
                        className="text-xs text-white font-medium"
                        style={{ backgroundColor: member.color }}
                      >
                        {member.name.split(' ').map(n => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm text-white font-medium">{member.name}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center justify-between p-4 rounded-xl backdrop-blur-md bg-white/10 border border-white/20">
            <div className="space-y-0.5">
              <Label htmlFor="sometime-today" className="text-sm font-medium cursor-pointer text-white">
                Sometime Today
              </Label>
              <p className="text-xs text-white/60">No specific time needed</p>
            </div>
            <Switch
              id="sometime-today"
              checked={isSometimeToday}
              onCheckedChange={setIsSometimeToday}
              data-testid="switch-sometime-today"
            />
          </div>

          {!isSometimeToday && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-sm font-medium flex items-center gap-2 text-white/80">
                  <Clock className="h-4 w-4" />
                  Start Time
                </Label>
                <Input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  data-testid="input-start-time"
                  className="backdrop-blur-md bg-white/10 border-white/20 rounded-xl text-white"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium flex items-center gap-2 text-white/80">
                  <Clock className="h-4 w-4" />
                  End Time
                </Label>
                <Input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  data-testid="input-end-time"
                  className="backdrop-blur-md bg-white/10 border-white/20 rounded-xl text-white"
                />
              </div>
            </div>
          )}

          {selectedMembers.length > 0 && startDate && (
            <div className="p-4 rounded-2xl backdrop-blur-md bg-white/10 border border-white/20">
              <div className="flex items-center gap-3">
                <div className="flex -space-x-2">
                  {selectedMembers.map(member => (
                    <Avatar key={member.id} className="h-10 w-10 ring-2 ring-white/30">
                      <AvatarFallback 
                        className="text-white font-semibold"
                        style={{ backgroundColor: member.color }}
                      >
                        {member.name.split(' ').map(n => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>
                  ))}
                </div>
                <div>
                  <div className="text-sm font-medium text-white">
                    Assigned to {selectedMembers.map(m => m.name).join(', ')}
                  </div>
                  <div className="text-xs text-white/60">
                    {(() => {
                      if (isSometimeToday) {
                        const eventDate = new Date(`${startDate}T09:00`);
                        return `${format(eventDate, 'PPP')} - Sometime today`;
                      }
                      if (startTime) {
                        const eventDate = new Date(`${startDate}T${startTime}`);
                        return !isNaN(eventDate.getTime()) ? `${format(eventDate, 'PPP')} at ${startTime}` : 'Select date and time';
                      }
                      return 'Select date and time';
                    })()}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-between gap-3 pt-4 border-t border-white/10">
          {event?.id && onDelete && (
            <Button
              variant="destructive"
              onClick={() => {
                onDelete(event.id!);
                onClose();
              }}
              data-testid="button-delete-event"
              className="hover-elevate active-elevate-2"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
          )}
          
          <div className="flex gap-3 ml-auto">
            <Button
              variant="outline"
              onClick={onClose}
              data-testid="button-cancel"
              className="backdrop-blur-md border-white/30 text-white hover:text-white hover-elevate active-elevate-2"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={!title || memberIds.length === 0}
              data-testid="button-save-event"
              className="hover-elevate active-elevate-2"
            >
              {event?.id ? 'Update Event' : 'Create Event'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

