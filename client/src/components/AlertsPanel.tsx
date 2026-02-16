import { useState, useMemo } from "react";
import { Bell, X, Clock, Calendar, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { useActiveFamily } from "@/contexts/ActiveFamilyContext";
import { useAuth } from "@/hooks/useAuth";
import { mapEventFromDb, type UiEvent } from "@shared/types";
import type { Event } from "@shared/schema";
import { format, isToday, isTomorrow, startOfDay, endOfDay, addDays, differenceInMinutes } from "date-fns";

export default function AlertsPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const { activeFamilyId } = useActiveFamily();
  const { isAuthenticated } = useAuth();

  const { data: rawEvents = [] } = useQuery<Event[]>({
    queryKey: ['/api/events?familyId=' + activeFamilyId],
    enabled: isAuthenticated && !!activeFamilyId,
  });

  const alerts = useMemo(() => {
    const now = new Date();
    const todayStart = startOfDay(now);
    const tomorrowEnd = endOfDay(addDays(now, 1));

    const mapped = rawEvents
      .map(e => mapEventFromDb(e))
      .filter(e => {
        const eventStart = new Date(e.startTime);
        return eventStart >= todayStart && eventStart <= tomorrowEnd && !dismissed.has(e.id);
      })
      .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

    const todayEvents = mapped.filter(e => isToday(new Date(e.startTime)));
    const tomorrowEvents = mapped.filter(e => isTomorrow(new Date(e.startTime)));

    return { todayEvents, tomorrowEvents, total: mapped.length };
  }, [rawEvents, dismissed]);

  const getTimeLabel = (event: UiEvent) => {
    const start = new Date(event.startTime);
    const now = new Date();
    if (isToday(start)) {
      const mins = differenceInMinutes(start, now);
      if (mins > 0 && mins <= 60) return `In ${mins} min`;
      if (mins > 60 && mins <= 120) return `In ${Math.round(mins / 60)} hr`;
      if (mins < 0 && mins > -60) return `Started ${Math.abs(mins)} min ago`;
    }
    return format(start, "h:mm a");
  };

  const getUrgencyClass = (event: UiEvent) => {
    const start = new Date(event.startTime);
    const now = new Date();
    const mins = differenceInMinutes(start, now);
    if (mins < 0) return "border-white/10 bg-white/5";
    if (mins <= 30) return "border-red-500/40 bg-red-500/10";
    if (mins <= 60) return "border-orange-500/30 bg-orange-500/10";
    return "border-white/10 bg-white/5";
  };

  if (alerts.total === 0) {
    return (
      <Button
        size="icon"
        variant="ghost"
        className="text-white/50 border border-white/10"
        aria-label="No alerts"
        data-testid="button-alerts"
      >
        <Bell className="w-4 h-4" />
      </Button>
    );
  }

  return (
    <div className="relative">
      <Button
        size="icon"
        variant="ghost"
        className="text-white border border-white/20 relative"
        aria-label="Alerts"
        onClick={() => setIsOpen(!isOpen)}
        data-testid="button-alerts"
      >
        <Bell className="w-4 h-4" />
        <span
          className="absolute -top-1 -right-1 min-w-[18px] h-[18px] rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center px-1"
          data-testid="badge-alert-count"
        >
          {alerts.total}
        </span>
      </Button>

      {isOpen && (
        <div
          className="absolute right-0 top-full mt-2 w-[calc(100vw-2rem)] max-w-sm bg-slate-950/95 border border-white/20 rounded-2xl shadow-xl overflow-hidden"
          style={{ zIndex: 99999 }}
          data-testid="panel-alerts"
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-orange-400" />
              <h3 className="text-sm font-semibold text-white">Upcoming Events</h3>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-white/50 p-1 rounded-md"
              data-testid="button-close-alerts"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="max-h-80 overflow-y-auto p-3 space-y-4">
            {alerts.todayEvents.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 px-1">
                  <Calendar className="w-3.5 h-3.5 text-orange-400" />
                  <span className="text-xs font-semibold text-orange-400 uppercase tracking-wide">Today</span>
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{alerts.todayEvents.length}</Badge>
                </div>
                {alerts.todayEvents.map(event => (
                  <div
                    key={event.id}
                    className={`flex items-start gap-3 p-3 rounded-lg border transition-all ${getUrgencyClass(event)}`}
                    data-testid={`alert-event-${event.id}`}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">{event.title}</p>
                      {event.description && (
                        <p className="text-xs text-white/50 truncate mt-0.5">{event.description}</p>
                      )}
                      <div className="flex items-center gap-2 mt-1">
                        <Clock className="w-3 h-3 text-white/40" />
                        <span className="text-xs text-white/60">
                          {format(new Date(event.startTime), "h:mm a")}
                        </span>
                        <ChevronRight className="w-3 h-3 text-white/20" />
                        <span className="text-xs font-medium text-orange-400">
                          {getTimeLabel(event)}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => setDismissed(prev => new Set(prev).add(event.id))}
                      className="text-white/30 p-0.5 rounded flex-shrink-0"
                      data-testid={`button-dismiss-alert-${event.id}`}
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {alerts.tomorrowEvents.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 px-1">
                  <Calendar className="w-3.5 h-3.5 text-teal-400" />
                  <span className="text-xs font-semibold text-teal-400 uppercase tracking-wide">Tomorrow</span>
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{alerts.tomorrowEvents.length}</Badge>
                </div>
                {alerts.tomorrowEvents.map(event => (
                  <div
                    key={event.id}
                    className="flex items-start gap-3 p-3 rounded-lg border border-white/10 bg-white/5 transition-all"
                    data-testid={`alert-event-${event.id}`}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">{event.title}</p>
                      {event.description && (
                        <p className="text-xs text-white/50 truncate mt-0.5">{event.description}</p>
                      )}
                      <div className="flex items-center gap-2 mt-1">
                        <Clock className="w-3 h-3 text-white/40" />
                        <span className="text-xs text-white/60">
                          {format(new Date(event.startTime), "h:mm a")}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => setDismissed(prev => new Set(prev).add(event.id))}
                      className="text-white/30 p-0.5 rounded flex-shrink-0"
                      data-testid={`button-dismiss-alert-${event.id}`}
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
