import { useState } from "react";
import TodayView from "@/components/TodayView";
import EventModal from "@/components/EventModal";
import MemberModal from "@/components/MemberModal";
import { isToday } from "date-fns";
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
  const [currentDate] = useState(new Date());
  const [eventModalOpen, setEventModalOpen] = useState(false);
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
      return await apiRequest('/api/events', {
        method: 'POST',
        body: JSON.stringify(event),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/events'] });
    },
  });

  // Update event mutation
  const updateEventMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<InsertEvent> }) => {
      return await apiRequest(`/api/events/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/events'] });
    },
  });

  // Delete event mutation
  const deleteEventMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest(`/api/events/${id}`, {
        method: 'DELETE',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/events'] });
    },
  });

  // Create member mutation
  const createMemberMutation = useMutation({
    mutationFn: async (member: { name: string; color: string }) => {
      return await apiRequest('/api/family-members', {
        method: 'POST',
        body: JSON.stringify(member),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/family-members'] });
    },
  });

  const [tasks] = useState(['Call plumber', 'Order cake', 'Family walk']);

  const handleEventClick = (event: TodayEvent) => {
    setSelectedEventId(event.id);
    setEventModalOpen(true);
  };

  const handleSaveEvent = async (eventData: Omit<Event, 'id' | 'color'> & { id?: string }) => {
    const member = members.find(m => m.id === eventData.memberId);
    if (!member) return;

    if (eventData.id) {
      // Update existing event
      await updateEventMutation.mutateAsync({
        id: eventData.id,
        data: {
          title: eventData.title,
          description: eventData.description,
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
        description: eventData.description,
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

  // Convert events to today view format
  const todayEvents: TodayEvent[] = events
    .filter(e => isToday(new Date(e.startTime)))
    .map(e => {
      // For the focus event (Date Night), include both members
      const isFocusEvent = e.title.toLowerCase().includes('date night');
      
      const eventMembers = isFocusEvent 
        ? members.slice(0, 2).map(m => ({
            ...m,
            initials: m.name.split(' ').map(n => n[0]).join('').toUpperCase()
          }))
        : members
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
        isFocus: isFocusEvent
      };
    })
    .sort((a, b) => {
      // Focus events first
      if (a.isFocus && !b.isFocus) return -1;
      if (!a.isFocus && b.isFocus) return 1;
      // Then by start time
      return a.startTime.getTime() - b.startTime.getTime();
    });

  const selectedEvent = selectedEventId ? events.find(e => e.id === selectedEventId) : undefined;

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#4A5A6A] via-[#5A6A7A] to-[#6A7A8A]">
      <TodayView
        date={currentDate}
        events={todayEvents}
        tasks={tasks}
        onEventClick={handleEventClick}
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
