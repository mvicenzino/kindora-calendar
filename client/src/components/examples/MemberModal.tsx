import MemberModal from '../MemberModal';
import { useState } from 'react';
import { Button } from '@/components/ui/button';

export default function MemberModalExample() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="p-8">
      <Button onClick={() => setIsOpen(true)}>Open Member Modal</Button>
      
      <MemberModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        onSave={(member) => {
          console.log('Save member:', member);
          setIsOpen(false);
        }}
      />
    </div>
  );
}
