import { useState } from "react";
import Header from "@/components/Header";
import TodayView from "@/components/TodayView";
import WeekView from "@/components/WeekView";
import MonthView from "@/components/MonthView";
import TimelineView from "@/components/TimelineView";
import EventModal from "@/components/EventModal";
import EventDetailView from "@/components/EventDetailView";
import MemberModal from "@/components/MemberModal";
import ProfileModal from "@/components/ProfileModal";
import MessagesModal from "@/components/MessagesModal";
import EventNotification from "@/components/EventNotification";
import DayTimelineModal from "@/components/DayTimelineModal";
import { isToday, isThisWeek, isThisMonth, startOfWeek, endOfWeek, isSameDay, isSameWeek, isSameMonth } from "date-fns";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useEventNotifications } from "@/hooks/useEventNotifications";
import type { FamilyMember, Event, InsertEvent, Message } from "@shared/schema";

interface TodayEvent {
  id: string;
  title: string;
  startTime: Date;
  endTime: Date;
  timeOfDay?: string;
  members: { id: string; name: string; color: string; initials: string }[];
  categories?: string[];
  isFocus?: boolean;
  photoUrl?: string | null;
}

export default function Home() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<'day' | 'week' | 'month' | 'timeline'>('day');
  const [eventModalOpen, setEventModalOpen] = useState(false);
  const [eventDetailOpen, setEventDetailOpen] = useState(false);
  const [memberModalOpen, setMemberModalOpen] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [messagesModalOpen, setMessagesModalOpen] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState<string>();
  const [selectedMemberId, setSelectedMemberId] = useState<string>();
  const [selectedDateForNewEvent, setSelectedDateForNewEvent] = useState<Date | undefined>();
  const [dayTimelineModalOpen, setDayTimelineModalOpen] = useState(false);
  const [selectedTimelineDate, setSelectedTimelineDate] = useState<Date | undefined>();

  // Fetch family members
  const { data: members = [] } = useQuery<FamilyMember[]>({
    queryKey: ['/api/family-members'],
  });

  // Fetch events
  const { data: events = [] } = useQuery<Event[]>({
    queryKey: ['/api/events'],
  });

  // Fetch messages
  const { data: messages = [] } = useQuery<Message[]>({
    queryKey: ['/api/messages'],
  });

  // Event notifications - converts events with Date objects for the hook
  const eventsWithDates = events.map(e => ({
    ...e,
    description: e.description || undefined,
    startTime: new Date(e.startTime),
    endTime: new Date(e.endTime)
  }));
  
  const { notificationEvent, isNotificationOpen, closeNotification } = useEventNotifications(eventsWithDates);

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
    memberIds: string[];
  }) => {
    // Use first member's color for event background
    const firstMember = members.find(m => m.id === eventData.memberIds[0]);
    if (!firstMember || eventData.memberIds.length === 0) return;

    if (eventData.id) {
      // Update existing event
      await updateEventMutation.mutateAsync({
        id: eventData.id,
        data: {
          title: eventData.title,
          description: eventData.description || undefined,
          startTime: eventData.startTime,
          endTime: eventData.endTime,
          memberIds: eventData.memberIds,
          color: firstMember.color,
        },
      });
    } else {
      // Create new event
      await createEventMutation.mutateAsync({
        title: eventData.title,
        description: eventData.description || undefined,
        startTime: eventData.startTime,
        endTime: eventData.endTime,
        memberIds: eventData.memberIds,
        color: firstMember.color,
      });
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    await deleteEventMutation.mutateAsync(eventId);
  };

  const handleAddEvent = (date?: Date) => {
    setSelectedEventId(undefined);
    setSelectedDateForNewEvent(date);
    setEventModalOpen(true);
  };

  const handleDateChange = (date: Date) => {
    setCurrentDate(date);
  };

  const handleWeekChange = (date: Date) => {
    setCurrentDate(date);
  };

  const handleDateSelect = (date: Date) => {
    setSelectedTimelineDate(date);
    setDayTimelineModalOpen(true);
  };

  const handleAddEventForTimeline = () => {
    setDayTimelineModalOpen(false);
    if (selectedTimelineDate) {
      handleAddEvent(selectedTimelineDate);
    }
  };

  // Convert events to today view format
  const todayEvents: TodayEvent[] = events
    .filter(e => isSameDay(new Date(e.startTime), currentDate))
    .map(e => {
      const eventMembers = members
        .filter(m => e.memberIds.includes(m.id))
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
        isFocus: false, // Remove focus event concept
        photoUrl: e.photoUrl
      };
    })
    .sort((a, b) => a.startTime.getTime() - b.startTime.getTime()); // Sort purely by time

  // Convert events to week view format
  const weekEvents = events
    .filter(e => isSameWeek(new Date(e.startTime), currentDate, { weekStartsOn: 1 }))
    .map(e => {
      const eventMembers = members
        .filter(m => e.memberIds.includes(m.id))
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
        categories,
        photoUrl: e.photoUrl
      };
    })
    .sort((a, b) => a.startTime.getTime() - b.startTime.getTime());

  // Convert events to month view format
  const monthEvents = events
    .filter(e => isSameMonth(new Date(e.startTime), currentDate))
    .map(e => {
      const eventMembers = members
        .filter(m => e.memberIds.includes(m.id))
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
        categories,
        photoUrl: e.photoUrl
      };
    })
    .sort((a, b) => a.startTime.getTime() - b.startTime.getTime());

  // Convert events to timeline view format (all events, sorted newest first)
  const timelineEvents = events
    .map(e => {
      const eventMembers = members
        .filter(m => e.memberIds.includes(m.id))
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
        description: e.description || undefined,
        startTime: new Date(e.startTime),
        endTime: new Date(e.endTime),
        members: eventMembers,
        categories,
        photoUrl: e.photoUrl
      };
    })
    .sort((a, b) => b.startTime.getTime() - a.startTime.getTime()); // Reversed: newest first

  // Convert events for day timeline modal (filtered by selected date)
  const dayTimelineEvents = selectedTimelineDate
    ? events
        .filter(e => isSameDay(new Date(e.startTime), selectedTimelineDate))
        .map(e => {
          const eventMembers = members
            .filter(m => e.memberIds.includes(m.id))
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
            description: e.description || undefined,
            startTime: new Date(e.startTime),
            endTime: new Date(e.endTime),
            members: eventMembers,
            categories,
            photoUrl: e.photoUrl
          };
        })
        .sort((a, b) => a.startTime.getTime() - b.startTime.getTime())
    : [];

  const selectedEvent = selectedEventId ? events.find(e => e.id === selectedEventId) : undefined;
  const selectedEventMembers = selectedEvent ? members.filter(m => selectedEvent.memberIds.includes(m.id)) : [];

  const handleMessagesClick = () => {
    setMessagesModalOpen(true);
  };

  const handleProfileClick = () => {
    setProfileModalOpen(true);
  };

  const handleEditMember = (member: FamilyMember) => {
    setSelectedMemberId(member.id);
    setProfileModalOpen(false);
    setMemberModalOpen(true);
  };

  const handleAddMemberFromProfile = () => {
    setSelectedMemberId(undefined);
    setProfileModalOpen(false);
    setMemberModalOpen(true);
  };

  return (
    <div className="min-h-screen h-screen bg-gradient-to-br from-[#4A5A6A] via-[#5A6A7A] to-[#6A7A8A] flex flex-col overflow-hidden">
      <Header 
        onMessagesClick={handleMessagesClick}
        onProfileClick={handleProfileClick}
      />
      
      <div className="flex-1 overflow-y-auto overflow-x-hidden">
        {view === 'day' && (
        <TodayView
          date={currentDate}
          events={todayEvents}
          tasks={tasks}
          messages={messages.map(m => ({
            ...m,
            createdAt: new Date(m.createdAt)
          }))}
          onEventClick={handleEventClick}
          onViewChange={setView}
          onAddEvent={handleAddEvent}
          onDeleteEvent={handleDeleteEvent}
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
          messages={messages.map(m => ({
            ...m,
            createdAt: new Date(m.createdAt)
          }))}
          onEventClick={handleEventClick}
          onViewChange={setView}
          onAddEvent={handleAddEvent}
          onDateChange={handleDateChange}
          onWeekChange={handleWeekChange}
          onDeleteEvent={handleDeleteEvent}
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
          messages={messages.map(m => ({
            ...m,
            createdAt: new Date(m.createdAt)
          }))}
          onEventClick={handleEventClick}
          onViewChange={setView}
          onAddEvent={handleAddEvent}
          onDateSelect={handleDateSelect}
        />
      )}

      {view === 'timeline' && (
        <TimelineView
          events={timelineEvents}
          messages={messages.map(m => ({
            ...m,
            createdAt: new Date(m.createdAt)
          }))}
          onEventClick={handleEventClick}
          onViewChange={setView}
          onAddEvent={handleAddEvent}
          onDeleteEvent={handleDeleteEvent}
        />
      )}
      </div>

      <EventDetailView
        isOpen={eventDetailOpen}
        onClose={() => {
          setEventDetailOpen(false);
          setSelectedEventId(undefined);
        }}
        onEdit={handleOpenEditFromDetail}
        event={selectedEvent ? {
          ...selectedEvent,
          description: selectedEvent.description || undefined,
          startTime: new Date(selectedEvent.startTime),
          endTime: new Date(selectedEvent.endTime)
        } : undefined}
        members={selectedEventMembers}
        allMembers={members}
      />

      <EventModal
        isOpen={eventModalOpen}
        onClose={() => {
          setEventModalOpen(false);
          setSelectedEventId(undefined);
          setSelectedDateForNewEvent(undefined);
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
        selectedDate={selectedDateForNewEvent}
        onAddMember={() => setMemberModalOpen(true)}
      />

      <MemberModal
        isOpen={memberModalOpen}
        onClose={() => {
          setMemberModalOpen(false);
          setSelectedMemberId(undefined);
        }}
        onSave={async (memberData) => {
          await createMemberMutation.mutateAsync(memberData);
          setMemberModalOpen(false);
          setProfileModalOpen(true);
        }}
      />

      <ProfileModal
        isOpen={profileModalOpen}
        onClose={() => setProfileModalOpen(false)}
        members={members.map(m => ({
          ...m,
          initials: m.name.split(' ').map(n => n[0]).join('').toUpperCase()
        }))}
        onEditMember={handleEditMember}
        onAddMember={handleAddMemberFromProfile}
      />

      <MessagesModal
        isOpen={messagesModalOpen}
        onOpenChange={setMessagesModalOpen}
        messages={messages.map(m => ({
          ...m,
          createdAt: new Date(m.createdAt)
        }))}
        events={events.map(e => ({
          ...e,
          startTime: new Date(e.startTime),
          endTime: new Date(e.endTime)
        }))}
      />

      <EventNotification
        isOpen={isNotificationOpen}
        onClose={closeNotification}
        event={notificationEvent || undefined}
        members={notificationEvent ? members.filter(m => notificationEvent.memberIds.includes(m.id)) : []}
      />

      <DayTimelineModal
        isOpen={dayTimelineModalOpen}
        onClose={() => {
          setDayTimelineModalOpen(false);
          setSelectedTimelineDate(undefined);
        }}
        date={selectedTimelineDate || new Date()}
        events={dayTimelineEvents}
        messages={messages.map(m => ({
          ...m,
          createdAt: new Date(m.createdAt)
        }))}
        onEventClick={handleEventClick}
        onAddEvent={handleAddEventForTimeline}
        onDeleteEvent={handleDeleteEvent}
      />
    </div>
  );
}
