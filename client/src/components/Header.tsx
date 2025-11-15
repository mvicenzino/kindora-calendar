import { MessageCircle, User } from "lucide-react";

interface HeaderProps {
  onMessagesClick?: () => void;
  onProfileClick?: () => void;
}

export default function Header({ onMessagesClick, onProfileClick }: HeaderProps) {
  return (
    <header className="w-full px-4 py-4 backdrop-blur-xl bg-white/5 border-b border-white/10">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Left: App branding */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-white/40 to-white/20 border-2 border-white/50 flex items-center justify-center shadow-lg">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              className="w-6 h-6"
              xmlns="http://www.w3.org/2000/svg"
            >
              <rect x="3" y="4" width="18" height="18" rx="2" stroke="white" strokeWidth="2" fill="none"/>
              <path d="M3 9h18M8 4v5M16 4v5" stroke="white" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </div>
          <div>
            <h1 className="text-xl font-bold text-white leading-none">FamilyCal</h1>
            <p className="text-xs text-white/70">Stay connected</p>
          </div>
        </div>

        {/* Right: Action icons */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onMessagesClick}
            data-testid="button-messages"
            className="w-10 h-10 rounded-xl backdrop-blur-xl bg-white/10 border border-white/20 flex items-center justify-center hover-elevate active-elevate-2 transition-all"
          >
            <MessageCircle className="w-5 h-5 text-white" strokeWidth={2} />
          </button>
          <button
            type="button"
            onClick={onProfileClick}
            data-testid="button-profile"
            className="w-10 h-10 rounded-xl backdrop-blur-xl bg-white/10 border border-white/20 flex items-center justify-center hover-elevate active-elevate-2 transition-all"
          >
            <User className="w-5 h-5 text-white" strokeWidth={2} />
          </button>
        </div>
      </div>
    </header>
  );
}
