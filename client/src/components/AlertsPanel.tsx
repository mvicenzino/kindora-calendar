import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { Bell, X, Clock, Calendar, ChevronRight, AlertCircle, Timer, CalendarClock } from "lucide-react";
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
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

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
    if (mins < 0) return "border-border bg-muted/50";
    if (mins <= 30) return "border-red-500/40 bg-red-500/10";
    if (mins <= 60) return "border-orange-500/30 bg-orange-500/10";
    return "border-border bg-muted/50";
  };

  type UrgencyBadge = { label: string; style: React.CSSProperties; Icon: React.ElementType } | null;
  const getUrgencyBadge = (event: UiEvent): UrgencyBadge => {
    const mins = differenceInMinutes(new Date(event.startTime), new Date());
    if (mins < 0) return null;
    if (mins <= 15) return { label: "Urgent", style: { background: 'rgba(239,68,68,0.15)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)' }, Icon: AlertCircle };
    if (mins <= 30) return { label: "Very Soon", style: { background: 'rgba(249,115,22,0.15)', color: '#f97316', border: '1px solid rgba(249,115,22,0.3)' }, Icon: Timer };
    if (mins <= 60) return { label: "Coming Up", style: { background: 'rgba(234,179,8,0.15)', color: '#ca8a04', border: '1px solid rgba(234,179,8,0.3)' }, Icon: CalendarClock };
    return null;
  };

  const handleClose = useCallback(() => setIsOpen(false), []);

  useEffect(() => {
    if (!isOpen) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose();
    };
    document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, [isOpen, handleClose]);

  if (alerts.total === 0) {
    return (
      <Button
        size="icon"
        variant="ghost"
        className="text-muted-foreground border border-border"
        aria-label="No alerts"
        data-testid="button-alerts"
      >
        <Bell className="w-4 h-4" />
      </Button>
    );
  }

  const panelContent = isOpen ? createPortal(
    <>
      <div
        className="fixed inset-0"
        style={{ zIndex: 99998 }}
        onClick={handleClose}
        data-testid="alerts-backdrop"
      />
      <div
        ref={panelRef}
        className="fixed right-2 sm:right-4 top-14 w-[calc(100vw-1rem)] sm:w-96 max-h-[calc(100vh-5rem)] bg-card/98 border border-border rounded-2xl shadow-2xl flex flex-col backdrop-blur-xl"
        style={{ zIndex: 99999 }}
        data-testid="panel-alerts"
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-border flex-shrink-0">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-orange-400" />
            <h3 className="text-sm font-semibold text-foreground">Upcoming Events</h3>
          </div>
          <button
            onClick={handleClose}
            className="text-muted-foreground p-1.5 rounded-lg hover-elevate"
            data-testid="button-close-alerts"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-4 overscroll-contain">
          {alerts.todayEvents.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 px-1">
                <Calendar className="w-3.5 h-3.5 text-orange-400" />
                <span className="text-xs font-semibold text-orange-400 uppercase tracking-wide">Today</span>
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{alerts.todayEvents.length}</Badge>
              </div>
              {alerts.todayEvents.map(event => {
                const badge = getUrgencyBadge(event);
                return (
                  <div
                    key={event.id}
                    className={`flex items-start gap-3 p-3 rounded-lg border transition-all ${getUrgencyClass(event)}`}
                    data-testid={`alert-event-${event.id}`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                        <p className="text-sm font-medium text-foreground truncate">{event.title}</p>
                        {badge && (
                          <span
                            className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-md flex-shrink-0"
                            style={badge.style}
                          >
                            <badge.Icon className="w-2.5 h-2.5" />
                            {badge.label}
                          </span>
                        )}
                      </div>
                      {event.description && (
                        <p className="text-xs text-muted-foreground truncate">{event.description}</p>
                      )}
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <Clock className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(event.startTime), "h:mm a")}
                        </span>
                        <ChevronRight className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                        <span className="text-xs font-medium text-orange-400">
                          {getTimeLabel(event)}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => setDismissed(prev => new Set(prev).add(event.id))}
                      className="text-muted-foreground p-1 rounded-lg flex-shrink-0 hover-elevate"
                      data-testid={`button-dismiss-alert-${event.id}`}
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {alerts.tomorrowEvents.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 px-1">
                <Calendar className="w-3.5 h-3.5 text-primary" />
                <span className="text-xs font-semibold text-primary uppercase tracking-wide">Tomorrow</span>
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{alerts.tomorrowEvents.length}</Badge>
              </div>
              {alerts.tomorrowEvents.map(event => (
                <div
                  key={event.id}
                  className="flex items-start gap-3 p-3 rounded-lg border border-border bg-muted/50 transition-all"
                  data-testid={`alert-event-${event.id}`}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{event.title}</p>
                    {event.description && (
                      <p className="text-xs text-muted-foreground truncate mt-0.5">{event.description}</p>
                    )}
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <Clock className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(event.startTime), "h:mm a")}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => setDismissed(prev => new Set(prev).add(event.id))}
                    className="text-muted-foreground p-1 rounded-lg flex-shrink-0 hover-elevate"
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
    </>,
    document.body
  ) : null;

  return (
    <>
      <Button
        ref={buttonRef}
        size="icon"
        variant="ghost"
        className="text-foreground border border-border relative"
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
      {panelContent}
    </>
  );
}
