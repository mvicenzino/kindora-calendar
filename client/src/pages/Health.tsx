import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { format, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, parseISO, subDays } from "date-fns";
import { Activity, Plus, ChevronLeft, ChevronRight, Trash2, FileText, TrendingUp, CalendarDays, ClipboardList, Loader2, AlertTriangle, Zap, Heart, Brain, Wind, Salad, Dumbbell, Moon, X, Users, Sparkles, Pill, Upload, CheckCircle2, Check, CircleCheck } from "lucide-react";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useActiveFamily } from "@/contexts/ActiveFamilyContext";
import HydrationTracker from "@/components/HydrationTracker";
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
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/symptoms"] });
      toast({ title: isEdit ? "Entry updated" : "Entry logged", description: `Symptom log saved for ${format(parseISO(form.date), "MMMM d")}` });
      onClose();
      if (!isEdit && (variables.overallSeverity ?? 0) >= 7) {
        setTimeout(() => {
          toast({
            title: "Kira is here for you",
            description: "That sounds like a hard day. Kira can help you think through it — find her in the sidebar.",
          });
        }, 800);
      }
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

function kiraCellSummary(entry: any): string {
  const sev = entry.overallSeverity ?? 0;
  const energy = entry.energyLevel ?? 0;
  const triggers: string[] = entry.triggers ?? [];

  if (entry.anaphylaxisAlert) return "Reaction flagged";

  let tone = "";
  if (sev <= 2) tone = "Good day";
  else if (sev <= 4) tone = "Manageable";
  else if (sev <= 6) tone = "Moderate";
  else if (sev <= 8) tone = "Tough day";
  else tone = "Very severe";

  if (triggers.length > 0) return `${tone} · ${triggers[0]}`;
  if (energy >= 7) return `${tone} · High energy`;
  if (energy <= 3) return `${tone} · Low energy`;
  return tone;
}

function kiraTimelineSummary(entry: any): string {
  const sev = entry.overallSeverity ?? 0;
  const energy = entry.energyLevel ?? 0;
  const triggers: string[] = entry.triggers ?? [];
  const systems: { system: string; severity: number }[] = entry.systems ?? [];
  const moodLabel = entry.moodEmoji ? MOOD_OPTIONS.find((m: any) => m.emoji === entry.moodEmoji)?.label : null;

  // Base tone
  let base = "";
  if (sev <= 2) base = "A genuinely good day";
  else if (sev <= 4) base = "A manageable day";
  else if (sev <= 6) base = "A moderate day with noticeable symptom activity";
  else if (sev <= 8) base = "A tough day with elevated symptoms";
  else base = "A very hard day — symptoms were severe";

  // Energy context
  let energyNote = "";
  if (energy >= 7) energyNote = ", energy was solid";
  else if (energy <= 3) energyNote = ", energy was quite low";

  // Reaction
  if (entry.anaphylaxisAlert) return `${base}${energyNote}. A reaction event was flagged — worth noting in your care records.`;

  // Most affected systems (severity ≥ 5)
  const flaringSystems = systems
    .filter(s => s.severity >= 5)
    .sort((a, b) => b.severity - a.severity)
    .slice(0, 2)
    .map(s => BODY_SYSTEMS.find(b => b.key === s.system)?.label ?? s.system);

  let systemNote = "";
  if (flaringSystems.length === 1) systemNote = ` ${flaringSystems[0]} was the main area of concern.`;
  else if (flaringSystems.length >= 2) systemNote = ` ${flaringSystems[0]} and ${flaringSystems[1]} were most affected.`;

  // Trigger context
  let triggerNote = "";
  if (triggers.length > 0) {
    const listed = triggers.slice(0, 2).join(" and ");
    triggerNote = ` ${listed} was a possible contributing factor.`;
  }

  // Mood
  let moodNote = "";
  if (moodLabel) moodNote = ` Mood: ${moodLabel}.`;

  return `${base}${energyNote}.${systemNote}${triggerNote}${moodNote}`.trim();
}

