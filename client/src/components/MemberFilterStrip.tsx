import { Users, Plus, HeartHandshake } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { UiFamilyMember } from "@shared/types";

interface MemberFilterStripProps {
  members: UiFamilyMember[];
  selectedMemberIds: string[];
  onToggleMember: (memberId: string) => void;
  onSelectAllMembers: () => void;
  onAddMember?: () => void;
}

function getFirstInitial(name: string): string {
  return (name[0] || '').toUpperCase();
}

export default function MemberFilterStrip({
  members,
  selectedMemberIds,
  onToggleMember,
  onSelectAllMembers,
  onAddMember,
}: MemberFilterStripProps) {
  const allSelected = selectedMemberIds.length === 0 || selectedMemberIds.length === members.length;

  return (
    <div
      className="flex items-center gap-1 px-3 py-1.5 border-b border-border/30 bg-background/40 backdrop-blur-sm overflow-x-auto scrollbar-hide"
      data-testid="member-filter-strip"
    >
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={onSelectAllMembers}
            className={`
              flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium
              transition-colors flex-shrink-0 cursor-pointer
              ${allSelected
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'
              }
            `}
            data-testid="button-filter-everyone"
          >
            <Users className="w-3.5 h-3.5" />
            <span>All</span>
          </button>
        </TooltipTrigger>
        <TooltipContent>Show everyone's events</TooltipContent>
      </Tooltip>

      <div className="w-px h-4 bg-border/30 flex-shrink-0 mx-0.5" />

      {members.map((member) => {
        const isSelected = allSelected || selectedMemberIds.includes(member.id);
        const isCaregiver = member.role === 'caregiver';
        return (
          <Tooltip key={member.id}>
            <TooltipTrigger asChild>
              <button
                onClick={() => onToggleMember(member.id)}
                className={`
                  flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium
                  transition-all flex-shrink-0 cursor-pointer
                  ${isSelected
                    ? 'text-foreground'
                    : 'text-muted-foreground/50 hover:text-muted-foreground hover:bg-muted/20 opacity-60 hover:opacity-80'
                  }
                `}
                style={isSelected ? {
                  backgroundColor: `${member.color}15`,
                  boxShadow: `inset 0 0 0 1px ${member.color}30`,
                } : undefined}
                data-testid={`button-filter-member-${member.id}`}
              >
                <div
                  className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold flex-shrink-0 transition-all ${!isSelected ? 'grayscale-[50%]' : ''}`}
                  style={{
                    backgroundColor: member.color,
                    color: '#fff',
                  }}
                >
                  {isCaregiver ? (
                    <HeartHandshake className="w-3 h-3" />
                  ) : (
                    getFirstInitial(member.name)
                  )}
                </div>
                <span className="whitespace-nowrap">
                  {member.name.split(' ')[0]}
                </span>
              </button>
            </TooltipTrigger>
            <TooltipContent>{isCaregiver ? `${member.name} (Caregiver)` : member.name}</TooltipContent>
          </Tooltip>
        );
      })}

      {onAddMember && (
        <>
          <div className="w-px h-4 bg-border/30 flex-shrink-0 mx-0.5" />
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={onAddMember}
                className="flex items-center justify-center w-7 h-7 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors flex-shrink-0 cursor-pointer"
                data-testid="button-filter-add-member"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </TooltipTrigger>
            <TooltipContent>Add family member</TooltipContent>
          </Tooltip>
        </>
      )}
    </div>
  );
}
