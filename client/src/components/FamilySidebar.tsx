import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Plus, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface FamilyMember {
  id: string;
  name: string;
  color: string;
  avatar?: string;
}

interface FamilySidebarProps {
  members: FamilyMember[];
  selectedMembers: string[];
  onToggleMember: (memberId: string) => void;
  onAddMember: () => void;
}

export default function FamilySidebar({
  members,
  selectedMembers,
  onToggleMember,
  onAddMember,
}: FamilySidebarProps) {
  return (
    <div className="w-80 backdrop-blur-xl bg-sidebar/50 border-r border-sidebar-border shadow-lg flex flex-col h-full">
      <div className="p-6 border-b border-sidebar-border">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-xl bg-primary/10">
            <Users className="h-5 w-5 text-primary" />
          </div>
          <h2 className="text-lg font-semibold">Family Members</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          Click to filter calendar events
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="space-y-3">
          {members.map((member) => {
            const isSelected = selectedMembers.includes(member.id);
            return (
              <button
                key={member.id}
                onClick={() => onToggleMember(member.id)}
                data-testid={`member-${member.id}`}
                className={`
                  w-full flex items-center gap-4 p-4 rounded-2xl
                  transition-all duration-300 backdrop-blur-md
                  hover:scale-[1.02] hover-elevate active-elevate-2
                  ${isSelected ? 'bg-sidebar-accent/80 ring-2' : 'bg-card/40'}
                `}
                style={isSelected ? {
                  '--tw-ring-color': `${member.color}50`
                } as React.CSSProperties : undefined}
              >
                <Avatar className="h-12 w-12 ring-2" style={{ '--tw-ring-color': member.color } as React.CSSProperties}>
                  <AvatarFallback 
                    className="font-semibold text-white"
                    style={{ backgroundColor: member.color }}
                  >
                    {member.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                
                <div className="flex-1 text-left">
                  <div className="font-medium">{member.name}</div>
                  <Badge 
                    variant="outline" 
                    className="mt-1 text-xs backdrop-blur-sm"
                    style={{ 
                      backgroundColor: `${member.color}20`,
                      borderColor: `${member.color}40`,
                      color: member.color
                    }}
                  >
                    Active
                  </Badge>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="p-6 border-t border-sidebar-border">
        <Button
          onClick={onAddMember}
          variant="outline"
          className="w-full backdrop-blur-md hover-elevate active-elevate-2"
          data-testid="button-add-member"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Family Member
        </Button>
      </div>
    </div>
  );
}
