import CalendarGrid from '../CalendarGrid';
import { useState } from 'react';

export default function CalendarGridExample() {
  const [currentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date>();

  const mockEvents = [
    {
      id: '1',
      title: 'Team Meeting',
      startTime: new Date(2025, 10, 15, 10, 0),
      endTime: new Date(2025, 10, 15, 11, 0),
      color: '#8B5CF6',
      memberId: '1'
    },
    {
      id: '2',
      title: 'Soccer Practice',
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
    }
  ];

  return (
    <CalendarGrid
      currentDate={currentDate}
      events={mockEvents}
      onDayClick={setSelectedDate}
      onEventClick={(event) => console.log('Event clicked:', event.title)}
      selectedDate={selectedDate}
    />
  );
}
