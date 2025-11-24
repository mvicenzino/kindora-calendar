import { Copy, Search, User, Image, LogOut, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import ProfileMenu from "@/components/ProfileMenu";
import type { UiFamilyMember } from "@shared/types";
import { useLocation } from "wouter";
import { useRef, useEffect, useState } from "react";
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
  const containerRef = useRef<HTMLElement>(null);
  const buttonsRef = useRef<Map<string, HTMLButtonElement>>(new Map());
  const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0 });
  
  const views: Array<{ value: 'day' | 'week' | 'month' | 'timeline'; label: string }> = [
    { value: 'day', label: 'Day' },
    { value: 'week', label: 'Week' },
    { value: 'month', label: 'Month' },
    { value: 'timeline', label: 'Timeline' },
  ];

  useEffect(() => {
    const updateIndicator = () => {
      const activeButton = buttonsRef.current.get(currentView);
      const container = containerRef.current;
      
      if (activeButton && container) {
        const containerRect = container.getBoundingClientRect();
        const buttonRect = activeButton.getBoundingClientRect();
        
        setIndicatorStyle({
          left: buttonRect.left - containerRect.left,
          width: buttonRect.width,
        });
      }
    };

    updateIndicator();
    window.addEventListener('resize', updateIndicator);
    return () => window.removeEventListener('resize', updateIndicator);
  }, [currentView]);

  return (
    <header className="sticky top-0 z-50 w-full">
      <div className="backdrop-blur-xl bg-white/5 border-b border-white/20 shadow-lg">
        <div className="flex flex-col md:flex-row items-center justify-between px-4 md:px-6 py-4 gap-4">
          <div className="flex items-center gap-4 md:gap-8 w-full md:w-auto justify-between md:justify-start">
            <div className="flex items-center gap-3">
              <img src={calendoraIcon} alt="Kindora Calendar" className="w-10 h-10" data-testid="icon-logo" />
              <span className="text-xl text-white app-title">
                <span className="font-extrabold">Kindora</span> <span className="font-medium">Calendar</span>
              </span>
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
                aria-label="Family Settings"
                onClick={() => setLocation('/family')}
                data-testid="button-family-mobile"
              >
                <Users className="w-5 h-5" />
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
          
          <nav ref={containerRef} className="relative flex items-center gap-1 bg-white/10 backdrop-blur-md rounded-full p-1 border border-white/20 w-full md:w-auto">
            <div
              className="absolute bg-white/25 backdrop-blur-md rounded-full shadow-lg transition-all duration-300 ease-out border border-white/30 z-0"
              style={{
                left: `${indicatorStyle.left}px`,
                width: `${indicatorStyle.width}px`,
                top: '4px',
                bottom: '4px',
              }}
            />
            {views.map((view) => (
              <button
                key={view.value}
                ref={(el) => {
                  if (el) {
                    buttonsRef.current.set(view.value, el);
                  } else {
                    buttonsRef.current.delete(view.value);
                  }
                }}
                onClick={() => onViewChange(view.value)}
                data-testid={`button-view-${view.value}`}
                aria-pressed={currentView === view.value}
                aria-label={`Switch to ${view.label} view`}
                className={`
                  relative z-10 flex-1 md:min-w-[80px] px-3 md:px-4 py-2 rounded-full text-sm font-medium 
                  flex items-center justify-center
                  transition-colors duration-300 ease-out
                  focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:outline-none
                  ${currentView === view.value
                    ? 'text-white'
                    : 'text-white/60 hover:text-white/90'
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
              aria-label="Family Settings"
              onClick={() => setLocation('/family')}
              data-testid="button-family-desktop"
            >
              <Users className="w-5 h-5" />
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
