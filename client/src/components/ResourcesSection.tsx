import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  CheckCircle2,
  Circle,
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  ClipboardList,
  Brain,
  FileText,
  Printer,
  AlertTriangle,
  BookOpen,
  Stethoscope,
  Users,
  Phone,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type Category = "Eldercare" | "Parenting" | "Well-Being" | "Sandwich Generation";
type ResourceType = "Checklist" | "Assessment" | "Template" | "Guide";

interface ResourceMeta {
  id: string;
  title: string;
  description: string;
  category: Category;
  type: ResourceType;
  icon: typeof ClipboardList;
  totalItems?: number;
}

// ─── Category / type styling ──────────────────────────────────────────────────

const CATEGORY_STYLES: Record<Category, string> = {
  Eldercare:             "bg-amber-500/10 text-amber-400 border-amber-500/20",
  Parenting:             "bg-blue-500/10 text-blue-400 border-blue-500/20",
  "Well-Being":          "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  "Sandwich Generation": "bg-orange-500/10 text-orange-400 border-orange-500/20",
};

const TYPE_STYLES: Record<ResourceType, string> = {
  Checklist:  "bg-violet-500/10 text-violet-400 border-violet-500/20",
  Assessment: "bg-rose-500/10 text-rose-400 border-rose-500/20",
  Template:   "bg-teal-500/10 text-teal-400 border-teal-500/20",
  Guide:      "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
};

// ─── localStorage helpers ─────────────────────────────────────────────────────

function lsGet<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch { return fallback; }
}

function lsSet(key: string, value: unknown) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
}

// ─── Checklist data ───────────────────────────────────────────────────────────

interface ChecklistItem { id: string; label: string; }
interface ChecklistSection { id: string; title: string; color: string; items: ChecklistItem[]; }

const AGING_PARENTS_CHECKLIST: ChecklistSection[] = [
  {
    id: "personal", title: "Personal", color: "text-blue-400",
    items: [
      { id: "ssn", label: "Social Security Number" },
      { id: "drivers-license", label: "Driver's License Number" },
      { id: "memberships", label: "Memberships" },
      { id: "computer-info", label: "Computer / Wi-Fi / Cellphone Info" },
      { id: "transportation", label: "Transportation Info" },
      { id: "hairdresser", label: "Hairdresser / Barber" },
      { id: "housing-alarm", label: "Housing / Alarm Code" },
      { id: "funeral", label: "Funeral Arrangements" },
    ],
  },
  {
    id: "health", title: "Health", color: "text-red-400",
    items: [
      { id: "doctors", label: "Doctors" },
      { id: "medications", label: "Medications" },
      { id: "allergies", label: "Allergies" },
      { id: "health-insurance", label: "Health Insurance / Medicare" },
    ],
  },
  {
    id: "finances", title: "Finances", color: "text-emerald-400",
    items: [
      { id: "bank-accounts", label: "Bank Accounts" },
      { id: "investments", label: "Investments" },
      { id: "retirement", label: "Retirement" },
      { id: "other-income", label: "Other Income / Assets" },
      { id: "credit-cards", label: "Credit Cards" },
      { id: "bills", label: "Bills" },
      { id: "safety-deposit", label: "Safety Deposit Box / Safe" },
    ],
  },
  {
    id: "legal", title: "Legal", color: "text-purple-400",
    items: [
      { id: "will", label: "Will" },
      { id: "power-of-attorney", label: "Power of Attorney" },
      { id: "medical-directive", label: "Medical Directive" },
    ],
  },
];

const CANT_LIVE_ALONE_CHECKLIST: ChecklistSection[] = [
  {
    id: "warning-signs", title: "Warning Signs to Watch", color: "text-amber-400",
    items: [
      { id: "wl-memory", label: "Memory lapses affecting daily safety (stove left on, door unlocked)" },
      { id: "wl-meds", label: "Missed medications or double dosing" },
      { id: "wl-nutrition", label: "Unexplained weight loss or repeatedly skipping meals" },
      { id: "wl-hygiene", label: "Declining personal hygiene" },
      { id: "wl-falls", label: "Falls, near-falls, or unexplained bruises" },
      { id: "wl-confusion", label: "Confusion about time, place, or familiar faces" },
      { id: "wl-driving", label: "Driving incidents, getting lost, or new dents on the car" },
      { id: "wl-bills", label: "Unpaid bills, bounced checks, or financial confusion" },
      { id: "wl-social", label: "Social withdrawal, isolation, or signs of depression" },
      { id: "wl-home", label: "Home becoming dirty, unsafe, or disorganized" },
    ],
  },
  {
    id: "home-safety", title: "Home Safety Assessment", color: "text-blue-400",
    items: [
      { id: "hs-grab-bars", label: "Grab bars installed in bathroom and shower" },
      { id: "hs-nonslip", label: "Non-slip mats in tub, shower, and entry" },
      { id: "hs-handrails", label: "Handrails on all staircases" },
      { id: "hs-lighting", label: "Adequate lighting throughout (especially stairs and hallways)" },
      { id: "hs-pathways", label: "Clear pathways — rugs secured, cords out of the way" },
      { id: "hs-meds-org", label: "Medications organized and accessible" },
      { id: "hs-emergency", label: "Emergency numbers posted in a visible location" },
      { id: "hs-alert", label: "Medical alert device considered or in place" },
    ],
  },
  {
    id: "care-options", title: "Care Options Explored", color: "text-purple-400",
    items: [
      { id: "co-inhome", label: "In-home aide evaluated (agency vs. private hire)" },
      { id: "co-dayprogram", label: "Adult day program considered" },
      { id: "co-assisted", label: "Assisted living communities toured" },
      { id: "co-memory", label: "Memory care options researched (if applicable)" },
      { id: "co-family", label: "Moving in with family discussed" },
      { id: "co-financial", label: "Financial implications reviewed with an advisor" },
    ],
  },
  {
    id: "conversation", title: "Having the Conversation", color: "text-emerald-400",
    items: [
      { id: "cv-timing", label: "Chosen a calm moment — not mid-crisis" },
      { id: "cv-setting", label: "Selected a private, comfortable setting" },
      { id: "cv-family", label: "Key family members included (or aligned beforehand)" },
      { id: "cv-listen", label: "Started with listening and questions, not directives" },
      { id: "cv-safety", label: "Framed around safety and independence, not taking over" },
      { id: "cv-agreement", label: "Reached agreement on concrete next steps" },
      { id: "cv-documented", label: "Decisions documented and shared with all involved" },
    ],
  },
];

