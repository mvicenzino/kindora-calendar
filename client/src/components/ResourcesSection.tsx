import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Circle, ChevronLeft, ClipboardList, BookOpen } from "lucide-react";

// ─── Checklist Data ──────────────────────────────────────────────────────────

interface ChecklistItem {
  id: string;
  label: string;
}

interface ChecklistSection {
  id: string;
  title: string;
  color: string;
  items: ChecklistItem[];
}

const AGING_PARENTS_CHECKLIST: ChecklistSection[] = [
  {
    id: "personal",
    title: "Personal",
    color: "text-blue-400",
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
    id: "health",
    title: "Health",
    color: "text-red-400",
    items: [
      { id: "doctors", label: "Doctors" },
      { id: "medications", label: "Medications" },
      { id: "allergies", label: "Allergies" },
      { id: "health-insurance", label: "Health Insurance / Medicare" },
    ],
  },
  {
    id: "finances",
    title: "Finances",
    color: "text-emerald-400",
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
    id: "legal",
    title: "Legal",
    color: "text-purple-400",
    items: [
      { id: "will", label: "Will" },
      { id: "power-of-attorney", label: "Power of Attorney" },
      { id: "medical-directive", label: "Medical Directive" },
    ],
  },
];

// ─── Storage helpers ──────────────────────────────────────────────────────────

function storageKey(familyId: string, checklistId: string) {
  return `kindora-checklist-${checklistId}-${familyId}`;
}

function loadChecked(familyId: string, checklistId: string): Set<string> {
  try {
    const raw = localStorage.getItem(storageKey(familyId, checklistId));
    if (!raw) return new Set();
    return new Set(JSON.parse(raw) as string[]);
  } catch {
    return new Set();
  }
}

function saveChecked(familyId: string, checklistId: string, checked: Set<string>) {
  try {
    localStorage.setItem(storageKey(familyId, checklistId), JSON.stringify([...checked]));
  } catch {}
}

// ─── Aging Parents Checklist ─────────────────────────────────────────────────

