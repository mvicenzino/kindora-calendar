import { useState, useMemo, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useActiveFamily } from "@/contexts/ActiveFamilyContext";
import ViewSwitcherBar, { type CalendarLayout, type CalendarView } from "@/components/ViewSwitcherBar";
import SearchPanel from "@/components/SearchPanel";
import TodayView from "@/components/TodayView";
import WeekView from "@/components/WeekView";
import MonthView from "@/components/MonthView";
import TimelineView from "@/components/TimelineView";
import DayGridView from "@/components/DayGridView";
import WeekGridView from "@/components/WeekGridView";
import MonthGridView from "@/components/MonthGridView";
import YearGridView from "@/components/YearGridView";
import EventModal from "@/components/EventModal";
import EventDetailsDialog from "@/components/EventDetailsDialog";
import MemberModal from "@/components/MemberModal";
import DayEventsDialog from "@/components/DayEventsDialog";
import MemberFilterStrip from "@/components/MemberFilterStrip";
import CalendarAskBar from "@/components/CalendarAskBar";
import { isSameDay, isSameWeek, isSameMonth } from "date-fns";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { FamilyMember, Event, InsertEvent, EventCategory } from "@shared/schema";
import { CATEGORY_CONFIG } from "@shared/schema";
import { mapEventFromDb, mapFamilyMemberFromDb, type UiEvent, type UiFamilyMember } from "@shared/types";
import { useToast } from "@/hooks/use-toast";
import { useUserRole } from "@/hooks/useUserRole";

