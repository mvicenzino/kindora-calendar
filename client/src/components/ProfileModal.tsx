import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Plus, Edit2 } from "lucide-react";

interface FamilyMember {
  id: string;
  name: string;
  color: string;
  avatar: string | null;
  initials: string;
}

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  members: FamilyMember[];
  onEditMember?: (member: FamilyMember) => void;
  onAddMember?: () => void;
}

export default function ProfileModal({ 
  isOpen, 
  onClose, 
  members,
  onEditMember,
  onAddMember
}: ProfileModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md w-[calc(100%-2rem)] sm:w-full bg-gradient-to-br from-white/95 to-white/90 backdrop-blur-xl border-2 border-white/50 shadow-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-[#4A5A6A] to-[#6A7A8A] bg-clip-text text-transparent">
            Family Members
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3 sm:space-y-4 py-2 sm:py-4">
          {/* Family members list */}
          <div className="space-y-2 sm:space-y-3">
            {members.map((member) => (
              <div
                key={member.id}
                className="flex items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-white/60 backdrop-blur-sm border border-white/40 hover-elevate transition-all touch-manipulation"
              >
                <Avatar className="h-12 w-12 sm:h-14 sm:w-14 ring-2 ring-white/40">
                  <AvatarFallback 
                    className="text-white font-bold text-base sm:text-lg"
                    style={{ backgroundColor: member.color }}
                  >
                    {member.initials}
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1 min-w-0">
                  <h3 className="text-base sm:text-lg font-semibold text-[#4A5A6A] truncate">
                    {member.name}
                  </h3>
                  <p className="text-xs sm:text-sm text-[#4A5A6A]/70 mt-0.5 sm:mt-1">
                    Family member
                  </p>
                </div>

                {onEditMember && (
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    onClick={() => onEditMember(member)}
                    data-testid={`button-edit-member-${member.id}`}
                    className="hover-elevate active-elevate-2 touch-manipulation flex-shrink-0"
                    aria-label={`Edit ${member.name}`}
                  >
                    <Edit2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>

          {/* Add member button */}
          {onAddMember && (
            <Button
              type="button"
              onClick={onAddMember}
              data-testid="button-add-family-member"
              className="w-full bg-gradient-to-r from-[#4A5A6A] to-[#6A7A8A] text-white hover-elevate active-elevate-2 touch-manipulation h-11 sm:h-10"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Family Member
            </Button>
          )}

          {/* Close button */}
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            data-testid="button-close-profile"
            className="w-full hover-elevate active-elevate-2 touch-manipulation h-11 sm:h-10"
          >
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