function AgingParentsChecklist({ familyId, onBack }: { familyId: string; onBack: () => void }) {
  const [checked, setChecked] = useState<Set<string>>(() =>
    loadChecked(familyId, "aging-parents")
  );

  const totalItems = AGING_PARENTS_CHECKLIST.reduce((acc, s) => acc + s.items.length, 0);
  const completedItems = checked.size;
  const progress = Math.round((completedItems / totalItems) * 100);

  function toggle(itemId: string) {
    setChecked(prev => {
      const next = new Set(prev);
      if (next.has(itemId)) {
        next.delete(itemId);
      } else {
        next.add(itemId);
      }
      saveChecked(familyId, "aging-parents", next);
      return next;
    });
  }

  function toggleSection(section: ChecklistSection) {
    const allChecked = section.items.every(i => checked.has(i.id));
    setChecked(prev => {
      const next = new Set(prev);
      if (allChecked) {
        section.items.forEach(i => next.delete(i.id));
      } else {
        section.items.forEach(i => next.add(i.id));
      }
      saveChecked(familyId, "aging-parents", next);
      return next;
    });
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack} data-testid="button-resources-back">
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <div>
          <h2 className="text-sm font-semibold text-foreground">Parenting Aging Parents Checklist</h2>
          <p className="text-xs text-muted-foreground">
            Gather this information so you have it ready when you need it
          </p>
        </div>
      </div>

      {/* Progress */}
      <Card>
        <CardContent className="pt-4 pb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-foreground">Progress</span>
            <span className="text-xs text-muted-foreground">
              {completedItems} of {totalItems} items gathered
            </span>
          </div>
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full bg-primary transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          {progress === 100 && (
            <p className="text-xs text-emerald-400 mt-2 font-medium">
              All done — you are well prepared.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Sections */}
      <div className="space-y-3">
        {AGING_PARENTS_CHECKLIST.map(section => {
          const sectionCompleted = section.items.filter(i => checked.has(i.id)).length;
          const sectionTotal = section.items.length;
          const allChecked = sectionCompleted === sectionTotal;

          return (
            <Card key={section.id} data-testid={`card-checklist-section-${section.id}`}>
              <CardHeader className="pb-2 pt-4 px-4">
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className={`text-sm font-semibold ${section.color}`}>
                    {section.title}
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      {sectionCompleted}/{sectionTotal}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs px-2"
                      onClick={() => toggleSection(section)}
                      data-testid={`button-toggle-section-${section.id}`}
                    >
                      {allChecked ? "Uncheck all" : "Check all"}
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
                        className="w-full flex items-center gap-3 text-left group py-1"
                        onClick={() => toggle(item.id)}
                        data-testid={`checkbox-item-${item.id}`}
                      >
                        {isChecked ? (
                          <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-primary" />
                        ) : (
                          <Circle className="w-4 h-4 flex-shrink-0 text-muted-foreground group-hover:text-foreground transition-colors" />
                        )}
                        <span
                          className={`text-sm transition-colors ${
                            isChecked
                              ? "line-through text-muted-foreground"
                              : "text-foreground"
                          }`}
                        >
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

// ─── Resource cards catalog ───────────────────────────────────────────────────

interface ResourceCard {
  id: string;
  title: string;
  description: string;
  icon: typeof ClipboardList;
  badge: string;
  badgeColor: string;
  totalItems?: number;
}

const RESOURCES: ResourceCard[] = [
  {
    id: "aging-parents-checklist",
    title: "Parenting Aging Parents Checklist",
    description:
      "Start gathering key information — personal, health, finances, and legal — so you have it ready when you need it.",
    icon: ClipboardList,
    badge: "Checklist",
    badgeColor: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    totalItems: AGING_PARENTS_CHECKLIST.reduce((acc, s) => acc + s.items.length, 0),
  },
];

// ─── Main ResourcesSection ────────────────────────────────────────────────────

interface ResourcesSectionProps {
  familyId: string;
}

export function ResourcesSection({ familyId }: ResourcesSectionProps) {
  const [openResource, setOpenResource] = useState<string | null>(null);

  function getProgress(resourceId: string): number {
    if (resourceId === "aging-parents-checklist") {
      const checked = loadChecked(familyId, "aging-parents");
      const total = AGING_PARENTS_CHECKLIST.reduce((acc, s) => acc + s.items.length, 0);
      return total === 0 ? 0 : Math.round((checked.size / total) * 100);
    }
    return 0;
  }

  if (openResource === "aging-parents-checklist") {
    return (
      <AgingParentsChecklist
        familyId={familyId}
        onBack={() => setOpenResource(null)}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-sm font-semibold text-foreground">Helpful References</h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Interactive guides and checklists to help you prepare and stay organized
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {RESOURCES.map(resource => {
          const Icon = resource.icon;
          const progress = getProgress(resource.id);
          const started = progress > 0;

          return (
            <Card
              key={resource.id}
              className="hover-elevate"
              data-testid={`card-resource-${resource.id}`}
            >
              <CardContent className="pt-4 pb-4 px-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="w-9 h-9 rounded-md bg-muted flex items-center justify-center flex-shrink-0">
                    <Icon className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <Badge
                    variant="outline"
                    className={`text-xs ${resource.badgeColor}`}
                  >
                    {resource.badge}
                  </Badge>
                </div>

                <div className="space-y-1">
                  <h3 className="text-sm font-semibold text-foreground leading-snug">
                    {resource.title}
                  </h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {resource.description}
                  </p>
                </div>

                {resource.totalItems && (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">
                        {started ? `${progress}% complete` : `${resource.totalItems} items`}
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full bg-primary transition-all duration-300"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                )}

                <Button
                  variant="outline"
                  size="sm"
                  className="w-full text-xs"
                  onClick={() => setOpenResource(resource.id)}
                  data-testid={`button-open-resource-${resource.id}`}
                >
                  {started ? "Continue" : "Open"}
                </Button>
              </CardContent>
            </Card>
          );
        })}

        {/* Coming soon placeholder */}
        <Card className="border-dashed opacity-60">
          <CardContent className="pt-4 pb-4 px-4 flex flex-col items-center justify-center gap-2 min-h-[160px] text-center">
            <BookOpen className="w-5 h-5 text-muted-foreground" />
            <p className="text-xs text-muted-foreground">More guides coming soon</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
