import TodayView from '../TodayView';

export default function TodayViewExample() {
  const mockMembers = [
    { id: '1', name: 'Mike', color: '#8B5CF6', initials: 'MV' },
    { id: '2', name: 'Claire', color: '#EC4899', initials: 'CV' },
  ];

  const mockEvents = [
    {
      id: '1',
      title: 'Date Night',
      startTime: new Date(2025, 10, 15, 19, 30),
      endTime: new Date(2025, 10, 16, 0, 30),
      timeOfDay: 'Late Morning',
      members: [mockMembers[0], mockMembers[1]],
      isFocus: true,
    },
    {
      id: '2',
      title: 'Brunch with Mom',
      startTime: new Date(2025, 10, 15, 15, 0),
      endTime: new Date(2025, 10, 15, 16, 0),
      timeOfDay: 'Afternoon',
      members: [mockMembers[0], mockMembers[1]],
      categories: ['Family', 'Work'],
      isFocus: false,
    },
    {
      id: '3',
      title: 'Yoga',
      startTime: new Date(2025, 10, 15, 17, 30),
      endTime: new Date(2025, 10, 15, 18, 30),
      timeOfDay: 'Evening',
      members: [mockMembers[0]],
      categories: ['Health'],
      isFocus: false,
    },
  ];

  const mockTasks = ['Call plumber', 'Order cake', 'Family walk'];

  return (
    <TodayView
      date={new Date(2025, 10, 15)}
      events={mockEvents}
      tasks={mockTasks}
      onEventClick={(event) => console.log('Event clicked:', event.title)}
    />
  );
}
