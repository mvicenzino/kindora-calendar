import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { Calendar, Zap, Users, Heart, LogOut, Sparkles } from "lucide-react";
import heroVideo from "@assets/generated_videos/family_chaos_to_harmony_montage.mp4";
import calendoraIcon from "@assets/IMG_3242_1763835484659.jpeg";
import { useAuth } from "@/hooks/useAuth";

export default function Landing() {
  const [, setLocation] = useLocation();
  const { isAuthenticated } = useAuth();

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

  const benefits = [
    {
      title: "Reduce Stress",
      description: "No more last-minute surprises or double-bookings. Know exactly what's happening and when."
    },
    {
      title: "Save Time",
      description: "Stop texting about schedules. One tap and everyone's informed."
    },
    {
      title: "Stay Connected",
      description: "Share memories and moments from events. Strengthen family bonds through shared experiences."
    },
    {
      title: "Take Control",
      description: "Master your family's schedule with intuitive day, week, and month views."
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#4A5A6A] via-[#5A6A7A] to-[#6A7A8A]">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full backdrop-blur-xl bg-white/5 border-b border-white/20 shadow-lg">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <img src={calendoraIcon} alt="Calendora" className="w-10 h-10" />
            <span className="text-xl font-bold text-white">Calendora</span>
          </div>
          <div className="flex items-center gap-2">
            {isAuthenticated ? (
              <>
                <Button
                  onClick={() => setLocation("/")}
                  className="bg-white text-slate-900 hover:bg-white/90"
                  data-testid="button-open-app"
                >
                  Open Calendar
                </Button>
                <Button
                  onClick={() => (window.location.href = "/api/logout")}
                  variant="outline"
                  className="border-white text-white hover:bg-white/10"
                  data-testid="button-logout"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Sign Out
                </Button>
              </>
            ) : (
              <>
                <Button
                  onClick={() => (window.location.href = "/api/login/demo")}
                  className="bg-gradient-to-r from-purple-500 to-teal-500 text-white hover:from-purple-600 hover:to-teal-600 border-0"
                  data-testid="button-demo"
                >
                  Try Demo
                </Button>
                <Button
                  onClick={() => (window.location.href = "/api/login")}
                  variant="outline"
                  className="border-white text-white hover:bg-white/10 bg-white/5 backdrop-blur-sm"
                  data-testid="button-login"
                >
                  Sign In
                </Button>
              </>
            )}
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
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-md border border-white/20 mb-6">
                <Sparkles className="w-4 h-4 text-teal-300" />
                <span className="text-sm font-medium text-white">Transform chaos into harmony</span>
              </div>
              
              <h1 className="text-5xl md:text-7xl font-bold text-white leading-tight mb-6 bg-gradient-to-r from-white via-purple-100 to-teal-100 bg-clip-text text-transparent">
                Your Family's Perfect Calendar
              </h1>
              
              <p className="text-xl md:text-2xl text-white/90 mb-8 leading-relaxed">
                Calendora brings order, connection, and peace to your busy family life. One app. One calendar. Everyone's on the same page.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 mb-8">
                <Button
                  onClick={() => {
                    if (isAuthenticated) {
                      setLocation("/");
                    } else {
                      window.location.href = "/api/login/demo";
                    }
                  }}
                  size="lg"
                  className="bg-gradient-to-r from-purple-500 to-teal-500 text-white hover:from-purple-600 hover:to-teal-600 text-lg font-semibold shadow-2xl shadow-purple-500/50 border-0"
                  data-testid="button-get-started"
                >
                  {isAuthenticated ? "Go to Calendar" : "Try Demo"}
                </Button>
                <Button
                  onClick={() => {
                    if (!isAuthenticated) {
                      window.location.href = "/api/login";
                    }
                  }}
                  variant="outline"
                  size="lg"
                  className="border-2 border-white/50 text-white hover:bg-white/10 backdrop-blur-md text-lg font-semibold bg-white/5"
                  data-testid="button-learn-more"
                >
                  {isAuthenticated ? "Learn More" : "Sign In"}
                </Button>
              </div>

              <div className="flex flex-wrap gap-6 text-sm text-white/80">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-teal-400" />
                  <span>No credit card required</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-purple-400" />
                  <span>Works on all devices</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-pink-400" />
                  <span>Instant sync</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="px-4 md:px-6 py-12 md:py-16 border-t border-white/10 relative">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-900/10 via-transparent to-teal-900/10" />
        <div className="max-w-6xl mx-auto relative">
          <div className="text-center mb-8 md:mb-12">
            <h2 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-purple-200 via-white to-teal-200 bg-clip-text text-transparent mb-3">
              Why Families Love Calendora
            </h2>
            <p className="text-lg text-white/70 max-w-2xl mx-auto">
              Simplify scheduling, strengthen connections, and make family life less stressful.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-5 md:gap-6">
            {benefits.map((benefit, index) => {
              const gradients = [
                'from-purple-500/20 to-purple-600/10',
                'from-teal-500/20 to-teal-600/10',
                'from-pink-500/20 to-pink-600/10',
                'from-blue-500/20 to-blue-600/10',
              ];
              const borderColors = [
                'border-purple-400/30',
                'border-teal-400/30',
                'border-pink-400/30',
                'border-blue-400/30',
              ];
              return (
                <div
                  key={index}
                  className={`backdrop-blur-md bg-gradient-to-br ${gradients[index]} border ${borderColors[index]} rounded-2xl p-5 md:p-6 hover-elevate transition-all group`}
                  data-testid={`card-benefit-${index}`}
                >
                  <h3 className="text-xl font-bold text-white mb-2 group-hover:text-transparent group-hover:bg-gradient-to-r group-hover:from-white group-hover:to-purple-100 group-hover:bg-clip-text transition-all">
                    {benefit.title}
                  </h3>
                  <p className="text-white/70 leading-relaxed">{benefit.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="px-4 md:px-6 py-12 md:py-16 relative">
        <div className="absolute inset-0 bg-gradient-to-br from-teal-900/10 via-transparent to-purple-900/10" />
        <div className="max-w-6xl mx-auto relative">
          <div className="text-center mb-8 md:mb-12">
            <h2 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-teal-200 via-white to-purple-200 bg-clip-text text-transparent mb-3">
              Powerful Features Made Simple
            </h2>
            <p className="text-lg text-white/70 max-w-2xl mx-auto">
              Everything you need to manage your family's schedule and memories in one beautiful app.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-5 md:gap-6">
            {features.map((feature, index) => {
              const IconComponent = feature.icon;
              const iconColors = [
                'bg-gradient-to-br from-purple-500 to-purple-600',
                'bg-gradient-to-br from-teal-500 to-teal-600',
                'bg-gradient-to-br from-pink-500 to-pink-600',
                'bg-gradient-to-br from-blue-500 to-blue-600',
              ];
              const glowColors = [
                'group-hover:shadow-purple-500/50',
                'group-hover:shadow-teal-500/50',
                'group-hover:shadow-pink-500/50',
                'group-hover:shadow-blue-500/50',
              ];
              return (
                <div
                  key={index}
                  className="backdrop-blur-md bg-white/5 border border-white/20 rounded-2xl p-5 md:p-6 hover-elevate transition-all group"
                  data-testid={`card-feature-${index}`}
                >
                  <div className="flex items-start gap-4">
                    <div className={`p-3 rounded-xl ${iconColors[index]} shadow-lg ${glowColors[index]} transition-shadow`}>
                      <IconComponent className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-white mb-2">{feature.title}</h3>
                      <p className="text-white/70 leading-relaxed">{feature.description}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="px-4 md:px-6 py-12 md:py-16 border-t border-white/10 relative">
        <div className="absolute inset-0 bg-gradient-to-r from-purple-600/20 via-pink-600/20 to-teal-600/20" />
        <div className="max-w-4xl mx-auto text-center relative">
          <h2 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-purple-200 via-pink-100 to-teal-200 bg-clip-text text-transparent mb-4">
            {isAuthenticated ? "Welcome Back!" : "Ready to Transform Your Family's Schedule?"}
          </h2>
          <p className="text-lg text-white/90 mb-6">
            {isAuthenticated 
              ? "Your calendar is ready for you. Manage events and family memories in one beautiful place."
              : "Join families who have taken control of their schedules and strengthened their connections."}
          </p>
          <Button
            onClick={() => {
              if (isAuthenticated) {
                setLocation("/");
              } else {
                window.location.href = "/api/login/demo";
              }
            }}
            size="lg"
            className="bg-gradient-to-r from-purple-500 via-pink-500 to-teal-500 text-white hover:from-purple-600 hover:via-pink-600 hover:to-teal-600 text-lg font-semibold shadow-2xl shadow-purple-500/50 border-0"
            data-testid="button-start-now"
          >
            {isAuthenticated ? "Open Calendar" : "Try Demo Now"}
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 px-4 md:px-6 py-8">
        <div className="max-w-6xl mx-auto text-center text-white/60 text-sm">
          <p>© 2025 Calendora. Bringing families closer, one calendar at a time.</p>
        </div>
      </footer>
    </div>
  );
}
