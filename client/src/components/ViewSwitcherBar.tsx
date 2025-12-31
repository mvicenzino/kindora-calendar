import { useRef, useEffect, useState } from "react";

interface ViewSwitcherBarProps {
  currentView: 'day' | 'week' | 'month' | 'timeline';
  onViewChange: (view: 'day' | 'week' | 'month' | 'timeline') => void;
}

export default function ViewSwitcherBar({ currentView, onViewChange }: ViewSwitcherBarProps) {
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
    <div className="relative z-[40] w-full titanium-glass border-b border-white/10">
      <div className="flex items-center justify-center px-4 py-2">
        <nav 
          ref={containerRef} 
          className="relative flex items-center gap-1 bg-white/5 backdrop-blur-xl rounded-full p-1 border border-white/15 overflow-x-auto scrollbar-hide shadow-inner"
          data-testid="nav-view-switcher"
        >
          {/* Active indicator with amber glow - high contrast for accessibility */}
          <div
            className="absolute rounded-full shadow-lg transition-all duration-300 ease-out z-0 bg-amber-400/60 border border-amber-300/80"
            style={{
              left: `${indicatorStyle.left}px`,
              width: `${indicatorStyle.width}px`,
              top: '4px',
              bottom: '4px',
              boxShadow: '0 0 12px rgba(251, 191, 36, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.3)',
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
                relative z-10 min-w-[70px] sm:min-w-[80px] px-3 sm:px-4 py-2 rounded-full text-sm font-medium 
                flex items-center justify-center whitespace-nowrap
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
      </div>
    </div>
  );
}
