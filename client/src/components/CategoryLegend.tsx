import { CATEGORY_CONFIG, type EventCategory } from "@shared/schema";

interface CategoryLegendProps {
  className?: string;
}

const LEGEND_ORDER: EventCategory[] = [
  'medical', 'school', 'activities', 'caregiving',
  'errands', 'financial', 'social', 'work', 'other',
];

export default function CategoryLegend({ className = '' }: CategoryLegendProps) {
  return (
    <div className={`flex items-center gap-x-3 gap-y-1 flex-wrap ${className}`} data-testid="category-legend">
      {LEGEND_ORDER.map(cat => (
        <div key={cat} className="flex items-center gap-1.5" data-testid={`legend-${cat}`}>
          <div
            className="w-2.5 h-2.5 rounded-full flex-shrink-0"
            style={{ backgroundColor: CATEGORY_CONFIG[cat].color }}
          />
          <span className="text-[11px] text-white/60 font-medium whitespace-nowrap">
            {CATEGORY_CONFIG[cat].label}
          </span>
        </div>
      ))}
    </div>
  );
}
