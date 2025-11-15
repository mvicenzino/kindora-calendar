import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Calendar, Clock, User, Trash2 } from "lucide-react";
import { format } from "date-fns";

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
  const [title, setTitle] = useState(event?.title || "");
  const [description, setDescription] = useState(event?.description || "");
  const [memberId, setMemberId] = useState(event?.memberId || members[0]?.id || "");
  const [startDate, setStartDate] = useState(
    event?.startTime ? format(event.startTime, 'yyyy-MM-dd') : format(defaultDate, 'yyyy-MM-dd')
  );
  const [startTime, setStartTime] = useState(
    event?.startTime ? format(event.startTime, 'HH:mm') : '09:00'
  );
  const [endTime, setEndTime] = useState(
    event?.endTime ? format(event.endTime, 'HH:mm') : '10:00'
  );

  const handleSave = () => {
    const startDateTime = new Date(`${startDate}T${startTime}`);
    const endDateTime = new Date(`${startDate}T${endTime}`);

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
      <DialogContent className="sm:max-w-2xl backdrop-blur-3xl bg-card/95 border-2 rounded-3xl shadow-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">
            {event?.id ? 'Edit Event' : 'Create New Event'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="space-y-2">
            <Label htmlFor="title" className="text-sm font-medium">Event Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Team meeting, Soccer practice..."
              data-testid="input-event-title"
              className="backdrop-blur-md bg-background/50 rounded-xl"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description" className="text-sm font-medium">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add event details..."
              data-testid="input-event-description"
              className="backdrop-blur-md bg-background/50 rounded-xl resize-none"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Date
              </Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                data-testid="input-event-date"
                className="backdrop-blur-md bg-background/50 rounded-xl"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium flex items-center gap-2">
                <User className="h-4 w-4" />
                Family Member
              </Label>
              <Select value={memberId} onValueChange={setMemberId}>
                <SelectTrigger 
                  data-testid="select-family-member"
                  className="backdrop-blur-md bg-background/50 rounded-xl"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="backdrop-blur-xl">
                  {members.map(member => (
                    <SelectItem key={member.id} value={member.id}>
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6 ring-1" style={{ '--tw-ring-color': member.color } as React.CSSProperties}>
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

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Start Time
              </Label>
              <Input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                data-testid="input-start-time"
                className="backdrop-blur-md bg-background/50 rounded-xl"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium flex items-center gap-2">
                <Clock className="h-4 w-4" />
                End Time
              </Label>
              <Input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                data-testid="input-end-time"
                className="backdrop-blur-md bg-background/50 rounded-xl"
              />
            </div>
          </div>

          {selectedMember && (
            <div className="p-4 rounded-2xl backdrop-blur-md" style={{ 
              backgroundColor: `${selectedMember.color}10`,
              borderColor: `${selectedMember.color}30`
            }}>
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10 ring-2" style={{ '--tw-ring-color': selectedMember.color } as React.CSSProperties}>
                  <AvatarFallback 
                    className="text-white font-semibold"
                    style={{ backgroundColor: selectedMember.color }}
                  >
                    {selectedMember.name.split(' ').map(n => n[0]).join('')}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <div className="text-sm font-medium">Assigned to {selectedMember.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {format(new Date(`${startDate}T${startTime}`), 'PPP')} at {startTime}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-between gap-3">
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
              className="backdrop-blur-md hover-elevate active-elevate-2"
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

import { useState } from 'react';
