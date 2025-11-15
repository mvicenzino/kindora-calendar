import { MessageCircle, User, Sun } from "lucide-react";

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
          <div className="w-10 h-10 rounded-xl sm:rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 border-2 border-amber-300/50 flex items-center justify-center shadow-lg shadow-orange-500/20">
            <Sun className="w-6 h-6 text-white" strokeWidth={2.5} />
          </div>
          <div>
            <h1 className="text-lg sm:text-xl font-bold text-white leading-none" style={{ fontFamily: 'Poppins, sans-serif' }}>DayMan</h1>
            <p className="text-[10px] sm:text-xs text-white/70 hidden sm:block">Stay connected</p>
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
