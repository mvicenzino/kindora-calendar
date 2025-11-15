import EventModal from '../EventModal';
import { useState } from 'react';
import { Button } from '@/components/ui/button';

export default function EventModalExample() {
  const [isOpen, setIsOpen] = useState(false);

  const mockMembers = [
    { id: '1', name: 'Sarah Johnson', color: '#8B5CF6' },
    { id: '2', name: 'Mike Johnson', color: '#EC4899' },
    { id: '3', name: 'Emma Johnson', color: '#10B981' },
  ];

  return (
    <div className="p-8">
      <Button onClick={() => setIsOpen(true)}>Open Event Modal</Button>
      
      <EventModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        onSave={(event) => {
          console.log('Save event:', event);
          setIsOpen(false);
        }}
        members={mockMembers}
        selectedDate={new Date()}
      />
    </div>
  );
}
