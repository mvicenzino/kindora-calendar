import { useState, useRef, useEffect } from 'react';
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { UiFamilyMember } from "@shared/types";
import type { FamilyMembership, User as UserType } from "@shared/schema";
import { X, User, UserPlus, Trash2, Shield, Users as UsersIcon, Heart } from 'lucide-react';
import { useUserRole } from "@/hooks/useUserRole";
import { useQuery } from "@tanstack/react-query";
import { useActiveFamily } from "@/contexts/ActiveFamilyContext";

interface ProfileMenuProps {
  members: UiFamilyMember[];
  onMemberColorChange: (memberId: string, color: string) => void;
  onAddMember?: () => void;
  onDeleteMember?: (memberId: string) => void;
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

type FamilyMembershipWithUser = FamilyMembership & { user: UserType };

function getRoleBadgeProps(role: string): { icon: typeof Shield; variant: 'default' | 'secondary' | 'outline'; label: string } {
  switch (role) {
    case 'owner':
      return { icon: Shield, variant: 'default', label: 'Owner' };
    case 'member':
      return { icon: UsersIcon, variant: 'secondary', label: 'Member' };
    case 'caregiver':
      return { icon: Heart, variant: 'outline', label: 'Caregiver' };
    default:
      return { icon: UsersIcon, variant: 'secondary', label: role };
  }
}

export default function ProfileMenu({ members, onMemberColorChange, onAddMember, onDeleteMember }: ProfileMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const { isCaregiver, isLoading: roleLoading } = useUserRole();
  const isReadOnly = roleLoading || isCaregiver;
  const { activeFamilyId } = useActiveFamily();

  // Fetch user accounts (family memberships with user info)
  const { data: userAccounts = [], isLoading: accountsLoading } = useQuery<FamilyMembershipWithUser[]>({
    queryKey: ['/api/family', activeFamilyId, 'members'],
    enabled: !!activeFamilyId && isOpen,
  });

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
        <div className="absolute right-0 mt-2 w-80 bg-slate-950/95 border border-white/20 rounded-2xl shadow-xl z-50 p-4 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-white/10">
            <h3 className="text-sm font-semibold text-white">Family Profile</h3>
            <button
              onClick={() => setIsOpen(false)}
              className="text-white/50 hover:text-white"
              data-testid="button-close-profile-menu"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* User Accounts Section */}
          <div className="space-y-2">
            <h4 className="text-xs font-medium text-white/70 uppercase tracking-wide">User Accounts</h4>
            {accountsLoading ? (
              <div className="text-center py-4">
                <p className="text-sm text-white/50">Loading...</p>
              </div>
            ) : userAccounts.length > 0 ? (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {userAccounts.map((account) => {
                  const roleProps = getRoleBadgeProps(account.role);
                  const RoleIcon = roleProps.icon;
                  const initials = account.user.firstName && account.user.lastName
                    ? `${account.user.firstName[0]}${account.user.lastName[0]}`
                    : account.user.firstName?.[0] || account.user.email?.[0]?.toUpperCase() || '?';

                  return (
                    <div
                      key={account.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/10"
                      data-testid={`user-account-${account.userId}`}
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <Avatar className="h-8 w-8 flex-shrink-0">
                          <AvatarFallback className="text-white text-xs font-semibold bg-gradient-to-br from-purple-500 to-pink-500">
                            {initials}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-white truncate">
                            {account.user.firstName && account.user.lastName
                              ? `${account.user.firstName} ${account.user.lastName}`
                              : account.user.firstName || account.user.email}
                          </div>
                          {account.user.email && (
                            <div className="text-xs text-white/50 truncate">{account.user.email}</div>
                          )}
                        </div>
                      </div>
                      <Badge 
                        variant={roleProps.variant} 
                        className="ml-2 flex-shrink-0 gap-1"
                        data-testid={`badge-role-${account.role}`}
                      >
                        <RoleIcon className="w-3 h-3" />
                        <span>{roleProps.label}</span>
                      </Badge>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-4">
                <p className="text-sm text-white/50">No user accounts</p>
              </div>
            )}
          </div>

          {/* Family Members (Calendar People) Section */}
          <div className="space-y-2 pt-2 border-t border-white/10">
            <h4 className="text-xs font-medium text-white/70 uppercase tracking-wide">Calendar Members</h4>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {members.length > 0 ? (
                members.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center justify-between p-3 rounded-lg hover:bg-white/10 transition-all group"
                  >
                    {editingMemberId === member.id && !isReadOnly ? (
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
                        <div className={`flex items-center gap-1 ${!isReadOnly ? 'opacity-0 group-hover:opacity-100' : 'opacity-0'} transition-opacity`}>
                          {!isReadOnly && (
                            <>
                              <button
                                onClick={() => setEditingMemberId(member.id)}
                                className="text-xs px-2 py-1 rounded-md bg-white/10 text-white/70 hover:text-white hover:bg-white/20 transition-all"
                                data-testid={`button-edit-color-${member.id}`}
                              >
                                Edit
                              </button>
                              {onDeleteMember && (
                                <button
                                  onClick={() => {
                                    if (confirm(`Remove ${member.name} from family?`)) {
                                      onDeleteMember(member.id);
                                    }
                                  }}
                                  className="text-xs px-2 py-1 rounded-md bg-red-500/20 text-red-300 hover:text-red-100 hover:bg-red-500/30 transition-all"
                                  data-testid={`button-delete-member-${member.id}`}
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                ))
              ) : (
                <div className="text-center py-6">
                  <p className="text-sm text-white/50">No calendar members yet</p>
                </div>
              )}
            </div>

            {/* Add Member Button */}
            {onAddMember && !isReadOnly && (
              <button
                onClick={() => {
                  onAddMember();
                  setIsOpen(false);
                }}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-white/10 hover:bg-white/15 border border-white/20 text-white transition-all mt-2"
                data-testid="button-add-member"
              >
                <UserPlus className="w-4 h-4" />
                <span className="text-sm font-medium">Add Calendar Member</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
