import { useState, useMemo } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation, type QueryFunction } from "@tanstack/react-query";
import { format, isToday, isTomorrow, addDays, startOfDay, endOfDay, isWithinInterval, formatDistanceToNow } from "date-fns";
import {
  CalendarDays, MessageCircle, Sparkles, Plus, Check,
  ChevronRight, Pill, AlertTriangle, Clock, Heart, ArrowRight
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useActiveFamily } from "@/contexts/ActiveFamilyContext";
import { useAuth } from "@/hooks/useAuth";
import { useKiraPanel } from "@/contexts/KiraPanelContext";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { mapEventFromDb, mapFamilyMemberFromDb, type UiEvent, type UiFamilyMember } from "@shared/types";
import type { Medication, FamilyMessage, FamilyMember } from "@shared/schema";
import EventModal from "@/components/EventModal";
import EventDetailsDialog from "@/components/EventDetailsDialog";

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function getDayLabel(date: Date): string {
  if (isToday(date)) return "Today";
  if (isTomorrow(date)) return "Tomorrow";
  return format(date, "EEEE, MMM d");
}

export default function FamilyDashboard() {
  const [, navigate] = useLocation();
  const { activeFamilyId } = useActiveFamily();
  const { user } = useAuth();
  const { openPanel } = useKiraPanel();
  const { toast } = useToast();

  const [createEventOpen, setCreateEventOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<UiEvent | null>(null);
  const [loggedMedIds, setLoggedMedIds] = useState<Set<string>>(new Set());
  const [kiraInput, setKiraInput] = useState("");

  // 'now' must be declared before todayKey/insightCacheKey (TDZ guard)
  const now = new Date();
  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);
  const weekEnd = endOfDay(addDays(now, 7));

  // ── Data queries ──────────────────────────────────────────────────────────
  const { data: rawEvents = [] } = useQuery<any[]>({
    queryKey: [`/api/events?familyId=${activeFamilyId}`],
    enabled: !!activeFamilyId,
  });

  // family-members uses path param: fetches /api/family-members/:familyId
  const { data: members = [] } = useQuery<FamilyMember[]>({
    queryKey: ["/api/family-members", activeFamilyId],
    enabled: !!activeFamilyId,
  });

  const { data: medications = [] } = useQuery<Medication[]>({
    queryKey: [`/api/medications?familyId=${activeFamilyId}`],
    enabled: !!activeFamilyId,
  });

  const { data: messages = [] } = useQuery<FamilyMessage[]>({
    queryKey: [`/api/family-messages?familyId=${activeFamilyId}`],
    enabled: !!activeFamilyId,
  });

  const { data: symptomEntries = [] } = useQuery<any[]>({
    queryKey: [`/api/symptoms?familyId=${activeFamilyId}`],
    enabled: !!activeFamilyId,
  });

  const { data: conversations = [] } = useQuery<any[]>({
    queryKey: ["/api/advisor/conversations"],
    enabled: !!user,
  });

  // Daily family insight — cached in localStorage per family+day
  const todayKey = format(now, "yyyy-MM-dd");
  const insightCacheKey = `kira_insight_${activeFamilyId}_${todayKey}`;

  const insightQueryFn: QueryFunction<string> = async () => {
    const cached = localStorage.getItem(insightCacheKey);
    if (cached) return cached;
    const res = await fetch(`/api/dashboard/insight?familyId=${activeFamilyId}`, { credentials: "include" });
    if (!res.ok) throw new Error("Failed to fetch insight");
    const data = await res.json();
    const text: string = data.insight ?? "";
    if (text) localStorage.setItem(insightCacheKey, text);
    return text;
  };

  const { data: familyInsight, isLoading: insightLoading } = useQuery<string>({
    queryKey: ["kira-insight", activeFamilyId, todayKey],
    queryFn: insightQueryFn,
    enabled: !!activeFamilyId,
    staleTime: Infinity,
    retry: false,
  });

  // ── Derived data ──────────────────────────────────────────────────────────
  const events: UiEvent[] = useMemo(
    () => rawEvents.map(mapEventFromDb),
    [rawEvents]
  );

  const todayEvents = useMemo(() =>
    events
      .filter(e => isWithinInterval(e.startTime, { start: todayStart, end: todayEnd }))
      .sort((a, b) => a.startTime.getTime() - b.startTime.getTime()),
    [events]
  );

  const upcomingEvents = useMemo(() => {
    const upcoming = events
      .filter(e => e.startTime > todayEnd && e.startTime <= weekEnd)
      .sort((a, b) => a.startTime.getTime() - b.startTime.getTime());

    // Group by day label
    const grouped: Record<string, UiEvent[]> = {};
    for (const e of upcoming) {
      const label = getDayLabel(e.startTime);
      if (!grouped[label]) grouped[label] = [];
      grouped[label].push(e);
    }
    return grouped;
  }, [events]);

  const activeMeds = useMemo(() =>
    medications.filter((m: any) => !m.isArchived && m.frequency !== "as_needed"),
    [medications]
  );

  const latestMessage = useMemo(() =>
    messages.length > 0 ? messages[messages.length - 1] : null,
    [messages]
  );

  // Health flags: severity > 7 or reactionFlag in last 48h
  const healthFlags = useMemo(() => {
    const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000);
    return symptomEntries.filter((e: any) => {
      const entryDate = new Date(e.date);
      return entryDate >= cutoff && (e.overallSeverity >= 7 || e.reactionFlag);
    });
  }, [symptomEntries]);

  const latestConversation = conversations[0] ?? null;

  const uiMembers: UiFamilyMember[] = useMemo(
    () => members.map(mapFamilyMemberFromDb),
    [members]
  );

  const memberMap = useMemo(() => {
    const m: Record<string, FamilyMember> = {};
    for (const mem of members) m[mem.id] = mem;
    return m;
  }, [members]);

  // ── Mutations ─────────────────────────────────────────────────────────────
  const completeMutation = useMutation({
    mutationFn: ({ eventId, completed }: { eventId: string; completed: boolean }) =>
      apiRequest("PATCH", `/api/events/${eventId}`, { completed }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [`/api/events?familyId=${activeFamilyId}`] }),
  });

  const logMedMutation = useMutation({
    mutationFn: ({ medicationId, memberId }: { medicationId: string; memberId: string | null }) =>
      apiRequest("POST", `/api/medications/${medicationId}/logs`, {
        memberId: memberId ?? null,
        administeredBy: user?.id,
        administeredAt: new Date().toISOString(),
        notes: "Logged from dashboard",
      }),
    onSuccess: (_, vars) => {
      setLoggedMedIds(prev => new Set(prev).add(vars.medicationId));
      toast({ title: "Dose logged", description: "Medication recorded for today." });
    },
  });

  // ── Helpers ───────────────────────────────────────────────────────────────
  const firstName = (user as any)?.firstName || (user as any)?.name?.split(" ")[0] || "there";
  const completedToday = todayEvents.filter(e => e.completed).length;

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">

        {/* ── Greeting ────────────────────────────────────────────────── */}
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              {getGreeting()}, {firstName}
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {format(now, "EEEE, MMMM d")}
              {todayEvents.length > 0 && (
                <span className="ml-2">
                  · {completedToday}/{todayEvents.length} events done today
                </span>
              )}
            </p>
          </div>
        </div>

        {/* ── Kira search bar ──────────────────────────────────────────── */}
        <div className="space-y-2.5">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const q = kiraInput.trim();
              openPanel(q || undefined);
              setKiraInput("");
            }}
            className="flex items-center gap-2 px-4 py-3 rounded-xl border border-border bg-card focus-within:ring-2 focus-within:ring-ring focus-within:border-transparent transition-all"
          >
            <Sparkles className="w-4 h-4 text-violet-500 flex-shrink-0" />
            <input
              value={kiraInput}
              onChange={(e) => setKiraInput(e.target.value)}
              placeholder="Ask Kira anything — schedule help, medication questions, caregiving advice…"
              data-testid="input-kira-search"
              className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
            />
            <button
              type="submit"
              data-testid="button-kira-search-submit"
              className="flex-shrink-0 w-7 h-7 rounded-lg bg-violet-500 flex items-center justify-center hover:bg-violet-600 transition-colors"
            >
              <ArrowRight className="w-3.5 h-3.5 text-white" />
            </button>
          </form>

          {/* Family insight from Kira */}
          {insightLoading && (
            <div className="px-4 py-3 rounded-xl border border-border bg-card/60">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-3.5 h-3.5 text-violet-500 flex-shrink-0" />
                <div className="h-2.5 w-16 rounded-full bg-muted animate-pulse" />
              </div>
              <div className="space-y-1.5">
                <div className="h-2.5 w-full rounded-full bg-muted animate-pulse" />
                <div className="h-2.5 w-5/6 rounded-full bg-muted animate-pulse" />
                <div className="h-2.5 w-4/6 rounded-full bg-muted animate-pulse" />
              </div>
            </div>
          )}
          {!insightLoading && familyInsight && (
            <div className="px-4 py-3 rounded-xl border border-violet-200/60 dark:border-violet-900/40 bg-violet-50/50 dark:bg-violet-950/20">
              <div className="flex items-start gap-2.5">
                <Sparkles className="w-3.5 h-3.5 text-violet-500 flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <span className="text-[11px] font-semibold text-violet-600 dark:text-violet-400 uppercase tracking-wider mr-2">Kira</span>
                  <p className="text-sm text-foreground/90 leading-relaxed inline">
                    {familyInsight}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Secondary quick links */}
          <div className="flex items-center gap-1 flex-wrap">
            <span className="text-xs text-muted-foreground mr-1">Quick:</span>
            {[
              { label: "Add event", action: () => setCreateEventOpen(true) },
              { label: "Messages", action: () => navigate("/messages") },
              { label: "Log symptom", action: () => navigate("/health") },
            ].map(({ label, action }) => (
              <button
                key={label}
                onClick={action}
                data-testid={`button-quick-${label.toLowerCase().replace(/ /g, "-")}`}
                className="text-xs px-2.5 py-1 rounded-full border border-border bg-card hover-elevate active-elevate-2 text-muted-foreground transition-all"
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* ── Main grid ────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Left column: Today + Upcoming */}
          <div className="lg:col-span-2 space-y-6">

            {/* Today's Events */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <CalendarDays className="w-4 h-4 text-orange-500" />
                    Today
                  </CardTitle>
                  <Button variant="ghost" onClick={() => navigate("/calendar")} data-testid="button-view-calendar">
                    Full calendar
                    <ChevronRight className="w-3.5 h-3.5 ml-1" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {todayEvents.length === 0 ? (
                  <div className="text-center py-8">
                    <CalendarDays className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">Nothing scheduled for today</p>
                    <Button variant="outline" size="sm" className="mt-3" onClick={() => setCreateEventOpen(true)}>
                      <Plus className="w-3.5 h-3.5 mr-1.5" />
                      Add something
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {todayEvents.map(event => (
                      <div
                        key={event.id}
                        onClick={() => setSelectedEvent(event)}
                        data-testid={`dashboard-event-${event.id}`}
                        className="flex items-center gap-3 p-2.5 rounded-lg hover-elevate cursor-pointer"
                        style={{
                          background: `${event.color}12`,
                          borderLeft: `3px solid ${event.color}`,
                        }}
                      >
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            completeMutation.mutate({ eventId: event.id, completed: !event.completed });
                          }}
                          data-testid={`button-dashboard-complete-${event.id}`}
                          className={`flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center border transition-all ${
                            event.completed
                              ? "bg-green-500 border-green-500 text-white"
                              : "border-muted-foreground/40 hover:border-green-500"
                          }`}
                        >
                          {event.completed && <Check className="w-3 h-3" strokeWidth={3} />}
                        </button>

                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-medium truncate ${event.completed ? "line-through text-muted-foreground" : "text-foreground"}`}>
                            {event.title}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {format(event.startTime, "h:mm a")} – {format(event.endTime, "h:mm a")}
                          </p>
                        </div>

                        {/* Member chips */}
                        {event.members && event.members.length > 0 && (
                          <div className="flex -space-x-1.5 flex-shrink-0">
                            {event.members.slice(0, 3).map(m => (
                              <div
                                key={m.id}
                                className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold text-white border-2 border-background"
                                style={{ backgroundColor: m.color }}
                                title={m.name}
                              >
                                {m.initials?.[0]}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Upcoming Events */}
            {Object.keys(upcomingEvents).length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Clock className="w-4 h-4 text-blue-500" />
                    Coming up
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {Object.entries(upcomingEvents).slice(0, 4).map(([dayLabel, dayEvents]) => (
                      <div key={dayLabel}>
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                          {dayLabel}
                        </p>
                        <div className="space-y-1.5">
                          {(dayEvents as UiEvent[]).slice(0, 3).map(event => (
                            <div
                              key={event.id}
                              onClick={() => setSelectedEvent(event)}
                              data-testid={`dashboard-upcoming-${event.id}`}
                              className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover-elevate cursor-pointer"
                              style={{
                                background: `${event.color}10`,
                                borderLeft: `2px solid ${event.color}`,
                              }}
                            >
                              <span
                                className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                                style={{ backgroundColor: event.color }}
                              />
                              <span className="text-sm text-foreground truncate flex-1">{event.title}</span>
                              <span className="text-xs text-muted-foreground flex-shrink-0">
                                {format(event.startTime, "h:mm a")}
                              </span>
                            </div>
                          ))}
                          {dayEvents.length > 3 && (
                            <p className="text-xs text-muted-foreground px-2.5">
                              +{dayEvents.length - 3} more
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right column: Meds, Messages, Health, Kira */}
          <div className="space-y-4">

            {/* Medications today */}
            {activeMeds.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <Pill className="w-4 h-4 text-emerald-500" />
                    Medications today
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {activeMeds.slice(0, 5).map((med: any) => {
                      const member = med.memberId ? memberMap[med.memberId] : null;
                      const isLogged = loggedMedIds.has(med.id);
                      return (
                        <div key={med.id} className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full flex-shrink-0 ${isLogged ? "bg-green-500" : "bg-amber-400"}`} />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-foreground truncate">{med.name}</p>
                            {member && (
                              <p className="text-[10px] text-muted-foreground">{member.name}</p>
                            )}
                          </div>
                          {isLogged ? (
                            <span className="text-[10px] text-green-600 font-medium flex-shrink-0">Given</span>
                          ) : (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-[10px] h-6 px-2 flex-shrink-0"
                              onClick={() => logMedMutation.mutate({ medicationId: med.id, memberId: med.memberId })}
                              disabled={logMedMutation.isPending}
                              data-testid={`button-log-med-${med.id}`}
                            >
                              Log
                            </Button>
                          )}
                        </div>
                      );
                    })}
                    {activeMeds.length > 5 && (
                      <p className="text-xs text-muted-foreground">+{activeMeds.length - 5} more</p>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full mt-3 text-xs"
                    onClick={() => navigate("/health")}
                    data-testid="button-view-all-meds"
                  >
                    View all medications
                    <ArrowRight className="w-3 h-3 ml-1.5" />
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Health flags */}
            {healthFlags.length > 0 && (
              <Card className="border-rose-200 dark:border-rose-900/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-sm text-rose-600 dark:text-rose-400">
                    <AlertTriangle className="w-4 h-4" />
                    Health alert
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-1.5">
                    {healthFlags.slice(0, 3).map((entry: any) => {
                      const member = entry.memberId ? memberMap[entry.memberId] : null;
                      return (
                        <div key={entry.id} className="flex items-center gap-2">
                          <div
                            className="w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold text-white flex-shrink-0"
                            style={{ backgroundColor: member?.color ?? "#e11d48" }}
                          >
                            {member?.name?.[0] ?? "?"}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-foreground">
                              {member?.name ?? "Family member"}
                              {entry.reactionFlag && <span className="ml-1 text-rose-500 font-medium">· reaction</span>}
                              {entry.overallSeverity >= 7 && (
                                <span className="ml-1 text-rose-500 font-medium">· severity {entry.overallSeverity}/10</span>
                              )}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full mt-3 text-xs text-rose-600 dark:text-rose-400"
                    onClick={() => navigate("/health")}
                    data-testid="button-view-health"
                  >
                    View health tracker
                    <ArrowRight className="w-3 h-3 ml-1.5" />
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Latest family message */}
            {latestMessage && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <MessageCircle className="w-4 h-4 text-blue-500" />
                    Latest message
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed">
                    {latestMessage.content}
                  </p>
                  <p className="text-[10px] text-muted-foreground/60 mt-1.5">
                    {formatDistanceToNow(new Date(latestMessage.createdAt), { addSuffix: true })}
                  </p>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full mt-3 text-xs"
                    onClick={() => navigate("/messages")}
                    data-testid="button-view-messages"
                  >
                    Open messages
                    <ArrowRight className="w-3 h-3 ml-1.5" />
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Kira activity */}
            {latestConversation && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <Sparkles className="w-4 h-4 text-violet-500" />
                    Kira
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-foreground font-medium truncate">
                    {latestConversation.title || "Recent conversation"}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {latestConversation.updatedAt
                      ? formatDistanceToNow(new Date(latestConversation.updatedAt), { addSuffix: true })
                      : "Recent"}
                  </p>
                  <div className="flex gap-2 mt-3">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 text-xs"
                      onClick={() => openPanel()}
                      data-testid="button-open-kira-panel"
                    >
                      <Sparkles className="w-3 h-3 mr-1.5" />
                      Ask Kira
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs"
                      onClick={() => navigate("/advisor")}
                      data-testid="button-view-advisor"
                    >
                      History
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Empty right column nudge */}
            {activeMeds.length === 0 && healthFlags.length === 0 && !latestMessage && !latestConversation && (
              <Card>
                <CardContent className="pt-6 text-center">
                  <Heart className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">
                    Your family snapshot will appear here as you add events, medications, and messages.
                  </p>
                </CardContent>
              </Card>
            )}

          </div>
        </div>
      </div>

      {/* Modals */}
      {createEventOpen && (
        <EventModal
          isOpen={createEventOpen}
          onClose={() => setCreateEventOpen(false)}
          familyId={activeFamilyId ?? ""}
          members={uiMembers}
        />
      )}

      {selectedEvent && (
        <EventDetailsDialog
          isOpen={!!selectedEvent}
          onClose={() => setSelectedEvent(null)}
          event={selectedEvent}
          onEdit={() => {
            setSelectedEvent(null);
            navigate("/calendar");
          }}
          onDelete={(id) => {
            setSelectedEvent(null);
            queryClient.invalidateQueries({ queryKey: ["/api/events"] });
          }}
        />
      )}
    </div>
  );
}
