import { useRef, useEffect, useState } from "react";
import { CalendarDays, LayoutGrid, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

export type CalendarLayout = 'grid' | 'tile';

export type CalendarView = 'day' | 'week' | 'month' | 'year' | 'timeline';

interface ViewSwitcherBarProps {
  currentView: CalendarView;
  onViewChange: (view: CalendarView) => void;
  layout: CalendarLayout;
  onLayoutChange: (layout: CalendarLayout) => void;
  onAddEvent?: () => void;
}

export default function ViewSwitcherBar({ currentView, onViewChange, layout, onLayoutChange, onAddEvent }: ViewSwitcherBarProps) {
  const containerRef = useRef<HTMLElement>(null);
  const buttonsRef = useRef<Map<string, HTMLButtonElement>>(new Map());
  const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0 });
  
  const views: Array<{ value: CalendarView; label: string }> = [
    { value: 'day', label: 'Day' },
    { value: 'week', label: 'Week' },
    { value: 'month', label: 'Month' },
    { value: 'year', label: 'Year' },
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

  const showLayoutToggle = currentView !== 'timeline' && currentView !== 'year';

  return (
    <div className="w-full bg-muted/20 dark:bg-white/[0.02] backdrop-blur-xl border-b border-border/30">
      <div className="flex items-center justify-center px-3 py-1.5 pb-3 gap-2 relative">
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

        <div className="absolute right-3 flex items-center gap-1">
          {showLayoutToggle && (
            <>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => onLayoutChange('grid')}
                data-testid="button-layout-grid"
                aria-pressed={layout === 'grid'}
                aria-label="Schedule view"
                className={`toggle-elevate ${layout === 'grid' ? 'toggle-elevated bg-accent text-accent-foreground' : 'text-muted-foreground'}`}
              >
                <CalendarDays className="w-4 h-4" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => onLayoutChange('tile')}
                data-testid="button-layout-tile"
                aria-pressed={layout === 'tile'}
                aria-label="Cards view"
                className={`toggle-elevate ${layout === 'tile' ? 'toggle-elevated bg-accent text-accent-foreground' : 'text-muted-foreground'}`}
              >
                <LayoutGrid className="w-4 h-4" />
              </Button>
            </>
          )}
          {onAddEvent && (
            <Button
              size="icon"
              variant="default"
              onClick={onAddEvent}
              data-testid="button-add-event"
              aria-label="Add event"
              className="rounded-full"
            >
              <Plus className="w-4 h-4" strokeWidth={2.5} />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