const HOSPITAL_DISCHARGE_CHECKLIST: ChecklistSection[] = [
  {
    id: "first-72", title: "First 72 Hours", color: "text-red-400",
    items: [
      { id: "hd-followup-scheduled", label: "Follow-up appointment with primary doctor scheduled" },
      { id: "hd-prescriptions", label: "All new or changed prescriptions picked up" },
      { id: "hd-instructions", label: "Discharge paperwork read and understood" },
      { id: "hd-equipment", label: "Home equipment arranged (walker, shower chair, hospital bed, etc.)" },
      { id: "hd-hazards", label: "Trip hazards removed from pathways at home" },
      { id: "hd-caregiver", label: "Who is responsible for care this week is agreed upon" },
      { id: "hd-transport", label: "Transportation to follow-up appointments confirmed" },
      { id: "hd-reminders", label: "Medication reminder alarms or pill organizer set up" },
    ],
  },
  {
    id: "followup-care", title: "Follow-up Care", color: "text-amber-400",
    items: [
      { id: "fc-primary", label: "Follow-up with primary doctor within 7 days" },
      { id: "fc-specialist", label: "Follow-up with specialist as directed" },
      { id: "fc-referrals", label: "All referrals and new appointments confirmed" },
      { id: "fc-paperwork", label: "Copy of discharge paperwork for all appointments" },
      { id: "fc-symptoms", label: "Aware of specific symptoms to watch for" },
      { id: "fc-nurseline", label: "Hospital's discharge nurse hotline number saved" },
    ],
  },
  {
    id: "medications", title: "Medications", color: "text-blue-400",
    items: [
      { id: "med-compare", label: "New medication list compared to pre-hospital medications" },
      { id: "med-new", label: "Purpose of each new medication understood" },
      { id: "med-stopped", label: "Any medications that were stopped are noted" },
      { id: "med-schedule", label: "Dosing schedule clear for each medication" },
      { id: "med-interactions", label: "Food and drug interactions reviewed" },
      { id: "med-pharmacy", label: "Pharmacy has all prescriptions on file" },
    ],
  },
  {
    id: "recovery", title: "Recovery at Home", color: "text-emerald-400",
    items: [
      { id: "rec-diet", label: "Dietary restrictions understood and in place" },
      { id: "rec-activity", label: "Physical activity and lifting restrictions known" },
      { id: "rec-wound", label: "Wound care instructions followed (if applicable)" },
      { id: "rec-sleep", label: "Sleep and rest requirements understood" },
      { id: "rec-hygiene", label: "Bathing and hygiene restrictions noted" },
      { id: "rec-driving", label: "When it is safe to drive confirmed (if applicable)" },
    ],
  },
  {
    id: "emergency-signs", title: "Know When to Return to the ER", color: "text-rose-400",
    items: [
      { id: "er-breathing", label: "Sudden or severe shortness of breath" },
      { id: "er-chest", label: "Chest pain or pressure" },
      { id: "er-infection", label: "Signs of infection: fever, redness, warmth, increased pain at wound" },
      { id: "er-neuro", label: "Sudden confusion, difficulty speaking, or vision changes" },
      { id: "er-pain", label: "Pain that cannot be controlled with prescribed medications" },
      { id: "er-falls", label: "Fall or inability to stand safely" },
    ],
  },
];

// ─── Generic Checklist View ───────────────────────────────────────────────────

