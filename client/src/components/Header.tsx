import { Search, User, Image, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import ProfileMenu from "@/components/ProfileMenu";
import FamilySelector from "@/components/FamilySelector";
import type { UiFamilyMember } from "@shared/types";
import { useLocation } from "wouter";
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

  return (
    <header className="w-full" data-testid="header-main">
      <div className="backdrop-blur-xl bg-white/5 border-b border-white/20 shadow-lg">
        <div className="flex items-center justify-between px-4 md:px-6 py-3">
          {/* Left: Logo */}
          <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
            <img src={calendoraIcon} alt="Kindora Calendar" className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg" data-testid="icon-logo" />
            <span className="text-base sm:text-lg md:text-xl app-title">
              <span className="font-extrabold text-orange-300">Kindora</span> <span className="font-medium text-white hidden sm:inline">Calendar</span>
            </span>
          </div>
          
          {/* Center: Family selector - prominently positioned */}
          <div className="flex-1 flex justify-center px-2 min-w-0">
            <FamilySelector />
          </div>

          {/* Right: Action buttons */}
          <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
            <Button
              size="icon"
              variant="ghost"
              className="text-white border border-white/50 h-8 w-8 sm:h-9 sm:w-9"
              aria-label="Messages"
              onClick={() => setLocation('/messages')}
              data-testid="button-messages"
            >
              <MessageCircle className="w-4 h-4 sm:w-5 sm:h-5" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="text-white border border-white/50 h-8 w-8 sm:h-9 sm:w-9"
              aria-label="Memories"
              onClick={() => setLocation('/memories')}
              data-testid="button-memories"
            >
              <Image className="w-4 h-4 sm:w-5 sm:h-5" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="text-white border border-white/50 h-8 w-8 sm:h-9 sm:w-9 hidden sm:flex"
              aria-label="Search events"
              onClick={onSearchClick}
              data-testid="button-search"
            >
              <Search className="w-4 h-4 sm:w-5 sm:h-5" />
            </Button>
            {onMemberColorChange ? (
              <ProfileMenu members={members} onMemberColorChange={onMemberColorChange} onAddMember={onAddMember} onDeleteMember={onDeleteMember} />
            ) : (
              <Button
                size="icon"
                variant="ghost"
                className="text-white border border-white/50 h-8 w-8 sm:h-9 sm:w-9"
                aria-label="User profile"
                data-testid="button-profile"
              >
                <User className="w-4 h-4 sm:w-5 sm:h-5" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
