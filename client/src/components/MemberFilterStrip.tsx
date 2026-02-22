import { Users, Plus, HeartHandshake } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { UiFamilyMember } from "@shared/types";

interface MemberFilterStripProps {
  members: UiFamilyMember[];
  selectedMemberIds: string[];
  onToggleMember: (memberId: string) => void;
  onSelectAllMembers: () => void;
  onAddMember?: () => void;
}

function getInitials(name: string): string {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
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
                {isCaregiver ? (
                  <div
                    className="w-5 h-5 rounded-full flex items-center justify-center"
                    style={{
                      backgroundColor: member.color + '30',
                      color: member.color,
                    }}
                  >
                    <HeartHandshake className="w-3 h-3" />
                  </div>
                ) : (
                  <Avatar className="w-5 h-5">
                    <AvatarFallback
                      className="text-[9px] font-semibold"
                      style={{
                        backgroundColor: member.color + '30',
                        color: member.color,
                      }}
                    >
                      {getInitials(member.name)}
                    </AvatarFallback>
                  </Avatar>
                )}
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