function ChecklistView({
  title, subtitle, sections, storageId, familyId, onBack,
}: {
  title: string;
  subtitle: string;
  sections: ChecklistSection[];
  storageId: string;
  familyId: string;
  onBack: () => void;
}) {
  const key = `kindora-checklist-${storageId}-${familyId}`;
  const [checked, setChecked] = useState<Set<string>>(
    () => new Set(lsGet<string[]>(key, []))
  );

  const totalItems = sections.reduce((a, s) => a + s.items.length, 0);
  const progress = totalItems === 0 ? 0 : Math.round((checked.size / totalItems) * 100);

  function toggle(itemId: string) {
    setChecked(prev => {
      const next = new Set(prev);
      next.has(itemId) ? next.delete(itemId) : next.add(itemId);
      lsSet(key, [...next]);
      return next;
    });
  }

  function toggleSection(section: ChecklistSection) {
    const allChecked = section.items.every(i => checked.has(i.id));
    setChecked(prev => {
      const next = new Set(prev);
      section.items.forEach(i => allChecked ? next.delete(i.id) : next.add(i.id));
      lsSet(key, [...next]);
      return next;
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack} data-testid="button-resources-back">
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <div>
          <h2 className="text-sm font-semibold text-foreground">{title}</h2>
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        </div>
      </div>

      <Card>
        <CardContent className="pt-4 pb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-foreground">Progress</span>
            <span className="text-xs text-muted-foreground">{checked.size} of {totalItems} items</span>
          </div>
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <div className="h-full rounded-full bg-primary transition-all duration-300" style={{ width: `${progress}%` }} />
          </div>
          {progress === 100 && (
            <p className="text-xs text-emerald-400 mt-2 font-medium">All done — you are well prepared.</p>
          )}
        </CardContent>
      </Card>

      <div className="space-y-3">
        {sections.map(section => {
          const done = section.items.filter(i => checked.has(i.id)).length;
          const all = done === section.items.length;
          return (
            <Card key={section.id} data-testid={`card-checklist-section-${section.id}`}>
              <CardHeader className="pb-2 pt-4 px-4">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <CardTitle className={`text-sm font-semibold ${section.color}`}>{section.title}</CardTitle>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">{done}/{section.items.length}</span>
                    <Button
                      variant="ghost" size="sm" className="h-7 text-xs px-2"
                      onClick={() => toggleSection(section)}
                      data-testid={`button-toggle-section-${section.id}`}
                    >
                      {all ? "Uncheck all" : "Check all"}
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <div className="space-y-2">
                  {section.items.map(item => {
                    const isChecked = checked.has(item.id);
                    return (
                      <button
                        key={item.id}
                        className="w-full flex items-start gap-3 text-left group py-1"
                        onClick={() => toggle(item.id)}
                        data-testid={`checkbox-item-${item.id}`}
                      >
                        {isChecked
                          ? <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-primary mt-0.5" />
                          : <Circle className="w-4 h-4 flex-shrink-0 text-muted-foreground group-hover:text-foreground transition-colors mt-0.5" />
                        }
                        <span className={`text-sm transition-colors leading-snug ${isChecked ? "line-through text-muted-foreground" : "text-foreground"}`}>
                          {item.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

// ─── Burnout Assessment ───────────────────────────────────────────────────────

const BURNOUT_QUESTIONS = [
  "I feel physically exhausted from caregiving duties.",
  "I feel emotionally drained at the end of the day.",
  "I have neglected my own health or medical needs.",
  "I feel resentful about my caregiving responsibilities.",
  "I feel isolated from friends and social activities.",
  "I have difficulty sleeping because of caregiving concerns.",
  "I feel like no one understands what I am going through.",
  "I snap at family members or the person I care for.",
  "I have stopped doing activities I used to enjoy.",
  "I feel like I have no time for myself.",
];

const ANSWER_LABELS = ["Never", "Rarely", "Sometimes", "Often"];

type BurnoutResult = { answers: number[]; score: number; date: string };

function burnoutInterpretation(score: number): { label: string; color: string; detail: string } {
  if (score <= 7)  return { label: "Low",      color: "text-emerald-400", detail: "You are managing well. Keep protecting your time and energy." };
  if (score <= 15) return { label: "Mild",     color: "text-yellow-400",  detail: "Some signs of strain. Consider building in more breaks and asking for help." };
  if (score <= 22) return { label: "Moderate", color: "text-orange-400",  detail: "Significant burnout signs. It is important to ask for help and talk to someone you trust." };
  return             { label: "High",     color: "text-red-400",    detail: "Severe burnout. Please reach out to a doctor, counselor, or support group — and consider talking to Kira." };
}

function BurnoutAssessment({ familyId, onBack }: { familyId: string; onBack: () => void }) {
  const key = `kindora-burnout-${familyId}`;
  const saved = lsGet<BurnoutResult | null>(key, null);

  const [answers, setAnswers] = useState<(number | null)[]>(
    saved ? saved.answers.map(a => a) : Array(BURNOUT_QUESTIONS.length).fill(null)
  );
  const [submitted, setSubmitted] = useState(!!saved);
  const [result, setResult] = useState<BurnoutResult | null>(saved);

  const allAnswered = answers.every(a => a !== null);

  function setAnswer(qi: number, val: number) {
    setAnswers(prev => { const n = [...prev]; n[qi] = val; return n; });
    setSubmitted(false);
  }

  function submit() {
    const score = (answers as number[]).reduce((a, b) => a + b, 0);
    const res: BurnoutResult = { answers: answers as number[], score, date: new Date().toLocaleDateString() };
    lsSet(key, res);
    setResult(res);
    setSubmitted(true);
  }

  function retake() {
    setAnswers(Array(BURNOUT_QUESTIONS.length).fill(null));
    setSubmitted(false);
    setResult(null);
    lsSet(key, null);
  }

  const interp = result ? burnoutInterpretation(result.score) : null;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack} data-testid="button-resources-back">
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <div>
          <h2 className="text-sm font-semibold text-foreground">Caregiver Burnout Self-Assessment</h2>
          <p className="text-xs text-muted-foreground">10 questions — takes about 2 minutes. Be honest with yourself.</p>
        </div>
      </div>

      {submitted && result && interp ? (
        <div className="space-y-4">
          <Card>
            <CardContent className="pt-5 pb-5">
              <div className="text-center space-y-2 mb-4">
                <p className="text-xs text-muted-foreground">Your burnout level</p>
                <p className={`text-2xl font-bold ${interp.color}`}>{interp.label}</p>
                <p className="text-xs text-muted-foreground">Score: {result.score} / 30 · Taken {result.date}</p>
              </div>
              <div className="h-2 rounded-full bg-muted overflow-hidden mb-4">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    result.score <= 7 ? "bg-emerald-500" :
                    result.score <= 15 ? "bg-yellow-500" :
                    result.score <= 22 ? "bg-orange-500" : "bg-red-500"
                  }`}
                  style={{ width: `${Math.round((result.score / 30) * 100)}%` }}
                />
              </div>
              <p className="text-sm text-foreground text-center leading-relaxed">{interp.detail}</p>
            </CardContent>
          </Card>

          {result.score >= 16 && (
            <Card className="border-amber-500/20 bg-amber-500/5">
              <CardContent className="pt-4 pb-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="text-xs font-semibold text-foreground">Consider reaching out</p>
                    <p className="text-xs text-muted-foreground">
                      Talk to your doctor, a counselor, or a caregiver support group. Kira, your AI advisor, is also here to listen and help you think through next steps.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <Button variant="outline" size="sm" onClick={retake} className="text-xs" data-testid="button-retake-assessment">
            Retake Assessment
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {BURNOUT_QUESTIONS.map((q, qi) => (
            <Card key={qi} data-testid={`card-question-${qi}`}>
              <CardContent className="pt-4 pb-4">
                <p className="text-sm text-foreground mb-3 leading-snug">
                  <span className="text-xs text-muted-foreground mr-2">{qi + 1}.</span>{q}
                </p>
                <div className="grid grid-cols-4 gap-1">
                  {ANSWER_LABELS.map((label, val) => (
                    <button
                      key={val}
                      onClick={() => setAnswer(qi, val)}
                      className={`py-1.5 px-2 rounded-md text-xs font-medium transition-colors border ${
                        answers[qi] === val
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-transparent text-muted-foreground border-border hover:text-foreground hover:border-foreground/30"
                      }`}
                      data-testid={`answer-q${qi}-${val}`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}

          <Button onClick={submit} disabled={!allAnswered} className="w-full text-xs" data-testid="button-submit-assessment">
            See My Results
          </Button>
        </div>
      )}
    </div>
  );
}

// ─── Pediatric Medical Info Sheet ─────────────────────────────────────────────

interface PediatricData {
  childName: string; dob: string; bloodType: string;
  allergies: string; conditions: string; medications: string;
  doctorName: string; doctorPhone: string;
  specialistName: string; specialistPhone: string; specialistType: string;
  dentistName: string; dentistPhone: string;
  insuranceCo: string; memberId: string; groupNum: string; insurancePhone: string;
  ec1Name: string; ec1Phone: string; ec1Rel: string;
  ec2Name: string; ec2Phone: string; ec2Rel: string;
  ec3Name: string; ec3Phone: string; ec3Rel: string;
}

const BLANK_PEDIATRIC: PediatricData = {
  childName: "", dob: "", bloodType: "",
  allergies: "", conditions: "", medications: "",
  doctorName: "", doctorPhone: "",
  specialistName: "", specialistPhone: "", specialistType: "",
  dentistName: "", dentistPhone: "",
  insuranceCo: "", memberId: "", groupNum: "", insurancePhone: "",
  ec1Name: "", ec1Phone: "", ec1Rel: "",
  ec2Name: "", ec2Phone: "", ec2Rel: "",
  ec3Name: "", ec3Phone: "", ec3Rel: "",
};

function PediatricInfoSheet({ familyId, onBack }: { familyId: string; onBack: () => void }) {
  const key = `kindora-pediatric-info-${familyId}`;
  const [data, setData] = useState<PediatricData>(() => lsGet(key, BLANK_PEDIATRIC));

  function update(field: keyof PediatricData, value: string) {
    setData(prev => { const next = { ...prev, [field]: value }; lsSet(key, next); return next; });
  }

  function Field({ label, field, placeholder, wide }: { label: string; field: keyof PediatricData; placeholder?: string; wide?: boolean }) {
    return (
      <div className={`space-y-1 ${wide ? "col-span-2" : ""}`}>
        <Label className="text-xs text-muted-foreground">{label}</Label>
        <Input value={data[field]} onChange={e => update(field, e.target.value)} placeholder={placeholder ?? ""} className="h-8 text-xs" data-testid={`input-pediatric-${field}`} />
      </div>
    );
  }

  function TextAreaField({ label, field, placeholder }: { label: string; field: keyof PediatricData; placeholder?: string }) {
    return (
      <div className="space-y-1 col-span-2">
        <Label className="text-xs text-muted-foreground">{label}</Label>
        <Textarea value={data[field]} onChange={e => update(field, e.target.value)} placeholder={placeholder ?? ""} className="text-xs min-h-[64px] resize-none" data-testid={`textarea-pediatric-${field}`} />
      </div>
    );
  }

  function Section({ title, children }: { title: string; children: React.ReactNode }) {
    return (
      <Card>
        <CardHeader className="pb-2 pt-4 px-4">
          <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{title}</CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4"><div className="grid grid-cols-2 gap-3">{children}</div></CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack} data-testid="button-resources-back"><ChevronLeft className="w-4 h-4" /></Button>
        <div className="flex-1">
          <h2 className="text-sm font-semibold text-foreground">Pediatric Medical Info Sheet</h2>
          <p className="text-xs text-muted-foreground">Fill in once, hand to any caregiver or use in an emergency</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => window.print()} className="gap-1.5 text-xs flex-shrink-0" data-testid="button-print-sheet">
          <Printer className="w-3.5 h-3.5" />Print
        </Button>
      </div>

      <Section title="Child Info">
        <Field label="Child's Full Name" field="childName" wide />
        <Field label="Date of Birth" field="dob" placeholder="MM/DD/YYYY" />
        <Field label="Blood Type" field="bloodType" placeholder="e.g. O+" />
      </Section>
      <Section title="Health">
        <TextAreaField label="Allergies (food, medication, environmental)" field="allergies" placeholder="List all known allergies..." />
        <TextAreaField label="Known Conditions / Diagnoses" field="conditions" placeholder="e.g. asthma, ADHD..." />
        <TextAreaField label="Current Medications & Dosages" field="medications" placeholder="Name, dose, and frequency..." />
      </Section>
      <Section title="Providers">
        <Field label="Primary Doctor" field="doctorName" placeholder="Name" />
        <Field label="Doctor Phone" field="doctorPhone" placeholder="(555) 000-0000" />
        <Field label="Specialist" field="specialistName" placeholder="Name" />
        <Field label="Specialist Phone" field="specialistPhone" placeholder="(555) 000-0000" />
        <Field label="Specialist Type" field="specialistType" placeholder="e.g. Allergist" />
        <Field label="Dentist" field="dentistName" placeholder="Name" />
        <Field label="Dentist Phone" field="dentistPhone" placeholder="(555) 000-0000" />
      </Section>
      <Section title="Insurance">
        <Field label="Insurance Company" field="insuranceCo" placeholder="e.g. BlueCross" />
        <Field label="Member ID" field="memberId" />
        <Field label="Group Number" field="groupNum" />
        <Field label="Insurance Phone" field="insurancePhone" placeholder="(555) 000-0000" />
      </Section>
      <Section title="Emergency Contacts">
        <Field label="Contact 1 — Name" field="ec1Name" />
        <Field label="Phone" field="ec1Phone" placeholder="(555) 000-0000" />
        <Field label="Relationship" field="ec1Rel" placeholder="e.g. Grandparent" />
        <div />
        <Field label="Contact 2 — Name" field="ec2Name" />
        <Field label="Phone" field="ec2Phone" placeholder="(555) 000-0000" />
        <Field label="Relationship" field="ec2Rel" placeholder="e.g. Aunt" />
        <div />
        <Field label="Contact 3 — Name" field="ec3Name" />
        <Field label="Phone" field="ec3Phone" placeholder="(555) 000-0000" />
        <Field label="Relationship" field="ec3Rel" placeholder="e.g. Neighbor" />
      </Section>
      <p className="text-xs text-muted-foreground text-center pb-2">Changes save automatically as you type.</p>
    </div>
  );
}

// ─── Family Meeting Agenda Template ──────────────────────────────────────────

interface ActionItem { who: string; what: string; by: string; }
interface MeetingData {
  date: string; location: string; calledBy: string;
  lovedOneName: string; lovedOneRelationship: string;
  attendees: string; healthUpdate: string; concerns: string;
  agendaItem1: string; agendaItem2: string; agendaItem3: string; agendaItem4: string;
  decisions: string;
  action1Who: string; action1What: string; action1By: string;
  action2Who: string; action2What: string; action2By: string;
  action3Who: string; action3What: string; action3By: string;
  nextMeetingDate: string; nextMeetingOrganizer: string;
  notes: string;
}

const BLANK_MEETING: MeetingData = {
  date: "", location: "", calledBy: "",
  lovedOneName: "", lovedOneRelationship: "",
  attendees: "", healthUpdate: "", concerns: "",
  agendaItem1: "", agendaItem2: "", agendaItem3: "", agendaItem4: "",
  decisions: "",
  action1Who: "", action1What: "", action1By: "",
  action2Who: "", action2What: "", action2By: "",
  action3Who: "", action3What: "", action3By: "",
  nextMeetingDate: "", nextMeetingOrganizer: "",
  notes: "",
};

function FamilyMeetingTemplate({ familyId, onBack }: { familyId: string; onBack: () => void }) {
  const key = `kindora-family-meeting-${familyId}`;
  const [data, setData] = useState<MeetingData>(() => lsGet(key, BLANK_MEETING));

  function update(field: keyof MeetingData, value: string) {
    setData(prev => { const next = { ...prev, [field]: value }; lsSet(key, next); return next; });
  }

  function F({ label, field, placeholder, span2 }: { label: string; field: keyof MeetingData; placeholder?: string; span2?: boolean }) {
    return (
      <div className={`space-y-1 ${span2 ? "col-span-2" : ""}`}>
        <Label className="text-xs text-muted-foreground">{label}</Label>
        <Input value={data[field]} onChange={e => update(field, e.target.value)} placeholder={placeholder ?? ""} className="h-8 text-xs" data-testid={`input-meeting-${field}`} />
      </div>
    );
  }

  function TA({ label, field, placeholder }: { label: string; field: keyof MeetingData; placeholder?: string }) {
    return (
      <div className="space-y-1 col-span-2">
        <Label className="text-xs text-muted-foreground">{label}</Label>
        <Textarea value={data[field]} onChange={e => update(field, e.target.value)} placeholder={placeholder ?? ""} className="text-xs min-h-[72px] resize-none" data-testid={`textarea-meeting-${field}`} />
      </div>
    );
  }

  function Section({ title, children }: { title: string; children: React.ReactNode }) {
    return (
      <Card>
        <CardHeader className="pb-2 pt-4 px-4">
          <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{title}</CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4"><div className="grid grid-cols-2 gap-3">{children}</div></CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack} data-testid="button-resources-back"><ChevronLeft className="w-4 h-4" /></Button>
        <div className="flex-1">
          <h2 className="text-sm font-semibold text-foreground">Family Meeting Agenda</h2>
          <p className="text-xs text-muted-foreground">A structured template to keep everyone aligned and accountable</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => window.print()} className="gap-1.5 text-xs flex-shrink-0" data-testid="button-print-meeting">
          <Printer className="w-3.5 h-3.5" />Print
        </Button>
      </div>

      <Section title="Meeting Info">
        <F label="Date" field="date" placeholder="MM/DD/YYYY" />
        <F label="Location" field="location" placeholder="e.g. Mom's kitchen" />
        <F label="Called by" field="calledBy" placeholder="Who organized this meeting" span2 />
      </Section>

      <Section title="About Whom">
        <F label="Loved One's Name" field="lovedOneName" placeholder="e.g. Dad" />
        <F label="Relationship" field="lovedOneRelationship" placeholder="e.g. Parent" />
      </Section>

      <Section title="Who is Attending">
        <TA label="Attendees (names and roles)" field="attendees" placeholder="e.g. Sarah (daughter), Tom (son), Dr. Patel (primary care)" />
      </Section>

      <Section title="Situation Update">
        <TA label="Current health & care status" field="healthUpdate" placeholder="What has changed since the last meeting? What is going well?" />
        <TA label="Key concerns to address" field="concerns" placeholder="What needs attention or a decision today?" />
      </Section>

      <Section title="Agenda Items">
        <F label="Item 1" field="agendaItem1" placeholder="e.g. Review medication changes" span2 />
        <F label="Item 2" field="agendaItem2" placeholder="e.g. Discuss driving situation" span2 />
        <F label="Item 3" field="agendaItem3" placeholder="e.g. Evaluate home safety modifications" span2 />
        <F label="Item 4" field="agendaItem4" placeholder="e.g. Review finances and upcoming costs" span2 />
      </Section>

      <Section title="Decisions Made">
        <TA label="What was agreed upon" field="decisions" placeholder="Record decisions clearly so everyone remembers the same thing..." />
      </Section>

      <Section title="Action Items">
        <div className="col-span-2 grid grid-cols-3 gap-2 text-xs font-medium text-muted-foreground pb-1">
          <span>Who</span><span>What</span><span>By When</span>
        </div>
        <div className="col-span-2 space-y-2">
          {([1, 2, 3] as const).map(n => (
            <div key={n} className="grid grid-cols-3 gap-2">
              <Input value={data[`action${n}Who` as keyof MeetingData]} onChange={e => update(`action${n}Who` as keyof MeetingData, e.target.value)} placeholder="Name" className="h-8 text-xs" data-testid={`input-meeting-action${n}Who`} />
              <Input value={data[`action${n}What` as keyof MeetingData]} onChange={e => update(`action${n}What` as keyof MeetingData, e.target.value)} placeholder="Task" className="h-8 text-xs" data-testid={`input-meeting-action${n}What`} />
              <Input value={data[`action${n}By` as keyof MeetingData]} onChange={e => update(`action${n}By` as keyof MeetingData, e.target.value)} placeholder="Date" className="h-8 text-xs" data-testid={`input-meeting-action${n}By`} />
            </div>
          ))}
        </div>
      </Section>

      <Section title="Next Meeting">
        <F label="Next meeting date" field="nextMeetingDate" placeholder="MM/DD/YYYY" />
        <F label="Who will organize it" field="nextMeetingOrganizer" placeholder="Name" />
      </Section>

      <Section title="Additional Notes">
        <TA label="Anything else to remember" field="notes" placeholder="Open issues, parking lot items, questions for the doctor..." />
      </Section>

      <p className="text-xs text-muted-foreground text-center pb-2">Changes save automatically as you type.</p>
    </div>
  );
}

// ─── Medicare vs. Medicaid Guide ─────────────────────────────────────────────

interface GuideSection { id: string; title: string; content: Array<{ heading?: string; text: string }> }

const MEDICARE_SECTIONS: GuideSection[] = [
  {
    id: "medicare",
    title: "Medicare — The Basics",
    content: [
      { heading: "Who qualifies", text: "Most Americans 65 and older automatically qualify. People under 65 can qualify if they have certain disabilities or End-Stage Renal Disease." },
      { heading: "Part A — Hospital Insurance", text: "Covers inpatient hospital stays, skilled nursing facility care (short-term), hospice, and some home health care. Most people pay no premium for Part A if they or their spouse worked 10+ years." },
      { heading: "Part B — Medical Insurance", text: "Covers doctor visits, outpatient care, preventive services, and medical equipment. Requires a monthly premium (around $170/month in 2024)." },
      { heading: "Part C — Medicare Advantage", text: "A private insurance alternative that bundles Parts A, B, and often D. May offer lower out-of-pocket costs but restricts you to a network." },
      { heading: "Part D — Prescription Drugs", text: "Adds prescription drug coverage. Sold through private insurers. Each plan has its own formulary (list of covered drugs)." },
    ],
  },
  {
    id: "medicaid",
    title: "Medicaid — The Basics",
    content: [
      { heading: "Who qualifies", text: "Medicaid is needs-based — eligibility depends on income, assets, age, and disability status. Rules vary significantly by state." },
      { heading: "What it covers", text: "Includes everything Medicare covers, plus long-term care (nursing homes, assisted living in some states), dental, vision, and hearing — making it critical for seniors who need extended care." },
      { heading: "Asset limits", text: "In most states, a single person must have assets below $2,000 (not counting the home, one car, and personal belongings). Married couples have different rules. Some states use Medicaid planning strategies to protect assets." },
      { heading: "How to apply", text: "Apply through your state Medicaid office or healthcare.gov. An elder law attorney can help if asset limits are a concern." },
    ],
  },
  {
    id: "together",
    title: "When Both Apply — Dual Eligibility",
    content: [
      { text: "People who qualify for both Medicare and Medicaid are called 'dual eligible.' Medicaid can pay Medicare premiums, deductibles, and co-pays, dramatically reducing out-of-pocket costs." },
      { text: "If a parent has Medicare and needs nursing home care, Medicare pays fully for days 1–20, then with a significant daily co-pay for days 21–100. After day 100, Medicare stops. Medicaid can then cover ongoing nursing home costs if the parent qualifies." },
    ],
  },
  {
    id: "nursing-home",
    title: "When a Parent Needs Nursing Home Care",
    content: [
      { heading: "Medicare's role", text: "Medicare covers skilled nursing facility care only after a 3-day qualifying hospital stay, and only for short-term recovery (not permanent care). It covers days 1–20 fully, then requires a co-pay through day 100. Nothing after day 100." },
      { heading: "Medicaid's role", text: "Medicaid covers long-term nursing home care indefinitely — but your parent must meet income and asset requirements first. A 'Medicaid spend-down' may be required." },
      { heading: "Planning ahead", text: "Consult an elder law attorney before a crisis. Medicaid has a 5-year 'look-back' period — transfers made to reduce assets within 5 years can cause disqualification." },
    ],
  },
  {
    id: "next-steps",
    title: "Next Steps & Key Contacts",
    content: [
      { heading: "Medicare questions", text: "Call 1-800-MEDICARE (1-800-633-4227) or visit medicare.gov. Your State Health Insurance Assistance Program (SHIP) offers free, unbiased counseling." },
      { heading: "Medicaid questions", text: "Contact your state Medicaid office. Find yours at medicaid.gov or through your state's health and human services department." },
      { heading: "Elder law attorney", text: "If assets are significant or nursing home care is imminent, consulting an elder law attorney is worth the investment. They can protect assets legally and navigate Medicaid planning." },
      { heading: "Benefits checkup", text: "Visit benefitscheckup.org (NCOA) for a free screening of all benefits a parent may qualify for — including Medicare Savings Programs." },
    ],
  },
];

function MedicareGuide({ onBack }: { onBack: () => void }) {
  const [open, setOpen] = useState<Set<string>>(new Set(["medicare"]));

  function toggle(id: string) {
    setOpen(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack} data-testid="button-resources-back"><ChevronLeft className="w-4 h-4" /></Button>
        <div>
          <h2 className="text-sm font-semibold text-foreground">Medicare vs. Medicaid — Plain English</h2>
          <p className="text-xs text-muted-foreground">What each covers, when they apply, and what to do when a parent needs nursing home care</p>
        </div>
      </div>

      <Card className="border-cyan-500/20 bg-cyan-500/5">
        <CardContent className="pt-4 pb-4">
          <div className="flex items-start gap-3">
            <BookOpen className="w-4 h-4 text-cyan-400 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-muted-foreground leading-relaxed">
              <span className="text-foreground font-medium">Quick rule of thumb:</span> Medicare is age-based (65+) and covers acute care. Medicaid is income/asset-based and covers long-term care. Many seniors need both.
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-2">
        {MEDICARE_SECTIONS.map(section => {
          const isOpen = open.has(section.id);
          return (
            <Card key={section.id} data-testid={`card-guide-section-${section.id}`}>
              <button
                className="w-full flex items-center justify-between px-4 py-3 text-left"
                onClick={() => toggle(section.id)}
                data-testid={`button-guide-toggle-${section.id}`}
              >
                <span className="text-sm font-semibold text-foreground">{section.title}</span>
                {isOpen ? <ChevronUp className="w-4 h-4 text-muted-foreground flex-shrink-0" /> : <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />}
              </button>
              {isOpen && (
                <CardContent className="px-4 pb-4 pt-0">
                  <div className="space-y-3 border-t border-border pt-3">
                    {section.content.map((item, i) => (
                      <div key={i} className="space-y-0.5">
                        {item.heading && <p className="text-xs font-semibold text-foreground">{item.heading}</p>}
                        <p className="text-xs text-muted-foreground leading-relaxed">{item.text}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}

// ─── ER vs. Urgent Care Guide ─────────────────────────────────────────────────

interface TriageItem { symptom: string; note?: string; }
interface TriageTier {
  id: string;
  level: string;
  action: string;
  color: string;
  bg: string;
  border: string;
  icon: typeof Phone;
  items: TriageItem[];
}

const TRIAGE_TIERS: TriageTier[] = [
  {
    id: "er-now",
    level: "Call 911 or go to the ER",
    action: "Immediately",
    color: "text-red-400",
    bg: "bg-red-500/5",
    border: "border-red-500/20",
    icon: Phone,
    items: [
      { symptom: "Chest pain or pressure, especially with arm or jaw pain" },
      { symptom: "Difficulty breathing or shortness of breath at rest" },
      { symptom: "Signs of stroke: face drooping, arm weakness, slurred speech" },
      { symptom: "Severe allergic reaction (anaphylaxis): throat swelling, hives, trouble breathing" },
      { symptom: "Uncontrolled or heavy bleeding that doesn't stop" },
      { symptom: "Loss of consciousness or not waking up" },
      { symptom: "Seizure in someone with no seizure history, or seizure lasting more than 5 minutes" },
      { symptom: "Head injury with confusion, vomiting, or loss of consciousness" },
      { symptom: "Suspected poisoning or overdose" },
      { symptom: "Severe abdominal pain, especially sudden onset" },
      { symptom: "Child: Infant under 3 months with fever over 100.4°F", note: "Always ER for newborns with any fever" },
      { symptom: "Child: Blue lips, difficulty breathing, or won't wake up" },
    ],
  },
  {
    id: "urgent-care",
    level: "Go to Urgent Care",
    action: "Same day",
    color: "text-orange-400",
    bg: "bg-orange-500/5",
    border: "border-orange-500/20",
    icon: Stethoscope,
    items: [
      { symptom: "Fever over 103°F in an adult (or over 101°F in a child 3 months–3 years)" },
      { symptom: "Ear pain with fever" },
      { symptom: "Urinary tract infection symptoms (burning, urgency, pain)" },
      { symptom: "Deep cut that may need stitches but bleeding is controlled" },
      { symptom: "Possible broken bone (but not compound fracture or severe deformity)" },
      { symptom: "Mild to moderate asthma attack that responds to inhaler" },
      { symptom: "Severe sore throat, especially with white patches or difficulty swallowing" },
      { symptom: "Eye pain, redness, or discharge that is worsening" },
      { symptom: "Vomiting or diarrhea with signs of dehydration (dry mouth, no urine, dizziness)" },
      { symptom: "Animal bite (needs wound cleaning and possible rabies assessment)" },
      { symptom: "Sprain or strain with significant swelling" },
    ],
  },
  {
    id: "call-doctor",
    level: "Call your doctor",
    action: "Within 24–48 hours",
    color: "text-yellow-400",
    bg: "bg-yellow-500/5",
    border: "border-yellow-500/20",
    icon: Phone,
    items: [
      { symptom: "Fever under 103°F that has lasted more than 3 days" },
      { symptom: "Cold or cough that is getting worse instead of better after 10 days" },
      { symptom: "Rash without fever or breathing trouble" },
      { symptom: "Mild ear pain without fever" },
      { symptom: "Sinus pain or pressure lasting more than 10 days" },
      { symptom: "Child: Recurring stomachaches or headaches without other symptoms" },
      { symptom: "Medication side effects that are manageable but concerning" },
      { symptom: "Worsening of a chronic condition (ask if ER is needed)" },
    ],
  },
  {
    id: "home",
    level: "Monitor at home",
    action: "Rest and watch",
    color: "text-emerald-400",
    bg: "bg-emerald-500/5",
    border: "border-emerald-500/20",
    icon: CheckCircle2,
    items: [
      { symptom: "Common cold with runny nose, mild sore throat, sneezing" },
      { symptom: "Low-grade fever (under 101°F) that responds to Tylenol or Advil" },
      { symptom: "Minor cut or scrape that can be cleaned and bandaged" },
      { symptom: "Mild headache that responds to over-the-counter medication" },
      { symptom: "Mild upset stomach or nausea without vomiting" },
      { symptom: "Muscle ache from exercise or activity" },
      { symptom: "Mild sunburn without blistering" },
      { symptom: "Constipation without severe pain" },
    ],
  },
];

function ERGuide({ onBack }: { onBack: () => void }) {
  const [open, setOpen] = useState<Set<string>>(new Set(["er-now"]));

  function toggle(id: string) {
    setOpen(prev => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack} data-testid="button-resources-back"><ChevronLeft className="w-4 h-4" /></Button>
        <div>
          <h2 className="text-sm font-semibold text-foreground">ER vs. Urgent Care vs. Wait It Out</h2>
          <p className="text-xs text-muted-foreground">A quick reference guide for common symptoms in both kids and adults</p>
        </div>
      </div>

      <Card className="border-amber-500/20 bg-amber-500/5">
        <CardContent className="pt-4 pb-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-muted-foreground leading-relaxed">
              <span className="text-foreground font-medium">When in doubt, err on the side of caution.</span> This guide is a general reference — always trust your instincts and call 911 if something feels seriously wrong.
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-2">
        {TRIAGE_TIERS.map(tier => {
          const isOpen = open.has(tier.id);
          return (
            <Card key={tier.id} className={`${tier.border} ${tier.bg}`} data-testid={`card-triage-${tier.id}`}>
              <button
                className="w-full flex items-center justify-between px-4 py-3 text-left gap-3"
                onClick={() => toggle(tier.id)}
                data-testid={`button-triage-toggle-${tier.id}`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <div>
                    <p className={`text-sm font-semibold ${tier.color}`}>{tier.level}</p>
                    <p className="text-xs text-muted-foreground">{tier.action}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Badge variant="outline" className={`text-xs ${tier.color} border-current hidden sm:flex`}>
                    {tier.items.length} situations
                  </Badge>
                  {isOpen ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                </div>
              </button>
              {isOpen && (
                <CardContent className="px-4 pb-4 pt-0">
                  <div className="space-y-1.5 border-t border-border/50 pt-3">
                    {tier.items.map((item, i) => (
                      <div key={i} className="flex items-start gap-2">
                        <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 mt-1.5 ${tier.color.replace("text-", "bg-")}`} />
                        <div>
                          <p className="text-xs text-foreground leading-snug">{item.symptom}</p>
                          {item.note && <p className="text-xs text-muted-foreground italic">{item.note}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}

// ─── Resources catalog ────────────────────────────────────────────────────────

const CHECKLIST_SECTIONS: Record<string, ChecklistSection[]> = {
  "aging-parents":      AGING_PARENTS_CHECKLIST,
  "cant-live-alone":    CANT_LIVE_ALONE_CHECKLIST,
  "hospital-discharge": HOSPITAL_DISCHARGE_CHECKLIST,
};

const RESOURCES: ResourceMeta[] = [
  {
    id: "aging-parents",
    title: "Parenting Aging Parents Checklist",
    description: "Gather key personal, health, financial, and legal info so you have it ready when you need it.",
    category: "Eldercare",
    type: "Checklist",
    icon: ClipboardList,
    totalItems: AGING_PARENTS_CHECKLIST.reduce((a, s) => a + s.items.length, 0),
  },
  {
    id: "cant-live-alone",
    title: "When a Parent Can No Longer Live Alone",
    description: "Warning signs, home safety, care options, and a guide for having the difficult conversation.",
    category: "Eldercare",
    type: "Checklist",
    icon: ClipboardList,
    totalItems: CANT_LIVE_ALONE_CHECKLIST.reduce((a, s) => a + s.items.length, 0),
  },
  {
    id: "hospital-discharge",
    title: "After a Hospital Discharge",
    description: "A step-by-step checklist for the critical days after a parent or loved one comes home from the hospital.",
    category: "Eldercare",
    type: "Checklist",
    icon: ClipboardList,
    totalItems: HOSPITAL_DISCHARGE_CHECKLIST.reduce((a, s) => a + s.items.length, 0),
  },
  {
    id: "medicare-guide",
    title: "Medicare vs. Medicaid — Plain English",
    description: "What each covers, who qualifies, and what happens when a parent needs long-term or nursing home care.",
    category: "Eldercare",
    type: "Guide",
    icon: BookOpen,
  },
  {
    id: "family-meeting",
    title: "Family Meeting Agenda",
    description: "A fillable, printable template to keep family members aligned and action items accountable.",
    category: "Sandwich Generation",
    type: "Template",
    icon: Users,
  },
  {
    id: "burnout-assessment",
    title: "Caregiver Burnout Self-Assessment",
    description: "10 questions to help you recognize burnout before it becomes a crisis. Takes 2 minutes.",
    category: "Well-Being",
    type: "Assessment",
    icon: Brain,
  },
  {
    id: "er-guide",
    title: "ER vs. Urgent Care vs. Wait It Out",
    description: "A quick symptom reference for kids and adults — so you know exactly where to go and how fast.",
    category: "Well-Being",
    type: "Guide",
    icon: Stethoscope,
  },
  {
    id: "pediatric-info",
    title: "Pediatric Medical Info Sheet",
    description: "A fillable, printable card covering providers, medications, allergies, and emergency contacts.",
    category: "Parenting",
    type: "Template",
    icon: FileText,
  },
];

// ─── Progress / status helpers ────────────────────────────────────────────────

function getChecklistProgress(storageId: string, familyId: string): number {
  const sections = CHECKLIST_SECTIONS[storageId];
  if (!sections) return 0;
  const key = `kindora-checklist-${storageId}-${familyId}`;
  const checked = lsGet<string[]>(key, []);
  const total = sections.reduce((a, s) => a + s.items.length, 0);
  return total === 0 ? 0 : Math.round((checked.length / total) * 100);
}

function getAssessmentResult(familyId: string): { label: string; color: string } | null {
  const res = lsGet<BurnoutResult | null>(`kindora-burnout-${familyId}`, null);
  if (!res) return null;
  const interp = burnoutInterpretation(res.score);
  return { label: interp.label, color: interp.color };
}

function isTemplateFilled(id: string, familyId: string): boolean {
  if (id === "pediatric-info") {
    const d = lsGet<PediatricData>(`kindora-pediatric-info-${familyId}`, BLANK_PEDIATRIC);
    return !!(d.childName || d.doctorName || d.allergies);
  }
  if (id === "family-meeting") {
    const d = lsGet<MeetingData>(`kindora-family-meeting-${familyId}`, BLANK_MEETING);
    return !!(d.date || d.lovedOneName || d.attendees);
  }
  return false;
}

// ─── Main ResourcesSection ────────────────────────────────────────────────────

const ALL_CATEGORIES: Array<Category | "All"> = ["All", "Eldercare", "Parenting", "Well-Being", "Sandwich Generation"];
const ALL_TYPES: Array<ResourceType | "All"> = ["All", "Checklist", "Assessment", "Template", "Guide"];

export function ResourcesSection({ familyId }: { familyId: string }) {
  const [openId, setOpenId] = useState<string | null>(null);
  const [catFilter, setCatFilter] = useState<Category | "All">("All");
  const [typeFilter, setTypeFilter] = useState<ResourceType | "All">("All");

  // ── Resource detail views ──
  if (openId === "aging-parents")
    return <ChecklistView title="Parenting Aging Parents Checklist" subtitle="Gather this information so you have it ready when you need it" sections={AGING_PARENTS_CHECKLIST} storageId="aging-parents" familyId={familyId} onBack={() => setOpenId(null)} />;
  if (openId === "cant-live-alone")
    return <ChecklistView title="When a Parent Can No Longer Live Alone" subtitle="Work through warning signs, home safety, care options, and the conversation" sections={CANT_LIVE_ALONE_CHECKLIST} storageId="cant-live-alone" familyId={familyId} onBack={() => setOpenId(null)} />;
  if (openId === "hospital-discharge")
    return <ChecklistView title="After a Hospital Discharge" subtitle="Work through these steps in the days following discharge to support a smooth recovery" sections={HOSPITAL_DISCHARGE_CHECKLIST} storageId="hospital-discharge" familyId={familyId} onBack={() => setOpenId(null)} />;
  if (openId === "burnout-assessment")
    return <BurnoutAssessment familyId={familyId} onBack={() => setOpenId(null)} />;
  if (openId === "pediatric-info")
    return <PediatricInfoSheet familyId={familyId} onBack={() => setOpenId(null)} />;
  if (openId === "family-meeting")
    return <FamilyMeetingTemplate familyId={familyId} onBack={() => setOpenId(null)} />;
  if (openId === "medicare-guide")
    return <MedicareGuide onBack={() => setOpenId(null)} />;
  if (openId === "er-guide")
    return <ERGuide onBack={() => setOpenId(null)} />;

  const filtered = RESOURCES.filter(r =>
    (catFilter === "All" || r.category === catFilter) &&
    (typeFilter === "All" || r.type === typeFilter)
  );

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-sm font-semibold text-foreground">Helpful References</h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Interactive guides, checklists, and tools to help you stay organized and prepared
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-1.5" data-testid="resources-category-filters">
        {ALL_CATEGORIES.map(cat => (
          <button
            key={cat}
            onClick={() => setCatFilter(cat)}
            className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors border ${
              catFilter === cat
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-transparent text-muted-foreground border-border hover:text-foreground"
            }`}
            data-testid={`filter-category-${cat.toLowerCase().replace(/\s+/g, "-")}`}
          >
            {cat}
          </button>
        ))}
        <span className="px-2 py-1 text-xs text-muted-foreground/40 self-center">|</span>
        {ALL_TYPES.map(type => (
          <button
            key={type}
            onClick={() => setTypeFilter(type)}
            className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors border ${
              typeFilter === type
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-transparent text-muted-foreground border-border hover:text-foreground"
            }`}
            data-testid={`filter-type-${type.toLowerCase()}`}
          >
            {type}
          </button>
        ))}
      </div>

      {/* Cards */}
      {filtered.length === 0 ? (
        <Card>
          <CardContent className="pt-8 pb-8 text-center">
            <p className="text-xs text-muted-foreground">No resources match the selected filters.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map(resource => {
            const Icon = resource.icon;
            let progressPct = 0;
            let assessmentResult: { label: string; color: string } | null = null;
            let actionLabel = "Open";

            if (resource.type === "Checklist") {
              progressPct = getChecklistProgress(resource.id, familyId);
              if (progressPct > 0) actionLabel = progressPct === 100 ? "Review" : "Continue";
            } else if (resource.type === "Assessment") {
              assessmentResult = getAssessmentResult(familyId);
              if (assessmentResult) actionLabel = "Retake";
            } else if (resource.type === "Template") {
              if (isTemplateFilled(resource.id, familyId)) actionLabel = "Edit";
            }

            return (
              <Card key={resource.id} className="hover-elevate flex flex-col" data-testid={`card-resource-${resource.id}`}>
                <CardContent className="pt-4 pb-4 px-4 flex flex-col gap-3 flex-1">
                  <div className="flex items-start justify-between gap-2 flex-wrap">
                    <div className="w-9 h-9 rounded-md bg-muted flex items-center justify-center flex-shrink-0">
                      <Icon className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <div className="flex gap-1 flex-wrap justify-end">
                      <Badge variant="outline" className={`text-xs ${CATEGORY_STYLES[resource.category]}`}>
                        {resource.category}
                      </Badge>
                      <Badge variant="outline" className={`text-xs ${TYPE_STYLES[resource.type]}`}>
                        {resource.type}
                      </Badge>
                    </div>
                  </div>

                  <div className="space-y-1 flex-1">
                    <h3 className="text-sm font-semibold text-foreground leading-snug">{resource.title}</h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">{resource.description}</p>
                  </div>

                  {resource.type === "Checklist" && resource.totalItems && (
                    <div className="space-y-1.5">
                      <span className="text-xs text-muted-foreground">
                        {progressPct > 0 ? `${progressPct}% complete` : `${resource.totalItems} items`}
                      </span>
                      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                        <div className="h-full rounded-full bg-primary transition-all duration-300" style={{ width: `${progressPct}%` }} />
                      </div>
                    </div>
                  )}

                  {resource.type === "Assessment" && assessmentResult && (
                    <p className="text-xs text-muted-foreground">
                      Last result: <span className={assessmentResult.color}>{assessmentResult.label}</span>
                    </p>
                  )}

                  <Button
                    variant="outline" size="sm" className="w-full text-xs mt-auto"
                    onClick={() => setOpenId(resource.id)}
                    data-testid={`button-open-resource-${resource.id}`}
                  >
                    {actionLabel}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
