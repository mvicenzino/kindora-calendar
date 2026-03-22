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
  ClipboardList,
  Brain,
  FileText,
  Printer,
  AlertTriangle,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type Category = "Eldercare" | "Parenting" | "Well-Being";
type ResourceType = "Checklist" | "Assessment" | "Template";

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
  Eldercare:   "bg-amber-500/10 text-amber-400 border-amber-500/20",
  Parenting:   "bg-blue-500/10 text-blue-400 border-blue-500/20",
  "Well-Being": "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
};

const TYPE_STYLES: Record<ResourceType, string> = {
  Checklist:  "bg-violet-500/10 text-violet-400 border-violet-500/20",
  Assessment: "bg-rose-500/10 text-rose-400 border-rose-500/20",
  Template:   "bg-teal-500/10 text-teal-400 border-teal-500/20",
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
      { id: "wl-memory", label: "Memory lapses that affect daily safety (stove left on, door unlocked)" },
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
      { id: "hs-grab-bars", label: "Grab bars installed in bathroom / shower" },
      { id: "hs-nonslip", label: "Non-slip mats in tub, shower, and entry" },
      { id: "hs-handrails", label: "Handrails on all staircases" },
      { id: "hs-lighting", label: "Adequate lighting throughout (especially stairs and hallways)" },
      { id: "hs-pathways", label: "Clear pathways — rugs secured, cords out of the way" },
      { id: "hs-meds-org", label: "Medications organized and accessible" },
      { id: "hs-emergency", label: "Emergency numbers posted in visible location" },
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
      { id: "co-financial", label: "Financial implications reviewed with advisor" },
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
  if (score <= 7)  return { label: "Low", color: "text-emerald-400", detail: "You are managing well. Keep protecting your time and energy." };
  if (score <= 15) return { label: "Mild", color: "text-yellow-400", detail: "Some signs of strain. Consider building in more breaks and asking for help." };
  if (score <= 22) return { label: "Moderate", color: "text-orange-400", detail: "Significant burnout signs. It is important to ask for help and talk to someone you trust." };
  return { label: "High", color: "text-red-400", detail: "Severe burnout. Please reach out to a doctor, counselor, or support group — and consider talking to Kira." };
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
          <p className="text-xs text-muted-foreground">
            10 questions — takes about 2 minutes. Be honest with yourself.
          </p>
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

          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={retake} className="text-xs" data-testid="button-retake-assessment">
              Retake
            </Button>
          </div>
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

          <Button
            onClick={submit}
            disabled={!allAnswered}
            className="w-full text-xs"
            data-testid="button-submit-assessment"
          >
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
  const [saved, setSaved] = useState(false);

  function update(field: keyof PediatricData, value: string) {
    setData(prev => { const next = { ...prev, [field]: value }; lsSet(key, next); return next; });
    setSaved(false);
  }

  function Field({ label, field, placeholder, wide }: { label: string; field: keyof PediatricData; placeholder?: string; wide?: boolean }) {
    return (
      <div className={`space-y-1 ${wide ? "col-span-2" : ""}`}>
        <Label className="text-xs text-muted-foreground">{label}</Label>
        <Input
          value={data[field]}
          onChange={e => update(field, e.target.value)}
          placeholder={placeholder ?? ""}
          className="h-8 text-xs"
          data-testid={`input-pediatric-${field}`}
        />
      </div>
    );
  }

  function TextAreaField({ label, field, placeholder }: { label: string; field: keyof PediatricData; placeholder?: string }) {
    return (
      <div className="space-y-1 col-span-2">
        <Label className="text-xs text-muted-foreground">{label}</Label>
        <Textarea
          value={data[field]}
          onChange={e => update(field, e.target.value)}
          placeholder={placeholder ?? ""}
          className="text-xs min-h-[64px] resize-none"
          data-testid={`textarea-pediatric-${field}`}
        />
      </div>
    );
  }

  function Section({ title, children }: { title: string; children: React.ReactNode }) {
    return (
      <Card>
        <CardHeader className="pb-2 pt-4 px-4">
          <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{title}</CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <div className="grid grid-cols-2 gap-3">{children}</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack} data-testid="button-resources-back">
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <div className="flex-1">
          <h2 className="text-sm font-semibold text-foreground">Pediatric Medical Info Sheet</h2>
          <p className="text-xs text-muted-foreground">Fill in once, hand to any caregiver or use in an emergency</p>
        </div>
        <Button
          variant="outline" size="sm"
          onClick={() => window.print()}
          className="gap-1.5 text-xs flex-shrink-0"
          data-testid="button-print-sheet"
        >
          <Printer className="w-3.5 h-3.5" />
          Print
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

      <p className="text-xs text-muted-foreground text-center pb-2">
        Changes save automatically as you type.
      </p>
    </div>
  );
}

