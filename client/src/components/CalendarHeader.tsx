import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";

interface CalendarHeaderProps {
  currentDate: Date;
  onPreviousMonth: () => void;
  onNextMonth: () => void;
  onToday: () => void;
  onAddEvent: () => void;
  view: "month" | "week" | "day";
  onViewChange: (view: "month" | "week" | "day") => void;
}

export default function CalendarHeader({
  currentDate,
  onPreviousMonth,
  onNextMonth,
  onToday,
  onAddEvent,
  view,
  onViewChange,
}: CalendarHeaderProps) {
  return (
    <div className="backdrop-blur-xl bg-card/50 border-b border-card-border shadow-lg sticky top-0 z-50">
      <div className="px-4 py-2 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <Button
              size="icon"
              variant="ghost"
              onClick={onPreviousMonth}
              data-testid="button-previous-month"
              className="hover-elevate active-elevate-2"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              onClick={onNextMonth}
              data-testid="button-next-month"
              className="hover-elevate active-elevate-2"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          
          <h1 className="text-lg font-semibold tracking-tight font-mono" data-testid="text-current-month">
            {format(currentDate, "MMMM yyyy")}
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center rounded-xl bg-muted/50 backdrop-blur-md p-1">
            {(["month", "week", "day"] as const).map((v) => (
              <Button
                key={v}
                size="sm"
                variant="ghost"
                onClick={() => onViewChange(v)}
                data-testid={`button-view-${v}`}
                className={`capitalize px-4 ${
                  view === v ? "toggle-elevate toggle-elevated" : ""
                }`}
              >
                {v}
              </Button>
            ))}
          </div>

          <Button
            variant="outline"
            onClick={onToday}
            data-testid="button-today"
            className="backdrop-blur-md hover-elevate active-elevate-2"
          >
            <CalendarIcon className="h-4 w-4 mr-2" />
            Today
          </Button>

          <Button
            onClick={onAddEvent}
            data-testid="button-add-event"
            className="hover-elevate active-elevate-2"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Event
          </Button>
        </div>
      </div>
    </div>
  );
}
