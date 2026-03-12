import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Calendar, ChevronRight, ArrowRight, Pill, Clock, Mail, Shield, Star, Heart } from "lucide-react";

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
        <div key={i} className="absolute rounded-xl flex items-center gap-2 px-3 py-2"
          style={{
            top: ev.top, left: ev.left, width: ev.width,
            background: `linear-gradient(135deg, ${ev.color}22 0%, ${ev.color}11 100%)`,
            border: `1px solid ${ev.color}44`,
            backdropFilter: "blur(12px)",
            animation: `slideInCard 0.5s ${ev.delay} both, floatUp ${3.5 + i * 0.4}s ${ev.delay} ease-in-out infinite`,
            boxShadow: `0 4px 20px ${ev.color}20`,
          }}>
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

export default function Intro() {
  const [slide, setSlide] = useState(0);
  const [visible, setVisible] = useState(true);
  const total = SLIDE_DATA.length;

  const transition = (target: number | "signup") => {
    setVisible(false);
    setTimeout(() => {
      if (target === "signup") {
        window.location.href = "/api/login";
      } else {
        setSlide(target);
        setVisible(true);
      }
    }, 320);
  };

  const goNext = () => {
    if (!visible) return;
    if (slide === total - 1) transition("signup");
    else transition(slide + 1);
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
                    background: i === slide ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.25)",
                  }}
                  data-testid={`dot-intro-${i}`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="pb-8 px-6 text-center">
        <p className="text-white/25 text-xs">
          Setup takes about 2 minutes · Free during beta
        </p>
      </div>
    </div>
  );
}