// ─── Resources catalog ────────────────────────────────────────────────────────

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
    id: "burnout-assessment",
    title: "Caregiver Burnout Self-Assessment",
    description: "10 questions to help you recognize burnout before it becomes a crisis. Takes 2 minutes.",
    category: "Well-Being",
    type: "Assessment",
    icon: Brain,
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

// ─── Progress helpers ─────────────────────────────────────────────────────────

function getChecklistProgress(storageId: string, sections: ChecklistSection[], familyId: string): number {
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

function getPediatricFilled(familyId: string): boolean {
  const d = lsGet<PediatricData>((`kindora-pediatric-info-${familyId}`), BLANK_PEDIATRIC);
  return !!(d.childName || d.doctorName || d.allergies);
}

// ─── Main ResourcesSection ────────────────────────────────────────────────────

const ALL_CATEGORIES: Array<Category | "All"> = ["All", "Eldercare", "Parenting", "Well-Being"];
const ALL_TYPES: Array<ResourceType | "All"> = ["All", "Checklist", "Assessment", "Template"];

export function ResourcesSection({ familyId }: { familyId: string }) {
  const [openId, setOpenId] = useState<string | null>(null);
  const [catFilter, setCatFilter] = useState<Category | "All">("All");
  const [typeFilter, setTypeFilter] = useState<ResourceType | "All">("All");

  // ── Resource detail views ──
  if (openId === "aging-parents") {
    return <ChecklistView title="Parenting Aging Parents Checklist" subtitle="Gather this information so you have it ready when you need it" sections={AGING_PARENTS_CHECKLIST} storageId="aging-parents" familyId={familyId} onBack={() => setOpenId(null)} />;
  }
  if (openId === "cant-live-alone") {
    return <ChecklistView title="When a Parent Can No Longer Live Alone" subtitle="Work through warning signs, home safety, care options, and the conversation" sections={CANT_LIVE_ALONE_CHECKLIST} storageId="cant-live-alone" familyId={familyId} onBack={() => setOpenId(null)} />;
  }
  if (openId === "burnout-assessment") {
    return <BurnoutAssessment familyId={familyId} onBack={() => setOpenId(null)} />;
  }
  if (openId === "pediatric-info") {
    return <PediatricInfoSheet familyId={familyId} onBack={() => setOpenId(null)} />;
  }

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
      <div className="space-y-2">
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
              data-testid={`filter-category-${cat.toLowerCase().replace(" ", "-")}`}
            >
              {cat}
            </button>
          ))}
          <span className="px-2 py-1 text-xs text-muted-foreground/50 self-center">|</span>
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
              const sections = resource.id === "aging-parents" ? AGING_PARENTS_CHECKLIST : CANT_LIVE_ALONE_CHECKLIST;
              progressPct = getChecklistProgress(resource.id, sections, familyId);
              if (progressPct > 0) actionLabel = progressPct === 100 ? "Review" : "Continue";
            } else if (resource.type === "Assessment") {
              assessmentResult = getAssessmentResult(familyId);
              if (assessmentResult) actionLabel = "Retake";
            } else if (resource.type === "Template") {
              if (getPediatricFilled(familyId)) actionLabel = "Edit";
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
                      <div className="flex justify-between">
                        <span className="text-xs text-muted-foreground">
                          {progressPct > 0 ? `${progressPct}% complete` : `${resource.totalItems} items`}
                        </span>
                      </div>
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
