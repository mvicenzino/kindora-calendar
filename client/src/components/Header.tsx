import { Search, Image, MessageCircle, FileText, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import ProfileMenu from "@/components/ProfileMenu";
import FamilySelector from "@/components/FamilySelector";
import type { UiFamilyMember } from "@shared/types";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import calendoraIcon from "@assets/generated_images/simple_clean_calendar_logo.png";

interface HeaderProps {
  members?: UiFamilyMember[];
  onMemberColorChange?: (memberId: string, color: string) => void;
  onSearchClick?: () => void;
  onAddMember?: () => void;
  onDeleteMember?: (memberId: string) => void;
}

export default function Header({ members = [], onMemberColorChange, onSearchClick, onAddMember, onDeleteMember }: HeaderProps) {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  
  // Check if user is in demo mode
  const isDemoMode = user?.id?.startsWith('demo-') ?? false;

  const handleExitDemo = () => {
    window.location.href = "/api/logout";
  };

  return (
    <header className="relative z-[60] w-full" data-testid="header-main">
      {/* Main header bar with Tesla-inspired glow */}
      <div className="titanium-glass tesla-glow-bar shadow-lg">
        <div className="flex items-center justify-between px-3 sm:px-4 md:px-6 py-2 sm:py-3">
          {/* Left: Logo */}
          <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
            <img src={calendoraIcon} alt="Kindora Calendar" className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg" data-testid="icon-logo" />
            <div className="flex flex-col leading-tight">
              <span className="text-base sm:text-lg md:text-xl font-extrabold text-orange-300 app-title">Kindora</span>
              <span className="text-[10px] sm:text-xs font-medium text-white/80 tracking-wide hidden sm:block">CALENDAR</span>
            </div>
          </div>

          {/* Right: Action buttons */}
          <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
            {/* Exit Demo button - only visible in demo mode */}
            {isDemoMode && (
              <Button
                size="sm"
                variant="outline"
                className="text-white border-white/50 bg-red-500/20 hover:bg-red-500/30 h-8 px-2 sm:px-3 gap-1"
                onClick={handleExitDemo}
                data-testid="button-exit-demo"
              >
                <X className="w-3.5 h-3.5" />
                <span className="hidden sm:inline text-xs font-medium">Exit Demo</span>
              </Button>
            )}
            <Button
              size="icon"
              variant="ghost"
              className="text-white border border-white/20 h-8 w-8 sm:h-9 sm:w-9"
              aria-label="Messages"
              onClick={() => setLocation('/messages')}
              data-testid="button-messages"
            >
              <MessageCircle className="w-4 h-4 sm:w-5 sm:h-5" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="text-white border border-white/20 h-8 w-8 sm:h-9 sm:w-9"
              aria-label="Documents"
              onClick={() => setLocation('/documents')}
              data-testid="button-documents"
            >
              <FileText className="w-4 h-4 sm:w-5 sm:h-5" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="text-white border border-white/20 h-8 w-8 sm:h-9 sm:w-9"
              aria-label="Memories"
              onClick={() => setLocation('/memories')}
              data-testid="button-memories"
            >
              <Image className="w-4 h-4 sm:w-5 sm:h-5" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="text-white border border-white/20 h-8 w-8 sm:h-9 sm:w-9 hidden sm:flex"
              aria-label="Search events"
              onClick={onSearchClick}
              data-testid="button-search"
            >
              <Search className="w-4 h-4 sm:w-5 sm:h-5" />
            </Button>
            <ProfileMenu 
              members={members} 
              onMemberColorChange={onMemberColorChange || (() => {})} 
              onAddMember={onAddMember} 
              onDeleteMember={onDeleteMember} 
            />
          </div>
        </div>
      </div>
      
      {/* Family selector row - separate for better mobile layout */}
      <div className="titanium-glass border-t-0 border-b border-white/10 px-3 sm:px-4 md:px-6 py-2">
        <FamilySelector />
      </div>
    </header>
  );
}
