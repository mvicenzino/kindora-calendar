import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import { Calendar, Clock, Users, Trash2, X } from "lucide-react";
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
  const [startTime, setStartTime] = useState('08:00');
  const [endTime, setEndTime] = useState('09:00');
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
      setStartTime('08:00');
      setEndTime('09:00');
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
  const displayDate = format(new Date(`${startDate}T12:00`), 'MMM d, yyyy');

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl p-0 border-0 overflow-hidden rounded-3xl">
        {/* Dark background container */}
        <div className="bg-gradient-to-br from-[#4A5A6A] via-[#5A6A7A] to-[#6A7A8A] p-8 space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-white">
              {event?.id ? 'Edit Event' : 'Create New Event'}
            </h2>
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-full border border-white/50 flex items-center justify-center text-white hover:bg-white/10 transition-all"
              data-testid="button-close-modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Divider */}
          <div className="h-px bg-white/20" />

          {/* Form content */}
          <div className="space-y-5">
            {/* Event Title */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-white">Event Title</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Team meeting, Soccer practice..."
                data-testid="input-event-title"
                className="bg-white/15 border border-white/40 rounded-2xl text-white placeholder:text-white/50 focus:border-purple-400 focus:ring-purple-400/50 h-12"
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-white">Description</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Add event details..."
                data-testid="input-event-description"
                className="bg-white/15 border border-white/40 rounded-2xl text-white placeholder:text-white/50 focus:border-purple-400 focus:ring-purple-400/50 resize-none"
                rows={3}
              />
            </div>

            {/* Date and Family Members */}
            <div className="grid grid-cols-2 gap-4">
              {/* Date */}
              <div className="space-y-2">
                <Label className="text-sm font-medium text-white flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Date
                </Label>
                <button
                  onClick={() => {
                    const input = document.createElement('input');
                    input.type = 'date';
                    input.value = startDate;
                    input.onchange = (e: any) => setStartDate(e.target.value);
                    input.click();
                  }}
                  className="w-full bg-white/15 border border-white/40 rounded-2xl text-white px-4 py-3 text-center hover:bg-white/20 transition-all cursor-pointer"
                  data-testid="button-event-date"
                >
                  {displayDate}
                </button>
              </div>

              {/* Family Members */}
              <div className="space-y-2">
                <Label className="text-sm font-medium text-white flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Family Members
                </Label>
                <Select value={memberId} onValueChange={setMemberId}>
                  <SelectTrigger 
                    data-testid="select-family-member"
                    className="bg-white/15 border border-white/40 rounded-2xl text-white focus:border-purple-400 focus:ring-purple-400/50 h-12"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-gradient-to-br from-[#4A5A6A] to-[#5A6A7A] border-white/20">
                    {members.map(member => (
                      <SelectItem key={member.id} value={member.id} className="text-white">
                        <div className="flex items-center gap-2">
                          <Avatar className="h-6 w-6">
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

            {/* Sometime Today Toggle */}
            <div className="flex items-center justify-between bg-white/15 border border-white/40 rounded-2xl p-4">
              <div>
                <Label className="text-sm font-medium text-white cursor-pointer block">
                  Sometime Today
                </Label>
                <p className="text-xs text-white/70">No specific time needed</p>
              </div>
              <Switch
                checked={isSometimeToday}
                onCheckedChange={setIsSometimeToday}
                data-testid="switch-sometime-today"
              />
            </div>

            {/* Start and End Times */}
            {!isSometimeToday && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-white flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    Start Time
                  </Label>
                  <Input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    data-testid="input-start-time"
                    className="bg-white/15 border border-white/40 rounded-2xl text-white focus:border-purple-400 focus:ring-purple-400/50 h-12 text-center"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium text-white flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    End Time
                  </Label>
                  <Input
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    data-testid="input-end-time"
                    className="bg-white/15 border border-white/40 rounded-2xl text-white focus:border-purple-400 focus:ring-purple-400/50 h-12 text-center"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Divider */}
          <div className="h-px bg-white/20" />

          {/* Action Buttons */}
          <div className="flex items-center justify-between gap-3">
            {event?.id && onDelete && (
              <Button
                variant="destructive"
                onClick={() => {
                  onDelete(event.id!);
                  onClose();
                }}
                data-testid="button-delete-event"
                className="bg-red-600 hover:bg-red-700 text-white border border-white/50 rounded-lg"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </Button>
            )}
            
            <div className="flex gap-3 ml-auto">
              <Button
                variant="ghost"
                onClick={onClose}
                data-testid="button-cancel"
                className="text-white border border-white/50 rounded-lg hover:bg-white/10"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={!title || !memberId}
                data-testid="button-save-event"
                className="bg-purple-600 hover:bg-purple-700 text-white border border-white/50 rounded-lg disabled:opacity-50"
              >
                {event?.id ? 'Update Event' : 'Create Event'}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
