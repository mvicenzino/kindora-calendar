import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import { Calendar, Clock, Users, Trash2, X, Repeat, ChevronDown } from "lucide-react";
import { format, addDays, addWeeks, addMonths, addYears } from "date-fns";
import { useState, useEffect, useRef } from 'react';
import type { UiFamilyMember } from "@shared/types";
import { useUserRole } from "@/hooks/useUserRole";

type RecurrenceRule = 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'yearly' | null;
type EndCondition = 'never' | 'after' | 'on';

interface Event {
  id?: string;
  title: string;
  description?: string;
  startTime: Date;
  endTime: Date;
  memberIds: string[];
  recurrenceRule?: RecurrenceRule;
  recurrenceEndDate?: Date | null;
  recurrenceCount?: string | null;
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

function getDefaultTimes() {
  const now = new Date();
  const minutes = now.getMinutes();
  const roundedMinutes = Math.ceil(minutes / 15) * 15;
  now.setMinutes(roundedMinutes, 0, 0);
  
  const endDate = new Date(now.getTime() + 60 * 60 * 1000);
  
  return {
    start: format(now, 'HH:mm'),
    end: format(endDate, 'HH:mm'),
  };
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
  const { isCaregiver, isLoading: roleLoading } = useUserRole();
  const isReadOnly = roleLoading || isCaregiver;
  const defaultDate = selectedDate || new Date();
  const defaultTimes = getDefaultTimes();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [memberId, setMemberId] = useState("");
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [startDate, setStartDate] = useState(format(defaultDate, 'yyyy-MM-dd'));
  const [startTime, setStartTime] = useState(defaultTimes.start);
  const [endTime, setEndTime] = useState(defaultTimes.end);
  const [isSometimeToday, setIsSometimeToday] = useState(false);
  const [showMemberDropdown, setShowMemberDropdown] = useState(false);
  const [memberSearch, setMemberSearch] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  // Recurrence state
  const [recurrenceRule, setRecurrenceRule] = useState<RecurrenceRule>(null);
  const [endCondition, setEndCondition] = useState<EndCondition>('never');
  const [recurrenceCount, setRecurrenceCount] = useState("10");
  const [recurrenceEndDate, setRecurrenceEndDate] = useState("");
  const [showRecurrenceDropdown, setShowRecurrenceDropdown] = useState(false);
  const recurrenceDropdownRef = useRef<HTMLDivElement>(null);

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      setTitle("");
      setDescription("");
      setMemberId("");
      setSelectedMemberIds([]);
      setMemberSearch("");
      setShowMemberDropdown(false);
      setRecurrenceRule(null);
      setEndCondition('never');
      setRecurrenceCount("10");
      setRecurrenceEndDate("");
      setShowRecurrenceDropdown(false);
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
      // New event - set defaults with current time rounded to nearest 15 min
      const times = getDefaultTimes();
      setTitle("");
      setDescription("");
      setStartDate(selectedDate ? format(selectedDate, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'));
      setStartTime(times.start);
      setEndTime(times.end);
      setIsSometimeToday(false);
      
      // Auto-select first member if available
      if (members.length > 0) {
        setMemberId(members[0].id);
        setSelectedMemberIds([members[0].id]);
      }
    }
  }, [event, selectedDate, isOpen, members]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowMemberDropdown(false);
      }
      if (recurrenceDropdownRef.current && !recurrenceDropdownRef.current.contains(e.target as Node)) {
        setShowRecurrenceDropdown(false);
      }
    };
    
    if (showMemberDropdown || showRecurrenceDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showMemberDropdown, showRecurrenceDropdown]);

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

    // Calculate recurrence end based on end condition
    let finalRecurrenceEndDate: Date | null = null;
    let finalRecurrenceCount: string | null = null;
    
    if (recurrenceRule) {
      if (endCondition === 'after') {
        finalRecurrenceCount = recurrenceCount;
      } else if (endCondition === 'on' && recurrenceEndDate) {
        finalRecurrenceEndDate = new Date(`${recurrenceEndDate}T23:59:59`);
      }
    }

    onSave({
      ...(event?.id && { id: event.id }),
      title,
      description,
      startTime: startDateTime,
      endTime: endDateTime,
      memberIds: selectedMemberIds,
      recurrenceRule: recurrenceRule,
      recurrenceEndDate: finalRecurrenceEndDate,
      recurrenceCount: finalRecurrenceCount,
    });
    onClose();
  };
  
  // Helper for recurrence options
  const recurrenceOptions: { value: RecurrenceRule; label: string }[] = [
    { value: null, label: 'Does not repeat' },
    { value: 'daily', label: 'Daily' },
    { value: 'weekly', label: 'Weekly' },
    { value: 'biweekly', label: 'Every 2 weeks' },
    { value: 'monthly', label: 'Monthly' },
    { value: 'yearly', label: 'Yearly' },
  ];
  
  const getRecurrenceLabel = () => {
    const option = recurrenceOptions.find(o => o.value === recurrenceRule);
    return option?.label || 'Does not repeat';
  };

  const selectedMember = members.find(m => m.id === memberId);
  const displayDate = format(new Date(`${startDate}T12:00`), 'MMM d, yyyy');

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[calc(100vw-2rem)] max-w-[calc(100vw-2rem)] sm:max-w-2xl p-0 border-0 overflow-hidden rounded-3xl max-h-[90vh] flex flex-col">
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
                disabled={isReadOnly}
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
                disabled={isReadOnly}
              />
            </div>

            {/* Date and Family Members */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Date */}
              <div className="space-y-2">
                <Label className="text-sm font-medium text-white flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Date
                </Label>
                <button
                  onClick={() => {
                    if (isReadOnly) return;
                    const input = document.createElement('input');
                    input.type = 'date';
                    input.value = startDate;
                    input.onchange = (e: any) => setStartDate(e.target.value);
                    input.click();
                  }}
                  className="w-full bg-white/15 border border-white/40 rounded-2xl text-white px-4 py-3 text-center hover:bg-white/20 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  data-testid="button-event-date"
                  disabled={isReadOnly}
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
                          {!isReadOnly && (
                            <button
                              onClick={() => removeMember(id)}
                              className="text-white/70 hover:text-white ml-1"
                              data-testid={`button-remove-member-${id}`}
                            >
                              ×
                            </button>
                          )}
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
                      disabled={isReadOnly}
                    />
                  </div>

                  {/* Dropdown menu */}
                  {showMemberDropdown && filteredMembers.length > 0 && !isReadOnly && (
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
                disabled={isReadOnly}
              />
            </div>

            {/* Start and End Times */}
            {!isSometimeToday && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-white flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    From
                  </Label>
                  <Input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    data-testid="input-start-time"
                    className="bg-white/15 border border-white/40 rounded-2xl text-white focus:border-purple-400 focus:ring-purple-400/50 h-12 text-center"
                    disabled={isReadOnly}
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium text-white flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    To
                  </Label>
                  <Input
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    data-testid="input-end-time"
                    className="bg-white/15 border border-white/40 rounded-2xl text-white focus:border-purple-400 focus:ring-purple-400/50 h-12 text-center"
                    disabled={isReadOnly}
                  />
                </div>
              </div>
            )}

            {/* Recurrence Section - Only show when creating new events */}
            {!event?.id && !isReadOnly && (
              <div className="space-y-3">
                <Label className="text-sm font-medium text-white flex items-center gap-2">
                  <Repeat className="w-4 h-4" />
                  Repeat
                </Label>
                
                {/* Recurrence Selector */}
                <div className="relative" ref={recurrenceDropdownRef}>
                  <button
                    type="button"
                    onClick={() => setShowRecurrenceDropdown(!showRecurrenceDropdown)}
                    data-testid="button-recurrence-selector"
                    className="w-full bg-white/15 border border-white/40 rounded-2xl text-white px-4 py-3 text-left hover:bg-white/20 transition-all flex items-center justify-between"
                  >
                    <span>{getRecurrenceLabel()}</span>
                    <ChevronDown className={`w-4 h-4 transition-transform ${showRecurrenceDropdown ? 'rotate-180' : ''}`} />
                  </button>
                  
                  {showRecurrenceDropdown && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-gradient-to-br from-[#4A5A6A] to-[#5A6A7A] border border-white/40 rounded-2xl shadow-lg z-50 overflow-hidden">
                      {recurrenceOptions.map((option) => (
                        <button
                          key={option.value ?? 'none'}
                          type="button"
                          onClick={() => {
                            setRecurrenceRule(option.value);
                            setShowRecurrenceDropdown(false);
                            if (!option.value) {
                              setEndCondition('never');
                            }
                          }}
                          data-testid={`option-recurrence-${option.value ?? 'none'}`}
                          className={`w-full px-4 py-3 text-left hover:bg-white/10 transition-all border-b border-white/10 last:border-0 ${
                            recurrenceRule === option.value ? 'bg-white/15 text-white' : 'text-white/80'
                          }`}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                
                {/* End Condition - Only show when recurrence is selected */}
                {recurrenceRule && (
                  <div className="space-y-3 pt-2">
                    <Label className="text-sm font-medium text-white/80">Ends</Label>
                    
                    {/* End condition buttons */}
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => setEndCondition('never')}
                        data-testid="button-end-never"
                        className={`flex-1 min-w-[70px] py-2 px-3 rounded-xl text-sm font-medium transition-all ${
                          endCondition === 'never'
                            ? 'bg-purple-600 text-white border border-purple-400'
                            : 'bg-white/10 text-white/70 border border-white/20 hover:bg-white/15'
                        }`}
                      >
                        Never
                      </button>
                      <button
                        type="button"
                        onClick={() => setEndCondition('after')}
                        data-testid="button-end-after"
                        className={`flex-1 min-w-[70px] py-2 px-3 rounded-xl text-sm font-medium transition-all ${
                          endCondition === 'after'
                            ? 'bg-purple-600 text-white border border-purple-400'
                            : 'bg-white/10 text-white/70 border border-white/20 hover:bg-white/15'
                        }`}
                      >
                        After
                      </button>
                      <button
                        type="button"
                        onClick={() => setEndCondition('on')}
                        data-testid="button-end-on"
                        className={`flex-1 min-w-[70px] py-2 px-3 rounded-xl text-sm font-medium transition-all ${
                          endCondition === 'on'
                            ? 'bg-purple-600 text-white border border-purple-400'
                            : 'bg-white/10 text-white/70 border border-white/20 hover:bg-white/15'
                        }`}
                      >
                        On Date
                      </button>
                    </div>
                    
                    {/* After X occurrences input */}
                    {endCondition === 'after' && (
                      <div className="flex items-center gap-3 bg-white/10 rounded-2xl p-3 border border-white/20">
                        <span className="text-white/70 text-sm">After</span>
                        <Input
                          type="number"
                          min="2"
                          max="365"
                          value={recurrenceCount}
                          onChange={(e) => setRecurrenceCount(e.target.value)}
                          data-testid="input-recurrence-count"
                          className="w-20 bg-white/15 border border-white/40 rounded-xl text-white text-center h-10"
                        />
                        <span className="text-white/70 text-sm">occurrences</span>
                      </div>
                    )}
                    
                    {/* On specific date input */}
                    {endCondition === 'on' && (
                      <div className="flex items-center gap-3 bg-white/10 rounded-2xl p-3 border border-white/20">
                        <span className="text-white/70 text-sm">Until</span>
                        <Input
                          type="date"
                          value={recurrenceEndDate}
                          onChange={(e) => setRecurrenceEndDate(e.target.value)}
                          min={startDate}
                          data-testid="input-recurrence-end-date"
                          className="flex-1 bg-white/15 border border-white/40 rounded-xl text-white h-10"
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
            </div>
          </div>

          {/* Sticky Footer with Action Buttons */}
          <div className="border-t border-white/20 px-6 md:px-8 py-4 bg-gradient-to-br from-[#4A5A6A] via-[#5A6A7A] to-[#6A7A8A] flex-shrink-0">
            <div className="flex items-center justify-between gap-3">
              {event?.id && onDelete && !isReadOnly && (
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
                  disabled={!title.trim() || selectedMemberIds.length === 0 || isReadOnly}
                  data-testid="button-save-event"
                  className="bg-purple-600 hover:bg-purple-700 text-white border border-white/50 rounded-lg disabled:opacity-50"
                  title={isReadOnly ? 'You cannot create or edit events' : !title.trim() ? 'Please enter an event title' : selectedMemberIds.length === 0 ? 'Please select at least one family member' : ''}
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
