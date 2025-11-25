import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import { Calendar, Clock, Users, Trash2, X } from "lucide-react";
import { format } from "date-fns";
import { useState, useEffect, useRef } from 'react';
import type { UiFamilyMember } from "@shared/types";

interface Event {
  id?: string;
  title: string;
  description?: string;
  startTime: Date;
  endTime: Date;
  memberIds: string[];
}

interface EventModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (event: Event) => void;
  onDelete?: (eventId: string) => void;
  event?: Event;
  members: UiFamilyMember[];
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
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [startDate, setStartDate] = useState(format(defaultDate, 'yyyy-MM-dd'));
  const [startTime, setStartTime] = useState('08:00');
  const [endTime, setEndTime] = useState('09:00');
  const [isSometimeToday, setIsSometimeToday] = useState(false);
  const [showMemberDropdown, setShowMemberDropdown] = useState(false);
  const [memberSearch, setMemberSearch] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      setTitle("");
      setDescription("");
      setMemberId("");
      setSelectedMemberIds([]);
      setMemberSearch("");
      setShowMemberDropdown(false);
    }
  }, [isOpen]);

  // Update form state when event prop changes or modal opens
  useEffect(() => {
    if (!isOpen) return;
    
    if (event) {
      // Editing existing event
      setTitle(event.title || "");
      setDescription(event.description || "");
      const eventMemberIds = event.memberIds || [];
      setSelectedMemberIds(eventMemberIds);
      setMemberId(eventMemberIds[0] || members[0]?.id || "");
      setStartDate(format(event.startTime, 'yyyy-MM-dd'));
      setStartTime(format(event.startTime, 'HH:mm'));
      setEndTime(format(event.endTime, 'HH:mm'));
      setIsSometimeToday(false);
    } else {
      // New event - set defaults
      setTitle("");
      setDescription("");
      setStartDate(selectedDate ? format(selectedDate, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'));
      setStartTime('08:00');
      setEndTime('09:00');
      setIsSometimeToday(false);
      
      // Auto-select first member if available
      if (members.length > 0) {
        setMemberId(members[0].id);
        setSelectedMemberIds([members[0].id]);
      }
    }
  }, [event, selectedDate, isOpen, members]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowMemberDropdown(false);
      }
    };
    
    if (showMemberDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showMemberDropdown]);

  const toggleMember = (id: string) => {
    setSelectedMemberIds(prev => {
      if (prev.includes(id)) {
        return prev.filter(m => m !== id);
      } else {
        return [...prev, id];
      }
    });
    // Update primary memberId to first selected member
    if (!selectedMemberIds.includes(id)) {
      setMemberId(id);
    }
  };

  const removeMember = (id: string) => {
    const newSelected = selectedMemberIds.filter(m => m !== id);
    setSelectedMemberIds(newSelected);
    if (memberId === id && newSelected.length > 0) {
      setMemberId(newSelected[0]);
    } else if (newSelected.length === 0) {
      setMemberId("");
    }
  };

  const filteredMembers = members.filter(m => 
    m.name.toLowerCase().includes(memberSearch.toLowerCase())
  );

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
      memberIds: selectedMemberIds,
    });
    onClose();
  };

  const selectedMember = members.find(m => m.id === memberId);
  const displayDate = format(new Date(`${startDate}T12:00`), 'MMM d, yyyy');

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl p-0 border-0 overflow-hidden rounded-3xl max-h-[90vh] flex flex-col">
        <DialogTitle className="sr-only">
          {event?.id ? 'Edit Event' : 'Create New Event'}
        </DialogTitle>
        <DialogDescription className="sr-only">
          {event?.id ? 'Edit your event details' : 'Create a new calendar event'}
        </DialogDescription>
        {/* Dark background container with scrollable content */}
        <div className="bg-gradient-to-br from-[#4A5A6A] via-[#5A6A7A] to-[#6A7A8A] flex flex-col flex-1 overflow-hidden">
          {/* Scrollable form content */}
          <div className="flex-1 overflow-y-auto px-6 md:px-8 pt-6 md:pt-8 pb-4 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
              <h2 className="text-xl md:text-2xl font-bold text-white">
                {event?.id ? 'Edit Event' : 'Create New Event'}
              </h2>
              <button
                onClick={onClose}
                className="w-9 h-9 rounded-full border border-white/50 flex items-center justify-center text-white hover:bg-white/10 transition-all flex-shrink-0"
                data-testid="button-close-modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Divider */}
            <div className="h-px bg-white/20" />

            {/* Form content */}
            <div className="space-y-4 md:space-y-5">
            {/* Event Title */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-white">
                Event Title <span className="text-red-400">*</span>
              </Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Team meeting, Soccer practice..."
                data-testid="input-event-title"
                className="bg-white/15 border border-white/40 rounded-2xl text-white placeholder:text-white/50 focus:border-purple-400 focus:ring-purple-400/50 h-12"
                autoFocus
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

              {/* Family Members - Multi-select Typeahead */}
              <div className="space-y-2">
                <Label className="text-sm font-medium text-white flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Family Members <span className="text-red-400">*</span>
                </Label>
                <div className="relative" ref={dropdownRef}>
                  <div className="bg-white/15 border border-white/40 rounded-2xl p-2 min-h-12 flex flex-wrap items-center gap-2">
                    {selectedMemberIds.map(id => {
                      const member = members.find(m => m.id === id);
                      return member ? (
                        <div
                          key={id}
                          className="flex items-center gap-2 bg-white/20 rounded-lg px-2 py-1"
                        >
                          <Avatar className="h-5 w-5">
                            <AvatarFallback 
                              className="text-xs text-white"
                              style={{ backgroundColor: member.color }}
                            >
                              {member.name.split(' ').map(n => n[0]).join('')}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-white text-sm">{member.name}</span>
                          <button
                            onClick={() => removeMember(id)}
                            className="text-white/70 hover:text-white ml-1"
                            data-testid={`button-remove-member-${id}`}
                          >
                            ×
                          </button>
                        </div>
                      ) : null;
                    })}
                    <input
                      type="text"
                      value={memberSearch}
                      onChange={(e) => {
                        setMemberSearch(e.target.value);
                        setShowMemberDropdown(true);
                      }}
                      onFocus={() => setShowMemberDropdown(true)}
                      placeholder="Type to add family members..."
                      className="flex-1 min-w-[150px] bg-transparent text-white placeholder:text-white/50 outline-none text-sm"
                      data-testid="input-member-search"
                    />
                  </div>

                  {/* Dropdown menu */}
                  {showMemberDropdown && filteredMembers.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-gradient-to-br from-[#4A5A6A] to-[#5A6A7A] border border-white/40 rounded-2xl shadow-lg z-50 max-h-48 overflow-y-auto">
                      {filteredMembers.map(member => (
                        <button
                          key={member.id}
                          onClick={() => {
                            toggleMember(member.id);
                            setMemberSearch("");
                          }}
                          className={`w-full px-4 py-3 flex items-center gap-3 text-left hover:bg-white/10 transition-all border-b border-white/10 last:border-0 ${
                            selectedMemberIds.includes(member.id) ? 'bg-white/15' : ''
                          }`}
                          data-testid={`option-member-${member.id}`}
                        >
                          <Avatar className="h-6 w-6">
                            <AvatarFallback 
                              className="text-xs text-white"
                              style={{ backgroundColor: member.color }}
                            >
                              {member.name.split(' ').map(n => n[0]).join('')}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-white text-sm flex-1">{member.name}</span>
                          {selectedMemberIds.includes(member.id) && (
                            <div className="w-4 h-4 rounded border border-white bg-white/30" />
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
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
          </div>

          {/* Sticky Footer with Action Buttons */}
          <div className="border-t border-white/20 px-6 md:px-8 py-4 bg-gradient-to-br from-[#4A5A6A] via-[#5A6A7A] to-[#6A7A8A] flex-shrink-0">
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
                  disabled={!title.trim() || selectedMemberIds.length === 0}
                  data-testid="button-save-event"
                  className="bg-purple-600 hover:bg-purple-700 text-white border border-white/50 rounded-lg disabled:opacity-50"
                  title={!title.trim() ? 'Please enter an event title' : selectedMemberIds.length === 0 ? 'Please select at least one family member' : ''}
                >
                  {event?.id ? 'Update Event' : 'Create Event'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
