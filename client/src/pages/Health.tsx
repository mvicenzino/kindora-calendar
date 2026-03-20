import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { format, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, parseISO, subDays } from "date-fns";
import { Activity, Plus, ChevronLeft, ChevronRight, Trash2, FileText, TrendingUp, CalendarDays, ClipboardList, Loader2, AlertTriangle, Zap, Heart, Brain, Wind, Salad, Dumbbell, Moon, X, Users } from "lucide-react";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useActiveFamily } from "@/contexts/ActiveFamilyContext";
import type { FamilyMember } from "@shared/schema";

// ── Constants ──────────────────────────────────────────────────────────────

const BODY_SYSTEMS = [
  { key: "skin", label: "Skin", icon: Heart, desc: "Hives, flushing, rash, itching" },
  { key: "gi", label: "GI", icon: Salad, desc: "Nausea, cramping, reflux, vomiting" },
  { key: "cardio", label: "Cardiovascular", icon: Activity, desc: "Racing heart, dizziness, POTS" },
  { key: "respiratory", label: "Respiratory", icon: Wind, desc: "Shortness of breath, wheezing" },
  { key: "neuro", label: "Neurological", icon: Brain, desc: "Brain fog, headache, tingling" },
  { key: "musculo", label: "Musculoskeletal", icon: Dumbbell, desc: "Joint pain, fatigue, weakness" },
  { key: "mood", label: "Mood / Sleep", icon: Moon, desc: "Sleep quality, mood, anxiety" },
];

const TRIGGER_OPTIONS = [
  "Food", "Stress", "Heat", "Cold", "Exercise", "Smell/Chemical",
  "Infection", "Medication", "Hormonal", "Unknown",
];

const REACTION_FLAGS = [
  { value: "none", label: "None", color: "text-muted-foreground" },
  { value: "mild", label: "Mild reaction", color: "text-yellow-500" },
  { value: "moderate", label: "Moderate reaction", color: "text-orange-500" },
  { value: "severe", label: "Severe reaction", color: "text-red-500" },
  { value: "anaphylaxis", label: "Anaphylaxis", color: "text-red-700" },
];

function severityColor(s?: number | null): string {
  if (!s) return "bg-muted/30";
  if (s <= 2) return "bg-green-500/70";
  if (s <= 4) return "bg-yellow-400/70";
  if (s <= 6) return "bg-orange-400/70";
  if (s <= 8) return "bg-red-400/70";
  return "bg-red-600/80";
}

function severityLabel(s?: number | null): string {
  if (!s) return "—";
  if (s <= 2) return "Minimal";
  if (s <= 4) return "Mild";
  if (s <= 6) return "Moderate";
  if (s <= 8) return "Severe";
  return "Very Severe";
}

// ── Score Picker ───────────────────────────────────────────────────────────

function ScorePicker({ value, onChange }: { value: number | null; onChange: (v: number) => void }) {
  return (
    <div className="flex gap-1 flex-wrap">
      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          data-testid={`score-${n}`}
          className={`w-8 h-8 rounded-md text-xs font-semibold transition-colors ${
            value === n
              ? n <= 3 ? "bg-green-500 text-white" : n <= 6 ? "bg-orange-400 text-white" : "bg-red-500 text-white"
              : "bg-muted hover-elevate text-muted-foreground"
          }`}
        >
          {n}
        </button>
      ))}
    </div>
  );
}

// ── Log Entry Form ─────────────────────────────────────────────────────────

const MOOD_OPTIONS = [
  { emoji: "😄", label: "Thriving" },
  { emoji: "🙂", label: "Good" },
  { emoji: "😐", label: "Okay" },
  { emoji: "😔", label: "Low" },
  { emoji: "😢", label: "Struggling" },
  { emoji: "😤", label: "Frustrated" },
  { emoji: "😴", label: "Exhausted" },
  { emoji: "🤒", label: "Unwell" },
];

interface FormState {
  date: string;
  memberId: string;
  moodEmoji: string | null;
  energyLevel: number | null;
  overallSeverity: number | null;
  reactionFlag: string;
  triggers: string[];
  notes: string;
  systems: Record<string, number | null>;
}

function defaultForm(memberId: string): FormState {
  return {
    date: format(new Date(), "yyyy-MM-dd"),
    memberId,
    moodEmoji: null,
    energyLevel: null,
    overallSeverity: null,
    reactionFlag: "none",
    triggers: [],
    notes: "",
    systems: Object.fromEntries(BODY_SYSTEMS.map(s => [s.key, null])),
  };
}

