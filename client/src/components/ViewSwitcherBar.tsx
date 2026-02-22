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
    <div className="w-full bg-background/60 backdrop-blur-xl border-b border-border/30">
      <div className="flex items-center justify-center px-4 py-2">
        <nav 
          ref={containerRef} 
          className="relative flex items-center gap-1 bg-muted/50 backdrop-blur-xl rounded-full p-1 border border-border/30 overflow-x-auto scrollbar-hide"
          data-testid="nav-view-switcher"
        >
          <div
            className="absolute rounded-full transition-all duration-300 ease-out z-0 bg-primary/80 border border-primary"
            style={{
              left: `${indicatorStyle.left}px`,
              width: `${indicatorStyle.width}px`,
              top: '4px',
              bottom: '4px',
              boxShadow: '0 0 12px rgba(249, 115, 22, 0.3)',
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
                focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:outline-none
                ${currentView === view.value
                  ? 'text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground'
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
