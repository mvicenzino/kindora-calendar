import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { User } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useState } from 'react';

interface MemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (member: { name: string; color: string }) => void;
}

const PRESET_COLORS = [
  '#8B5CF6', // Purple
  '#EC4899', // Pink
  '#10B981', // Green
  '#F59E0B', // Amber
  '#3B82F6', // Blue
  '#EF4444', // Red
  '#14B8A6', // Teal
  '#F97316', // Orange
];

export default function MemberModal({
  isOpen,
  onClose,
  onSave,
}: MemberModalProps) {
  const [name, setName] = useState("");
  const [selectedColor, setSelectedColor] = useState(PRESET_COLORS[0]);

  const handleSave = () => {
    if (name.trim()) {
      onSave({ name: name.trim(), color: selectedColor });
      setName("");
      setSelectedColor(PRESET_COLORS[0]);
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md backdrop-blur-3xl bg-card/95 border-2 rounded-3xl shadow-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">Add Family Member</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="space-y-2">
            <Label htmlFor="name" className="text-sm font-medium">Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter name..."
              data-testid="input-member-name"
              className="backdrop-blur-md bg-background/50 rounded-xl"
            />
          </div>

          <div className="space-y-3">
            <Label className="text-sm font-medium">Choose Color</Label>
            <div className="grid grid-cols-4 gap-3">
              {PRESET_COLORS.map(color => (
                <button
                  key={color}
                  onClick={() => setSelectedColor(color)}
                  data-testid={`color-${color}`}
                  className={`
                    h-12 rounded-xl transition-all duration-300
                    hover:scale-110 hover-elevate active-elevate-2
                    ${selectedColor === color ? 'ring-4 ring-offset-2 ring-offset-background' : 'ring-2 ring-transparent'}
                  `}
                  style={{ 
                    backgroundColor: color,
                    '--tw-ring-color': selectedColor === color ? color : 'transparent'
                  } as React.CSSProperties}
                />
              ))}
            </div>
          </div>

          <div className="p-4 rounded-2xl backdrop-blur-md bg-muted/50">
            <div className="flex items-center gap-3">
              <Avatar className="h-12 w-12 ring-2" style={{ '--tw-ring-color': selectedColor } as React.CSSProperties}>
                <AvatarFallback 
                  className="text-white font-semibold"
                  style={{ backgroundColor: selectedColor }}
                >
                  {name ? name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : <User className="h-5 w-5" />}
                </AvatarFallback>
              </Avatar>
              <div>
                <div className="text-sm font-medium">Preview</div>
                <div className="text-xs text-muted-foreground">
                  {name || 'Enter a name'}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <Button
            variant="outline"
            onClick={onClose}
            data-testid="button-cancel"
            className="backdrop-blur-md hover-elevate active-elevate-2"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={!name.trim()}
            data-testid="button-save-member"
            className="hover-elevate active-elevate-2"
          >
            Add Member
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
