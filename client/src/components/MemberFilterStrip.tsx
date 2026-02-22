import { Users, Plus, HeartHandshake } from "lucide-react";
import { Button } from "@/components/ui/button";
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
      className="flex items-center gap-1 px-3 sm:px-4 md:px-6 py-1 border-b border-border/30 bg-background/40 backdrop-blur-sm overflow-x-auto scrollbar-hide"
      data-testid="member-filter-strip"
    >
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant={allSelected ? "default" : "ghost"}
            onClick={onSelectAllMembers}
            className="flex-shrink-0 gap-1.5"
            data-testid="button-filter-everyone"
          >
            <Users className="w-4 h-4" />
            <span>All</span>
          </Button>
        </TooltipTrigger>
        <TooltipContent>Show everyone's events</TooltipContent>
      </Tooltip>

      <div className="w-px h-5 bg-border/40 flex-shrink-0" />

      {members.map((member) => {
        const isSelected = allSelected || selectedMemberIds.includes(member.id);
        const isCaregiver = member.role === 'caregiver';
        return (
          <Tooltip key={member.id}>
            <TooltipTrigger asChild>
              <Button
                variant={isSelected ? "secondary" : "ghost"}
                onClick={() => onToggleMember(member.id)}
                className="flex-shrink-0 gap-1.5"
                data-testid={`button-filter-member-${member.id}`}
              >
                <div
                  className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0"
                  style={{
                    backgroundColor: member.color,
                    color: '#fff',
                  }}
                >
                  {isCaregiver ? (
                    <HeartHandshake className="w-3.5 h-3.5" />
                  ) : (
                    getFirstInitial(member.name)
                  )}
                </div>
                <span className="text-xs font-medium whitespace-nowrap">
                  {member.name.split(' ')[0]}
                </span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>{isCaregiver ? `${member.name} (Caregiver)` : member.name}</TooltipContent>
          </Tooltip>
        );
      })}

      {onAddMember && (
        <>
          <div className="w-px h-5 bg-border/40 flex-shrink-0" />
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="icon"
                variant="ghost"
                onClick={onAddMember}
                className="flex-shrink-0"
                data-testid="button-filter-add-member"
              >
                <Plus className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Add family member</TooltipContent>
          </Tooltip>
        </>
      )}
    </div>
  );
}
