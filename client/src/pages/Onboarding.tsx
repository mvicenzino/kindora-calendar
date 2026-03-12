import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Users,
  Calendar,
  Heart,
  ArrowRight,
  Check,
  Loader2,
  AlertCircle,
  Plus,
  X,
  UserPlus,
  ChevronRight,
  Pill,
  Clock,
  Mail,
  Shield,
  Star,
} from "lucide-react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import type { Family } from "@shared/schema";

type OnboardingStep =
  | "slides"
  | "role"
  | "owner-name"
  | "add-members"
  | "owner-success"
  | "aide-code"
  | "aide-success";

type CareContextOption = "kids" | "parent" | "extended" | "multi";

const SLIDE_DATA = [
  {
    gradient: ["#0f0a1e", "#1a0f3a", "#0a1628"],
    accentGlow: "rgba(139, 92, 246, 0.35)",
    badge: "The sandwich generation",
    headline: "Juggling kids\nand aging parents?",
    sub: "You're managing two completely different worlds at once. Kindora is the first calendar built for exactly this.",
    illustration: "family",
  },
  {
    gradient: ["#071a20", "#0a2230", "#081520"],
    accentGlow: "rgba(20, 184, 166, 0.3)",
    badge: "Role-based access",
    headline: "Everyone in the loop.\nNo one overstepping.",
    sub: "Give caregivers exactly the access they need — medication schedules, appointments, nothing more. Your family, your rules.",
    illustration: "access",
  },
  {
    gradient: ["#1a0a20", "#200a30", "#100818"],
    accentGlow: "rgba(244, 114, 182, 0.3)",
    badge: "Beyond the calendar",
    headline: "Google Calendar\ncan't do this.",
    sub: "Medication tracking. Caregiver time logs. Automated weekly family summaries. Everything Google and Apple left out.",
    illustration: "features",
  },
] as const;

function FamilyIllustration() {
  return (
    <div className="relative w-full max-w-xs mx-auto h-52 select-none">
      <style>{`
        @keyframes floatUp { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-6px)} }
        @keyframes floatUpDelay { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-5px)} }
        @keyframes slideInCard { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
        @keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
        @keyframes pulseGlow { 0%,100%{opacity:0.5} 50%{opacity:1} }
      `}</style>

      <div className="absolute inset-0 rounded-2xl overflow-hidden">
        <div className="absolute inset-0 opacity-20"
          style={{ backgroundImage: "linear-gradient(rgba(255,255,255,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.06) 1px, transparent 1px)", backgroundSize: "32px 32px" }} />
      </div>

      {[
        { top: "4px", left: "0", color: "#8B5CF6", label: "Sophie · Soccer", time: "3:30 PM", delay: "0ms", width: "148px" },
        { top: "56px", left: "24px", color: "#F59E0B", label: "Grandpa · Dr. Visit", time: "10:00 AM", delay: "80ms", width: "164px" },
        { top: "108px", left: "8px", color: "#10B981", label: "Lucas · Piano", time: "4:00 PM", delay: "160ms", width: "140px" },
        { top: "160px", left: "32px", color: "#EC4899", label: "Mom · PT Session", time: "2:00 PM", delay: "240ms", width: "152px" },
      ].map((ev, i) => (
        <div
          key={i}
          className="absolute rounded-xl flex items-center gap-2 px-3 py-2"
          style={{
            top: ev.top, left: ev.left, width: ev.width,
            background: `linear-gradient(135deg, ${ev.color}22 0%, ${ev.color}11 100%)`,
            border: `1px solid ${ev.color}44`,
            backdropFilter: "blur(12px)",
            animation: `slideInCard 0.5s ${ev.delay} both, floatUp ${3.5 + i * 0.4}s ${ev.delay} ease-in-out infinite`,
            boxShadow: `0 4px 20px ${ev.color}20`,
          }}
        >
          <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: ev.color, boxShadow: `0 0 8px ${ev.color}` }} />
          <div className="flex-1 min-w-0">
            <p className="text-white text-[10px] font-semibold leading-tight truncate">{ev.label}</p>
            <p className="text-white/50 text-[9px]">{ev.time}</p>
          </div>
        </div>
      ))}

      <div className="absolute right-0 top-1/2 -translate-y-1/2"
        style={{ animation: "floatUpDelay 4s ease-in-out infinite", animationDelay: "500ms" }}>
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center"
          style={{ background: "linear-gradient(135deg, rgba(139,92,246,0.3), rgba(20,184,166,0.3))", border: "1px solid rgba(255,255,255,0.15)", backdropFilter: "blur(16px)", boxShadow: "0 8px 32px rgba(139,92,246,0.3)" }}>
          <Calendar className="w-7 h-7 text-white" />
        </div>
      </div>
    </div>
  );
}

