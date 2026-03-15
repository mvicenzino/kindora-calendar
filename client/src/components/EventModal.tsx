import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Calendar, Clock, Users, Trash2, X, Repeat, ChevronDown, MessageCircle, Smile, Tag, Flag } from "lucide-react";
import { format, addDays, addWeeks, addMonths, addYears } from "date-fns";
import { useState, useEffect, useRef } from 'react';
import type { UiFamilyMember } from "@shared/types";
import { useUserRole } from "@/hooks/useUserRole";
import { useActiveFamily } from "@/contexts/ActiveFamilyContext";
import EventNotesSection from "./EventNotesSection";
import { EVENT_CATEGORIES, CATEGORY_CONFIG, type EventCategory } from "@shared/schema";

type RecurrenceRule = 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'yearly' | null;
type EndCondition = 'never' | 'after' | 'on';

interface Event {
  id?: string;
  title: string;
  description?: string;
  startTime: Date;
  endTime: Date;
  memberIds: string[];
  category?: EventCategory;
  recurrenceRule?: RecurrenceRule;
  recurrenceEndDate?: Date | null;
  recurrenceCount?: string | null;
  rrule?: string | null;
  isRecurringParent?: boolean;
  isImportant?: boolean;
  _isVirtualOccurrence?: boolean;
  _parentEventId?: string;
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
  const { toast } = useToast();
  const { can, isLoading: roleLoading } = useUserRole();
  const { activeFamilyId } = useActiveFamily();
  const canEdit = !roleLoading && can('canEditEvents');
  const canCreate = !roleLoading && can('canCreateEvents');
  const canDelete = !roleLoading && can('canDeleteEvents');
  const isReadOnly = roleLoading || (!canEdit && !canCreate);
  const defaultDate = selectedDate || new Date();
  const defaultTimes = getDefaultTimes();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [memberId, setMemberId] = useState("");
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [startDate, setStartDate] = useState(format(defaultDate, 'yyyy-MM-dd'));
  const [startTime, setStartTime] = useState(defaultTimes.start);
  const [endTime, setEndTime] = useState(defaultTimes.end);
  const [category, setCategory] = useState<EventCategory>('other');
  const [isImportant, setIsImportant] = useState(false);
  const [isSometimeToday, setIsSometimeToday] = useState(false);
  const [showMemberDropdown, setShowMemberDropdown] = useState(false);
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [memberSearch, setMemberSearch] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);
  const categoryDropdownRef = useRef<HTMLDivElement>(null);
  
  // When start time changes, shift end time to maintain the same duration (min 1 hour)
  const handleStartTimeChange = (newStart: string) => {
    setStartTime(newStart);
    const [sh, sm] = startTime.split(':').map(Number);
    const [eh, em] = endTime.split(':').map(Number);
    const prevDuration = (eh * 60 + em) - (sh * 60 + sm);
    const duration = prevDuration > 0 ? prevDuration : 60;
    const [nh, nm] = newStart.split(':').map(Number);
    const newEndMins = Math.min(nh * 60 + nm + duration, 23 * 60 + 59);
    const newEh = Math.floor(newEndMins / 60);
    const newEm = newEndMins % 60;
    setEndTime(`${String(newEh).padStart(2, '0')}:${String(newEm).padStart(2, '0')}`);
  };

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
      setCategory('other');
      setIsImportant(false);
      setMemberSearch("");
      setShowMemberDropdown(false);
      setShowCategoryDropdown(false);
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
      setTitle(event.title || "");
      setDescription(event.description || "");
      const eventMemberIds = event.memberIds || [];
      setSelectedMemberIds(eventMemberIds);
      setMemberId(eventMemberIds[0] || members[0]?.id || "");
      setCategory(event.category || 'other');
      setIsImportant(event.isImportant || false);
      setStartDate(format(event.startTime, 'yyyy-MM-dd'));
      setStartTime(format(event.startTime, 'HH:mm'));
      setEndTime(format(event.endTime, 'HH:mm'));
      setIsSometimeToday(false);
    } else {
      setTitle("");
      setDescription("");
      if (selectedDate && (selectedDate.getHours() !== 0 || selectedDate.getMinutes() !== 0)) {
        setStartDate(format(selectedDate, 'yyyy-MM-dd'));
        setStartTime(format(selectedDate, 'HH:mm'));
        const end = new Date(selectedDate.getTime() + 60 * 60 * 1000);
        setEndTime(format(end, 'HH:mm'));
      } else {
        const times = getDefaultTimes();
        setStartDate(selectedDate ? format(selectedDate, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'));
        setStartTime(times.start);
        setEndTime(times.end);
      }
      setIsSometimeToday(false);
      
      // Auto-select first member if available
      if (members.length > 0) {
        setMemberId(members[0].id);
        setSelectedMemberIds([members[0].id]);
      }
    }
  }, [event, selectedDate, isOpen, members]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowMemberDropdown(false);
      }
      if (recurrenceDropdownRef.current && !recurrenceDropdownRef.current.contains(e.target as Node)) {
        setShowRecurrenceDropdown(false);
      }
      if (categoryDropdownRef.current && !categoryDropdownRef.current.contains(e.target as Node)) {
        setShowCategoryDropdown(false);
      }
    };
    
    if (showMemberDropdown || showRecurrenceDropdown || showCategoryDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showMemberDropdown, showRecurrenceDropdown, showCategoryDropdown]);

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

  const buildRRuleString = (): string | null => {
    if (!recurrenceRule) return null;
    
    const freqMap: Record<string, string> = {
      'daily': 'DAILY',
      'weekly': 'WEEKLY',
      'biweekly': 'WEEKLY',
      'monthly': 'MONTHLY',
      'yearly': 'YEARLY',
    };
    
    const freq = freqMap[recurrenceRule];
    if (!freq) return null;
    
    const parts = [`FREQ=${freq}`];
    if (recurrenceRule === 'biweekly') parts.push('INTERVAL=2');
    
    if (endCondition === 'after' && recurrenceCount) {
      parts.push(`COUNT=${recurrenceCount}`);
    } else if (endCondition === 'on' && recurrenceEndDate) {
      const untilDate = new Date(`${recurrenceEndDate}T23:59:59`);
      parts.push(`UNTIL=${untilDate.toISOString().replace(/[-:]/g, '').replace(/\.\d+Z/, 'Z')}`);
    }
    
    return parts.join(';');
  };

  const handleSave = () => {
    if (!title.trim()) {
      toast({ title: "Title required", description: "Please enter an event title.", variant: "destructive" });
      return;
    }
    if (selectedMemberIds.length === 0) {
      toast({ title: "Select a family member", description: "At least one family member must be assigned to this event.", variant: "destructive" });
      return;
    }

    const actualStartTime = isSometimeToday ? '23:58' : startTime;
    const actualEndTime = isSometimeToday ? '23:59' : endTime;
    
    const startDateTime = new Date(`${startDate}T${actualStartTime}`);
    const endDateTime = new Date(`${startDate}T${actualEndTime}`);

    const rruleString = buildRRuleString();

    onSave({
      ...(event?.id && { id: event.id }),
      title,
      description,
      startTime: startDateTime,
      endTime: endDateTime,
      memberIds: selectedMemberIds,
      category,
      rrule: rruleString,
      isImportant,
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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        className="w-[calc(100vw-2rem)] max-w-[calc(100vw-2rem)] sm:max-w-2xl p-0 border-0 overflow-hidden rounded-2xl max-h-[90vh] flex flex-col gap-0"
        style={{
          background: 'transparent',
          boxShadow: '0 0 0 1px rgba(255,255,255,0.06), 0 25px 60px -12px rgba(0,0,0,0.5)',
        }}
      >
        <DialogTitle className="sr-only">
          {event?.id ? 'Edit Event' : 'Create New Event'}
        </DialogTitle>
        <DialogDescription className="sr-only">
          {event?.id ? 'Edit your event details' : 'Create a new calendar event'}
        </DialogDescription>
        <div className="flex flex-col flex-1 overflow-hidden" style={{ background: 'hsl(var(--card) / 0.95)', backdropFilter: 'blur(40px)' }}>
          {/* Header */}
          <div className="px-5 md:px-6 pt-4 pb-3 flex items-center justify-between gap-3" style={{ borderBottom: '1px solid hsl(var(--border) / 0.4)' }}>
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-primary/15">
                <Calendar className="w-4 h-4 text-primary" />
              </div>
              <h2 className="text-base font-bold text-foreground">
                {event?.id ? 'Edit Event' : 'New Event'}
              </h2>
            </div>
            <button
              onClick={onClose}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
              style={{ background: 'hsl(var(--muted) / 0.4)' }}
              data-testid="button-close-modal"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Scrollable form content */}
          <div className="flex-1 overflow-y-auto px-5 md:px-6 pt-4 pb-4 space-y-4">

            {/* Form content */}
            <div className="space-y-4 md:space-y-5">
            {/* Event Title */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground">
                Event Title <span className="text-red-400">*</span>
              </Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Team meeting, Soccer practice..."
                data-testid="input-event-title"
                className="bg-muted/50 border border-border rounded-2xl focus:border-purple-400 focus:ring-purple-400/50 h-12"
                autoFocus
                disabled={isReadOnly}
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground">Description</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Add event details..."
                data-testid="input-event-description"
                className="bg-muted/50 border border-border rounded-2xl focus:border-purple-400 focus:ring-purple-400/50 resize-none"
                rows={3}
                disabled={isReadOnly}
              />
            </div>

            {/* Category Selector */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground flex items-center gap-2">
                <Tag className="w-4 h-4" />
                Category
              </Label>
              <div className="relative" ref={categoryDropdownRef}>
                <button
                  type="button"
                  onClick={() => !isReadOnly && setShowCategoryDropdown(!showCategoryDropdown)}
                  className="w-full bg-muted/50 border border-border rounded-2xl px-4 py-3 h-12 flex items-center justify-between text-left text-foreground transition-all hover:bg-muted"
                  data-testid="button-category-select"
                  disabled={isReadOnly}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-3.5 h-3.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: CATEGORY_CONFIG[category].color }}
                    />
                    <span className="text-sm font-medium">{CATEGORY_CONFIG[category].label}</span>
                    <span className="text-xs text-muted-foreground hidden sm:inline">{CATEGORY_CONFIG[category].description}</span>
                  </div>
                  <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${showCategoryDropdown ? 'rotate-180' : ''}`} />
                </button>
                {showCategoryDropdown && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-card border border-border rounded-2xl shadow-lg z-50 max-h-64 overflow-y-auto">
                    {EVENT_CATEGORIES.map(cat => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => {
                          setCategory(cat);
                          setShowCategoryDropdown(false);
                        }}
                        className={`w-full px-4 py-3 flex items-center gap-3 text-left hover:bg-muted/50 transition-all border-b border-border last:border-0 ${category === cat ? 'bg-muted' : ''}`}
                        data-testid={`option-category-${cat}`}
                      >
                        <div
                          className="w-3.5 h-3.5 rounded-full flex-shrink-0"
                          style={{ backgroundColor: CATEGORY_CONFIG[cat].color }}
                        />
                        <div className="flex-1 min-w-0">
                          <span className="text-foreground text-sm font-medium">{CATEGORY_CONFIG[cat].label}</span>
                          <span className="text-muted-foreground text-xs ml-2">{CATEGORY_CONFIG[cat].description}</span>
                        </div>
                        {category === cat && (
                          <div className="w-4 h-4 rounded-full border-2 border-border bg-muted flex-shrink-0" />
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Important Flag */}
            <div className="flex items-start justify-between gap-3 px-4 py-3 bg-muted/40 border border-border rounded-2xl">
              <div className="flex items-start gap-2.5 min-w-0">
                <Flag className={`w-4 h-4 mt-0.5 flex-shrink-0 ${isImportant ? 'text-orange-500 fill-orange-500' : 'text-muted-foreground'}`} />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground">Mark as Important</p>
                  <p className="text-xs text-muted-foreground">Fires a toast reminder 30, 15, and 5 minutes before the event</p>
                </div>
              </div>
              <Switch
                checked={isImportant}
                onCheckedChange={setIsImportant}
                disabled={isReadOnly}
                data-testid="toggle-important"
                className="flex-shrink-0 mt-0.5"
              />
            </div>

            {/* Date and Family Members */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Date */}
              <div className="space-y-2">
                <Label className="text-sm font-medium text-foreground flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Date
                </Label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="bg-muted/50 border border-border rounded-2xl px-4 py-3 h-12 focus:border-purple-400 focus:ring-purple-400/50 [&::-webkit-calendar-picker-indicator]:invert [&::-webkit-calendar-picker-indicator]:opacity-70 [&::-webkit-calendar-picker-indicator]:cursor-pointer"
                  data-testid="input-event-date"
                  disabled={isReadOnly}
                />
              </div>

              {/* Family Members - Multi-select Typeahead */}
              <div className="space-y-2">
                <Label className="text-sm font-medium text-foreground flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Family Members <span className="text-red-400">*</span>
                </Label>
                <div className="relative" ref={dropdownRef}>
                  <div className="bg-muted/50 border border-border rounded-2xl p-2 min-h-12 flex flex-wrap items-center gap-2">
                    {selectedMemberIds.map(id => {
                      const member = members.find(m => m.id === id);
                      return member ? (
                        <div
                          key={id}
                          className="flex items-center gap-2 bg-muted rounded-lg px-2 py-1"
                        >
                          <Avatar className="h-5 w-5">
                            <AvatarFallback 
                              className="text-xs text-white"
                              style={{ backgroundColor: member.color }}
                            >
                              {member.name.split(' ').map(n => n[0]).join('')}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-foreground text-sm">{member.name}</span>
                          {!isReadOnly && (
                            <button
                              onClick={() => removeMember(id)}
                              className="text-muted-foreground hover:text-foreground ml-1"
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
                      className="flex-1 min-w-[150px] bg-transparent text-foreground placeholder:text-muted-foreground outline-none text-sm"
                      data-testid="input-member-search"
                      disabled={isReadOnly}
                    />
                  </div>

                  {/* Dropdown menu */}
                  {showMemberDropdown && filteredMembers.length > 0 && !isReadOnly && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-card border border-border rounded-2xl shadow-lg z-50 max-h-48 overflow-y-auto">
                      {filteredMembers.map(member => (
                        <button
                          key={member.id}
                          onClick={() => {
                            toggleMember(member.id);
                            setMemberSearch("");
                          }}
                          className={`w-full px-4 py-3 flex items-center gap-3 text-left hover:bg-muted/50 transition-all border-b border-border last:border-0 ${
                            selectedMemberIds.includes(member.id) ? 'bg-muted' : ''
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
                          <span className="text-foreground text-sm flex-1">{member.name}</span>
                          {selectedMemberIds.includes(member.id) && (
                            <div className="w-4 h-4 rounded border border-border bg-muted" />
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Sometime Today Toggle */}
            <div className="flex items-center justify-between bg-muted/50 border border-border rounded-2xl p-4">
              <div>
                <Label className="text-sm font-medium text-foreground cursor-pointer block">
                  Sometime Today
                </Label>
                <p className="text-xs text-muted-foreground">No specific time needed</p>
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
                  <Label className="text-sm font-medium text-foreground flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    From
                  </Label>
                  <Input
                    type="time"
                    value={startTime}
                    onChange={(e) => handleStartTimeChange(e.target.value)}
                    data-testid="input-start-time"
                    className="bg-muted/50 border border-border rounded-2xl focus:border-purple-400 focus:ring-purple-400/50 h-12 text-center"
                    disabled={isReadOnly}
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium text-foreground flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    To
                  </Label>
                  <Input
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    data-testid="input-end-time"
                    className="bg-muted/50 border border-border rounded-2xl focus:border-purple-400 focus:ring-purple-400/50 h-12 text-center"
                    disabled={isReadOnly}
                  />
                </div>
              </div>
            )}

            {/* Recurrence Section - Only show when creating new events */}
            {!event?.id && !isReadOnly && (
              <div className="space-y-3">
                <Label className="text-sm font-medium text-foreground flex items-center gap-2">
                  <Repeat className="w-4 h-4" />
                  Repeat
                </Label>
                
                {/* Recurrence Selector */}
                <div className="relative" ref={recurrenceDropdownRef}>
                  <button
                    type="button"
                    onClick={() => setShowRecurrenceDropdown(!showRecurrenceDropdown)}
                    data-testid="button-recurrence-selector"
                    className="w-full bg-muted/50 border border-border rounded-2xl text-foreground px-4 py-3 text-left hover:bg-muted transition-all flex items-center justify-between"
                  >
                    <span>{getRecurrenceLabel()}</span>
                    <ChevronDown className={`w-4 h-4 transition-transform ${showRecurrenceDropdown ? 'rotate-180' : ''}`} />
                  </button>
                  
                  {showRecurrenceDropdown && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-card border border-border rounded-2xl shadow-lg z-50 overflow-hidden">
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
                          className={`w-full px-4 py-3 text-left hover:bg-muted/50 transition-all border-b border-border last:border-0 ${
                            recurrenceRule === option.value ? 'bg-muted text-foreground' : 'text-muted-foreground'
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
                    <Label className="text-sm font-medium text-muted-foreground">Ends</Label>
                    
                    {/* End condition buttons */}
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => setEndCondition('never')}
                        data-testid="button-end-never"
                        className={`flex-1 min-w-[70px] py-2 px-3 rounded-xl text-sm font-medium transition-all ${
                          endCondition === 'never'
                            ? 'bg-purple-600 text-white border border-purple-400'
                            : 'bg-muted/50 text-muted-foreground border border-border hover:bg-muted'
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
                            : 'bg-muted/50 text-muted-foreground border border-border hover:bg-muted'
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
                            : 'bg-muted/50 text-muted-foreground border border-border hover:bg-muted'
                        }`}
                      >
                        On Date
                      </button>
                    </div>
                    
                    {/* After X occurrences input */}
                    {endCondition === 'after' && (
                      <div className="flex items-center gap-3 bg-muted/50 rounded-2xl p-3 border border-border">
                        <span className="text-muted-foreground text-sm">After</span>
                        <Input
                          type="number"
                          min="2"
                          max="365"
                          value={recurrenceCount}
                          onChange={(e) => setRecurrenceCount(e.target.value)}
                          data-testid="input-recurrence-count"
                          className="w-20 bg-muted/50 border border-border rounded-xl text-center h-10"
                        />
                        <span className="text-muted-foreground text-sm">occurrences</span>
                      </div>
                    )}
                    
                    {/* On specific date input */}
                    {endCondition === 'on' && (
                      <div className="flex items-center gap-3 bg-muted/50 rounded-2xl p-3 border border-border">
                        <span className="text-muted-foreground text-sm">Until</span>
                        <Input
                          type="date"
                          value={recurrenceEndDate}
                          onChange={(e) => setRecurrenceEndDate(e.target.value)}
                          min={startDate}
                          data-testid="input-recurrence-end-date"
                          className="flex-1 bg-muted/50 border border-border rounded-xl h-10"
                        />
                      </div>
                    )}

                    {/* Preview of next occurrences */}
                    {recurrenceRule && (() => {
                      const previewDates: Date[] = [];
                      const base = new Date(`${startDate}T${isSometimeToday ? '12:00' : startTime}`);
                      let current = new Date(base);
                      for (let i = 0; i < 3; i++) {
                        switch (recurrenceRule) {
                          case 'daily': current = addDays(current, 1); break;
                          case 'weekly': current = addWeeks(current, 1); break;
                          case 'biweekly': current = addWeeks(current, 2); break;
                          case 'monthly': current = addMonths(current, 1); break;
                          case 'yearly': current = addYears(current, 1); break;
                        }
                        previewDates.push(new Date(current));
                      }
                      return (
                        <div className="bg-muted/50 rounded-xl p-3 border border-border" data-testid="recurrence-preview">
                          <p className="text-muted-foreground text-xs mb-1.5">Next occurrences:</p>
                          <div className="flex flex-wrap gap-1.5">
                            {previewDates.map((d, i) => (
                              <span key={i} className="text-muted-foreground text-xs bg-muted px-2 py-0.5 rounded-full">
                                {format(d, 'MMM d, yyyy')}
                              </span>
                            ))}
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>
            )}

            {/* Notes Section - Only show when editing existing events */}
            {event?.id && activeFamilyId && (
              <div className="space-y-3">
                <Label className="text-sm font-medium text-foreground flex items-center gap-2">
                  <MessageCircle className="w-4 h-4" />
                  Notes & Conversation
                </Label>
                <div className="bg-muted/50 rounded-2xl border border-border overflow-hidden">
                  <EventNotesSection
                    eventId={event.id}
                    familyId={activeFamilyId}
                    currentUserId={undefined}
                    showEmojiPicker={true}
                  />
                </div>
              </div>
            )}

            {/* Notes hint for new events */}
            {!event?.id && (
              <div className="bg-muted/50 border border-border rounded-2xl p-4">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <MessageCircle className="w-4 h-4" />
                  <span className="text-sm">Notes can be added after creating the event</span>
                </div>
              </div>
            )}
            </div>
          </div>

          {/* Footer */}
          <div
            className="px-5 md:px-6 py-3 flex-shrink-0"
            style={{ borderTop: '1px solid hsl(var(--border) / 0.4)' }}
          >
            <div className="flex items-center justify-between gap-3">
              {event?.id && onDelete && !isReadOnly && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => {
                    onDelete(event.id!);
                    onClose();
                  }}
                  data-testid="button-delete-event"
                  className="rounded-lg text-xs"
                >
                  <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                  Delete
                </Button>
              )}
              
              <div className="flex gap-2 ml-auto">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onClose}
                  data-testid="button-cancel"
                  className="rounded-lg text-xs"
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleSave}
                  disabled={!title.trim() || selectedMemberIds.length === 0 || isReadOnly}
                  data-testid="button-save-event"
                  className="rounded-lg text-xs disabled:opacity-50"
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
