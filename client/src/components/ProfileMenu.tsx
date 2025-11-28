import { useState, useRef, useEffect } from 'react';
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { UiFamilyMember } from "@shared/types";
import type { FamilyMembership, User as UserType } from "@shared/schema";
import { X, User, UserPlus, Trash2, Shield, Users as UsersIcon, Heart, Settings, ChevronRight, LogOut, Sparkles } from 'lucide-react';
import { useUserRole } from "@/hooks/useUserRole";
import { useQuery } from "@tanstack/react-query";
import { useActiveFamily } from "@/contexts/ActiveFamilyContext";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";

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
  const [activeTab, setActiveTab] = useState<'profile' | 'members' | 'settings'>('profile');
  const menuRef = useRef<HTMLDivElement>(null);
  const { isCaregiver, isLoading: roleLoading } = useUserRole();
  const isReadOnly = roleLoading || isCaregiver;
  const { activeFamilyId, activeFamily } = useActiveFamily();
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  
  // Check if user is in demo mode (user ID starts with "demo-")
  const isDemoMode = user?.id?.startsWith('demo-') ?? false;

  // Fetch user accounts (family memberships with user info)
  const { data: userAccounts = [], isLoading: accountsLoading } = useQuery<FamilyMembershipWithUser[]>({
    queryKey: ['/api/family', activeFamilyId, 'members'],
    enabled: !!activeFamilyId && isOpen,
  });

  // Get current user info
  const currentUser = userAccounts.find(account => account.userId);

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

  const handleNavigateToSettings = () => {
    setIsOpen(false);
    setLocation('/family');
  };

  const handleLogout = () => {
    window.location.href = "/api/logout";
  };

  return (
    <div className="relative" ref={menuRef}>
      <Button
        size="icon"
        variant="ghost"
        className="text-white border border-white/50"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Profile menu"
        data-testid="button-profile-menu"
      >
        <User className="w-5 h-5" />
      </Button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-[calc(100vw-2rem)] max-w-80 bg-slate-950/95 border border-white/20 rounded-2xl shadow-xl z-50 overflow-hidden">
          {/* Header with tabs */}
          <div className="border-b border-white/10">
            <div className="flex items-center justify-between px-4 pt-3 pb-2">
              <h3 className="text-sm font-semibold text-white">
                {activeFamily?.name || 'Family'}
              </h3>
              <button
                onClick={() => setIsOpen(false)}
                className="text-white/50 hover:text-white p-1 rounded-md hover:bg-white/10"
                data-testid="button-close-profile-menu"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            {/* Tab Navigation */}
            <div className="flex px-2 pb-2 gap-1">
              <button
                onClick={() => setActiveTab('profile')}
                className={`flex-1 px-3 py-2 text-xs font-medium rounded-lg transition-all ${
                  activeTab === 'profile'
                    ? 'bg-white/15 text-white'
                    : 'text-white/60 hover:text-white hover:bg-white/5'
                }`}
                data-testid="tab-profile"
              >
                <User className="w-3.5 h-3.5 mx-auto mb-1" />
                Profile
              </button>
              <button
                onClick={() => setActiveTab('members')}
                className={`flex-1 px-3 py-2 text-xs font-medium rounded-lg transition-all ${
                  activeTab === 'members'
                    ? 'bg-white/15 text-white'
                    : 'text-white/60 hover:text-white hover:bg-white/5'
                }`}
                data-testid="tab-members"
              >
                <UsersIcon className="w-3.5 h-3.5 mx-auto mb-1" />
                Members
              </button>
              <button
                onClick={() => setActiveTab('settings')}
                className={`flex-1 px-3 py-2 text-xs font-medium rounded-lg transition-all ${
                  activeTab === 'settings'
                    ? 'bg-white/15 text-white'
                    : 'text-white/60 hover:text-white hover:bg-white/5'
                }`}
                data-testid="tab-settings"
              >
                <Settings className="w-3.5 h-3.5 mx-auto mb-1" />
                Settings
              </button>
            </div>
          </div>

          {/* Tab Content */}
          <div className="p-4 max-h-64 overflow-y-auto">
            {/* Profile Tab */}
            {activeTab === 'profile' && (
              <div className="space-y-3">
                <h4 className="text-xs font-medium text-white/70 uppercase tracking-wide">User Accounts</h4>
                {accountsLoading ? (
                  <div className="text-center py-4">
                    <p className="text-sm text-white/50">Loading...</p>
                  </div>
                ) : userAccounts.length > 0 ? (
                  <div className="space-y-2">
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
            )}

            {/* Members Tab */}
            {activeTab === 'members' && (
              <div className="space-y-3">
                <h4 className="text-xs font-medium text-white/70 uppercase tracking-wide">Calendar Members</h4>
                <div className="space-y-2">
                  {members.length > 0 ? (
                    members.map((member) => (
                      <div
                        key={member.id}
                        className="flex items-center justify-between p-3 rounded-lg hover:bg-white/10 transition-all group"
                      >
                        {editingMemberId === member.id && !isReadOnly ? (
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
            )}

            {/* Settings Tab */}
            {activeTab === 'settings' && (
              <div className="space-y-2">
                <button
                  onClick={handleNavigateToSettings}
                  className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-white/10 transition-all text-left"
                  data-testid="button-family-settings"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
                      <UsersIcon className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <div className="text-sm font-medium text-white">Family Settings</div>
                      <div className="text-xs text-white/50">Manage invites & sharing</div>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-white/40" />
                </button>
              </div>
            )}
          </div>

          {/* Quick Logout / Exit Demo - Always visible at bottom */}
          <div className="border-t border-white/10 p-3 space-y-2">
            {isDemoMode && (
              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-gradient-to-r from-purple-500/20 to-teal-500/20 hover:from-purple-500/30 hover:to-teal-500/30 border border-purple-500/30 text-white transition-all"
                data-testid="button-exit-demo"
              >
                <Sparkles className="w-4 h-4" />
                <span className="text-sm font-medium">Exit Demo</span>
              </button>
            )}
            {!isDemoMode && (
              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 hover:text-red-300 transition-all"
                data-testid="button-quick-logout"
              >
                <LogOut className="w-4 h-4" />
                <span className="text-sm font-medium">Sign Out</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
