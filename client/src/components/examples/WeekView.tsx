import WeekView from '../WeekView';

export default function WeekViewExample() {
  const mockMembers = [
    { id: '1', name: 'Mike V', color: '#8B5CF6', initials: 'MV' },
    { id: '2', name: 'Claire', color: '#EC4899', initials: 'C' },
  ];

  const today = new Date();
  const mockEvents = [
    {
      id: '1',
      title: 'Dinner with Carolyn',
      startTime: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 3, 17, 30),
      endTime: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 3, 19, 0),
      members: [mockMembers[0]],
    },
    {
      id: '2',
      title: 'Project Meeting',
      startTime: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 2, 13, 0),
      endTime: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 2, 14, 0),
      members: [mockMembers[1]],
      categories: ['Work'],
    },
    {
      id: '3',
      title: 'Grocery Shopping',
      startTime: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 4, 11, 0),
      endTime: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 4, 12, 0),
      members: [mockMembers[0]],
    },
    {
      id: '4',
      title: 'Workout',
      startTime: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 2, 9, 0),
      endTime: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 2, 10, 0),
      members: [mockMembers[0]],
      categories: ['Health'],
    },
  ];

  return (
    <WeekView
      date={new Date()}
      events={mockEvents}
      members={mockMembers}
      onEventClick={(event) => console.log('Event clicked:', event.title)}
    />
  );
}
