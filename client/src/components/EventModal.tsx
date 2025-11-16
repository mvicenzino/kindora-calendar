import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import { Calendar, Clock, User, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { useState, useEffect } from 'react';

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
  memberId: string;
}

interface EventModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (event: Event) => void;
  onDelete?: (eventId: string) => void;
  event?: Event;
  members: FamilyMember[];
  selectedDate?: Date;
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
}: EventModalProps) {
  const defaultDate = selectedDate || new Date();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [memberId, setMemberId] = useState("");
  const [startDate, setStartDate] = useState(format(defaultDate, 'yyyy-MM-dd'));
  const [startTime, setStartTime] = useState(() => getCurrentTimeRounded());
  const [endTime, setEndTime] = useState(() => addHoursToTime(getCurrentTimeRounded(), 1));
  const [isSometimeToday, setIsSometimeToday] = useState(false);

  // Update form state when event prop changes
  useEffect(() => {
    if (event) {
      setTitle(event.title || "");
      setDescription(event.description || "");
      setMemberId(event.memberId || members[0]?.id || "");
      setStartDate(format(event.startTime, 'yyyy-MM-dd'));
      setStartTime(format(event.startTime, 'HH:mm'));
      setEndTime(format(event.endTime, 'HH:mm'));
      setIsSometimeToday(false);
    } else {
      // Reset form for new event
      setTitle("");
      setDescription("");
      setMemberId(members[0]?.id || "");
      setStartDate(selectedDate ? format(selectedDate, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'));
      const currentTime = getCurrentTimeRounded();
      setStartTime(currentTime);
      setEndTime(addHoursToTime(currentTime, 1));
      setIsSometimeToday(false);
    }
  }, [event, members, selectedDate]);

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
      memberId,
    });
    onClose();
  };

  const selectedMember = members.find(m => m.id === memberId);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl backdrop-blur-3xl bg-gradient-to-br from-slate-800/95 via-slate-700/95 to-slate-800/95 border-2 border-white/20 rounded-3xl shadow-2xl">
        <DialogHeader className="pb-4 border-b border-white/10">
          <DialogTitle className="text-2xl font-bold text-white">
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

          <div className="grid grid-cols-2 gap-3">
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
                <User className="h-4 w-4" />
                Family Member
              </Label>
              <Select value={memberId} onValueChange={setMemberId}>
                <SelectTrigger 
                  data-testid="select-family-member"
                  className="backdrop-blur-md bg-white/10 border-white/20 rounded-xl text-white"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="backdrop-blur-xl bg-slate-800/95 border-white/20">
                  {members.map(member => (
                    <SelectItem key={member.id} value={member.id} className="text-white">
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6 ring-1 ring-white/30">
                          <AvatarFallback 
                            className="text-xs text-white"
                            style={{ backgroundColor: member.color }}
                          >
                            {member.name.split(' ').map(n => n[0]).join('')}
                          </AvatarFallback>
                        </Avatar>
                        {member.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
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

          {selectedMember && startDate && (
            <div className="p-4 rounded-2xl backdrop-blur-md bg-white/10 border border-white/20">
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10 ring-2 ring-white/30">
                  <AvatarFallback 
                    className="text-white font-semibold"
                    style={{ backgroundColor: selectedMember.color }}
                  >
                    {selectedMember.name.split(' ').map(n => n[0]).join('')}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <div className="text-sm font-medium text-white">Assigned to {selectedMember.name}</div>
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
              disabled={!title || !memberId}
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