function TimelineView({ entries, memberId, members }: { entries: any[]; memberId: string; members: FamilyMember[] }) {
  const [monthOffset, setMonthOffset] = useState(0);
  const today = new Date();
  const targetMonth = monthOffset === 0 ? today : subMonths(today, -monthOffset);
  const monthStart = startOfMonth(targetMonth);
  const monthEnd = endOfMonth(targetMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startDow = monthStart.getDay();

  const filteredEntries = useMemo(() =>
    entries.filter(e => !memberId || memberId === "all" || e.memberId === memberId),
    [entries, memberId]
  );

  const entriesByDate = useMemo(() => {
    const map: Record<string, any> = {};
    filteredEntries.forEach(e => { map[e.date] = e; });
    return map;
  }, [filteredEntries]);

  const monthEntries = useMemo(() =>
    filteredEntries
      .filter(e => {
        const d = parseISO(e.date);
        return d >= monthStart && d <= monthEnd;
      })
      .sort((a, b) => b.date.localeCompare(a.date)),
    [filteredEntries, monthStart, monthEnd]
  );

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
          const moodLabel = entry?.moodEmoji ? MOOD_OPTIONS.find((m: any) => m.emoji === entry.moodEmoji)?.label : null;
          const tooltipLines = entry ? [
            `${format(day, "MMMM d")}`,
            `Severity: ${entry.overallSeverity}/10 (${severityLabel(entry.overallSeverity)})`,
            `Energy: ${entry.energyLevel}/10`,
            moodLabel ? `Mood: ${moodLabel}` : null,
            entry.anaphylaxisAlert ? "⚠ Reaction flagged" : null,
          ].filter(Boolean).join("\n") : format(day, "MMMM d");
          return (
            <div
              key={key}
              title={tooltipLines}
              data-testid={`calendar-day-${key}`}
              className={`aspect-square rounded-md flex flex-col items-center justify-between py-1.5 px-1 relative cursor-default ${
                entry ? severityColor(entry.overallSeverity) + " text-white" : "bg-muted/20 text-muted-foreground"
              } ${isToday ? "ring-2 ring-primary ring-offset-1 ring-offset-background" : ""}`}
            >
              <span className="text-xs font-bold leading-none w-full text-center">{format(day, "d")}</span>
              {entry?.moodEmoji
                ? <span className="text-2xl leading-none">{entry.moodEmoji}</span>
                : entry?.overallSeverity
                  ? <span className="text-[11px] font-semibold opacity-80 leading-none">{severityLabel(entry.overallSeverity)?.slice(0, 3)}</span>
                  : <span />
              }
              {entry
                ? <span className="text-[8px] leading-tight text-center opacity-85 w-full truncate px-0.5">{kiraCellSummary(entry)}</span>
                : <span />
              }
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

      {monthEntries.length > 0 && (
        <div className="space-y-2 pt-2">
          <div className="flex items-center gap-2 pb-1">
            <Sparkles className="w-3.5 h-3.5 text-primary" />
            <p className="text-xs font-semibold text-foreground">Daily breakdown</p>
          </div>
          {monthEntries.map(entry => {
            const moodLabel = entry.moodEmoji ? MOOD_OPTIONS.find((m: any) => m.emoji === entry.moodEmoji)?.label : null;
            const systems: { system: string; severity: number }[] = entry.systems ?? [];
            const activeSystems = systems.filter(s => s.severity >= 4).sort((a, b) => b.severity - a.severity);
            const triggers: string[] = entry.triggers ?? [];
            return (
              <div key={entry.date} className="rounded-lg bg-muted/20 border border-border/40 overflow-hidden">
                {/* Header row */}
                <div className="flex items-center justify-between gap-2 px-3 pt-2.5 pb-2 border-b border-border/30">
                  <div className="flex items-center gap-2 min-w-0">
                    {entry.moodEmoji && (
                      <span className="text-xl leading-none flex-shrink-0" title={moodLabel ?? undefined}>{entry.moodEmoji}</span>
                    )}
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-foreground leading-tight">
                        {format(parseISO(entry.date), "EEEE, MMMM d")}
                      </p>
                      {moodLabel && <p className="text-[10px] text-muted-foreground">{moodLabel}</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {entry.anaphylaxisAlert && (
                      <Badge variant="destructive" className="text-[10px] gap-1 no-default-hover-elevate no-default-active-elevate">
                        <AlertTriangle className="w-2.5 h-2.5" />Reaction
                      </Badge>
                    )}
                    {/* Energy + Severity chips */}
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-muted/60 text-muted-foreground">
                      <Zap className="w-2.5 h-2.5" />{entry.energyLevel ?? "—"}
                    </span>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold text-white ${severityColor(entry.overallSeverity)}`}>
                      {entry.overallSeverity ?? "—"}/10
                    </span>
                  </div>
                </div>

                <div className="px-3 py-2.5 space-y-2">
                  {/* Summary sentence */}
                  <p className="text-xs text-muted-foreground leading-relaxed">{kiraTimelineSummary(entry)}</p>

                  {/* Body systems */}
                  {activeSystems.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {activeSystems.map(s => {
                        const sys = BODY_SYSTEMS.find(b => b.key === s.system);
                        return (
                          <span key={s.system} className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-medium text-white ${severityColor(s.severity)}`}>
                            {sys?.label} · {s.severity}
                          </span>
                        );
                      })}
                    </div>
                  )}

                  {/* Triggers */}
                  {triggers.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {triggers.map(t => (
                        <Badge key={t} variant="outline" className="text-[10px] px-1.5 no-default-hover-elevate no-default-active-elevate">
                          {t}
                        </Badge>
                      ))}
                    </div>
                  )}

                  {/* User's own notes */}
                  {entry.notes && (
                    <p className="text-[11px] text-muted-foreground italic border-l-2 border-border/60 pl-2 leading-relaxed">
                      "{entry.notes}"
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
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
  const [, navigate] = useLocation();

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

          {/* Kira integration card */}
          <Card className="border-primary/20 bg-gradient-to-br from-primary/8 via-primary/4 to-purple-500/5">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/15 border border-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Sparkles className="w-4 h-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground mb-0.5">Talk to Kira about this</p>
                  <p className="text-xs text-muted-foreground mb-3 leading-relaxed">
                    Kira can help you make sense of these patterns, prepare questions for your doctor, or just process a hard stretch.
                  </p>
                  <Button
                    size="sm"
                    onClick={() => {
                      const topTriggers = Object.entries(triggerCounts).sort((a, b) => b[1] - a[1]).slice(0, 5);
                      const systemAvgs = Object.entries(systemTotals)
                        .map(([sys, vals]) => ({ sys, avg: (vals as number[]).reduce((a, b) => a + b, 0) / (vals as number[]).length }))
                        .sort((a, b) => b.avg - a.avg).slice(0, 3);
                      const memberName = member?.name ?? "the tracked member";
                      const lines = [
                        `I'd like your help understanding some health patterns from the last ${range} days.`,
                        ``,
                        `Summary for ${memberName} (${filtered.length} entries):`,
                        `• Average severity: ${avgSeverity}/10`,
                        `• Good days (≤3 severity): ${goodDays}`,
                        `• Severe days (≥7 severity): ${badDays}`,
                        anaphylaxisDays > 0 ? `• ⚠ Anaphylaxis events: ${anaphylaxisDays}` : null,
                        topTriggers.length > 0 ? `• Top triggers: ${topTriggers.map(([t, c]) => `${t} (${c}×)`).join(", ")}` : null,
                        systemAvgs.length > 0 ? `• Most affected systems: ${systemAvgs.map(s => `${BODY_SYSTEMS.find(b => b.key === s.sys)?.label ?? s.sys} (${s.avg.toFixed(1)}/10)`).join(", ")}` : null,
                        ``,
                        `Can you help me understand what these patterns might mean and what I should bring up with a doctor?`,
                      ].filter(Boolean).join("\n");
                      sessionStorage.setItem("kira_health_context", lines);
                      navigate("/advisor");
                    }}
                    data-testid="button-discuss-with-kira"
                  >
                    <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                    Discuss with Kira
                  </Button>
                </div>
              </div>
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

// ── Health Meds Tab ─────────────────────────────────────────────────────────

interface HealthMedsTabProps {
  familyId: string;
  members: FamilyMember[];
  selectedMemberId: string;
}

function HealthMedsTab({ familyId, members, selectedMemberId }: HealthMedsTabProps) {
  const { toast } = useToast();
  const [addOpen, setAddOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [addForm, setAddForm] = useState({ memberId: "", name: "", dosage: "", frequency: "", instructions: "", scheduledTimes: "" });
  const [importSource, setImportSource] = useState("text");
  const [importStep, setImportStep] = useState<"source" | "preview" | "assign">("source");
  const [importText, setImportText] = useState("");
  const [parsedMeds, setParsedMeds] = useState<any[]>([]);
  const [selectedMeds, setSelectedMeds] = useState<Record<number, boolean>>({});
  const [assignMemberId, setAssignMemberId] = useState("");
  const [isImporting, setIsImporting] = useState(false);
  const [pendingLogMed, setPendingLogMed] = useState<{ id: string; name: string; loggedBy: string; loggedAt: string } | null>(null);

  const { data: medications = [] } = useQuery<any[]>({
    queryKey: ["/api/medications", familyId],
    queryFn: () => fetch(`/api/medications?familyId=${familyId}`).then(r => r.json()),
    enabled: !!familyId,
  });

  const { data: todayLogs = [] } = useQuery<any[]>({
    queryKey: ["/api/medication-logs/today", familyId],
    queryFn: () => fetch(`/api/medication-logs/today?familyId=${familyId}`).then(r => r.json()),
    enabled: !!familyId,
    refetchInterval: 30_000,
  });

  const logDoseMutation = useMutation({
    mutationFn: (medId: string) => apiRequest("POST", `/api/medications/${medId}/logs`, { status: "given", familyId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/medication-logs/today", familyId] });
      toast({ title: "Dose logged" });
    },
    onError: () => toast({ title: "Could not log dose", variant: "destructive" }),
  });

  function expectedDoses(frequency: string): number {
    const f = frequency.toLowerCase();
    if (f.includes("twice") || f.includes("two") || f.includes("2")) return 2;
    if (f.includes("three") || f.includes("3x") || f.includes("3 times")) return 3;
    if (f.includes("four") || f.includes("4")) return 4;
    return 1;
  }

  function mostRecentLogWithin4Hours(logs: any[]) {
    const cutoff = Date.now() - 4 * 60 * 60 * 1000;
    return logs
      .filter(l => l.status === "given" && new Date(l.administeredAt).getTime() > cutoff)
      .sort((a, b) => new Date(b.administeredAt).getTime() - new Date(a.administeredAt).getTime())[0] ?? null;
  }

  function handleLogDoseClick(med: any, logsForMed: any[]) {
    const recentLog = mostRecentLogWithin4Hours(logsForMed);
    if (recentLog) {
      const loggedBy = recentLog.administeredByUser?.firstName ?? "Someone";
      const loggedAt = format(new Date(recentLog.administeredAt), "h:mm a");
      setPendingLogMed({ id: med.id, name: med.name, loggedBy, loggedAt });
    } else {
      logDoseMutation.mutate(med.id);
    }
  }

  const filteredMeds = useMemo(() =>
    selectedMemberId === "all" ? medications : medications.filter((m: any) => m.memberId === selectedMemberId),
    [medications, selectedMemberId]
  );

  const addMutation = useMutation({
    mutationFn: () => {
      const times = addForm.scheduledTimes.split(",").map(t => t.trim()).filter(Boolean);
      return apiRequest("POST", "/api/medications", {
        familyId, memberId: addForm.memberId,
        name: addForm.name.trim(), dosage: addForm.dosage.trim(),
        frequency: addForm.frequency.trim(),
        instructions: addForm.instructions.trim() || null,
        scheduledTimes: times.length > 0 ? times : [],
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/medications", familyId] });
      toast({ title: "Medication added" });
      setAddOpen(false);
      setAddForm({ memberId: "", name: "", dosage: "", frequency: "", instructions: "", scheduledTimes: "" });
    },
    onError: () => toast({ title: "Error", description: "Failed to add medication", variant: "destructive" }),
  });

  const removeMutation = useMutation({
    mutationFn: (medId: string) => apiRequest("DELETE", `/api/medications/${medId}?familyId=${familyId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/medications", familyId] });
      toast({ title: "Medication removed" });
    },
  });

  const saveParsedMutation = useMutation({
    mutationFn: async () => {
      const toSave = parsedMeds.filter((_, i) => selectedMeds[i]);
      for (const med of toSave) {
        await apiRequest("POST", "/api/medications", {
          familyId, memberId: assignMemberId,
          name: med.name, dosage: med.dosage, frequency: med.frequency,
          scheduledTimes: med.scheduledTimes ?? [],
          instructions: med.instructions ?? null,
        });
      }
      return toSave.length;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ["/api/medications", familyId] });
      toast({ title: `${count} medication${count !== 1 ? "s" : ""} imported` });
      setImportOpen(false);
      resetImport();
    },
    onError: () => toast({ title: "Import failed", variant: "destructive" }),
  });

  function resetImport() {
    setImportStep("source"); setImportSource("text"); setImportText("");
    setParsedMeds([]); setSelectedMeds({}); setAssignMemberId(""); setIsImporting(false);
  }

  async function runTextImport() {
    setIsImporting(true);
    try {
      const res = await apiRequest("POST", "/api/medications/import-ai", { text: importText, familyId });
      const data = await res.json();
      if (data.medications?.length > 0) {
        setParsedMeds(data.medications);
        const all: Record<number, boolean> = {};
        data.medications.forEach((_: any, i: number) => { all[i] = true; });
        setSelectedMeds(all);
        setImportStep("preview");
      } else {
        toast({ title: "No medications found", description: "Try pasting a clearer list.", variant: "destructive" });
      }
    } catch { toast({ title: "Import failed", variant: "destructive" }); }
    finally { setIsImporting(false); }
  }

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsImporting(true);
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const base64 = (ev.target?.result as string).split(",")[1];
      try {
        const res = await apiRequest("POST", "/api/medications/import-ai", { imageBase64: base64, mimeType: file.type, familyId });
        const data = await res.json();
        if (data.medications?.length > 0) {
          setParsedMeds(data.medications);
          const all: Record<number, boolean> = {};
          data.medications.forEach((_: any, i: number) => { all[i] = true; });
          setSelectedMeds(all);
          setImportStep("preview");
        } else {
          toast({ title: "No medications found", variant: "destructive" });
        }
      } catch { toast({ title: "Import failed", variant: "destructive" }); }
      finally { setIsImporting(false); }
    };
    reader.readAsDataURL(file);
  }

  const defaultAddMember = selectedMemberId !== "all" ? selectedMemberId : (members[0]?.id ?? "");

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <p className="text-xs text-muted-foreground">
          {filteredMeds.length} active medication{filteredMeds.length !== 1 ? "s" : ""}
          {selectedMemberId !== "all" && members.find(m => m.id === selectedMemberId) ? ` for ${members.find(m => m.id === selectedMemberId)!.name.split(" ")[0]}` : ""}
        </p>
        <div className="flex items-center gap-1.5">
          <Button size="sm" variant="outline" onClick={() => { resetImport(); setImportOpen(true); }} data-testid="button-import-meds-health">
            <Upload className="w-3.5 h-3.5 mr-1.5" />Import
          </Button>
          <Button size="sm" onClick={() => { setAddForm(f => ({ ...f, memberId: defaultAddMember })); setAddOpen(true); }} data-testid="button-add-med-health">
            <Plus className="w-3.5 h-3.5 mr-1.5" />Add
          </Button>
        </div>
      </div>

      {filteredMeds.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center">
            <Pill className="w-8 h-8 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No medications yet.</p>
            <p className="text-xs text-muted-foreground mt-1">Add manually or import from a prescription list.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filteredMeds.map((med: any) => {
            const member = members.find(m => m.id === med.memberId);
            const medLogsToday = todayLogs.filter((l: any) => l.medicationId === med.id && l.status === "given");
            const takenCount = medLogsToday.length;
            const expected = expectedDoses(med.frequency);
            const allDone = takenCount >= expected;
            const isLogging = logDoseMutation.isPending && logDoseMutation.variables === med.id;
            const sortedLogs = [...medLogsToday].sort((a, b) => new Date(b.administeredAt).getTime() - new Date(a.administeredAt).getTime());
            return (
              <Card key={med.id} data-testid={`card-health-med-${med.id}`}>
                <CardContent className="p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2.5 min-w-0 flex-1">
                      <Pill className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-semibold">{med.name}</p>
                          {takenCount > 0 && (
                            <Badge variant="outline" className={`text-[10px] gap-1 ${allDone ? "border-green-500/40 text-green-600 dark:text-green-400" : "border-amber-500/40 text-amber-600 dark:text-amber-400"}`}>
                              <CircleCheck className="w-2.5 h-2.5" />
                              {allDone ? `All ${expected > 1 ? expected + " doses" : "dose"} taken` : `${takenCount}/${expected} doses`}
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">{med.dosage} · {med.frequency}</p>
                        {member && (
                          <div className="flex items-center gap-1 mt-1">
                            <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: member.color }} />
                            <span className="text-[10px] text-muted-foreground">{member.name.split(" ")[0]}</span>
                          </div>
                        )}
                        {med.instructions && <p className="text-[11px] text-muted-foreground mt-1 italic">{med.instructions}</p>}
                        {med.scheduledTimes?.length > 0 && (
                          <div className="flex gap-1 mt-1.5 flex-wrap">
                            {med.scheduledTimes.map((t: string, i: number) => (
                              <Badge key={i} variant="outline" className="text-[10px]">{t}</Badge>
                            ))}
                          </div>
                        )}
                        {sortedLogs.length > 0 && (
                          <div className="mt-2 space-y-0.5">
                            {sortedLogs.map((log: any, i: number) => (
                              <p key={i} className="text-[11px] text-muted-foreground flex items-center gap-1">
                                <CircleCheck className="w-2.5 h-2.5 text-green-500 flex-shrink-0" />
                                Logged by <span className="font-medium text-foreground">{log.administeredByUser?.firstName ?? "Unknown"}</span> at {format(new Date(log.administeredAt), "h:mm a")}
                              </p>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <Button
                        size="sm"
                        variant={allDone ? "outline" : "default"}
                        className={`gap-1.5 text-xs ${allDone ? "text-muted-foreground" : ""}`}
                        onClick={() => handleLogDoseClick(med, medLogsToday)}
                        disabled={isLogging}
                        data-testid={`button-log-dose-health-${med.id}`}
                      >
                        {isLogging ? <Loader2 className="w-3 h-3 animate-spin" /> : allDone ? <Check className="w-3 h-3" /> : <CheckCircle2 className="w-3 h-3" />}
                        {allDone ? "Log Again" : "Log Dose"}
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="text-muted-foreground flex-shrink-0"
                        onClick={() => removeMutation.mutate(med.id)}
                        disabled={removeMutation.isPending}
                        data-testid={`button-remove-med-${med.id}`}
                      >
                        <X className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Add Medication Dialog */}
      <Dialog open={addOpen} onOpenChange={v => { if (!v) setAddOpen(false); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pill className="w-4 h-4 text-primary" />Add Medication
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-1">
            <div>
              <Label className="text-xs">Family Member</Label>
              <Select value={addForm.memberId} onValueChange={v => setAddForm(f => ({ ...f, memberId: v }))}>
                <SelectTrigger className="mt-1" data-testid="select-add-med-member">
                  <SelectValue placeholder="Select member" />
                </SelectTrigger>
                <SelectContent>{members.map(m => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Medication Name</Label>
              <Input className="mt-1" placeholder="e.g. Metformin" value={addForm.name} onChange={e => setAddForm(f => ({ ...f, name: e.target.value }))} data-testid="input-med-name" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Dosage</Label>
                <Input className="mt-1" placeholder="e.g. 500mg" value={addForm.dosage} onChange={e => setAddForm(f => ({ ...f, dosage: e.target.value }))} data-testid="input-med-dosage" />
              </div>
              <div>
                <Label className="text-xs">Frequency</Label>
                <Input className="mt-1" placeholder="e.g. Twice daily" value={addForm.frequency} onChange={e => setAddForm(f => ({ ...f, frequency: e.target.value }))} data-testid="input-med-frequency" />
              </div>
            </div>
            <div>
              <Label className="text-xs">Scheduled Times <span className="text-muted-foreground">(optional, comma-separated)</span></Label>
              <Input className="mt-1" placeholder="e.g. 08:00, 20:00" value={addForm.scheduledTimes} onChange={e => setAddForm(f => ({ ...f, scheduledTimes: e.target.value }))} data-testid="input-med-times" />
            </div>
            <div>
              <Label className="text-xs">Instructions <span className="text-muted-foreground">(optional)</span></Label>
              <Input className="mt-1" placeholder="e.g. Take with food" value={addForm.instructions} onChange={e => setAddForm(f => ({ ...f, instructions: e.target.value }))} data-testid="input-med-instructions" />
            </div>
            <Button
              className="w-full"
              disabled={!addForm.memberId || !addForm.name || !addForm.dosage || !addForm.frequency || addMutation.isPending}
              onClick={() => addMutation.mutate()}
              data-testid="button-save-med"
            >
              {addMutation.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Save Medication
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* AI Import Dialog */}
      <Dialog open={importOpen} onOpenChange={v => { if (!v) { setImportOpen(false); resetImport(); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />Import Medication List
            </DialogTitle>
          </DialogHeader>

          {importStep === "source" && (
            <div className="space-y-4 py-1">
              <div className="flex gap-2">
                {["text", "file"].map(s => (
                  <button key={s} onClick={() => setImportSource(s)} className={`flex-1 py-2 px-3 rounded-lg text-xs font-medium border transition-all ${importSource === s ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border text-muted-foreground"}`}>
                    {s === "text" ? "Paste Text" : "Upload File"}
                  </button>
                ))}
              </div>
              {importSource === "text" && (
                <div>
                  <Label className="text-xs">Paste medication list</Label>
                  <Textarea className="mt-1 resize-none h-28 text-sm" placeholder={"Metformin 500mg - twice daily\nLisinopril 10mg - once daily"} value={importText} onChange={e => setImportText(e.target.value)} />
                  <Button className="w-full mt-3" disabled={!importText.trim() || isImporting} onClick={runTextImport} data-testid="button-parse-meds">
                    {isImporting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Sparkles className="w-3.5 h-3.5 mr-1.5" />}
                    Extract Medications
                  </Button>
                </div>
              )}
              {importSource === "file" && (
                <div className="border-2 border-dashed border-border rounded-lg p-6 text-center">
                  <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground/50" />
                  <p className="text-xs text-muted-foreground mb-3">Photo or file of prescription/med list</p>
                  <label className="cursor-pointer">
                    <span className="text-xs bg-primary text-primary-foreground px-3 py-1.5 rounded-md font-medium">
                      {isImporting ? "Extracting…" : "Choose File"}
                    </span>
                    <input type="file" accept="image/*,.pdf" onChange={handleFileUpload} className="hidden" disabled={isImporting} />
                  </label>
                </div>
              )}
            </div>
          )}

          {importStep === "preview" && (
            <div className="space-y-3 py-1">
              <p className="text-xs text-muted-foreground">{parsedMeds.length} medication{parsedMeds.length !== 1 ? "s" : ""} found — uncheck any to skip.</p>
              <div className="space-y-2 max-h-52 overflow-y-auto">
                {parsedMeds.map((med, i) => (
                  <div key={i} className="flex items-start gap-2 p-2 rounded-lg border border-border bg-card">
                    <input type="checkbox" checked={!!selectedMeds[i]} onChange={e => setSelectedMeds(s => ({ ...s, [i]: e.target.checked }))} className="mt-0.5 flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs font-semibold">{med.name}</p>
                      <p className="text-[11px] text-muted-foreground">{med.dosage} · {med.frequency}</p>
                    </div>
                  </div>
                ))}
              </div>
              <Button className="w-full" onClick={() => setImportStep("assign")} disabled={Object.values(selectedMeds).filter(Boolean).length === 0} data-testid="button-import-next">
                Next — Assign to Member
              </Button>
            </div>
          )}

          {importStep === "assign" && (
            <div className="space-y-4 py-1">
              <p className="text-xs text-muted-foreground">Who are these medications for?</p>
              <Select value={assignMemberId} onValueChange={setAssignMemberId}>
                <SelectTrigger data-testid="select-import-assign-member"><SelectValue placeholder="Select family member" /></SelectTrigger>
                <SelectContent>{members.map(m => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}</SelectContent>
              </Select>
              <Button className="w-full" disabled={!assignMemberId || saveParsedMutation.isPending} onClick={() => saveParsedMutation.mutate()} data-testid="button-confirm-import">
                {saveParsedMutation.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                Import {Object.values(selectedMeds).filter(Boolean).length} Medication{Object.values(selectedMeds).filter(Boolean).length !== 1 ? "s" : ""}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Double-dose confirmation */}
      <AlertDialog open={!!pendingLogMed} onOpenChange={v => { if (!v) setPendingLogMed(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              Dose already logged
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pendingLogMed && (
                <>
                  <span className="font-medium text-foreground">{pendingLogMed.name}</span> was already logged by{' '}
                  <span className="font-medium text-foreground">{pendingLogMed.loggedBy}</span> at{' '}
                  <span className="font-medium text-foreground">{pendingLogMed.loggedAt}</span>.
                  <br /><br />
                  Are you sure you want to log another dose?
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPendingLogMed(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-amber-500 text-white"
              onClick={() => { if (pendingLogMed) { logDoseMutation.mutate(pendingLogMed.id); setPendingLogMed(null); } }}
              data-testid="button-confirm-double-dose-health"
            >
              Log Anyway
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
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
        <TabsList className="w-full h-auto p-1.5 rounded-full gap-0.5 bg-black/[0.05] dark:bg-white/[0.04] border border-black/10 dark:border-white/10 backdrop-blur-xl shadow-[inset_0_1px_0_rgba(0,0,0,0.04)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
          {(
            [
              { value: "log",      Icon: ClipboardList, label: "Log"      },
              { value: "meds",     Icon: Pill,          label: "Meds"     },
              { value: "timeline", Icon: CalendarDays,  label: "Timeline" },
              { value: "trends",   Icon: TrendingUp,    label: "Trends"   },
              { value: "report",   Icon: FileText,      label: "Report"   },
            ] as const
          ).map(({ value, Icon, label }) => (
            <TabsTrigger
              key={value}
              value={value}
              data-testid={`tab-health-${value}`}
              className="
                flex-1 flex items-center justify-center gap-1.5
                rounded-full py-2 text-xs font-medium
                border border-transparent
                text-muted-foreground/70
                transition-all duration-200
                data-[state=active]:bg-violet-500/15
                data-[state=active]:text-violet-700
                dark:data-[state=active]:text-violet-300
                data-[state=active]:border-violet-500/25
                dark:data-[state=active]:border-violet-400/30
                data-[state=active]:shadow-[0_0_10px_rgba(109,40,217,0.12)]
                dark:data-[state=active]:shadow-[0_0_14px_rgba(139,92,246,0.3),inset_0_1px_0_rgba(255,255,255,0.12)]
              "
            >
              <Icon className="w-3.5 h-3.5 flex-shrink-0" />
              <span className="hidden sm:inline">{label}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="log" className="mt-0">
          <div className="space-y-3">
            {activeFamilyId && members.length > 0 && (
              <HydrationTracker
                familyId={activeFamilyId}
                members={members}
                memberId={selectedMemberId}
                compact
              />
            )}
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
          </div>
        </TabsContent>

        <TabsContent value="meds" className="mt-0">
          {activeFamilyId && (
            <HealthMedsTab
              familyId={activeFamilyId}
              members={members}
              selectedMemberId={selectedMemberId}
            />
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
