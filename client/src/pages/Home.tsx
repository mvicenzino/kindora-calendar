import { useState, useMemo } from "react";
import Header from "@/components/Header";
import SearchPanel from "@/components/SearchPanel";
import TodayView from "@/components/TodayView";
import WeekView from "@/components/WeekView";
import MonthView from "@/components/MonthView";
import TimelineView from "@/components/TimelineView";
import EventModal from "@/components/EventModal";
import EventDetailsDialog from "@/components/EventDetailsDialog";
import MemberModal from "@/components/MemberModal";
import { isToday, isThisWeek, isThisMonth, startOfWeek, endOfWeek, isSameDay, isSameWeek, isSameMonth } from "date-fns";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { FamilyMember, Event, InsertEvent } from "@shared/schema";
import { mapEventFromDb, mapFamilyMemberFromDb, type UiEvent, type UiFamilyMember } from "@shared/types";

export default function Home() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<'day' | 'week' | 'month' | 'timeline'>('day');
  const [eventModalOpen, setEventModalOpen] = useState(false);
  const [eventDetailsOpen, setEventDetailsOpen] = useState(false);
  const [memberModalOpen, setMemberModalOpen] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState<string>();
  const [searchOpen, setSearchOpen] = useState(false);

  // Fetch family members
  const { data: rawMembers = [] } = useQuery<FamilyMember[]>({
    queryKey: ['/api/family-members'],
  });

  // Fetch events
  const { data: rawEvents = [] } = useQuery<Event[]>({
    queryKey: ['/api/events'],
  });

  // Map to UI types
  const members = useMemo(() => rawMembers.map(mapFamilyMemberFromDb), [rawMembers]);
  const events = useMemo(() => rawEvents.map(e => ({
    ...mapEventFromDb(e),
    members: members.filter(m => m.id === e.memberId)
  })), [rawEvents, members]);

  // Create event mutation
  const createEventMutation = useMutation({
    mutationFn: async (event: InsertEvent) => {
      const res = await apiRequest('POST', '/api/events', event);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/events'] });
    },
  });

  // Update event mutation
  const updateEventMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<InsertEvent> }) => {
      const res = await apiRequest('PUT', `/api/events/${id}`, data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/events'] });
    },
  });

  // Delete event mutation
  const deleteEventMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest('DELETE', `/api/events/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/events'] });
    },
  });

  // Create member mutation
  const createMemberMutation = useMutation({
    mutationFn: async (member: { name: string; color: string }) => {
      const res = await apiRequest('POST', '/api/family-members', member);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/family-members'] });
    },
  });

  // Update member color mutation
  const updateMemberColorMutation = useMutation({
    mutationFn: async ({ memberId, color }: { memberId: string; color: string }) => {
      const res = await apiRequest('PUT', `/api/family-members/${memberId}`, { color });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/family-members'] });
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
    memberId: string;
  }) => {
    const member = members.find(m => m.id === eventData.memberId);
    if (!member) return;

    if (eventData.id) {
      // Update existing event
      await updateEventMutation.mutateAsync({
        id: eventData.id,
        data: {
          title: eventData.title,
          description: eventData.description || undefined,
          startTime: eventData.startTime,
          endTime: eventData.endTime,
          memberId: eventData.memberId,
          color: member.color,
        },
      });
    } else {
      // Create new event
      await createEventMutation.mutateAsync({
        title: eventData.title,
        description: eventData.description || undefined,
        startTime: eventData.startTime,
        endTime: eventData.endTime,
        memberId: eventData.memberId,
        color: member.color,
      });
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    await deleteEventMutation.mutateAsync(eventId);
  };

  const handleAddEvent = () => {
    setSelectedEventId(undefined);
    setEventModalOpen(true);
  };

  const handleDateChange = (date: Date) => {
    setCurrentDate(date);
  };

  const handleWeekChange = (date: Date) => {
    setCurrentDate(date);
  };

  // Filter events for each view (already mapped to UI types)
  const todayEvents = events
    .filter(e => isSameDay(e.startTime, currentDate))
    .sort((a, b) => a.startTime.getTime() - b.startTime.getTime());

  const weekEvents = events
    .filter(e => isSameWeek(e.startTime, currentDate, { weekStartsOn: 0 }))
    .sort((a, b) => a.startTime.getTime() - b.startTime.getTime());

  const monthEvents = events
    .filter(e => isSameMonth(e.startTime, currentDate))
    .sort((a, b) => a.startTime.getTime() - b.startTime.getTime());

  const selectedEvent = selectedEventId ? events.find(e => e.id === selectedEventId) : undefined;

  const handleMemberColorChange = async (memberId: string, color: string) => {
    await updateMemberColorMutation.mutateAsync({ memberId, color });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#4A5A6A] via-[#5A6A7A] to-[#6A7A8A]">
      <Header 
        currentView={view} 
        onViewChange={setView} 
        members={members}
        onMemberColorChange={handleMemberColorChange}
        onSearchClick={() => setSearchOpen(true)}
      />
      
      <SearchPanel
        isOpen={searchOpen}
        onClose={() => setSearchOpen(false)}
        events={events}
        onSelectEvent={handleEventClick}
      />
      
      {view === 'day' && (
        <TodayView
          date={currentDate}
          events={todayEvents}
          tasks={tasks}
          onEventClick={handleEventClick}
          onViewChange={setView}
          onAddEvent={handleAddEvent}
        />
      )}
      
      {view === 'week' && (
        <WeekView
          date={currentDate}
          events={weekEvents}
          members={members}
          onEventClick={handleEventClick}
          onViewChange={setView}
          onAddEvent={handleAddEvent}
          onDateChange={handleDateChange}
          onWeekChange={handleWeekChange}
        />
      )}

      {view === 'month' && (
        <MonthView
          date={currentDate}
          events={monthEvents}
          members={members}
          onEventClick={handleEventClick}
          onViewChange={setView}
          onAddEvent={handleAddEvent}
          onDateChange={handleDateChange}
        />
      )}

      {view === 'timeline' && (
        <TimelineView
          events={events}
          onEventClick={handleEventClick}
          onAddEvent={handleAddEvent}
        />
      )}

      {/* Event Details Dialog */}
      {selectedEvent && (
        <EventDetailsDialog
          isOpen={eventDetailsOpen}
          onClose={() => {
            setEventDetailsOpen(false);
            setSelectedEventId(undefined);
          }}
          onEdit={handleEditFromDetails}
          event={selectedEvent}
        />
      )}

      {/* Event Modal */}
      <EventModal
        isOpen={eventModalOpen}
        onClose={() => {
          setEventModalOpen(false);
          setSelectedEventId(undefined);
        }}
        onSave={handleSaveEvent}
        onDelete={handleDeleteEvent}
        event={selectedEvent ? {
          ...selectedEvent,
          description: selectedEvent.description || undefined,
          startTime: new Date(selectedEvent.startTime),
          endTime: new Date(selectedEvent.endTime)
        } : undefined}
        members={members}
      />

      <MemberModal
        isOpen={memberModalOpen}
        onClose={() => setMemberModalOpen(false)}
        onSave={async (memberData) => {
          await createMemberMutation.mutateAsync(memberData);
        }}
      />
    </div>
  );
}
