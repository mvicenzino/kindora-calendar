import { useState, useRef, useEffect } from 'react';
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import type { UiFamilyMember } from "@shared/types";
import { X, User } from 'lucide-react';

interface ProfileMenuProps {
  members: UiFamilyMember[];
  onMemberColorChange: (memberId: string, color: string) => void;
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

export default function ProfileMenu({ members, onMemberColorChange }: ProfileMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setEditingMemberId(null);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  return (
    <div className="relative" ref={menuRef}>
      {/* User Profile Icon Button */}
      <Button
        size="icon"
        variant="ghost"
        className="text-white border border-white/50"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Family members menu"
        data-testid="button-profile-menu"
      >
        <User className="w-5 h-5" />
      </Button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-72 bg-slate-950/95 border border-white/20 rounded-2xl shadow-xl z-50 p-4 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-white/10">
            <h3 className="text-sm font-semibold text-white">Family Members</h3>
            <button
              onClick={() => setIsOpen(false)}
              className="text-white/50 hover:text-white"
              data-testid="button-close-profile-menu"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-2 max-h-64 overflow-y-auto">
            {members.map((member) => (
              <div
                key={member.id}
                className="flex items-center justify-between p-3 rounded-lg hover:bg-white/10 transition-all group"
              >
                {editingMemberId === member.id ? (
                  // Color picker mode
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback
                          className="text-white text-xs font-semibold"
                          style={{ backgroundColor: member.color }}
                        >
                          {member.initials}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm font-medium text-white flex-1">{member.name}</span>
                      <button
                        onClick={() => setEditingMemberId(null)}
                        className="text-white/50 hover:text-white text-xs"
                        data-testid={`button-close-color-picker-${member.id}`}
                      >
                        Done
                      </button>
                    </div>
                    <div className="grid grid-cols-4 gap-2 pl-10">
                      {PRESET_COLORS.map(color => (
                        <button
                          key={color}
                          onClick={() => {
                            onMemberColorChange(member.id, color);
                            setEditingMemberId(null);
                          }}
                          className={`h-8 rounded-lg transition-all ${
                            member.color === color ? 'ring-2 ring-white' : 'hover:scale-110'
                          }`}
                          style={{ backgroundColor: color }}
                          data-testid={`button-color-${member.id}-${color}`}
                          title={color}
                        />
                      ))}
                    </div>
                  </div>
                ) : (
                  // Normal view
                  <>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback
                          className="text-white text-xs font-semibold"
                          style={{ backgroundColor: member.color }}
                        >
                          {member.initials}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm font-medium text-white">{member.name}</span>
                    </div>
                    <button
                      onClick={() => setEditingMemberId(member.id)}
                      className="text-xs px-2 py-1 rounded-md bg-white/10 text-white/70 hover:text-white hover:bg-white/20 transition-all opacity-0 group-hover:opacity-100"
                      data-testid={`button-edit-color-${member.id}`}
                    >
                      Edit
                    </button>
                  </>
                )}
              </div>
            ))}
          </div>

          {members.length === 0 && (
            <div className="text-center py-6">
              <p className="text-sm text-white/50">No family members yet</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
