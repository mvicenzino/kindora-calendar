import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Calendar, Bot, Heart, Activity, ArrowRight, X, Sparkles } from "lucide-react";

const SEEN_KEY = "kindora-welcome-seen-v1";

const PATHS = [
  {
    id: "calendar",
    icon: Calendar,
    color: "text-blue-400",
    bg: "bg-blue-500/10 border-blue-400/20 hover:border-blue-400/40",
    title: "Plan your week",
    description: "Add events, coordinate schedules, and keep everyone on the same page.",
    href: "/",
  },
  {
    id: "advisor",
    icon: Bot,
    color: "text-primary",
    bg: "bg-primary/10 border-primary/20 hover:border-primary/40",
    title: "Talk to Kira",
    description: "Get guidance on parenting, eldercare, or just talk through what's on your mind.",
    href: "/advisor",
  },
  {
    id: "care",
    icon: Heart,
    color: "text-rose-400",
    bg: "bg-rose-500/10 border-rose-400/20 hover:border-rose-400/40",
    title: "Manage caregiving",
    description: "Track medications, log caregiver hours, and coordinate care for a loved one.",
    href: "/care",
  },
  {
    id: "health",
    icon: Activity,
    color: "text-emerald-400",
    bg: "bg-emerald-500/10 border-emerald-400/20 hover:border-emerald-400/40",
    title: "Track health",
    description: "Log symptoms, energy levels, and health patterns for any family member.",
    href: "/health",
  },
];

export default function WelcomeModal() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const seen = localStorage.getItem(SEEN_KEY);
    if (!seen && user && !user.id?.startsWith("demo-")) {
      // Small delay so the app finishes rendering first
      const t = setTimeout(() => setVisible(true), 600);
      return () => clearTimeout(t);
    }
  }, [user]);

  function dismiss() {
    localStorage.setItem(SEEN_KEY, "1");
    setVisible(false);
  }

  function pick(href: string) {
    dismiss();
    navigate(href);
  }

  if (!visible) return null;

  const firstName = user?.firstName || user?.email?.split("@")[0] || "there";

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.65)", backdropFilter: "blur(6px)" }}
      data-testid="welcome-modal"
    >
      <div className="relative w-full max-w-lg bg-card border border-border/60 rounded-2xl shadow-2xl overflow-hidden">
        {/* Dismiss button */}
        <button
          onClick={dismiss}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors z-10"
          aria-label="Close"
          data-testid="button-close-welcome"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header */}
        <div className="px-6 pt-6 pb-5 border-b border-border/40">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-7 h-7 rounded-lg bg-primary/20 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-primary" />
            </div>
            <span className="text-xs font-semibold text-primary uppercase tracking-wider">Welcome to Kindora</span>
          </div>
          <h2 className="text-xl font-bold text-foreground leading-tight">
            Hey {firstName}, where do you want to start?
          </h2>
          <p className="text-sm text-muted-foreground mt-1.5">
            Kindora is your family's command center. Pick the area that matters most to you right now.
          </p>
        </div>

        {/* Options */}
        <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
          {PATHS.map((p) => {
            const Icon = p.icon;
            return (
              <button
                key={p.id}
                onClick={() => pick(p.href)}
                className={`group text-left p-4 rounded-xl border transition-all ${p.bg}`}
                data-testid={`welcome-pick-${p.id}`}
              >
                <div className="flex items-start gap-3">
                  <div className={`mt-0.5 flex-shrink-0 ${p.color}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground flex items-center gap-1">
                      {p.title}
                      <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 -translate-x-1 group-hover:translate-x-0 transition-all" />
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{p.description}</p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-5 pb-5 flex items-center justify-between">
          <p className="text-[11px] text-muted-foreground/60">You can always come back to any of these from the sidebar.</p>
          <Button size="sm" variant="ghost" onClick={dismiss} className="text-xs text-muted-foreground flex-shrink-0" data-testid="button-skip-welcome">
            Skip
          </Button>
        </div>
      </div>
    </div>
  );
}