function AccessIllustration() {
  const roles = [
    { label: "You", role: "Owner", color: "#8B5CF6", icon: Star, angle: -90, r: 88 },
    { label: "Maria", role: "Caregiver", color: "#14B8A6", icon: Heart, angle: 30, r: 88 },
    { label: "Dr. Chen", role: "Provider", color: "#3B82F6", icon: Shield, angle: 150, r: 88 },
  ];

  return (
    <div className="relative w-full max-w-[260px] mx-auto h-52 select-none flex items-center justify-center">
      <div className="relative w-52 h-52">
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 208 208">
          {roles.map((r, i) => {
            const cx = 104 + r.r * Math.cos((r.angle * Math.PI) / 180);
            const cy = 104 + r.r * Math.sin((r.angle * Math.PI) / 180);
            return (
              <line key={i} x1="104" y1="104" x2={cx} y2={cy}
                stroke={r.color} strokeWidth="1.5" strokeDasharray="4 4" opacity="0.5"
                style={{ animation: `pulseGlow 2.5s ${i * 0.4}s ease-in-out infinite` }} />
            );
          })}
          <circle cx="104" cy="104" r="28" fill="rgba(139,92,246,0.12)" stroke="rgba(139,92,246,0.3)" strokeWidth="1.5" />
        </svg>

        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-14 h-14 rounded-2xl flex items-center justify-center z-10"
          style={{ background: "linear-gradient(135deg, rgba(139,92,246,0.4), rgba(20,184,166,0.3))", border: "1px solid rgba(255,255,255,0.2)", backdropFilter: "blur(16px)", boxShadow: "0 0 32px rgba(139,92,246,0.4)" }}>
          <Calendar className="w-7 h-7 text-white" />
        </div>

        {roles.map((r, i) => {
          const Icon = r.icon;
          const x = 50 + r.r * Math.cos((r.angle * Math.PI) / 180) / 208 * 100;
          const y = 50 + r.r * Math.sin((r.angle * Math.PI) / 180) / 208 * 100;
          return (
            <div key={i} className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-1"
              style={{ left: `${x}%`, top: `${y}%`, animation: `slideInCard 0.5s ${i * 100}ms both, floatUp ${3 + i * 0.5}s ease-in-out infinite` }}>
              <div className="w-10 h-10 rounded-full flex items-center justify-center"
                style={{ background: `linear-gradient(135deg, ${r.color}30, ${r.color}15)`, border: `1.5px solid ${r.color}50`, backdropFilter: "blur(8px)", boxShadow: `0 4px 16px ${r.color}25` }}>
                <Icon className="w-4 h-4" style={{ color: r.color }} />
              </div>
              <div className="text-center">
                <p className="text-white text-[10px] font-semibold leading-none">{r.label}</p>
                <p className="text-white/50 text-[9px] mt-0.5 whitespace-nowrap">{r.role}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function FeaturesIllustration() {
  const features = [
    { icon: Pill, color: "#EC4899", label: "Medication tracker", value: "Metformin · 8:00 AM", delay: "0ms", x: "0%", y: "0%" },
    { icon: Clock, color: "#F59E0B", label: "Caregiver hours", value: "This week: 18.5 hrs", delay: "100ms", x: "55%", y: "20%" },
    { icon: Mail, color: "#8B5CF6", label: "Weekly digest", value: "Sent every Sunday", delay: "200ms", x: "10%", y: "54%" },
  ];

  return (
    <div className="relative w-full max-w-xs mx-auto h-52 select-none">
      {features.map((f, i) => {
        const Icon = f.icon;
        return (
          <div key={i} className="absolute rounded-2xl p-3 flex items-center gap-3"
            style={{
              left: f.x, top: f.y, width: "172px",
              background: `linear-gradient(135deg, ${f.color}18 0%, ${f.color}08 100%)`,
              border: `1px solid ${f.color}35`,
              backdropFilter: "blur(16px)",
              animation: `slideInCard 0.5s ${f.delay} both, floatUp ${3.2 + i * 0.6}s ${f.delay} ease-in-out infinite`,
              boxShadow: `0 8px 28px ${f.color}18`,
            }}>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: `${f.color}22`, border: `1px solid ${f.color}40` }}>
              <Icon className="w-4 h-4" style={{ color: f.color }} />
            </div>
            <div className="min-w-0">
              <p className="text-white/60 text-[9px] uppercase tracking-wider leading-none mb-0.5">{f.label}</p>
              <p className="text-white text-[11px] font-semibold leading-snug">{f.value}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function WelcomeSlides({ onComplete }: { onComplete: () => void }) {
  const [slide, setSlide] = useState(0);
  const [visible, setVisible] = useState(true);
  const [pendingSlide, setPendingSlide] = useState<number | null>(null);
  const total = SLIDE_DATA.length;

  const transition = (target: number | "complete") => {
    setVisible(false);
    setTimeout(() => {
      if (target === "complete") {
        onComplete();
      } else {
        setSlide(target);
        setPendingSlide(null);
        setVisible(true);
      }
    }, 320);
  };

  const goNext = () => {
    if (!visible) return;
    if (slide === total - 1) transition("complete");
    else transition(slide + 1);
  };

  const goPrev = () => {
    if (!visible || slide === 0) return;
    transition(slide - 1);
  };

  const current = SLIDE_DATA[slide];
  const illustrations = [<FamilyIllustration />, <AccessIllustration />, <FeaturesIllustration />];

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{
        background: `radial-gradient(ellipse at 30% 20%, ${current.accentGlow} 0%, transparent 60%), linear-gradient(160deg, ${current.gradient[0]} 0%, ${current.gradient[1]} 50%, ${current.gradient[2]} 100%)`,
        transition: "background 0.8s ease",
      }}
    >
      <div className="flex items-center justify-between px-6 pt-6">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg flex items-center justify-center"
            style={{ background: "linear-gradient(135deg, #8B5CF6, #14B8A6)" }}>
            <Calendar className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="text-white/80 text-sm font-semibold tracking-wide" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            Kindora
          </span>
        </div>
        <button
          onClick={() => transition("complete")}
          className="text-white/40 text-sm hover:text-white/70 transition-colors px-3 py-1.5 rounded-lg"
          data-testid="button-skip-slides"
        >
          Skip
        </button>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-6 py-8">
        <div
          className="w-full max-w-md flex flex-col items-center gap-8"
          style={{
            opacity: visible ? 1 : 0,
            transform: visible ? "translateY(0)" : "translateY(12px)",
            transition: "opacity 0.32s ease, transform 0.32s ease",
          }}
        >
          <div className="w-full">
            {illustrations[slide]}
          </div>

          <div className="text-center space-y-4 w-full">
            <div
              className="inline-block px-3 py-1 rounded-full text-xs font-semibold tracking-wide uppercase"
              style={{ background: "rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.7)", border: "1px solid rgba(255,255,255,0.15)" }}
            >
              {current.badge}
            </div>

            <h1
              className="text-3xl md:text-4xl font-bold text-white leading-tight"
              style={{ fontFamily: "'Space Grotesk', sans-serif", textShadow: "0 2px 20px rgba(0,0,0,0.4)" }}
            >
              {current.headline.split("\n").map((line, i) => (
                <span key={i}>{line}{i < current.headline.split("\n").length - 1 && <br />}</span>
              ))}
            </h1>

            <p className="text-white/60 text-base leading-relaxed max-w-sm mx-auto">
              {current.sub}
            </p>
          </div>

          <div className="flex flex-col items-center gap-4 w-full">
            <Button
              onClick={goNext}
              size="lg"
              className="w-full max-w-xs text-white border-0 font-semibold"
              style={{
                background: "linear-gradient(135deg, rgba(139,92,246,0.9), rgba(20,184,166,0.85))",
                boxShadow: "0 8px 32px rgba(139,92,246,0.35), inset 0 1px 0 rgba(255,255,255,0.2)",
              }}
              data-testid={slide === total - 1 ? "button-get-started" : "button-next-slide"}
            >
              {slide === total - 1 ? (
                <>Get started <ArrowRight className="w-4 h-4 ml-1" /></>
              ) : (
                <>Next <ChevronRight className="w-4 h-4 ml-1" /></>
              )}
            </Button>

            <div className="flex items-center gap-2">
              {SLIDE_DATA.map((_, i) => (
                <button
                  key={i}
                  onClick={() => i !== slide && transition(i)}
                  className="rounded-full transition-all duration-300"
                  style={{
                    width: i === slide ? "24px" : "6px",
                    height: "6px",
                    background: i === slide ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.25)",
                  }}
                  data-testid={`dot-slide-${i}`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="pb-8 px-6 text-center">
        <p className="text-white/25 text-xs">
          Setup takes about 2 minutes
        </p>
      </div>
    </div>
  );
}

export default function Onboarding() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();
  const [step, setStep] = useState<OnboardingStep>("slides");
  const [familyName, setFamilyName] = useState("");
  const [careContext, setCareContext] = useState<CareContextOption[]>([]);
  const [inviteCode, setInviteCode] = useState("");
  const [joinedFamily, setJoinedFamily] = useState<Family | null>(null);
  const [createdFamilyId, setCreatedFamilyId] = useState<string | null>(null);
  const [memberEntries, setMemberEntries] = useState<{ name: string }[]>([]);
  const [newMemberName, setNewMemberName] = useState("");

  const { data: families = [] } = useQuery<Family[]>({
    queryKey: ["/api/families"],
  });

  useEffect(() => {
    if (user?.lastName) {
      setFamilyName(`The ${user.lastName} Family`);
    } else if (user?.firstName) {
      setFamilyName(`${user.firstName}'s Family`);
    }
  }, [user]);

  const createFamilyMutation = useMutation({
    mutationFn: async ({ name }: { name: string }) => {
      const res = await apiRequest("POST", "/api/families", { name });
      return res.json() as Promise<Family>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/families"] });
    },
  });

  const renameFamilyMutation = useMutation({
    mutationFn: async ({ familyId, name }: { familyId: string; name: string }) => {
      const res = await apiRequest("PUT", `/api/families/${familyId}`, { name });
      return res.json() as Promise<Family>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/families"] });
    },
  });

  const joinFamilyMutation = useMutation({
    mutationFn: async (code: string) => {
      const res = await apiRequest("POST", "/api/family/join", {
        inviteCode: code,
        role: "caregiver",
      });
      return res.json() as Promise<Family>;
    },
    onSuccess: (family) => {
      queryClient.invalidateQueries({ queryKey: ["/api/families"] });
      setJoinedFamily(family);
      setStep("aide-success");
    },
  });

  const createMemberMutation = useMutation({
    mutationFn: async ({ name, color, familyId }: { name: string; color: string; familyId: string }) => {
      const res = await apiRequest("POST", "/api/family-members", { name, color, familyId });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/family-members"] });
    },
  });

  const MEMBER_COLORS = [
    '#8B5CF6', '#EC4899', '#10B981', '#F59E0B', '#3B82F6', '#EF4444', '#14B8A6', '#F97316',
  ];

  const handleOwnerSubmit = async () => {
    const name = familyName.trim();
    if (!name) {
      toast({ title: "Please enter a family name", variant: "destructive" });
      return;
    }
    const ownerName = [user?.firstName, user?.lastName].filter(Boolean).join(" ") || "Me";
    setMemberEntries([{ name: ownerName }]);
    setNewMemberName("");
    try {
      if (families.length > 0) {
        await renameFamilyMutation.mutateAsync({ familyId: families[0].id, name });
        setCreatedFamilyId(families[0].id);
      } else {
        const newFamily = await createFamilyMutation.mutateAsync({ name });
        setCreatedFamilyId(newFamily.id);
      }
      setStep("add-members");
    } catch {
      toast({ title: "Something went wrong", description: "Please try again.", variant: "destructive" });
    }
  };

  const handleAddMember = () => {
    const trimmed = newMemberName.trim();
    if (!trimmed) return;
    if (memberEntries.some(m => m.name.toLowerCase() === trimmed.toLowerCase())) {
      toast({ title: "Already added", description: `${trimmed} is already in the list.`, variant: "destructive" });
      return;
    }
    setMemberEntries(prev => [...prev, { name: trimmed }]);
    setNewMemberName("");
  };

  const handleRemoveMember = (index: number) => {
    if (index === 0) return;
    setMemberEntries(prev => prev.filter((_, i) => i !== index));
  };

  const handleMembersSubmit = async () => {
    const familyId = createdFamilyId || (families.length > 0 ? families[0].id : null);
    if (!familyId) {
      toast({ title: "Family not created yet", description: "Please go back and create a family first.", variant: "destructive" });
      return;
    }
    try {
      for (let i = 0; i < memberEntries.length; i++) {
        await createMemberMutation.mutateAsync({
          name: memberEntries[i].name,
          color: MEMBER_COLORS[i % MEMBER_COLORS.length],
          familyId,
        });
      }
      setStep("owner-success");
    } catch {
      toast({ title: "Something went wrong", description: "Please try again.", variant: "destructive" });
    }
  };

  const handleJoinSubmit = async () => {
    const code = inviteCode.trim();
    if (!code) {
      toast({ title: "Please enter your invite code", variant: "destructive" });
      return;
    }
    try {
      await joinFamilyMutation.mutateAsync(code);
    } catch {
      toast({
        title: "That code isn't valid",
        description: "Check with your family and try again.",
        variant: "destructive",
      });
    }
  };

  const markOnboardingComplete = () => {
    localStorage.setItem("kindora_onboarding_complete", "true");
  };

  const goToCalendar = () => {
    markOnboardingComplete();
    setLocation("/");
  };

  const goToInvite = () => {
    markOnboardingComplete();
    setLocation("/family");
  };

  const careOptions: { id: CareContextOption; label: string }[] = [
    { id: "kids", label: "Kids" },
    { id: "parent", label: "Parent / Grandparent" },
    { id: "extended", label: "Extended family" },
    { id: "multi", label: "Multiple generations" },
  ];

  if (step === "slides") {
    return <WelcomeSlides onComplete={() => setStep("role")} />;
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-lg w-full">

        {step === "role" && (
          <RoleStep
            onOwner={() => setStep("owner-name")}
            onAide={() => setStep("aide-code")}
          />
        )}

        {step === "owner-name" && (
          <Card className="p-8 md:p-10">
            <div className="space-y-6">
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-gradient-to-br from-purple-500 to-teal-500 mb-4">
                  <Users className="w-7 h-7 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-foreground mb-2" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                  What should we call your family?
                </h2>
                <p className="text-muted-foreground text-sm">
                  This will appear when inviting others to join
                </p>
              </div>

              <div className="space-y-2">
                <Label className="text-sm">Family name</Label>
                <Input
                  value={familyName}
                  onChange={(e) => setFamilyName(e.target.value)}
                  placeholder="e.g., The Johnsons, Garcia Household"
                  className="text-base"
                  data-testid="input-family-name"
                  autoFocus
                  onKeyDown={(e) => e.key === "Enter" && handleOwnerSubmit()}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Who do you care for? (optional)</Label>
                <div className="flex flex-wrap gap-2">
                  {careOptions.map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setCareContext(prev =>
                        prev.includes(opt.id)
                          ? prev.filter(c => c !== opt.id)
                          : [...prev, opt.id]
                      )}
                      className={`px-3 py-2 rounded-md text-sm font-medium border transition-all toggle-elevate ${
                        careContext.includes(opt.id)
                          ? "bg-muted border-border text-foreground toggle-elevated"
                          : "bg-muted/50 border-border text-muted-foreground"
                      }`}
                      data-testid={`tag-${opt.id}`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <Button
                onClick={handleOwnerSubmit}
                disabled={createFamilyMutation.isPending || renameFamilyMutation.isPending || !familyName.trim()}
                className="w-full"
                data-testid="button-create-family"
              >
                {(createFamilyMutation.isPending || renameFamilyMutation.isPending) ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : null}
                Create family
              </Button>
            </div>
          </Card>
        )}

        {step === "add-members" && (
          <Card className="p-8 md:p-10">
            <div className="space-y-6">
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-gradient-to-br from-purple-500 to-teal-500 mb-4">
                  <UserPlus className="w-7 h-7 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-foreground mb-2" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                  Who's in your family?
                </h2>
                <p className="text-muted-foreground text-sm">
                  Add the people you'll be scheduling for. You can always edit this later.
                </p>
              </div>

              <div className="space-y-2">
                {memberEntries.map((entry, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 border border-border"
                    data-testid={`member-entry-${index}`}
                  >
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-semibold flex-shrink-0"
                      style={{ backgroundColor: MEMBER_COLORS[index % MEMBER_COLORS.length] }}
                    >
                      {entry.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{entry.name}</p>
                    </div>
                    {index === 0 ? (
                      <span className="text-xs text-muted-foreground flex-shrink-0">You</span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleRemoveMember(index)}
                        className="text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
                        data-testid={`button-remove-member-${index}`}
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <div className="space-y-2">
                <Label className="text-xs">Add a family member</Label>
                <div className="flex gap-2">
                  <Input
                    value={newMemberName}
                    onChange={(e) => setNewMemberName(e.target.value)}
                    placeholder="Name (e.g., Carolyn, Sebby)"
                    className="text-sm flex-1"
                    data-testid="input-new-member-name"
                    onKeyDown={(e) => e.key === "Enter" && handleAddMember()}
                  />
                  <Button
                    size="icon"
                    variant="outline"
                    onClick={handleAddMember}
                    disabled={!newMemberName.trim()}
                    data-testid="button-add-member"
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <div className="flex flex-col gap-3 pt-2">
                <Button
                  onClick={handleMembersSubmit}
                  disabled={createMemberMutation.isPending || memberEntries.length === 0}
                  className="w-full"
                  data-testid="button-save-members"
                >
                  {createMemberMutation.isPending ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : null}
                  {memberEntries.length <= 1 ? "Continue" : `Add ${memberEntries.length} members & continue`}
                </Button>
                <button
                  type="button"
                  onClick={() => setStep("owner-success")}
                  className="text-muted-foreground text-sm hover:text-foreground transition-colors py-1"
                  data-testid="button-skip-members"
                >
                  Skip for now
                </button>
              </div>
            </div>
          </Card>
        )}

        {step === "owner-success" && (
          <Card className="p-8 md:p-10">
            <div className="space-y-6 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 mb-2">
                <Check className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-foreground" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                You're all set, {user?.firstName || "there"}!
              </h2>
              <p className="text-muted-foreground">
                {memberEntries.length > 1
                  ? `Your family calendar is ready with ${memberEntries.length} members. Now let's add caregivers who need access.`
                  : "Your family calendar is ready. Let's add the people who need access."}
              </p>

              <div className="flex flex-col gap-3 pt-2">
                <Button
                  onClick={goToInvite}
                  className="w-full"
                  data-testid="button-invite-caregiver"
                >
                  <Users className="w-4 h-4 mr-2" />
                  Invite your first caregiver
                </Button>
                <Button
                  onClick={goToCalendar}
                  variant="outline"
                  className="w-full"
                  data-testid="button-skip-to-calendar"
                >
                  I'll do this later
                </Button>
              </div>
            </div>
          </Card>
        )}

        {step === "aide-code" && (
          <Card className="p-8 md:p-10">
            <div className="space-y-6">
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-gradient-to-br from-orange-400 to-pink-500 mb-4">
                  <Heart className="w-7 h-7 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-foreground mb-2" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                  Enter your invite code
                </h2>
                <p className="text-muted-foreground text-sm">
                  Your family sent you a code to join their calendar
                </p>
              </div>

              <div className="space-y-2">
                <Label className="text-sm">Invite code</Label>
                <Input
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                  placeholder="e.g., ABC123"
                  className="text-center text-xl tracking-[0.3em] font-mono uppercase"
                  data-testid="input-invite-code"
                  autoFocus
                  maxLength={12}
                  onKeyDown={(e) => e.key === "Enter" && handleJoinSubmit()}
                />
              </div>

              {joinFamilyMutation.isError && (
                <div className="flex items-start gap-2 p-3 rounded-md bg-red-500/10 border border-red-500/30 text-red-200 text-sm">
                  <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span>That code isn't valid. Check with your family and try again.</span>
                </div>
              )}

              <Button
                onClick={handleJoinSubmit}
                disabled={joinFamilyMutation.isPending || !inviteCode.trim()}
                className="w-full bg-gradient-to-r from-orange-400 to-pink-500 text-white border-0"
                data-testid="button-join-family"
              >
                {joinFamilyMutation.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : null}
                Join family
              </Button>

              <button
                type="button"
                onClick={() => {
                  toast({
                    title: "No code yet?",
                    description: "Ask the family member to send you an invite from their Family Settings page.",
                  });
                  goToCalendar();
                }}
                className="w-full text-muted-foreground text-sm hover:text-foreground transition-colors py-2"
                data-testid="button-no-code"
              >
                I don't have a code yet
              </button>
            </div>
          </Card>
        )}

        {step === "aide-success" && joinedFamily && (
          <Card className="p-8 md:p-10">
            <div className="space-y-6 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 mb-2">
                <Check className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-foreground" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                Welcome to {joinedFamily.name}!
              </h2>
              <p className="text-muted-foreground">
                You're now receiving updates about family schedules and medications.
              </p>

              <Button
                onClick={goToCalendar}
                className="w-full"
                data-testid="button-see-calendar"
              >
                <Calendar className="w-4 h-4 mr-2" />
                See calendar
              </Button>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}

function RoleStep({
  onOwner,
  onAide,
}: {
  onOwner: () => void;
  onAide: () => void;
}) {
  return (
    <div className="space-y-6">
      <div className="text-center mb-4">
        <h2
          className="text-2xl md:text-3xl font-bold text-foreground mb-2"
          style={{ fontFamily: "'Space Grotesk', sans-serif" }}
          data-testid="text-role-title"
        >
          What brings you here?
        </h2>
        <p className="text-muted-foreground text-sm">
          Managing schedules for kids AND parents is a lot. We're here to help.
        </p>
      </div>

      <div className="grid gap-4">
        <Card
          className="p-6 cursor-pointer transition-all hover-elevate group"
          onClick={onOwner}
          data-testid="card-role-owner"
        >
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
              <Calendar className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-semibold text-foreground mb-1">
                I'm managing family schedules
              </h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Parents, guardians, or adult children coordinating family activities
              </p>
            </div>
            <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-foreground mt-1 flex-shrink-0 transition-colors" />
          </div>
        </Card>

        <Card
          className="p-6 cursor-pointer transition-all hover-elevate group"
          onClick={onAide}
          data-testid="card-role-aide"
        >
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 w-12 h-12 rounded-full bg-gradient-to-br from-orange-400 to-pink-500 flex items-center justify-center">
              <Heart className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-semibold text-foreground mb-1">
                I'm a caregiver joining a family
              </h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Home aides, nurses, or helpers who received an invite code
              </p>
            </div>
            <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-foreground mt-1 flex-shrink-0 transition-colors" />
          </div>
        </Card>
      </div>
    </div>
  );
}
