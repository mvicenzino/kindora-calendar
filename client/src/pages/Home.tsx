import { useState } from "react";
import CalendarHeader from "@/components/CalendarHeader";
import CalendarGrid from "@/components/CalendarGrid";
import FamilySidebar from "@/components/FamilySidebar";
import EventModal from "@/components/EventModal";
import MemberModal from "@/components/MemberModal";
import ThemeToggle from "@/components/ThemeToggle";
import { addMonths, subMonths } from "date-fns";

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
}

export default function Home() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<"month" | "week" | "day">("month");
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [eventModalOpen, setEventModalOpen] = useState(false);
  const [memberModalOpen, setMemberModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | undefined>();

  // todo: remove mock functionality - Mock data for demonstration
  const [members, setMembers] = useState<FamilyMember[]>([
    { id: '1', name: 'Sarah Johnson', color: '#8B5CF6' },
    { id: '2', name: 'Mike Johnson', color: '#EC4899' },
    { id: '3', name: 'Emma Johnson', color: '#10B981' },
    { id: '4', name: 'Noah Johnson', color: '#F59E0B' },
  ]);

  const [selectedMembers, setSelectedMembers] = useState<string[]>(
    members.map(m => m.id)
  );

  // todo: remove mock functionality - Mock events
  const [events, setEvents] = useState<Event[]>([
    {
      id: '1',
      title: 'Team Meeting',
      description: 'Monthly team sync',
      startTime: new Date(2025, 10, 15, 10, 0),
      endTime: new Date(2025, 10, 15, 11, 0),
      color: '#8B5CF6',
      memberId: '1'
    },
    {
      id: '2',
      title: 'Soccer Practice',
      description: 'Weekly practice session',
      startTime: new Date(2025, 10, 15, 16, 0),
      endTime: new Date(2025, 10, 15, 17, 30),
      color: '#EC4899',
      memberId: '2'
    },
    {
      id: '3',
      title: 'Dentist Appointment',
      startTime: new Date(2025, 10, 18, 14, 0),
      endTime: new Date(2025, 10, 18, 15, 0),
      color: '#10B981',
      memberId: '3'
    },
    {
      id: '4',
      title: 'Piano Lesson',
      startTime: new Date(2025, 10, 20, 15, 0),
      endTime: new Date(2025, 10, 20, 16, 0),
      color: '#F59E0B',
      memberId: '4'
    },
    {
      id: '5',
      title: 'Family Dinner',
      description: 'Celebrating anniversary',
      startTime: new Date(2025, 10, 22, 18, 30),
      endTime: new Date(2025, 10, 22, 20, 0),
      color: '#8B5CF6',
      memberId: '1'
    },
  ]);

  const filteredEvents = events.filter(event => 
    selectedMembers.includes(event.memberId)
  );

  const handleAddEvent = () => {
    setSelectedEvent(undefined);
    setEventModalOpen(true);
  };

  const handleEventClick = (event: Event) => {
    setSelectedEvent(event);
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

  const handleAddMember = (memberData: { name: string; color: string }) => {
    const newMember: FamilyMember = {
      id: Date.now().toString(),
      name: memberData.name,
      color: memberData.color,
    };
    setMembers(prev => [...prev, newMember]);
    setSelectedMembers(prev => [...prev, newMember.id]);
  };

  const handleToggleMember = (memberId: string) => {
    setSelectedMembers(prev => 
      prev.includes(memberId)
        ? prev.filter(id => id !== memberId)
        : [...prev, memberId]
    );
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <FamilySidebar
        members={members}
        selectedMembers={selectedMembers}
        onToggleMember={handleToggleMember}
        onAddMember={() => setMemberModalOpen(true)}
      />

      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-6 py-3 backdrop-blur-xl bg-card/30 border-b border-card-border">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-primary/10">
              <span className="text-2xl">📅</span>
            </div>
            <h1 className="text-xl font-bold">Family Calendar</h1>
          </div>
          <ThemeToggle />
        </div>

        <CalendarHeader
          currentDate={currentDate}
          onPreviousMonth={() => setCurrentDate(prev => subMonths(prev, 1))}
          onNextMonth={() => setCurrentDate(prev => addMonths(prev, 1))}
          onToday={() => setCurrentDate(new Date())}
          onAddEvent={handleAddEvent}
          view={view}
          onViewChange={setView}
        />

        <div className="flex-1 overflow-y-auto">
          <CalendarGrid
            currentDate={currentDate}
            events={filteredEvents}
            onDayClick={(date) => {
              setSelectedDate(date);
              setSelectedEvent(undefined);
              setEventModalOpen(true);
            }}
            onEventClick={handleEventClick}
            selectedDate={selectedDate}
          />
        </div>
      </div>

      <EventModal
        isOpen={eventModalOpen}
        onClose={() => {
          setEventModalOpen(false);
          setSelectedEvent(undefined);
        }}
        onSave={handleSaveEvent}
        onDelete={handleDeleteEvent}
        event={selectedEvent}
        members={members}
        selectedDate={selectedDate}
      />

      <MemberModal
        isOpen={memberModalOpen}
        onClose={() => setMemberModalOpen(false)}
        onSave={handleAddMember}
      />
    </div>
  );
}
