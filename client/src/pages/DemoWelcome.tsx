import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { Calendar, Zap, Users, Heart, LogOut, Sparkles, ArrowRight } from "lucide-react";
import heroVideo from "@assets/generated_videos/family_chaos_to_harmony_montage.mp4";
import calendoraIcon from "@assets/generated_images/transparent_background_calendar_icon.png";

export default function DemoWelcome() {
  const [, setLocation] = useLocation();

  const features = [
    {
      icon: Calendar,
      title: "Unified Calendar",
      description: "All family events in one beautiful view. No more conflicting schedules or missed appointments."
    },
    {
      icon: Zap,
      title: "Real-Time Sync",
      description: "Updates instantly across all devices. Everyone sees the same schedule, always."
    },
    {
      icon: Users,
      title: "Family Profiles",
      description: "Custom colors for each family member. See at a glance who has what scheduled."
    },
    {
      icon: Heart,
      title: "Memory Sharing",
      description: "Capture and preserve special moments with photos attached to events. Build your family story."
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#4A5A6A] via-[#5A6A7A] to-[#6A7A8A]">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full backdrop-blur-xl bg-white/5 border-b border-white/20 shadow-lg">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <img src={calendoraIcon} alt="Kindora Calendar" className="w-10 h-10 mix-blend-normal" style={{backgroundColor: 'transparent'}} />
            <span className="text-xl app-title">
              <span className="font-extrabold text-orange-300">Kindora</span> <span className="font-medium text-white">Calendar</span>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={() => setLocation("/")}
              className="bg-gradient-to-r from-purple-500 to-teal-500 text-white hover:from-purple-600 hover:to-teal-600 border-0"
              data-testid="button-try-demo"
            >
              Try Demo
            </Button>
            <Button
              onClick={() => (window.location.href = "/api/logout")}
              variant="outline"
              className="border-white text-white hover:bg-white/10"
              data-testid="button-logout"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Exit Demo
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden min-h-[90vh] flex items-center">
        {/* Full-width Video Background */}
        <div className="absolute inset-0 w-full h-full">
          <video
            src={heroVideo}
            autoPlay
            loop
            muted
            playsInline
            className="w-full h-full object-cover"
          />
          {/* Dark gradient overlay for readability */}
          <div className="absolute inset-0 bg-gradient-to-br from-slate-900/80 via-slate-900/70 to-slate-900/80" />
          {/* Colorful gradient accents */}
          <div className="absolute inset-0 bg-gradient-to-br from-purple-600/20 via-transparent to-teal-500/20" />
        </div>

        {/* Content */}
        <div className="relative z-10 w-full px-4 md:px-6 py-12 md:py-20">
          <div className="max-w-6xl mx-auto">
            <div className="max-w-3xl">
              {/* Demo Badge */}
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-purple-500/20 to-teal-500/20 backdrop-blur-md border border-purple-400/30 mb-6">
                <Sparkles className="w-4 h-4 text-purple-300" />
                <span className="text-sm font-medium text-white">You're viewing a demo preview</span>
              </div>
              
              <h1 className="text-5xl md:text-7xl font-bold text-white leading-tight mb-6 bg-gradient-to-r from-white via-purple-100 to-teal-100 bg-clip-text text-transparent">
                Welcome to Calendora Demo
              </h1>
              
              <p className="text-xl md:text-2xl text-white/90 mb-8 leading-relaxed">
                You're experiencing a preview of Calendora's family calendar. Explore the features, add events, and see how it brings harmony to busy family life.
              </p>

              <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-6 mb-8">
                <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                  <ArrowRight className="w-5 h-5 text-teal-400" />
                  Ready for the Real Thing?
                </h3>
                <p className="text-white/80 mb-4">
                  This is a temporary demo account. Your data won't be saved when you leave. To use Calendora with your real family and keep your memories forever, sign in with your account.
                </p>
                <div className="flex flex-wrap gap-3">
                  <Button
                    onClick={() => (window.location.href = "/api/login")}
                    className="bg-white text-slate-900 hover:bg-white/90"
                    data-testid="button-sign-in-now"
                  >
                    Sign In to Start
                  </Button>
                  <Button
                    onClick={() => setLocation("/")}
                    variant="outline"
                    className="border-white text-white hover:bg-white/10 bg-white/5 backdrop-blur-sm"
                    data-testid="button-continue-demo"
                  >
                    Continue with Demo
                  </Button>
                </div>
              </div>

              <div className="flex flex-wrap gap-6 text-sm text-white/80">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-teal-400" />
                  <span>No credit card required</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-purple-400" />
                  <span>Free to start</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-pink-400" />
                  <span>Your data stays private</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="relative py-20 px-4 md:px-6 bg-gradient-to-b from-transparent to-black/20">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
              Everything You Need
            </h2>
            <p className="text-xl text-white/70">
              Powerful features designed for busy families
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {features.map((feature, index) => (
              <div 
                key={index}
                className="group p-8 rounded-3xl backdrop-blur-xl bg-white/5 border border-white/10 hover:border-white/30 transition-all hover-elevate"
              >
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-500/20 to-teal-500/20 flex items-center justify-center mb-6 border border-white/20">
                  <feature.icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-2xl font-semibold text-white mb-3">{feature.title}</h3>
                <p className="text-white/70 leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