export default function Home() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const { activeFamilyId, isLoadingFamily } = useActiveFamily();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { isCaregiver, can, isLoading: isRoleLoading } = useUserRole();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<CalendarView>('day');
  const [layout, setLayout] = useState<CalendarLayout>('grid');
  const [eventModalOpen, setEventModalOpen] = useState(false);
  const [eventDetailsOpen, setEventDetailsOpen] = useState(false);
  const [memberModalOpen, setMemberModalOpen] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState<string>();
  const [searchOpen, setSearchOpen] = useState(false);
  const [eventModalDate, setEventModalDate] = useState<Date | undefined>();
  const [dayEventsOpen, setDayEventsOpen] = useState(false);
  const [selectedDayDate, setSelectedDayDate] = useState<Date>(new Date());
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [importedEvent, setImportedEvent] = useState<{
    title: string;
    description?: string;
    startTime: Date;
    endTime: Date;
  } | undefined>();

  useEffect(() => {
    if (!isAuthenticated || isLoading) return;

    const importData = sessionStorage.getItem("stride_import");
    if (!importData) return;
    sessionStorage.removeItem("stride_import");

    const params = new URLSearchParams(importData);
    const title = params.get("title");
    const start = params.get("start");
    if (title && start) {
      const startTime = new Date(start);
      const end = params.get("end");
      const endTime = end ? new Date(end) : new Date(startTime.getTime() + 60 * 60 * 1000);
      const description = params.get("description") || undefined;

      setImportedEvent({ title, description, startTime, endTime });
      setSelectedEventId(undefined);
      setEventModalOpen(true);
    }
  }, [isAuthenticated, isLoading]);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      window.location.href = "/api/login";
    }
  }, [isAuthenticated, isLoading]);

  useEffect(() => {
    if (!isRoleLoading && isCaregiver) {
      setLocation("/care");
    }
  }, [isCaregiver, isRoleLoading, setLocation]);

  const isDemoMode = user?.id?.startsWith('demo-') ?? false;
  useEffect(() => {
    if (!isLoading && isAuthenticated && !isLoadingFamily && !isDemoMode) {
      if (!activeFamilyId) {
        const hasSeenIntro = localStorage.getItem("kindora_intro_seen");
        if (!hasSeenIntro) {
          setLocation("/intro");
        } else {
          setLocation("/onboarding");
        }
      }
    }
  }, [isAuthenticated, isLoading, isLoadingFamily, activeFamilyId, isDemoMode, setLocation]);


  const joinFamilyMutation = useMutation({
    mutationFn: async (inviteCode: string) => {
      const res = await apiRequest('POST', '/api/family/join', { inviteCode });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/family'] });
      queryClient.invalidateQueries({ queryKey: ['/api/family-members'] });
      queryClient.invalidateQueries({ queryKey: ['/api/events'] });
      toast({
        title: "Welcome to the family!",
        description: "You've successfully joined the calendar.",
      });
      localStorage.removeItem('pendingInviteCode');
    },
    onError: (error: any) => {
      toast({
        title: "Couldn't join family",
        description: error.message || "The invite code may be invalid.",
        variant: "destructive",
      });
      localStorage.removeItem('pendingInviteCode');
    },
  });

  useEffect(() => {
    if (isAuthenticated && !isLoading) {
      const pendingInvite = localStorage.getItem('pendingInviteCode');
      if (pendingInvite) {
        setTimeout(() => {
          joinFamilyMutation.mutate(pendingInvite);
        }, 500);
      }
    }
  }, [isAuthenticated, isLoading]);

  const { data: rawMembers = [], isLoading: membersLoading } = useQuery<FamilyMember[]>({
    queryKey: ['/api/family-members', activeFamilyId],
    enabled: isAuthenticated && !!activeFamilyId,
  });

  const { data: rawEvents = [], isLoading: eventsLoading } = useQuery<Event[]>({
    queryKey: ['/api/events?familyId=' + activeFamilyId],
    enabled: isAuthenticated && !!activeFamilyId,
  });

  const members = useMemo(() => rawMembers.map(mapFamilyMemberFromDb), [rawMembers]);
  const events = useMemo(() => rawEvents.map(e => ({
    ...mapEventFromDb(e),
    members: members.filter(m => e.memberIds.includes(m.id))
  })), [rawEvents, members]);

  const filteredEvents = useMemo(() => {
    if (selectedMemberIds.length === 0) return events;
    return events.filter(e =>
      e.members?.some(m => selectedMemberIds.includes(m.id)) ||
      (e as any).memberIds?.some((id: string) => selectedMemberIds.includes(id))
    );
  }, [events, selectedMemberIds]);

  const handleToggleMember = useCallback((memberId: string) => {
    setSelectedMemberIds(prev => {
      if (prev.includes(memberId)) {
        const next = prev.filter(id => id !== memberId);
        return next;
      } else {
        return [...prev, memberId];
      }
    });
  }, []);

  const handleSelectAllMembers = useCallback(() => {
    setSelectedMemberIds([]);
  }, []);

  const createEventMutation = useMutation({
    mutationFn: async (event: InsertEvent) => {
      const res = await apiRequest('POST', '/api/events', { ...event, familyId: activeFamilyId });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/events?familyId=' + activeFamilyId] });
    },
  });

  const updateEventMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<InsertEvent> }) => {
      const res = await apiRequest('PUT', `/api/events/${id}`, { ...data, familyId: activeFamilyId });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/events?familyId=' + activeFamilyId] });
    },
  });

  const deleteEventMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest('DELETE', `/api/events/${id}`, { familyId: activeFamilyId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/events?familyId=' + activeFamilyId] });
    },
  });

  const createMemberMutation = useMutation({
    mutationFn: async (member: { name: string; color: string }) => {
      const res = await apiRequest('POST', '/api/family-members', { ...member, familyId: activeFamilyId });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/family-members', activeFamilyId] });
    },
  });

  const updateMemberColorMutation = useMutation({
    mutationFn: async ({ memberId, color }: { memberId: string; color: string }) => {
      const res = await apiRequest('PUT', `/api/family-members/${memberId}`, { color, familyId: activeFamilyId });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/family-members', activeFamilyId] });
    },
  });

  const deleteMemberMutation = useMutation({
    mutationFn: async (memberId: string) => {
      await apiRequest('DELETE', `/api/family-members/${memberId}`, { familyId: activeFamilyId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/family-members', activeFamilyId] });
      queryClient.invalidateQueries({ queryKey: ['/api/events?familyId=' + activeFamilyId] });
    },
  });

  const [tasks] = useState(['Call plumber', 'Order cake', 'Family walk']);

  const handleEventClick = (event: any) => {
    setSelectedEventId(event.id);
    setEventDetailsOpen(true);
  };

  const handleEditFromDetails = () => {
    setEventDetailsOpen(false);
    setEventModalOpen(true);
  };

  const handleSaveEvent = async (eventData: {
    id?: string;
    title: string;
    description?: string;
    startTime: Date;
    endTime: Date;
    memberIds: string[];
    category?: EventCategory;
    rrule?: string | null;
  }) => {
    if (eventData.memberIds.length === 0) return;

    const cat = eventData.category || 'other';
    const color = CATEGORY_CONFIG[cat].color;

    if (eventData.id) {
      await updateEventMutation.mutateAsync({
        id: eventData.id,
        data: {
          title: eventData.title,
          description: eventData.description || undefined,
          startTime: eventData.startTime,
          endTime: eventData.endTime,
          memberIds: eventData.memberIds,
          category: cat,
          color,
        },
      });
    } else {
      await createEventMutation.mutateAsync({
        title: eventData.title,
        description: eventData.description || undefined,
        startTime: eventData.startTime,
        endTime: eventData.endTime,
        memberIds: eventData.memberIds,
        category: cat,
        color,
        ...(eventData.rrule && { rrule: eventData.rrule, isRecurringParent: true }),
      });
    }
  };

  const handleEventDrop = useCallback(async (event: UiEvent, newStart: Date, newEnd: Date) => {
    const realId = event.id.includes('_occ_') ? event.id.split('_occ_')[0] : event.id;
    await updateEventMutation.mutateAsync({
      id: realId,
      data: {
        startTime: newStart,
        endTime: newEnd,
      },
    });
  }, [updateEventMutation]);

  const handleDeleteEvent = async (eventId: string) => {
    const realId = eventId.includes('_occ_') ? eventId.split('_occ_')[0] : eventId;
    await deleteEventMutation.mutateAsync(realId);
  };

  const handleAddEvent = () => {
    setSelectedEventId(undefined);
    setEventModalDate(undefined);
    setEventModalOpen(true);
  };

  const handleAddEventForDate = (date: Date) => {
    setSelectedEventId(undefined);
    setEventModalDate(date);
    setEventModalOpen(true);
  };

  const handleDayClick = (date: Date) => {
    setSelectedDayDate(date);
    setDayEventsOpen(true);
  };

  const handleDateChange = (date: Date) => {
    setCurrentDate(date);
  };

  const handleWeekChange = (date: Date) => {
    setCurrentDate(date);
  };

  const todayEvents = filteredEvents
    .filter(e => isSameDay(e.startTime, currentDate))
    .sort((a, b) => a.startTime.getTime() - b.startTime.getTime());

  const weekEvents = filteredEvents
    .filter(e => isSameWeek(e.startTime, currentDate, { weekStartsOn: 0 }))
    .sort((a, b) => a.startTime.getTime() - b.startTime.getTime());

  const monthEvents = filteredEvents
    .filter(e => isSameMonth(e.startTime, currentDate))
    .sort((a, b) => a.startTime.getTime() - b.startTime.getTime());

  const selectedEvent = selectedEventId ? (() => {
    const found = events.find(e => e.id === selectedEventId);
    if (found) return found;
    const parentId = selectedEventId.includes('_occ_') ? selectedEventId.split('_occ_')[0] : null;
    if (parentId) {
      return events.find(e => e.id === parentId) || events.find(e => (e as any)._parentEventId === parentId);
    }
    return undefined;
  })() : undefined;

  if (isLoading || isLoadingFamily || membersLoading || eventsLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="w-14 h-14 border-3 border-primary/30 border-t-primary rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground text-sm">Loading your calendar...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="sticky top-0 z-40">
        <ViewSwitcherBar currentView={view} onViewChange={setView} layout={layout} onLayoutChange={setLayout} />
        {members.length > 0 && (
          <MemberFilterStrip
            members={members}
            selectedMemberIds={selectedMemberIds}
            onToggleMember={handleToggleMember}
            onSelectAllMembers={handleSelectAllMembers}
            onAddMember={() => setMemberModalOpen(true)}
          />
        )}
        <CalendarAskBar onSelectEvent={handleEventClick} />
      </div>

      <SearchPanel
        isOpen={searchOpen}
        onClose={() => setSearchOpen(false)}
        events={filteredEvents}
        onSelectEvent={handleEventClick}
      />

      <div className={`flex-1 ${layout === 'grid' && view !== 'timeline' && view !== 'year' ? 'flex flex-col overflow-hidden' : view === 'year' ? 'flex flex-col overflow-hidden' : 'overflow-y-auto'}`}>
        {view === 'day' && layout === 'grid' && (
          <DayGridView
            date={currentDate}
            events={todayEvents}
            members={members}
            onEventClick={handleEventClick}
            onAddEvent={can('canCreateEvents') ? handleAddEvent : undefined}
            onAddEventForDate={can('canCreateEvents') ? handleAddEventForDate : undefined}
            onDateChange={handleDateChange}
            onEventDrop={can('canEditEvents') ? handleEventDrop : undefined}
            onEventDelete={can('canDeleteEvents') ? handleDeleteEvent : undefined}
          />
        )}

        {view === 'day' && layout === 'tile' && (
          <TodayView
            date={currentDate}
            events={todayEvents}
            tasks={tasks}
            members={members}
            onEventClick={handleEventClick}
            onViewChange={setView}
            onAddEvent={can('canCreateEvents') ? handleAddEvent : undefined}
          />
        )}

        {view === 'week' && layout === 'grid' && (
          <WeekGridView
            date={currentDate}
            events={weekEvents}
            members={members}
            onEventClick={handleEventClick}
            onAddEvent={can('canCreateEvents') ? handleAddEvent : undefined}
            onAddEventForDate={can('canCreateEvents') ? handleAddEventForDate : undefined}
            onDateChange={handleDateChange}
            onWeekChange={handleWeekChange}
            onEventDrop={can('canEditEvents') ? handleEventDrop : undefined}
            onEventDelete={can('canDeleteEvents') ? handleDeleteEvent : undefined}
          />
        )}

        {view === 'week' && layout === 'tile' && (
          <WeekView
            date={currentDate}
            events={weekEvents}
            members={members}
            onEventClick={handleEventClick}
            onViewChange={setView}
            onAddEvent={can('canCreateEvents') ? handleAddEvent : undefined}
            onAddEventForDate={can('canCreateEvents') ? handleAddEventForDate : undefined}
            onDateChange={handleDateChange}
            onWeekChange={handleWeekChange}
          />
        )}

        {view === 'month' && layout === 'grid' && (
          <MonthGridView
            date={currentDate}
            events={monthEvents}
            members={members}
            onEventClick={handleEventClick}
            onViewChange={setView}
            onAddEvent={can('canCreateEvents') ? handleAddEvent : undefined}
            onAddEventForDate={can('canCreateEvents') ? handleDayClick : undefined}
            onDateChange={handleDateChange}
            onEventDrop={can('canEditEvents') ? handleEventDrop : undefined}
          />
        )}

        {view === 'month' && layout === 'tile' && (
          <MonthView
            date={currentDate}
            events={monthEvents}
            members={members}
            onEventClick={handleEventClick}
            onViewChange={setView}
            onAddEvent={can('canCreateEvents') ? handleAddEvent : undefined}
            onAddEventForDate={can('canCreateEvents') ? handleDayClick : undefined}
            onDateChange={handleDateChange}
          />
        )}

        {view === 'year' && (
          <YearGridView
            date={currentDate}
            events={filteredEvents}
            onDateChange={handleDateChange}
            onMonthClick={(monthDate) => {
              setCurrentDate(monthDate);
              setView('month');
            }}
            onDayClick={(dayDate) => {
              setCurrentDate(dayDate);
              setView('day');
            }}
          />
        )}

        {view === 'timeline' && (
          <TimelineView
            events={filteredEvents}
            onEventClick={handleEventClick}
            onAddEvent={can('canCreateEvents') ? handleAddEvent : undefined}
          />
        )}
      </div>

      {selectedEvent && (
        <EventDetailsDialog
          isOpen={eventDetailsOpen}
          onClose={() => {
            setEventDetailsOpen(false);
            setSelectedEventId(undefined);
          }}
          onEdit={can('canEditEvents') ? handleEditFromDetails : undefined}
          onDelete={can('canDeleteEvents') ? handleDeleteEvent : undefined}
          event={selectedEvent}
        />
      )}

      <EventModal
        isOpen={eventModalOpen}
        onClose={() => {
          setEventModalOpen(false);
          setSelectedEventId(undefined);
          setEventModalDate(undefined);
          setImportedEvent(undefined);
        }}
        onSave={handleSaveEvent}
        onDelete={handleDeleteEvent}
        event={selectedEvent ? {
          ...selectedEvent,
          description: selectedEvent.description || undefined,
          startTime: new Date(selectedEvent.startTime),
          endTime: new Date(selectedEvent.endTime),
          category: (selectedEvent.category as EventCategory) || 'other',
          recurrenceRule: (selectedEvent.recurrenceRule as 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'yearly') || undefined,
          isRecurringParent: selectedEvent.isRecurringParent ?? undefined,
        } : importedEvent ? {
          title: importedEvent.title,
          description: importedEvent.description,
          startTime: importedEvent.startTime,
          endTime: importedEvent.endTime,
          memberIds: [],
        } : undefined}
        members={members}
        selectedDate={eventModalDate}
      />

      <MemberModal
        isOpen={memberModalOpen}
        onClose={() => setMemberModalOpen(false)}
        onSave={async (memberData) => {
          await createMemberMutation.mutateAsync(memberData);
        }}
      />

      <DayEventsDialog
        isOpen={dayEventsOpen}
        onClose={() => setDayEventsOpen(false)}
        date={selectedDayDate}
        events={filteredEvents}
        members={members}
        onEventClick={handleEventClick}
        onAddEvent={can('canCreateEvents') ? () => handleAddEventForDate(selectedDayDate) : undefined}
      />
    </div>
  );
}