function LogForm({ memberId, members, existingEntry, onClose }: {
  memberId: string;
  members: FamilyMember[];
  existingEntry?: any;
  onClose: () => void;
}) {
  const { toast } = useToast();
  const [form, setForm] = useState<FormState>(() => {
    if (existingEntry) {
      const sysMap: Record<string, number | null> = Object.fromEntries(BODY_SYSTEMS.map(s => [s.key, null]));
      (existingEntry.systems ?? []).forEach((r: any) => { sysMap[r.system] = r.severity; });
      return {
        date: existingEntry.date,
        memberId: existingEntry.memberId,
        moodEmoji: existingEntry.moodEmoji ?? null,
        energyLevel: existingEntry.energyLevel ?? null,
        overallSeverity: existingEntry.overallSeverity ?? null,
        reactionFlag: existingEntry.reactionFlag ?? "none",
        triggers: existingEntry.triggers ?? [],
        notes: existingEntry.notes ?? "",
        systems: sysMap,
      };
    }
    return defaultForm(memberId);
  });

  const isEdit = !!existingEntry;

  const mutation = useMutation({
    mutationFn: async (data: FormState) => {
      const systems = BODY_SYSTEMS
        .filter(s => data.systems[s.key] !== null)
        .map(s => ({ system: s.key, severity: data.systems[s.key]! }));
      const payload = {
        memberId: data.memberId,
        date: data.date,
        moodEmoji: data.moodEmoji ?? null,
        energyLevel: data.energyLevel,
        overallSeverity: data.overallSeverity,
        reactionFlag: data.reactionFlag,
        triggers: data.triggers.length > 0 ? data.triggers : null,
        notes: data.notes.trim() || null,
        systems,
      };
      if (isEdit) {
        return apiRequest("PUT", `/api/symptoms/${existingEntry.id}`, payload);
      }
      return apiRequest("POST", "/api/symptoms", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/symptoms"] });
      toast({ title: isEdit ? "Entry updated" : "Entry logged", description: `Symptom log saved for ${format(parseISO(form.date), "MMMM d")}` });
      onClose();
    },
    onError: () => toast({ title: "Error", description: "Failed to save entry", variant: "destructive" }),
  });

  function toggleTrigger(t: string) {
    setForm(f => ({
      ...f,
      triggers: f.triggers.includes(t) ? f.triggers.filter(x => x !== t) : [...f.triggers, t],
    }));
  }

  return (
    <div className="space-y-5 pb-2">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Date</label>
          <input
            type="date"
            value={form.date}
            onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
            data-testid="input-symptom-date"
            className="w-full text-sm bg-muted/40 border border-border rounded-md px-2.5 py-1.5 text-foreground"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">For</label>
          <Select value={form.memberId} onValueChange={v => setForm(f => ({ ...f, memberId: v }))}>
            <SelectTrigger data-testid="select-symptom-member" className="text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {members.map(m => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Mood / How are they feeling?</label>
        <div className="flex flex-wrap gap-2">
          {MOOD_OPTIONS.map(opt => (
            <button
              key={opt.emoji}
              type="button"
              onClick={() => setForm(f => ({ ...f, moodEmoji: f.moodEmoji === opt.emoji ? null : opt.emoji }))}
              data-testid={`mood-${opt.label.toLowerCase()}`}
              title={opt.label}
              className={`flex flex-col items-center gap-0.5 px-2.5 py-1.5 rounded-lg border text-sm transition-all ${
                form.moodEmoji === opt.emoji
                  ? "border-primary bg-primary/10 shadow-sm scale-105"
                  : "border-border bg-muted/40 hover-elevate"
              }`}
            >
              <span className="text-xl leading-none">{opt.emoji}</span>
              <span className={`text-[10px] font-medium ${form.moodEmoji === opt.emoji ? "text-primary" : "text-muted-foreground"}`}>{opt.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Energy Level</label>
        <ScorePicker value={form.energyLevel} onChange={v => setForm(f => ({ ...f, energyLevel: v }))} />
        <div className="flex justify-between text-[10px] text-muted-foreground px-0.5">
          <span>1 = exhausted</span>
          <span>10 = great</span>
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Overall Symptom Severity</label>
        <ScorePicker value={form.overallSeverity} onChange={v => setForm(f => ({ ...f, overallSeverity: v }))} />
        <div className="flex justify-between text-[10px] text-muted-foreground px-0.5">
          <span>1 = minimal</span>
          <span>10 = severe</span>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-baseline justify-between">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Body Systems Affected</label>
          <span className="text-[10px] text-muted-foreground">1 = minimal · 10 = severe</span>
        </div>
        <div className="space-y-2">
          {BODY_SYSTEMS.map(sys => {
            const Icon = sys.icon;
            const val = form.systems[sys.key];
            return (
              <div key={sys.key} className="flex items-center gap-3">
                <div className="flex items-center gap-1.5 w-32 flex-shrink-0">
                  <Icon className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="text-xs font-medium">{sys.label}</span>
                </div>
                <div className="flex gap-1 flex-wrap">
                  {[1,2,3,4,5,6,7,8,9,10].map(n => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setForm(f => ({ ...f, systems: { ...f.systems, [sys.key]: f.systems[sys.key] === n ? null : n } }))}
                      data-testid={`system-${sys.key}-${n}`}
                      className={`w-6 h-6 rounded text-[10px] font-semibold transition-colors ${
                        val === n
                          ? n <= 3 ? "bg-green-500 text-white" : n <= 6 ? "bg-orange-400 text-white" : "bg-red-500 text-white"
                          : "bg-muted/60 hover-elevate text-muted-foreground"
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Potential Triggers</label>
        <div className="flex flex-wrap gap-1.5">
          {TRIGGER_OPTIONS.map(t => (
            <button
              key={t}
              type="button"
              onClick={() => toggleTrigger(t)}
              data-testid={`trigger-${t.toLowerCase().replace("/", "-")}`}
              className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors border ${
                form.triggers.includes(t)
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-muted/40 text-muted-foreground border-border hover-elevate"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Reaction Flag</label>
        <div className="flex flex-wrap gap-2">
          {REACTION_FLAGS.map(r => (
            <button
              key={r.value}
              type="button"
              onClick={() => setForm(f => ({ ...f, reactionFlag: r.value }))}
              data-testid={`reaction-${r.value}`}
              className={`px-2.5 py-1 rounded-md text-xs font-medium border transition-colors ${
                form.reactionFlag === r.value
                  ? "bg-primary/10 border-primary text-primary"
                  : "bg-muted/40 border-border text-muted-foreground hover-elevate"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Notes</label>
        <Textarea
          value={form.notes}
          onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
          placeholder="What happened today? What did they eat? What helped?"
          data-testid="textarea-symptom-notes"
          rows={3}
          className="text-sm resize-none"
        />
      </div>

      <div className="flex gap-2 pt-1">
        <Button variant="outline" onClick={onClose} className="flex-1" data-testid="button-cancel-entry">Cancel</Button>
        <Button
          onClick={() => mutation.mutate(form)}
          disabled={mutation.isPending}
          className="flex-1"
          data-testid="button-save-entry"
        >
          {mutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : isEdit ? "Update Entry" : "Save Entry"}
        </Button>
      </div>
    </div>
  );
}

// ── Entry Card ─────────────────────────────────────────────────────────────

function EntryCard({ entry, members, onEdit }: { entry: any; members: FamilyMember[]; onEdit: (e: any) => void }) {
  const { toast } = useToast();
  const member = members.find(m => m.id === entry.memberId);
  const reaction = REACTION_FLAGS.find(r => r.value === entry.reactionFlag);

  const deleteMutation = useMutation({
    mutationFn: () => apiRequest("DELETE", `/api/symptoms/${entry.id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/symptoms"] });
      toast({ title: "Entry deleted" });
    },
  });

  return (
    <Card data-testid={`card-entry-${entry.id}`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3 flex-wrap mb-3">
          <div className="flex items-center gap-3">
            {entry.moodEmoji && (
              <span
                className="text-3xl leading-none flex-shrink-0"
                title={MOOD_OPTIONS.find(m => m.emoji === entry.moodEmoji)?.label}
                data-testid={`mood-display-${entry.id}`}
              >
                {entry.moodEmoji}
              </span>
            )}
            <div>
              <p className="text-sm font-semibold text-foreground">{format(parseISO(entry.date), "EEEE, MMMM d")}</p>
              {member && <p className="text-xs text-muted-foreground">{member.name}</p>}
              {entry.moodEmoji && (
                <p className="text-xs text-muted-foreground">{MOOD_OPTIONS.find(m => m.emoji === entry.moodEmoji)?.label}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {entry.reactionFlag && entry.reactionFlag !== "none" && (
              <Badge variant="outline" className={`text-xs ${reaction?.color}`}>
                <AlertTriangle className="w-2.5 h-2.5 mr-1" />
                {reaction?.label}
              </Badge>
            )}
            <Button size="icon" variant="ghost" onClick={() => onEdit(entry)} data-testid={`button-edit-entry-${entry.id}`}>
              <ClipboardList className="w-4 h-4" />
            </Button>
            <Button size="icon" variant="ghost" onClick={() => deleteMutation.mutate()} disabled={deleteMutation.isPending} data-testid={`button-delete-entry-${entry.id}`}>
              <Trash2 className="w-4 h-4 text-destructive" />
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 mb-3">
          <div className="bg-muted/30 rounded-md p-2.5">
            <div className="flex items-center gap-1.5 mb-1">
              <Zap className="w-3 h-3 text-muted-foreground" />
              <span className="text-[10px] text-muted-foreground uppercase tracking-wide">Energy</span>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-lg font-bold text-foreground">{entry.energyLevel ?? "—"}</span>
              <span className="text-xs text-muted-foreground">/10</span>
            </div>
          </div>
          <div className="bg-muted/30 rounded-md p-2.5">
            <div className="flex items-center gap-1.5 mb-1">
              <Activity className="w-3 h-3 text-muted-foreground" />
              <span className="text-[10px] text-muted-foreground uppercase tracking-wide">Severity</span>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-lg font-bold text-foreground">{entry.overallSeverity ?? "—"}</span>
              <span className="text-xs text-muted-foreground">/10</span>
              {entry.overallSeverity && <span className="text-xs text-muted-foreground">· {severityLabel(entry.overallSeverity)}</span>}
            </div>
          </div>
        </div>

        {entry.systems && entry.systems.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2">
            {entry.systems.map((s: any) => {
              const sys = BODY_SYSTEMS.find(b => b.key === s.system);
              return (
                <span key={s.system} className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium text-white ${severityColor(s.severity)}`}>
                  {sys?.label} {s.severity}
                </span>
              );
            })}
          </div>
        )}

        {entry.triggers && entry.triggers.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2">
            {entry.triggers.map((t: string) => (
              <Badge key={t} variant="outline" className="text-[10px] px-1.5">{t}</Badge>
            ))}
          </div>
        )}

        {entry.notes && (
          <p className="text-xs text-muted-foreground leading-relaxed mt-2 whitespace-pre-wrap">{entry.notes}</p>
        )}
      </CardContent>
    </Card>
  );
}

// ── Timeline View ──────────────────────────────────────────────────────────

function TimelineView({ entries, memberId, members }: { entries: any[]; memberId: string; members: FamilyMember[] }) {
  const [monthOffset, setMonthOffset] = useState(0);
  const today = new Date();
  const targetMonth = monthOffset === 0 ? today : subMonths(today, -monthOffset);
  const monthStart = startOfMonth(targetMonth);
  const monthEnd = endOfMonth(targetMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startDow = monthStart.getDay();

  const entriesByDate = useMemo(() => {
    const map: Record<string, any> = {};
    entries.filter(e => !memberId || memberId === "all" || e.memberId === memberId).forEach(e => { map[e.date] = e; });
    return map;
  }, [entries, memberId]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Button size="icon" variant="ghost" onClick={() => setMonthOffset(o => o - 1)} data-testid="button-prev-month">
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <p className="text-sm font-semibold">{format(targetMonth, "MMMM yyyy")}</p>
        <Button size="icon" variant="ghost" onClick={() => setMonthOffset(o => Math.min(0, o + 1))} disabled={monthOffset >= 0} data-testid="button-next-month">
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center">
        {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map(d => (
          <div key={d} className="text-[10px] text-muted-foreground font-medium py-1">{d}</div>
        ))}
        {Array.from({ length: startDow }).map((_, i) => <div key={`pad-${i}`} />)}
        {days.map(day => {
          const key = format(day, "yyyy-MM-dd");
          const entry = entriesByDate[key];
          const isToday = isSameDay(day, today);
          return (
            <div
              key={key}
              data-testid={`calendar-day-${key}`}
              className={`aspect-square rounded-md flex flex-col items-center justify-center text-[10px] font-medium relative ${
                entry ? severityColor(entry.overallSeverity) + " text-white" : "bg-muted/20 text-muted-foreground"
              } ${isToday ? "ring-2 ring-primary ring-offset-1 ring-offset-background" : ""}`}
            >
              <span>{format(day, "d")}</span>
              {entry?.overallSeverity && <span className="text-[8px] opacity-80">{entry.overallSeverity}</span>}
            </div>
          );
        })}
      </div>

      <div className="flex items-center gap-3 flex-wrap justify-center pt-1">
        {[
          { label: "Good (1–2)", cls: "bg-green-500/70" },
          { label: "Mild (3–4)", cls: "bg-yellow-400/70" },
          { label: "Moderate (5–6)", cls: "bg-orange-400/70" },
          { label: "Severe (7–8)", cls: "bg-red-400/70" },
          { label: "Very Severe (9–10)", cls: "bg-red-600/80" },
          { label: "No entry", cls: "bg-muted/30" },
        ].map(l => (
          <div key={l.label} className="flex items-center gap-1">
            <div className={`w-3 h-3 rounded-sm ${l.cls}`} />
            <span className="text-[10px] text-muted-foreground">{l.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Trends View ────────────────────────────────────────────────────────────

function TrendsView({ entries, memberId }: { entries: any[]; memberId: string }) {
  const filtered = useMemo(() =>
    entries.filter(e => !memberId || memberId === "all" || e.memberId === memberId)
      .slice(0, 30)
      .reverse(),
    [entries, memberId]
  );

  const chartData = filtered.map(e => ({
    date: format(parseISO(e.date), "MM/dd"),
    severity: e.overallSeverity,
    energy: e.energyLevel,
  }));

  const systemTotals: Record<string, { count: number; total: number }> = {};
  filtered.forEach(e => {
    (e.systems ?? []).forEach((s: any) => {
      if (!systemTotals[s.system]) systemTotals[s.system] = { count: 0, total: 0 };
      systemTotals[s.system].count++;
      systemTotals[s.system].total += s.severity;
    });
  });
  const systemData = BODY_SYSTEMS
    .filter(s => systemTotals[s.key])
    .map(s => ({ name: s.label, avg: +(systemTotals[s.key].total / systemTotals[s.key].count).toFixed(1) }))
    .sort((a, b) => b.avg - a.avg);

  const triggerCounts: Record<string, number> = {};
  filtered.forEach(e => (e.triggers ?? []).forEach((t: string) => { triggerCounts[t] = (triggerCounts[t] ?? 0) + 1; }));
  const triggerData = Object.entries(triggerCounts).sort((a, b) => b[1] - a[1]).map(([name, count]) => ({ name, count }));

  const goodDays = filtered.filter(e => (e.overallSeverity ?? 10) <= 3).length;
  const totalDays = filtered.length;

  if (filtered.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <TrendingUp className="w-8 h-8 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Log at least a few entries to see trends.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-foreground">{goodDays}/{totalDays}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Good days (last 30)</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-foreground">
              {filtered.length > 0 ? (filtered.reduce((s, e) => s + (e.overallSeverity ?? 0), 0) / filtered.filter(e => e.overallSeverity).length).toFixed(1) : "—"}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">Avg severity</p>
          </CardContent>
        </Card>
      </div>

      {chartData.length > 1 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Severity & Energy (last 30 days)</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <ResponsiveContainer width="100%" height={160}>
              <LineChart data={chartData} margin={{ top: 4, right: 8, bottom: 0, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} interval="preserveStartEnd" />
                <YAxis domain={[0, 10]} tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "6px", fontSize: "11px" }} />
                <Line type="monotone" dataKey="severity" stroke="#f97316" strokeWidth={2} dot={false} name="Severity" />
                <Line type="monotone" dataKey="energy" stroke="#22c55e" strokeWidth={2} dot={false} name="Energy" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {systemData.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Avg Severity by Body System</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <ResponsiveContainer width="100%" height={140}>
              <BarChart data={systemData} margin={{ top: 4, right: 8, bottom: 20, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" tick={{ fontSize: 8, fill: "hsl(var(--muted-foreground))" }} angle={-25} textAnchor="end" interval={0} />
                <YAxis domain={[0, 10]} tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "6px", fontSize: "11px" }} />
                <Bar dataKey="avg" fill="#f97316" radius={[3, 3, 0, 0]} name="Avg Severity" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {triggerData.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Trigger Frequency</CardTitle>
          </CardHeader>
          <CardContent className="pt-0 space-y-1.5">
            {triggerData.map(t => (
              <div key={t.name} className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground w-24 truncate">{t.name}</span>
                <div className="flex-1 bg-muted/30 rounded-full h-2">
                  <div
                    className="h-2 bg-primary rounded-full"
                    style={{ width: `${(t.count / (triggerData[0]?.count || 1)) * 100}%` }}
                  />
                </div>
                <span className="text-xs font-medium w-5 text-right">{t.count}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ── Reports View ───────────────────────────────────────────────────────────

function ReportsView({ entries, memberId, members }: { entries: any[]; members: FamilyMember[]; memberId: string }) {
  const [range, setRange] = useState("30");

  const filtered = useMemo(() => {
    const cutoff = format(subDays(new Date(), parseInt(range)), "yyyy-MM-dd");
    return entries
      .filter(e => e.date >= cutoff)
      .filter(e => !memberId || memberId === "all" || e.memberId === memberId);
  }, [entries, memberId, range]);

  const member = members.find(m => m.id === memberId);

  const avgSeverity = filtered.filter(e => e.overallSeverity).length > 0
    ? (filtered.reduce((s, e) => s + (e.overallSeverity ?? 0), 0) / filtered.filter(e => e.overallSeverity).length).toFixed(1)
    : "—";

  const goodDays = filtered.filter(e => (e.overallSeverity ?? 10) <= 3).length;
  const badDays = filtered.filter(e => (e.overallSeverity ?? 0) >= 7).length;
  const anaphylaxisDays = filtered.filter(e => e.reactionFlag === "anaphylaxis").length;
  const severeDays = filtered.filter(e => e.reactionFlag === "severe" || e.reactionFlag === "anaphylaxis").length;

  const systemTotals: Record<string, number[]> = {};
  filtered.forEach(e => (e.systems ?? []).forEach((s: any) => {
    if (!systemTotals[s.system]) systemTotals[s.system] = [];
    systemTotals[s.system].push(s.severity);
  }));

  const triggerCounts: Record<string, number> = {};
  filtered.forEach(e => (e.triggers ?? []).forEach((t: string) => { triggerCounts[t] = (triggerCounts[t] ?? 0) + 1; }));

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Select value={range} onValueChange={setRange}>
          <SelectTrigger className="w-36" data-testid="select-report-range">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="14">Last 14 days</SelectItem>
            <SelectItem value="30">Last 30 days</SelectItem>
            <SelectItem value="60">Last 60 days</SelectItem>
            <SelectItem value="90">Last 90 days</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">{filtered.length} entries logged</p>
      </div>

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="w-8 h-8 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No entries in this range.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3 text-sm" id="symptom-report">
          <Card>
            <CardContent className="p-4 space-y-3">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Patient</p>
                <p className="font-semibold">{member?.name ?? "All members"}</p>
                <p className="text-xs text-muted-foreground">Report period: last {range} days · {filtered.length} entries</p>
              </div>
              <div className="grid grid-cols-2 gap-3 pt-1">
                {[
                  { label: "Avg Severity", value: avgSeverity + "/10" },
                  { label: "Good Days (≤3)", value: goodDays },
                  { label: "Severe Days (≥7)", value: badDays },
                  { label: "Reaction Events", value: severeDays },
                ].map(stat => (
                  <div key={stat.label} className="bg-muted/30 rounded-md p-2.5">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{stat.label}</p>
                    <p className="text-lg font-bold text-foreground">{stat.value}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {anaphylaxisDays > 0 && (
            <Card className="border-red-500/40 bg-red-500/5">
              <CardContent className="p-4 flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0" />
                <p className="text-sm text-red-500 font-medium">{anaphylaxisDays} anaphylaxis event{anaphylaxisDays > 1 ? "s" : ""} recorded in this period</p>
              </CardContent>
            </Card>
          )}

          {Object.keys(systemTotals).length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Body Systems — Average Severity</CardTitle>
              </CardHeader>
              <CardContent className="pt-0 space-y-2">
                {BODY_SYSTEMS.filter(s => systemTotals[s.key]).map(s => {
                  const vals = systemTotals[s.key];
                  const avg = (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1);
                  const Icon = s.icon;
                  return (
                    <div key={s.key} className="flex items-center gap-2">
                      <Icon className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                      <span className="text-xs w-28 flex-shrink-0">{s.label}</span>
                      <div className="flex-1 bg-muted/30 rounded-full h-2">
                        <div className="h-2 bg-primary rounded-full" style={{ width: `${(parseFloat(avg) / 10) * 100}%` }} />
                      </div>
                      <span className="text-xs font-medium w-8 text-right">{avg}/10</span>
                      <span className="text-[10px] text-muted-foreground w-12">({vals.length}×)</span>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          )}

          {Object.keys(triggerCounts).length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Identified Triggers</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex flex-wrap gap-1.5">
                  {Object.entries(triggerCounts).sort((a, b) => b[1] - a[1]).map(([t, c]) => (
                    <Badge key={t} variant="outline" className="text-xs">{t} ({c})</Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Recent Entries</CardTitle>
            </CardHeader>
            <CardContent className="pt-0 space-y-2">
              {filtered.slice(0, 10).map(e => (
                <div key={e.id} className="flex items-start gap-3 py-2 border-b border-border last:border-0">
                  <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${severityColor(e.overallSeverity)}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium">{format(parseISO(e.date), "EEE, MMM d")}</p>
                    {e.notes && <p className="text-[11px] text-muted-foreground truncate">{e.notes}</p>}
                  </div>
                  <div className="text-right flex-shrink-0">
                    {e.overallSeverity && <p className="text-xs font-semibold">{e.overallSeverity}/10</p>}
                    {e.reactionFlag && e.reactionFlag !== "none" && <p className="text-[10px] text-orange-500">{e.reactionFlag}</p>}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <p className="text-[10px] text-muted-foreground text-center pb-2">
            Generated by Kindora · {format(new Date(), "MMMM d, yyyy")} · For informational use only
          </p>
        </div>
      )}
    </div>
  );
}

// ── Member Pill Strip ──────────────────────────────────────────────────────

function MemberPillStrip({ members, selectedMemberId, onSelect, todayLoggedIds }: {
  members: FamilyMember[];
  selectedMemberId: string;
  onSelect: (id: string) => void;
  todayLoggedIds: Set<string>;
}) {
  return (
    <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide pb-0.5">
      <button
        onClick={() => onSelect("all")}
        data-testid="button-member-all"
        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-medium flex-shrink-0 transition-colors border ${
          selectedMemberId === "all"
            ? "bg-primary text-primary-foreground border-primary"
            : "bg-muted/40 text-muted-foreground border-border hover-elevate"
        }`}
      >
        <Users className="w-3.5 h-3.5" />
        All
      </button>

      {members.map(m => {
        const isSelected = selectedMemberId === m.id;
        const loggedToday = todayLoggedIds.has(m.id);
        const firstName = m.name.split(" ")[0];
        return (
          <button
            key={m.id}
            onClick={() => onSelect(m.id)}
            data-testid={`button-member-${m.id}`}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-medium flex-shrink-0 transition-colors border ${
              isSelected
                ? "border-transparent text-foreground"
                : "bg-muted/40 text-muted-foreground border-border hover-elevate"
            }`}
            style={isSelected ? {
              backgroundColor: `${m.color}20`,
              borderColor: `${m.color}50`,
              color: "hsl(var(--foreground))",
            } : undefined}
          >
            <div
              className="w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold text-white flex-shrink-0"
              style={{ backgroundColor: m.color }}
            >
              {m.name[0]?.toUpperCase()}
            </div>
            <span className="whitespace-nowrap">{firstName}</span>
            {loggedToday && (
              <div className="w-1.5 h-1.5 rounded-full bg-green-500 flex-shrink-0" title="Logged today" />
            )}
          </button>
        );
      })}
    </div>
  );
}

// ── Main Health Page ───────────────────────────────────────────────────────

export default function Health() {
  const { activeFamilyId } = useActiveFamily();
  const [selectedMemberId, setSelectedMemberId] = useState<string>("all");
  const [formOpen, setFormOpen] = useState(false);
  const [editEntry, setEditEntry] = useState<any>(null);

  const { data: members = [] } = useQuery<FamilyMember[]>({
    queryKey: ["/api/family-members"],
    enabled: !!activeFamilyId,
  });

  // Always fetch all entries so the pill strip can show logged-today dots
  const { data: allEntries = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/symptoms", activeFamilyId],
    queryFn: () => fetch("/api/symptoms").then(r => r.json()),
    enabled: !!activeFamilyId,
  });

  const todayStr = format(new Date(), "yyyy-MM-dd");

  // Which member IDs have a log entry today
  const todayLoggedIds = useMemo(() =>
    new Set(allEntries.filter(e => e.date === todayStr).map(e => e.memberId)),
    [allEntries, todayStr]
  );

  // Filtered entries for the selected view
  const entries = useMemo(() =>
    selectedMemberId === "all"
      ? allEntries
      : allEntries.filter(e => e.memberId === selectedMemberId),
    [allEntries, selectedMemberId]
  );

  // Members who haven't logged today (for the prompt)
  const notLoggedToday = useMemo(() => {
    if (selectedMemberId !== "all") {
      const m = members.find(m => m.id === selectedMemberId);
      return !todayLoggedIds.has(selectedMemberId) && m ? [m] : [];
    }
    return members.filter(m => !todayLoggedIds.has(m.id));
  }, [members, todayLoggedIds, selectedMemberId]);

  function openNew(preselectedMemberId?: string) {
    setEditEntry(preselectedMemberId ? { _preselect: preselectedMemberId } : null);
    setFormOpen(true);
  }

  function openEdit(entry: any) {
    setEditEntry(entry);
    setFormOpen(true);
  }

  // The member ID to pre-fill in the form
  const defaultMemberId = useMemo(() => {
    if (editEntry?._preselect) return editEntry._preselect;
    if (editEntry?.memberId) return editEntry.memberId;
    if (selectedMemberId !== "all") return selectedMemberId;
    return members[0]?.id ?? "";
  }, [editEntry, selectedMemberId, members]);

  // The actual entry to edit (null if _preselect stub)
  const entryToEdit = editEntry?._preselect ? null : editEntry;

  return (
    <div className="p-3 md:p-4 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-base font-semibold flex items-center gap-2" data-testid="text-health-title">
            <Activity className="w-4 h-4 text-primary" />
            Symptom Tracker
          </h1>
          <p className="text-xs text-muted-foreground">Daily health log for complex conditions</p>
        </div>
        <Button size="icon" onClick={() => openNew()} data-testid="button-new-entry">
          <Plus className="w-4 h-4" />
        </Button>
      </div>

      {members.length > 0 && (
        <MemberPillStrip
          members={members}
          selectedMemberId={selectedMemberId}
          onSelect={setSelectedMemberId}
          todayLoggedIds={todayLoggedIds}
        />
      )}

      {notLoggedToday.length > 0 && (
        <div className="space-y-2">
          {notLoggedToday.map(m => (
            <Card key={m.id} className="border-primary/20 bg-primary/5">
              <CardContent className="p-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <div
                    className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0"
                    style={{ backgroundColor: m.color }}
                  >
                    {m.name[0]?.toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{m.name.split(" ")[0]} hasn't logged today</p>
                    <p className="text-xs text-muted-foreground">How are they feeling?</p>
                  </div>
                </div>
                <Button size="sm" onClick={() => openNew(m.id)} data-testid={`button-log-today-${m.id}`}>
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  Log
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Tabs defaultValue="log" className="space-y-3">
        <TabsList className="w-full">
          <TabsTrigger value="log" className="flex-1 text-xs" data-testid="tab-health-log">
            <ClipboardList className="w-3.5 h-3.5 sm:mr-1.5" />
            <span className="hidden sm:inline">Log</span>
          </TabsTrigger>
          <TabsTrigger value="timeline" className="flex-1 text-xs" data-testid="tab-health-timeline">
            <CalendarDays className="w-3.5 h-3.5 sm:mr-1.5" />
            <span className="hidden sm:inline">Timeline</span>
          </TabsTrigger>
          <TabsTrigger value="trends" className="flex-1 text-xs" data-testid="tab-health-trends">
            <TrendingUp className="w-3.5 h-3.5 sm:mr-1.5" />
            <span className="hidden sm:inline">Trends</span>
          </TabsTrigger>
          <TabsTrigger value="report" className="flex-1 text-xs" data-testid="tab-health-report">
            <FileText className="w-3.5 h-3.5 sm:mr-1.5" />
            <span className="hidden sm:inline">Report</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="log" className="mt-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : entries.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Activity className="w-8 h-8 text-muted-foreground/40 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground mb-3">No entries yet.</p>
                <Button size="sm" onClick={openNew} data-testid="button-first-entry">
                  <Plus className="w-3.5 h-3.5 mr-1.5" />
                  Log First Entry
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {entries
                .filter(e => selectedMemberId === "all" || e.memberId === selectedMemberId)
                .map(e => <EntryCard key={e.id} entry={e} members={members} onEdit={openEdit} />)
              }
            </div>
          )}
        </TabsContent>

        <TabsContent value="timeline" className="mt-0">
          <Card>
            <CardContent className="p-4">
              <TimelineView entries={entries} memberId={selectedMemberId} members={members} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trends" className="mt-0">
          <TrendsView entries={entries} memberId={selectedMemberId} />
        </TabsContent>

        <TabsContent value="report" className="mt-0">
          <ReportsView entries={entries} memberId={selectedMemberId} members={members} />
        </TabsContent>
      </Tabs>

      <Dialog open={formOpen} onOpenChange={open => { if (!open) { setFormOpen(false); setEditEntry(null); } }}>
        <DialogContent className="max-w-lg max-h-[92vh] overflow-y-auto" data-testid="dialog-symptom-form">
          <DialogHeader>
            <DialogTitle>{entryToEdit ? "Edit Entry" : "Log Symptoms"}</DialogTitle>
          </DialogHeader>
          {members.length > 0 && (
            <LogForm
              memberId={defaultMemberId}
              members={members}
              existingEntry={entryToEdit}
              onClose={() => { setFormOpen(false); setEditEntry(null); }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
