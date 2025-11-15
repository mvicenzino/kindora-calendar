import { useState } from "react";
import TodayView from "@/components/TodayView";
import WeekView from "@/components/WeekView";
import MonthView from "@/components/MonthView";
import TimelineView from "@/components/TimelineView";
import EventModal from "@/components/EventModal";
import EventDetailView from "@/components/EventDetailView";
import MemberModal from "@/components/MemberModal";
import { isToday, isThisWeek, isThisMonth, startOfWeek, endOfWeek, isSameDay, isSameWeek, isSameMonth } from "date-fns";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { FamilyMember, Event, InsertEvent } from "@shared/schema";

interface TodayEvent {
  id: string;
  title: string;
  startTime: Date;
  endTime: Date;
  timeOfDay?: string;
  members: { id: string; name: string; color: string; initials: string }[];
  categories?: string[];
  isFocus?: boolean;
}

export default function Home() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<'day' | 'week' | 'month' | 'timeline'>('day');
  const [eventModalOpen, setEventModalOpen] = useState(false);
  const [eventDetailOpen, setEventDetailOpen] = useState(false);
  const [memberModalOpen, setMemberModalOpen] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState<string>();

  // Fetch family members
  const { data: members = [] } = useQuery<FamilyMember[]>({
    queryKey: ['/api/family-members'],
  });

  // Fetch events
  const { data: events = [] } = useQuery<Event[]>({
    queryKey: ['/api/events'],
  });

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

  const [tasks] = useState(['Call plumber', 'Order cake', 'Family walk']);

  const handleEventClick = (event: TodayEvent) => {
    setSelectedEventId(event.id);
    setEventDetailOpen(true);
  };

  const handleOpenEditFromDetail = () => {
    setEventDetailOpen(false);
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

  // Convert events to today view format
  const todayEvents: TodayEvent[] = events
    .filter(e => isSameDay(new Date(e.startTime), currentDate))
    .map(e => {
      const eventMembers = members
        .filter(m => m.id === e.memberId)
        .map(m => ({
          ...m,
          initials: m.name.split(' ').map(n => n[0]).join('').toUpperCase()
        }));
      
      // Determine category based on title
      let categories: string[] | undefined;
      if (e.title.toLowerCase().includes('mom') || e.title.toLowerCase().includes('birthday')) {
        categories = ['Family'];
      } else if (e.title.toLowerCase().includes('meeting') || e.title.toLowerCase().includes('client')) {
        categories = ['Work'];
      } else if (e.title.toLowerCase().includes('gym') || e.title.toLowerCase().includes('yoga')) {
        categories = ['Health'];
      }
      
      return {
        id: e.id,
        title: e.title,
        startTime: new Date(e.startTime),
        endTime: new Date(e.endTime),
        members: eventMembers,
        categories,
        isFocus: false // Remove focus event concept
      };
    })
    .sort((a, b) => a.startTime.getTime() - b.startTime.getTime()); // Sort purely by time

  // Convert events to week view format
  const weekEvents = events
    .filter(e => isSameWeek(new Date(e.startTime), currentDate, { weekStartsOn: 0 }))
    .map(e => {
      const eventMembers = members
        .filter(m => m.id === e.memberId)
        .map(m => ({
          ...m,
          initials: m.name.split(' ').map(n => n[0]).join('').toUpperCase()
        }));
      
      let categories: string[] | undefined;
      if (e.title.toLowerCase().includes('mom') || e.title.toLowerCase().includes('birthday')) {
        categories = ['Family'];
      } else if (e.title.toLowerCase().includes('meeting') || e.title.toLowerCase().includes('client') || e.title.toLowerCase().includes('project')) {
        categories = ['Work'];
      } else if (e.title.toLowerCase().includes('gym') || e.title.toLowerCase().includes('yoga') || e.title.toLowerCase().includes('workout')) {
        categories = ['Health'];
      }
      
      return {
        id: e.id,
        title: e.title,
        startTime: new Date(e.startTime),
        endTime: new Date(e.endTime),
        members: eventMembers,
        categories
      };
    })
    .sort((a, b) => a.startTime.getTime() - b.startTime.getTime());

  // Convert events to month view format
  const monthEvents = events
    .filter(e => isSameMonth(new Date(e.startTime), currentDate))
    .map(e => {
      const eventMembers = members
        .filter(m => m.id === e.memberId)
        .map(m => ({
          ...m,
          initials: m.name.split(' ').map(n => n[0]).join('').toUpperCase()
        }));
      
      let categories: string[] | undefined;
      if (e.title.toLowerCase().includes('mom') || e.title.toLowerCase().includes('birthday')) {
        categories = ['Family'];
      } else if (e.title.toLowerCase().includes('meeting') || e.title.toLowerCase().includes('client') || e.title.toLowerCase().includes('project')) {
        categories = ['Work'];
      } else if (e.title.toLowerCase().includes('gym') || e.title.toLowerCase().includes('yoga') || e.title.toLowerCase().includes('workout')) {
        categories = ['Health'];
      }
      
      return {
        id: e.id,
        title: e.title,
        startTime: new Date(e.startTime),
        endTime: new Date(e.endTime),
        members: eventMembers,
        categories
      };
    })
    .sort((a, b) => a.startTime.getTime() - b.startTime.getTime());

  // Convert events to timeline view format (all events, no date filtering)
  const timelineEvents = events
    .map(e => {
      const eventMembers = members
        .filter(m => m.id === e.memberId)
        .map(m => ({
          ...m,
          initials: m.name.split(' ').map(n => n[0]).join('').toUpperCase()
        }));
      
      let categories: string[] | undefined;
      if (e.title.toLowerCase().includes('mom') || e.title.toLowerCase().includes('birthday')) {
        categories = ['Family'];
      } else if (e.title.toLowerCase().includes('meeting') || e.title.toLowerCase().includes('client') || e.title.toLowerCase().includes('project')) {
        categories = ['Work'];
      } else if (e.title.toLowerCase().includes('gym') || e.title.toLowerCase().includes('yoga') || e.title.toLowerCase().includes('workout')) {
        categories = ['Health'];
      }
      
      return {
        id: e.id,
        title: e.title,
        description: e.description,
        startTime: new Date(e.startTime),
        endTime: new Date(e.endTime),
        members: eventMembers,
        categories
      };
    })
    .sort((a, b) => a.startTime.getTime() - b.startTime.getTime());

  const selectedEvent = selectedEventId ? events.find(e => e.id === selectedEventId) : undefined;
  const selectedEventMember = selectedEvent ? members.find(m => m.id === selectedEvent.memberId) : undefined;

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#4A5A6A] via-[#5A6A7A] to-[#6A7A8A]">
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
          members={members.map(m => ({
            ...m,
            initials: m.name.split(' ').map(n => n[0]).join('').toUpperCase()
          }))}
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
          members={members.map(m => ({
            ...m,
            initials: m.name.split(' ').map(n => n[0]).join('').toUpperCase()
          }))}
          onEventClick={handleEventClick}
          onViewChange={setView}
          onAddEvent={handleAddEvent}
        />
      )}

      {view === 'timeline' && (
        <TimelineView
          events={timelineEvents}
          onEventClick={handleEventClick}
          onViewChange={setView}
          onAddEvent={handleAddEvent}
        />
      )}

      <EventDetailView
        isOpen={eventDetailOpen}
        onClose={() => {
          setEventDetailOpen(false);
          setSelectedEventId(undefined);
        }}
        onEdit={handleOpenEditFromDetail}
        event={selectedEvent ? {
          ...selectedEvent,
          startTime: new Date(selectedEvent.startTime),
          endTime: new Date(selectedEvent.endTime)
        } : undefined}
        member={selectedEventMember}
      />

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
