import { Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import ProfileMenu from "@/components/ProfileMenu";
import AlertsPanel from "@/components/AlertsPanel";
import type { UiFamilyMember } from "@shared/types";
import { useAuth } from "@/hooks/useAuth";

interface HeaderProps {
  members?: UiFamilyMember[];
  onMemberColorChange?: (memberId: string, color: string) => void;
  onSearchClick?: () => void;
  onAddMember?: () => void;
  onDeleteMember?: (memberId: string) => void;
}

export default function Header({ members = [], onMemberColorChange, onSearchClick, onAddMember, onDeleteMember }: HeaderProps) {
  const { user } = useAuth();
  const isDemoMode = user?.id?.startsWith('demo-') ?? false;

  const handleExitDemo = () => {
    window.location.href = "/api/logout";
  };

  return (
    <div className="flex items-center gap-1">
      {isDemoMode && (
        <Button
          size="sm"
          variant="outline"
          className="text-destructive border-destructive/30 gap-1"
          onClick={handleExitDemo}
          data-testid="button-exit-demo"
        >
          <X className="w-3.5 h-3.5" />
          <span className="hidden sm:inline text-xs">Exit Demo</span>
        </Button>
      )}
      <AlertsPanel />
      <Button
        size="icon"
        variant="ghost"
        aria-label="Search events"
        onClick={onSearchClick}
        data-testid="button-search"
      >
        <Search className="w-4 h-4" />
      </Button>
      <ProfileMenu
        members={members}
        onMemberColorChange={onMemberColorChange || (() => {})}
        onAddMember={onAddMember}
        onDeleteMember={onDeleteMember}
      />
    </div>
  );
}
