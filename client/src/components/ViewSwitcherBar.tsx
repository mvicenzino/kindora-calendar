import { useRef, useEffect, useState } from "react";
import { LayoutGrid } from "lucide-react";
import { Button } from "@/components/ui/button";

export type CalendarLayout = 'grid' | 'tile';

export type CalendarView = 'day' | 'week' | 'month' | 'year' | 'timeline';

interface ViewSwitcherBarProps {
  currentView: CalendarView;
  onViewChange: (view: CalendarView) => void;
  layout: CalendarLayout;
  onLayoutChange: (layout: CalendarLayout) => void;
}

export default function ViewSwitcherBar({ currentView, onViewChange, layout, onLayoutChange }: ViewSwitcherBarProps) {
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
    <div
      className="w-full border-b border-white/[0.06] dark:border-white/[0.05]"
      style={{
        background: 'linear-gradient(180deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.01) 100%)',
        backdropFilter: 'blur(20px) saturate(1.3)',
        WebkitBackdropFilter: 'blur(20px) saturate(1.3)',
      }}
    >
      <div className="relative flex items-center justify-center px-3 py-2">
        <nav
          ref={containerRef}
          className="relative flex items-center gap-0 rounded-full p-[3px] overflow-x-auto scrollbar-hide"
          data-testid="nav-view-switcher"
          style={{
            background: 'linear-gradient(135deg, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0.04) 50%, rgba(0,0,0,0.08) 100%)',
            backdropFilter: 'blur(24px) saturate(1.5)',
            WebkitBackdropFilter: 'blur(24px) saturate(1.5)',
            border: '1px solid rgba(255,255,255,0.14)',
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.18), 0 4px 20px rgba(0,0,0,0.12), 0 1px 4px rgba(0,0,0,0.08)',
          }}
        >
          <div
            className="absolute rounded-full z-0 transition-all duration-300 ease-out"
            style={{
              left: `${indicatorStyle.left}px`,
              width: `${indicatorStyle.width}px`,
              top: '3px',
              bottom: '3px',
              background: 'linear-gradient(135deg, hsl(var(--primary) / 0.9) 0%, hsl(var(--primary) / 0.7) 100%)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              border: '1px solid hsl(var(--primary) / 0.5)',
              boxShadow: [
                '0 0 16px hsl(var(--primary) / 0.35)',
                '0 0 6px hsl(var(--primary) / 0.25)',
                'inset 0 1px 0 rgba(255,255,255,0.28)',
                'inset 0 -1px 0 rgba(0,0,0,0.12)',
              ].join(', '),
            }}
          />

          {views.map((view) => (
            <button
              key={view.value}
              ref={(el) => {
                if (el) buttonsRef.current.set(view.value, el);
                else buttonsRef.current.delete(view.value);
              }}
              onClick={() => onViewChange(view.value)}
              data-testid={`button-view-${view.value}`}
              aria-pressed={currentView === view.value}
              aria-label={`Switch to ${view.label} view`}
              className={`
                relative z-10 min-w-[56px] sm:min-w-[68px] px-3 sm:px-4 py-1.5 rounded-full
                text-xs font-semibold tracking-wide flex items-center justify-center whitespace-nowrap
                transition-all duration-300 ease-out
                focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:outline-none
                ${currentView === view.value
                  ? 'text-primary-foreground drop-shadow-sm'
                  : 'text-muted-foreground/70 hover:text-foreground/90'
                }
              `}
            >
              {view.label}
            </button>
          ))}
        </nav>

        {showLayoutToggle && (
          <div className="absolute right-2 sm:right-3 flex items-center">
            <Button
              size="icon"
              variant="ghost"
              onClick={() => onLayoutChange(layout === 'tile' ? 'grid' : 'tile')}
              data-testid="button-layout-toggle"
              aria-pressed={layout === 'tile'}
              aria-label="Toggle cards view"
              className={`toggle-elevate ${layout === 'tile' ? 'toggle-elevated bg-accent text-accent-foreground' : 'text-muted-foreground'}`}
            >
              <LayoutGrid className="w-4 h-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
