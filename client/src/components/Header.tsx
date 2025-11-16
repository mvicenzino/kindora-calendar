import { MessageCircle, User } from "lucide-react";

interface HeaderProps {
  onMessagesClick?: () => void;
  onProfileClick?: () => void;
}

export default function Header({ onMessagesClick, onProfileClick }: HeaderProps) {
  return (
    <header className="w-full px-3 sm:px-4 md:px-6 py-3 sm:py-4 backdrop-blur-xl bg-gradient-to-r from-slate-900/60 via-slate-800/50 to-slate-900/60 border-b border-white/10 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Left: App branding */}
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="w-10 h-10 rounded-xl sm:rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 border-2 border-blue-300/50 flex items-center justify-center shadow-lg shadow-blue-500/20">
            <svg
              viewBox="0 0 100 100"
              className="w-7 h-7"
              xmlns="http://www.w3.org/2000/svg"
            >
              {/* Calendar base */}
              <rect x="20" y="25" width="60" height="60" rx="4" fill="#FFF"/>
              
              {/* Calendar header bar */}
              <rect x="20" y="25" width="60" height="15" rx="4" fill="#FFF" fillOpacity="0.9"/>
              <rect x="20" y="25" width="60" height="10" fill="#E0E7FF"/>
              
              {/* Binding rings */}
              <circle cx="35" cy="22" r="3" fill="#FFF"/>
              <circle cx="50" cy="22" r="3" fill="#FFF"/>
              <circle cx="65" cy="22" r="3" fill="#FFF"/>
              
              {/* Calendar grid dots (representing days) */}
              <g fill="#94A3B8">
                <circle cx="30" cy="50" r="2"/>
                <circle cx="40" cy="50" r="2"/>
                <circle cx="50" cy="50" r="2"/>
                <circle cx="60" cy="50" r="2"/>
                <circle cx="70" cy="50" r="2"/>
                
                <circle cx="30" cy="60" r="2"/>
                <circle cx="40" cy="60" r="2"/>
                <circle cx="60" cy="60" r="2"/>
                <circle cx="70" cy="60" r="2"/>
                
                <circle cx="30" cy="70" r="2"/>
                <circle cx="40" cy="70" r="2"/>
                <circle cx="50" cy="70" r="2"/>
                <circle cx="60" cy="70" r="2"/>
                <circle cx="70" cy="70" r="2"/>
              </g>
              
              {/* Highlighted day (today) */}
              <circle cx="50" cy="60" r="5" fill="#8B5CF6"/>
            </svg>
          </div>
          <div>
            <h1 className="text-lg sm:text-xl font-bold text-white leading-none" style={{ fontFamily: 'Inter, sans-serif' }}>Calendora</h1>
            <p className="text-[10px] sm:text-xs text-white/70 hidden sm:block">Family Schedules, Finally Simplified</p>
          </div>
        </div>

        {/* Right: Action icons */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          <button
            type="button"
            onClick={onMessagesClick}
            data-testid="button-messages"
            className="w-11 h-11 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl backdrop-blur-xl bg-white/10 border border-white/20 flex items-center justify-center hover-elevate active-elevate-2 transition-all touch-manipulation"
            aria-label="Messages"
          >
            <MessageCircle className="w-5 h-5 text-white" strokeWidth={2} />
          </button>
          <button
            type="button"
            onClick={onProfileClick}
            data-testid="button-profile"
            className="w-11 h-11 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl backdrop-blur-xl bg-white/10 border border-white/20 flex items-center justify-center hover-elevate active-elevate-2 transition-all touch-manipulation"
            aria-label="Profile"
          >
            <User className="w-5 h-5 text-white" strokeWidth={2} />
          </button>
        </div>
      </div>
    </header>
  );
}
