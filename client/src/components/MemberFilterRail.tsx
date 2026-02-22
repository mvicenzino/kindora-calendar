import { Users, Plus } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { UiFamilyMember } from "@shared/types";

interface MemberFilterRailProps {
  members: UiFamilyMember[];
  selectedMemberIds: string[];
  onToggleMember: (memberId: string) => void;
  onSelectAllMembers: () => void;
  onAddMember?: () => void;
}

function getInitials(name: string): string {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

export default function MemberFilterRail({
  members,
  selectedMemberIds,
  onToggleMember,
  onSelectAllMembers,
  onAddMember,
}: MemberFilterRailProps) {
  const allSelected = selectedMemberIds.length === 0 || selectedMemberIds.length === members.length;

  if (members.length === 0) return null;

  return (
    <div
      className="flex flex-col items-center gap-1.5 py-3 px-1.5 border-r border-border/30 bg-background/50 backdrop-blur-sm"
      data-testid="member-filter-rail"
    >
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={onSelectAllMembers}
            className="relative flex items-center justify-center w-9 h-9 rounded-full transition-all"
            data-testid="button-rail-all-members"
          >
            <div className={`
              w-9 h-9 rounded-full flex items-center justify-center text-xs font-semibold transition-all
              ${allSelected
                ? 'bg-primary/20 text-primary member-avatar-ring active'
                : 'bg-muted text-muted-foreground'
              }
            `}>
              <Users className="w-4 h-4" />
            </div>
          </button>
        </TooltipTrigger>
        <TooltipContent side="right">Everyone</TooltipContent>
      </Tooltip>

      <div className="w-5 border-t border-border/40 my-0.5" />

      {members.map((member) => {
        const isSelected = allSelected || selectedMemberIds.includes(member.id);
        return (
          <Tooltip key={member.id}>
            <TooltipTrigger asChild>
              <button
                onClick={() => onToggleMember(member.id)}
                className="relative flex items-center justify-center transition-all"
                data-testid={`button-rail-member-${member.id}`}
              >
                <Avatar className={`w-9 h-9 transition-all ${isSelected ? 'member-avatar-ring active' : 'opacity-40'}`}>
                  <AvatarFallback
                    className="text-[11px] font-semibold"
                    style={{
                      backgroundColor: member.color + '30',
                      color: member.color,
                    }}
                  >
                    {getInitials(member.name)}
                  </AvatarFallback>
                </Avatar>
              </button>
            </TooltipTrigger>
            <TooltipContent side="right">{member.name}</TooltipContent>
          </Tooltip>
        );
      })}

      {onAddMember && (
        <>
          <div className="w-5 border-t border-border/40 my-0.5" />
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={onAddMember}
                className="flex items-center justify-center w-9 h-9 rounded-full bg-muted/50 text-muted-foreground hover-elevate transition-all"
                data-testid="button-rail-add-member"
              >
                <Plus className="w-4 h-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right">Add family member</TooltipContent>
          </Tooltip>
        </>
      )}
    </div>
  );
}
