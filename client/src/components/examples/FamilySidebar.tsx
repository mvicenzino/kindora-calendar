import FamilySidebar from '../FamilySidebar';
import { useState } from 'react';

export default function FamilySidebarExample() {
  const [selectedMembers, setSelectedMembers] = useState<string[]>(['1', '2', '3']);

  const mockMembers = [
    { id: '1', name: 'Sarah Johnson', color: '#8B5CF6' },
    { id: '2', name: 'Mike Johnson', color: '#EC4899' },
    { id: '3', name: 'Carolyn Johnson', color: '#10B981' },
    { id: '4', name: 'Noah Johnson', color: '#F59E0B' },
  ];

  const handleToggleMember = (memberId: string) => {
    setSelectedMembers(prev => 
      prev.includes(memberId) 
        ? prev.filter(id => id !== memberId)
        : [...prev, memberId]
    );
  };

  return (
    <div className="h-screen">
      <FamilySidebar
        members={mockMembers}
        selectedMembers={selectedMembers}
        onToggleMember={handleToggleMember}
        onAddMember={() => console.log('Add member clicked')}
      />
    </div>
  );
}
