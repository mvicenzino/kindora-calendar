import { useRef, useEffect, useState } from "react";
import { LayoutGrid, List } from "lucide-react";

export type CalendarLayout = 'grid' | 'tile';

interface ViewSwitcherBarProps {
  currentView: 'day' | 'week' | 'month' | 'timeline';
  onViewChange: (view: 'day' | 'week' | 'month' | 'timeline') => void;
  layout: CalendarLayout;
  onLayoutChange: (layout: CalendarLayout) => void;
}

export default function ViewSwitcherBar({ currentView, onViewChange, layout, onLayoutChange }: ViewSwitcherBarProps) {
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

  const showLayoutToggle = currentView !== 'timeline';

  return (
    <div className="w-full bg-background/60 backdrop-blur-xl border-b border-border/30">
      <div className="flex flex-col items-center px-3 py-1 gap-1">
        <nav 
          ref={containerRef} 
          className="relative flex items-center gap-0.5 bg-muted/40 backdrop-blur-xl rounded-full p-0.5 border border-border/30 overflow-x-auto scrollbar-hide"
          data-testid="nav-view-switcher"
        >
          <div
            className="absolute rounded-full transition-all duration-300 ease-out z-0 bg-primary/80 border border-primary"
            style={{
              left: `${indicatorStyle.left}px`,
              width: `${indicatorStyle.width}px`,
              top: '2px',
              bottom: '2px',
              boxShadow: '0 0 10px hsl(var(--primary) / 0.25)',
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
                relative z-10 min-w-[56px] sm:min-w-[64px] px-2.5 sm:px-3 py-1 rounded-full text-xs font-medium 
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

        {showLayoutToggle && (
          <div className="flex items-center gap-0.5 bg-muted/40 rounded-full p-0.5 border border-border/30" data-testid="layout-toggle">
            <button
              onClick={() => onLayoutChange('grid')}
              data-testid="button-layout-grid"
              aria-pressed={layout === 'grid'}
              aria-label="Grid layout"
              className={`
                relative z-10 px-2 py-0.5 rounded-full text-[10px] font-medium flex items-center justify-center gap-1
                transition-colors duration-300 ease-out
                ${layout === 'grid'
                  ? 'bg-primary/80 text-primary-foreground border border-primary'
                  : 'text-muted-foreground'
                }
              `}
            >
              <LayoutGrid className="w-2.5 h-2.5" />
              <span>Grid</span>
            </button>
            <button
              onClick={() => onLayoutChange('tile')}
              data-testid="button-layout-tile"
              aria-pressed={layout === 'tile'}
              aria-label="Tile layout"
              className={`
                relative z-10 px-2 py-0.5 rounded-full text-[10px] font-medium flex items-center justify-center gap-1
                transition-colors duration-300 ease-out
                ${layout === 'tile'
                  ? 'bg-primary/80 text-primary-foreground border border-primary'
                  : 'text-muted-foreground'
                }
              `}
            >
              <List className="w-2.5 h-2.5" />
              <span>List</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
