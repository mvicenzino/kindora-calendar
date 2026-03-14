import { useState } from "react";
import { useLocation, useSearch } from "wouter";
import { Button } from "@/components/ui/button";
import { ChevronRight, ArrowRight, Pill, Clock, Mail, Shield, Star, Heart, Calendar, MessageCircle, FolderLock, Image, Loader2 } from "lucide-react";
import calendoraIcon from "@assets/IMG_4040_1773507883126.jpeg";
import { useAuth } from "@/hooks/useAuth";

const BRAND_ORANGE = "#f97316";
const BRAND_AMBER = "#f59e0b";

const SLIDE_DATA = [
  {
    gradient: ["#120a03", "#1c0f04", "#0e0802"],
    accentGlow: "rgba(249, 115, 22, 0.3)",
    badge: "The sandwich generation",
    headline: "Juggling kids\nand aging parents?",
    sub: "You're managing two completely different worlds at once. Kindora is the first calendar built for exactly this.",
    illustration: "family",
  },
  {
    gradient: ["#0e0a04", "#1a1004", "#100c03"],
    accentGlow: "rgba(245, 158, 11, 0.25)",
    badge: "Role-based access",
    headline: "Everyone in the loop.\nNo one overstepping.",
    sub: "Give caregivers exactly the access they need — medication schedules, appointments, nothing more. Your family, your rules.",
    illustration: "access",
  },
  {
    gradient: ["#130903", "#1e0e04", "#0f0802"],
    accentGlow: "rgba(249, 115, 22, 0.28)",
    badge: "Beyond the calendar",
    headline: "Google Calendar\ncan't do this.",
    sub: "Medications. Caregiver hours. Family messaging. Document vault. Shared memories. Weekly summaries. Everything Google and Apple left out.",
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
        @keyframes pulseGlow { 0%,100%{opacity:0.4} 50%{opacity:0.9} }
      `}</style>
      <div className="absolute inset-0 rounded-2xl overflow-hidden">
        <div className="absolute inset-0 opacity-10"
          style={{ backgroundImage: "linear-gradient(rgba(249,115,22,0.15) 1px, transparent 1px), linear-gradient(90deg, rgba(249,115,22,0.15) 1px, transparent 1px)", backgroundSize: "32px 32px" }} />
      </div>
      {[
        { top: "4px", left: "0", color: BRAND_ORANGE, label: "Sophie · Soccer", time: "3:30 PM", delay: "0ms", width: "148px" },
        { top: "56px", left: "24px", color: BRAND_AMBER, label: "Grandpa · Dr. Visit", time: "10:00 AM", delay: "80ms", width: "164px" },
        { top: "108px", left: "8px", color: "#10B981", label: "Lucas · Piano", time: "4:00 PM", delay: "160ms", width: "140px" },
        { top: "160px", left: "32px", color: "#EC4899", label: "Mom · PT Session", time: "2:00 PM", delay: "240ms", width: "152px" },
      ].map((ev, i) => (
        <div key={i} className="absolute rounded-xl flex items-center gap-2 px-3 py-2"
          style={{
            top: ev.top, left: ev.left, width: ev.width,
            background: `linear-gradient(135deg, ${ev.color}22 0%, ${ev.color}0d 100%)`,
            border: `1px solid ${ev.color}44`,
            backdropFilter: "blur(12px)",
            animation: `slideInCard 0.5s ${ev.delay} both, floatUp ${3.5 + i * 0.4}s ${ev.delay} ease-in-out infinite`,
            boxShadow: `0 4px 20px ${ev.color}18`,
          }}>
          <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: ev.color, boxShadow: `0 0 6px ${ev.color}` }} />
          <div className="flex-1 min-w-0">
            <p className="text-white text-[10px] font-semibold leading-tight truncate">{ev.label}</p>
            <p className="text-white/50 text-[9px]">{ev.time}</p>
          </div>
        </div>
      ))}
      <div className="absolute right-0 top-1/2 -translate-y-1/2"
        style={{ animation: "floatUpDelay 4s ease-in-out infinite", animationDelay: "500ms" }}>
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center overflow-hidden"
          style={{ background: "rgba(249,115,22,0.15)", border: "1px solid rgba(249,115,22,0.3)", backdropFilter: "blur(16px)", boxShadow: "0 8px 32px rgba(249,115,22,0.25)" }}>
          <img src={calendoraIcon} alt="Kindora" className="w-10 h-10 rounded-lg" />
        </div>
      </div>
    </div>
  );
}

function AccessIllustration() {
  const roles = [
    { label: "You", role: "Owner", color: BRAND_ORANGE, icon: Star, angle: -90, r: 88 },
    { label: "Maria", role: "Caregiver", color: BRAND_AMBER, icon: Heart, angle: 30, r: 88 },
    { label: "Dr. Chen", role: "Provider", color: "#10B981", icon: Shield, angle: 150, r: 88 },
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
          <circle cx="104" cy="104" r="28" fill="rgba(249,115,22,0.1)" stroke="rgba(249,115,22,0.35)" strokeWidth="1.5" />
        </svg>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-14 h-14 rounded-2xl flex items-center justify-center z-10 overflow-hidden"
          style={{ background: "rgba(249,115,22,0.18)", border: "1px solid rgba(249,115,22,0.4)", backdropFilter: "blur(16px)", boxShadow: "0 0 32px rgba(249,115,22,0.3)" }}>
          <img src={calendoraIcon} alt="Kindora" className="w-10 h-10 rounded-lg" />
        </div>
        {roles.map((r, i) => {
          const Icon = r.icon;
          const x = 50 + r.r * Math.cos((r.angle * Math.PI) / 180) / 208 * 100;
          const y = 50 + r.r * Math.sin((r.angle * Math.PI) / 180) / 208 * 100;
          return (
            <div key={i} className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-1"
              style={{ left: `${x}%`, top: `${y}%`, animation: `slideInCard 0.5s ${i * 100}ms both, floatUp ${3 + i * 0.5}s ease-in-out infinite` }}>
              <div className="w-10 h-10 rounded-full flex items-center justify-center"
                style={{ background: `${r.color}25`, border: `1.5px solid ${r.color}50`, backdropFilter: "blur(8px)", boxShadow: `0 4px 16px ${r.color}20` }}>
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
    { icon: Pill,          color: BRAND_ORANGE, label: "Medications",       value: "Metformin · 8 AM"    },
    { icon: Clock,         color: BRAND_AMBER,  label: "Caregiver hours",   value: "18.5 hrs this week"  },
    { icon: Mail,          color: "#10B981",    label: "Weekly digest",     value: "Every Sunday"        },
    { icon: MessageCircle, color: "#3B82F6",    label: "Family messaging",  value: "All in one place"    },
    { icon: FolderLock,    color: "#A855F7",    label: "Document vault",    value: "Insurance, legal..."  },
    { icon: Image,         color: "#EC4899",    label: "Shared memories",   value: "Photos & moments"    },
  ];
  return (
    <div className="w-full max-w-xs mx-auto select-none">
      <div className="grid grid-cols-2 gap-2">
        {features.map((f, i) => {
          const Icon = f.icon;
          return (
            <div key={i} className="rounded-xl p-2.5 flex items-center gap-2"
              style={{
                background: `linear-gradient(135deg, ${f.color}18 0%, ${f.color}08 100%)`,
                border: `1px solid ${f.color}35`,
                backdropFilter: "blur(16px)",
                animation: `slideInCard 0.4s ${i * 60}ms both`,
                boxShadow: `0 4px 16px ${f.color}12`,
              }}>
              <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ background: `${f.color}20`, border: `1px solid ${f.color}38` }}>
                <Icon className="w-3.5 h-3.5" style={{ color: f.color }} />
              </div>
              <div className="min-w-0">
                <p className="text-white/55 text-[8px] uppercase tracking-wide leading-none mb-0.5 truncate">{f.label}</p>
                <p className="text-white text-[10px] font-semibold leading-snug truncate">{f.value}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function Intro() {
  const [slide, setSlide] = useState(0);
  const [visible, setVisible] = useState(true);
  const [isNavigating, setIsNavigating] = useState(false);
  const total = SLIDE_DATA.length;
  const { isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const search = useSearch();
  const params = new URLSearchParams(search);
  const isDemoMode = params.get("mode") === "demo";
  const tzOffset = params.get("tz") || String(new Date().getTimezoneOffset());

  const transition = (target: number | "signup") => {
    if (target === "signup") {
      localStorage.setItem("kindora_intro_seen", "true");
      if (isDemoMode) {
        setIsNavigating(true);
        setTimeout(() => {
          window.location.href = `/api/login/demo?tz=${tzOffset}`;
        }, 100);
        return;
      }
      setVisible(false);
      setTimeout(() => {
        if (isAuthenticated) {
          setLocation("/onboarding");
        } else {
          window.location.href = "/api/login";
        }
      }, 320);
    } else {
      setVisible(false);
      setTimeout(() => {
        setSlide(target);
        setVisible(true);
      }, 320);
    }
  };

  const goNext = () => {
    if (!visible) return;
    if (slide === total - 1) transition("signup");
    else transition(slide + 1);
  };

  const current = SLIDE_DATA[slide];
  const illustrations = [<FamilyIllustration />, <AccessIllustration />, <FeaturesIllustration />];

  if (isNavigating) {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center"
        style={{
          background: `linear-gradient(160deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)`,
        }}
      >
        <div className="text-center">
          <div className="relative mb-6">
            <img src={calendoraIcon} alt="Kindora" className="w-16 h-16 rounded-2xl mx-auto mb-4" />
          </div>
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" style={{ color: BRAND_ORANGE }} />
          <p className="text-white text-lg font-medium" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            Setting up your demo...
          </p>
          <p className="text-white/50 text-sm mt-2">This only takes a moment</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen flex flex-col relative"
      style={{
        background: `radial-gradient(ellipse at 25% 15%, ${current.accentGlow} 0%, transparent 55%), linear-gradient(160deg, ${current.gradient[0]} 0%, ${current.gradient[1]} 50%, ${current.gradient[2]} 100%)`,
        transition: "background 0.8s ease",
      }}
    >
      <div className="flex items-center justify-between px-6 pt-6">
        <div className="flex items-center gap-2.5">
          <img src={calendoraIcon} alt="Kindora" className="w-8 h-8 rounded-lg flex-shrink-0" />
          <span className="font-bold text-base" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            <span style={{ color: BRAND_ORANGE }}>Kindora</span>
            <span className="text-white/70"> Calendar</span>
          </span>
        </div>
        <button
          onClick={() => transition("signup")}
          className="text-white/40 text-sm hover:text-white/70 transition-colors px-3 py-1.5 rounded-lg"
          data-testid="button-skip-intro"
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
              style={{ background: "rgba(249,115,22,0.15)", color: "rgba(249,115,22,0.9)", border: "1px solid rgba(249,115,22,0.25)" }}
            >
              {current.badge}
            </div>

            <h1
              className="text-3xl md:text-4xl font-bold text-white leading-tight"
              style={{ fontFamily: "'Space Grotesk', sans-serif", textShadow: "0 2px 20px rgba(0,0,0,0.5)" }}
            >
              {current.headline.split("\n").map((line, i) => (
                <span key={i}>{line}{i < current.headline.split("\n").length - 1 && <br />}</span>
              ))}
            </h1>

            <p className="text-white/55 text-base leading-relaxed max-w-sm mx-auto">
              {current.sub}
            </p>
          </div>

          <div className="flex flex-col items-center gap-4 w-full">
            <Button
              onClick={goNext}
              size="lg"
              className="w-full max-w-xs font-semibold text-white border-0"
              style={{
                background: `linear-gradient(135deg, ${BRAND_ORANGE}, ${BRAND_AMBER})`,
                boxShadow: `0 8px 28px rgba(249,115,22,0.4), inset 0 1px 0 rgba(255,255,255,0.15)`,
              }}
              data-testid={slide === total - 1 ? "button-intro-get-started" : "button-intro-next"}
            >
              {slide === total - 1 ? (
                <>Get started free <ArrowRight className="w-4 h-4 ml-1" /></>
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
                    background: i === slide ? BRAND_ORANGE : "rgba(255,255,255,0.2)",
                  }}
                  data-testid={`dot-intro-${i}`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="pb-8 px-6 text-center">
        <p className="text-white/20 text-xs">
          Setup takes about 2 minutes · Free during beta
        </p>
      </div>
    </div>
  );
}
