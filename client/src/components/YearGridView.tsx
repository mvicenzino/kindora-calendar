import { useMemo } from "react";
import { format, startOfYear, endOfYear, eachMonthOfInterval, startOfMonth, endOfMonth, eachDayOfInterval, startOfWeek, endOfWeek, isSameMonth, isSameDay, isToday, addYears, subYears } from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { UiEvent } from "@shared/types";

interface YearGridViewProps {
  date: Date;
  events: UiEvent[];
  onDateChange?: (date: Date) => void;
  onMonthClick?: (date: Date) => void;
  onDayClick?: (date: Date) => void;
}

const WEEKDAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

function MiniMonth({ month, events, onMonthClick, onDayClick }: {
  month: Date;
  events: UiEvent[];
  onMonthClick?: (date: Date) => void;
  onDayClick?: (date: Date) => void;
}) {
  const monthStart = startOfMonth(month);
  const monthEnd = endOfMonth(month);
  const calendarStart = startOfWeek(monthStart);
  const calendarEnd = endOfWeek(monthEnd);
  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const eventDays = useMemo(() => {
    const set = new Set<string>();
    events.forEach(e => {
      if (isSameMonth(e.startTime, month)) {
        set.add(format(e.startTime, 'yyyy-MM-dd'));
      }
    });
    return set;
  }, [events, month]);

  const eventColorMap = useMemo(() => {
    const map = new Map<string, string[]>();
    events.forEach(e => {
      if (isSameMonth(e.startTime, month)) {
        const key = format(e.startTime, 'yyyy-MM-dd');
        const colors = map.get(key) || [];
        if (e.color && !colors.includes(e.color)) {
          colors.push(e.color);
        }
        map.set(key, colors);
      }
    });
    return map;
  }, [events, month]);

  const weeks = useMemo(() => {
    const result: Date[][] = [];
    for (let i = 0; i < calendarDays.length; i += 7) {
      result.push(calendarDays.slice(i, i + 7));
    }
    return result;
  }, [calendarDays]);

  return (
    <div className="flex flex-col">
      <button
        onClick={() => onMonthClick?.(month)}
        className="text-xs font-semibold text-foreground mb-1.5 text-left transition-colors hover-elevate rounded-md px-1 -mx-1"
        data-testid={`button-year-month-${format(month, 'MMM').toLowerCase()}`}
      >
        {format(month, 'MMMM')}
      </button>

      <div className="grid grid-cols-7 gap-0">
        {WEEKDAY_LABELS.map((label, i) => (
          <div key={i} className="text-center text-[9px] font-medium text-muted-foreground/60 pb-0.5">
            {label}
          </div>
        ))}

        {weeks.map((week, wi) => (
          week.map((day, di) => {
            const inMonth = isSameMonth(day, month);
            const today = isToday(day);
            const dateStr = format(day, 'yyyy-MM-dd');
            const hasEvents = eventDays.has(dateStr);
            const dayColors = eventColorMap.get(dateStr) || [];

            return (
              <div
                key={`${wi}-${di}`}
                role={inMonth ? "button" : undefined}
                tabIndex={inMonth ? 0 : undefined}
                onClick={(e) => {
                  e.stopPropagation();
                  if (inMonth) onDayClick?.(day);
                }}
                className={`
                  relative flex flex-col items-center justify-center
                  w-full aspect-square text-[10px] leading-none
                  rounded-full cursor-default
                  ${!inMonth ? 'text-transparent pointer-events-none' : 'cursor-pointer hover-elevate'}
                  ${inMonth && !today ? 'text-foreground/80' : ''}
                  ${today ? 'bg-primary text-primary-foreground font-bold' : ''}
                `}
                data-testid={inMonth ? `button-year-day-${dateStr}` : undefined}
              >
                <span>{format(day, 'd')}</span>
                {hasEvents && inMonth && !today && (
                  <div className="absolute bottom-[1px] flex items-center gap-[1px]">
                    {dayColors.slice(0, 3).map((color, ci) => (
                      <div
                        key={ci}
                        className="w-[3px] h-[3px] rounded-full"
                        style={{ backgroundColor: color }}
                      />
                    ))}
                    {dayColors.length === 0 && (
                      <div className="w-[3px] h-[3px] rounded-full bg-primary" />
                    )}
                  </div>
                )}
                {hasEvents && inMonth && today && (
                  <div className="absolute bottom-[1px] flex items-center gap-[1px]">
                    {dayColors.slice(0, 3).map((color, ci) => (
                      <div
                        key={ci}
                        className="w-[3px] h-[3px] rounded-full bg-primary-foreground/80"
                      />
                    ))}
                    {dayColors.length === 0 && (
                      <div className="w-[3px] h-[3px] rounded-full bg-primary-foreground/80" />
                    )}
                  </div>
                )}
              </div>
            );
          })
        ))}
      </div>
    </div>
  );
}

export default function YearGridView({ date, events, onDateChange, onMonthClick, onDayClick }: YearGridViewProps) {
  const yearStart = startOfYear(date);
  const yearEnd = endOfYear(date);
  const months = eachMonthOfInterval({ start: yearStart, end: yearEnd });

  const handlePrevYear = () => onDateChange?.(subYears(date, 1));
  const handleNextYear = () => onDateChange?.(addYears(date, 1));

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-center gap-3 px-3 py-2 border-b border-border/30">
        <Button
          size="icon"
          variant="ghost"
          onClick={handlePrevYear}
          data-testid="button-year-prev"
          aria-label="Previous year"
        >
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <span className="text-sm font-semibold text-foreground min-w-[4rem] text-center" data-testid="text-year-label">
          {format(date, 'yyyy')}
        </span>
        <Button
          size="icon"
          variant="ghost"
          onClick={handleNextYear}
          data-testid="button-year-next"
          aria-label="Next year"
        >
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 sm:p-4">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6 max-w-5xl mx-auto">
          {months.map((month) => (
            <MiniMonth
              key={format(month, 'yyyy-MM')}
              month={month}
              events={events}
              onMonthClick={onMonthClick}
              onDayClick={onDayClick}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
