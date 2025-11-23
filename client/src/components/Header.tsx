import { Copy, Search, User, Image, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import ProfileMenu from "@/components/ProfileMenu";
import type { UiFamilyMember } from "@shared/types";
import { useLocation } from "wouter";
import calendoraIcon from "@assets/IMG_3242_1763835484659.jpeg";

interface HeaderProps {
  currentView: 'day' | 'week' | 'month' | 'timeline';
  onViewChange: (view: 'day' | 'week' | 'month' | 'timeline') => void;
  members?: UiFamilyMember[];
  onMemberColorChange?: (memberId: string, color: string) => void;
  onSearchClick?: () => void;
  onAddMember?: () => void;
  onDeleteMember?: (memberId: string) => void;
}

export default function Header({ currentView, onViewChange, members = [], onMemberColorChange, onSearchClick, onAddMember, onDeleteMember }: HeaderProps) {
  const [, setLocation] = useLocation();
  
  const views: Array<{ value: 'day' | 'week' | 'month' | 'timeline'; label: string }> = [
    { value: 'day', label: 'Day' },
    { value: 'week', label: 'Week' },
    { value: 'month', label: 'Month' },
    { value: 'timeline', label: 'Timeline' },
  ];

  return (
    <header className="sticky top-0 z-50 w-full">
      <div className="backdrop-blur-xl bg-white/5 border-b border-white/20 shadow-lg">
        <div className="flex flex-col md:flex-row items-center justify-between px-4 md:px-6 py-4 gap-4">
          <div className="flex items-center gap-4 md:gap-8 w-full md:w-auto justify-between md:justify-start">
            <div className="flex items-center gap-3">
              <img src={calendoraIcon} alt="Calendora" className="w-10 h-10" data-testid="icon-logo" />
              <span className="text-xl font-bold text-white">Calendora</span>
            </div>
            
            <div className="flex items-center gap-2 md:hidden">
              <Button
                size="icon"
                variant="ghost"
                className="text-white border border-white/50"
                aria-label="Memories"
                onClick={() => setLocation('/memories')}
                data-testid="button-memories-mobile"
              >
                <Image className="w-5 h-5" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="text-white border border-white/50"
                aria-label="Search events"
                onClick={onSearchClick}
                data-testid="button-search-mobile"
              >
                <Search className="w-5 h-5" />
              </Button>
              {onMemberColorChange ? (
                <ProfileMenu members={members} onMemberColorChange={onMemberColorChange} onAddMember={onAddMember} onDeleteMember={onDeleteMember} />
              ) : (
                <Button
                  size="icon"
                  variant="ghost"
                  className="text-white border border-white/50"
                  aria-label="User profile"
                  data-testid="button-profile-mobile"
                >
                  <User className="w-5 h-5" />
                </Button>
              )}
              <Button
                size="icon"
                variant="ghost"
                className="text-white border border-white/50"
                aria-label="Sign out"
                onClick={() => (window.location.href = "/api/logout")}
                data-testid="button-logout-mobile"
              >
                <LogOut className="w-5 h-5" />
              </Button>
            </div>
          </div>
          
          <nav className="relative flex items-center gap-1 bg-white/10 backdrop-blur-md rounded-full p-1 border border-white/20 w-full md:w-auto">
            <div
              className="absolute inset-y-1 bg-white/25 backdrop-blur-md rounded-full shadow-lg transition-all duration-300 ease-out border border-white/30 z-0"
              style={{
                left: `${views.findIndex(v => v.value === currentView) * (100 / views.length)}%`,
                width: `calc(${100 / views.length}% - 0.25rem)`,
                marginLeft: '0.125rem',
              }}
            />
            {views.map((view) => (
              <button
                key={view.value}
                onClick={() => onViewChange(view.value)}
                data-testid={`button-view-${view.value}`}
                aria-pressed={currentView === view.value}
                aria-label={`Switch to ${view.label} view`}
                className={`
                  relative z-10 flex-1 md:flex-none px-3 md:px-4 py-2 rounded-full text-sm font-medium 
                  transition-all duration-300 ease-out
                  focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:outline-none
                  ${currentView === view.value
                    ? 'text-white scale-105'
                    : 'text-white/60 hover:text-white/90 hover:scale-[1.02] active:scale-95'
                  }
                `}
              >
                {view.label}
              </button>
            ))}
          </nav>

          <div className="hidden md:flex items-center gap-2">
            <Button
              size="icon"
              variant="ghost"
              className="text-white border border-white/50"
              aria-label="Memories"
              onClick={() => setLocation('/memories')}
              data-testid="button-memories-desktop"
            >
              <Image className="w-5 h-5" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="text-white border border-white/50"
              aria-label="Search events"
              onClick={onSearchClick}
              data-testid="button-search-desktop"
            >
              <Search className="w-5 h-5" />
            </Button>
            {onMemberColorChange ? (
              <ProfileMenu members={members} onMemberColorChange={onMemberColorChange} onAddMember={onAddMember} onDeleteMember={onDeleteMember} />
            ) : (
              <Button
                size="icon"
                variant="ghost"
                className="text-white border border-white/50"
                aria-label="User profile"
                data-testid="button-profile-desktop"
              >
                <User className="w-5 h-5" />
              </Button>
            )}
            <Button
              size="icon"
              variant="ghost"
              className="text-white border border-white/50"
              aria-label="Sign out"
              onClick={() => (window.location.href = "/api/logout")}
              data-testid="button-logout-desktop"
            >
              <LogOut className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
