import { useState } from "react";
import TodayView from "@/components/TodayView";
import EventModal from "@/components/EventModal";
import MemberModal from "@/components/MemberModal";
import { isToday } from "date-fns";

interface FamilyMember {
  id: string;
  name: string;
  color: string;
  avatar?: string;
}

interface Event {
  id: string;
  title: string;
  description?: string;
  startTime: Date;
  endTime: Date;
  memberId: string;
  color: string;
  categories?: string[];
  isFocus?: boolean;
}

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

  // todo: remove mock functionality - Mock data for demonstration
  const [members, setMembers] = useState<FamilyMember[]>([
    { id: '1', name: 'Mike V', color: '#8B5CF6' },
    { id: '2', name: 'Claire V', color: '#EC4899' },
  ]);

  // todo: remove mock functionality - Mock events
  const [events, setEvents] = useState<Event[]>([
    {
      id: '1',
      title: 'Date Night',
      description: 'Evening out',
      startTime: new Date(2025, 10, 15, 19, 30),
      endTime: new Date(2025, 10, 16, 0, 30),
      color: '#8B5CF6',
      memberId: '1',
      isFocus: true
    },
    {
      id: '2',
      title: 'Brunch with Mom',
      description: 'Family time',
      startTime: new Date(2025, 10, 15, 15, 0),
      endTime: new Date(2025, 10, 15, 16, 0),
      color: '#EC4899',
      memberId: '2',
      categories: ['Family', 'Work']
    },
    {
      id: '3',
      title: 'Yoga',
      startTime: new Date(2025, 10, 15, 17, 30),
      endTime: new Date(2025, 10, 15, 18, 30),
      color: '#8B5CF6',
      memberId: '1',
      categories: ['Health']
    },
  ]);

  const [tasks, setTasks] = useState(['Call plumber', 'Order cake', 'Family walk']);

  const handleEventClick = (event: TodayEvent) => {
    setSelectedEventId(event.id);
    setEventModalOpen(true);
  };

  const handleSaveEvent = (eventData: Omit<Event, 'id' | 'color'> & { id?: string }) => {
    const member = members.find(m => m.id === eventData.memberId);
    if (!member) return;

    if (eventData.id) {
      // Update existing event
      setEvents(prev => prev.map(e => 
        e.id === eventData.id 
          ? { ...eventData, id: e.id, color: member.color }
          : e
      ));
    } else {
      // Create new event
      const newEvent: Event = {
        ...eventData,
        id: Date.now().toString(),
        color: member.color,
      };
      setEvents(prev => [...prev, newEvent]);
    }
  };

  const handleDeleteEvent = (eventId: string) => {
    setEvents(prev => prev.filter(e => e.id !== eventId));
  };

  // Convert events to today view format
  const todayEvents: TodayEvent[] = events
    .filter(e => isToday(e.startTime))
    .map(e => {
      const eventMembers = members
        .filter(m => m.id === e.memberId || e.id === '1')
        .map(m => ({
          ...m,
          initials: m.name.split(' ').map(n => n[0]).join('').toUpperCase()
        }));
      
      return {
        id: e.id,
        title: e.title,
        startTime: e.startTime,
        endTime: e.endTime,
        members: eventMembers,
        categories: e.categories,
        isFocus: e.isFocus
      };
    });

  const selectedEvent = selectedEventId ? events.find(e => e.id === selectedEventId) : undefined;

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#6B7A9E] via-[#7B8AAE] to-[#8B9ABE]">
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
        event={selectedEvent}
        members={members}
      />

      <MemberModal
        isOpen={memberModalOpen}
        onClose={() => setMemberModalOpen(false)}
        onSave={(memberData) => {
          const newMember: FamilyMember = {
            id: Date.now().toString(),
            name: memberData.name,
            color: memberData.color,
          };
          setMembers(prev => [...prev, newMember]);
        }}
      />
    </div>
  );
}
