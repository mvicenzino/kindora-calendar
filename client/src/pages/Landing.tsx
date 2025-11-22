import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { Calendar, Zap, Users, Heart } from "lucide-react";
import heroVideo from "@assets/generated_videos/chaotic_to_calm_family_transformation.mp4";
import calendoraIcon from "@assets/IMG_3242_1763835484659.jpeg";

export default function Landing() {
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
          <Button
            onClick={() => setLocation("/app")}
            className="bg-white text-slate-900 hover:bg-white/90"
            data-testid="button-launch-app"
          >
            Launch App
          </Button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden px-4 md:px-6 py-12 md:py-20">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-2 gap-8 md:gap-12 items-center">
            {/* Video */}
            <div className="rounded-3xl overflow-hidden shadow-2xl">
              <video
                src={heroVideo}
                autoPlay
                loop
                muted
                playsInline
                className="w-full h-full object-cover"
              />
            </div>

            {/* Content */}
            <div className="space-y-6">
              <div className="space-y-3">
                <h1 className="text-4xl md:text-5xl font-bold text-white leading-tight">
                  Turn Family Chaos Into Perfect Harmony
                </h1>
                <p className="text-xl text-white/80">
                  Calendora brings order, connection, and peace to your busy family life. One app. One calendar. Everyone's on the same page.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-4">
                <Button
                  onClick={() => setLocation("/app")}
                  size="lg"
                  className="bg-white text-slate-900 hover:bg-white/90 text-base font-semibold"
                  data-testid="button-get-started"
                >
                  Get Started Free
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  className="border-white text-white hover:bg-white/10 text-base font-semibold"
                  data-testid="button-learn-more"
                >
                  Learn More
                </Button>
              </div>

              <p className="text-sm text-white/60 pt-4">
                ✓ No credit card required • ✓ Works on all devices • ✓ Instant sync
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="px-4 md:px-6 py-16 md:py-24 border-t border-white/10">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12 md:mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Why Families Love Calendora
            </h2>
            <p className="text-lg text-white/70 max-w-2xl mx-auto">
              Simplify scheduling, strengthen connections, and make family life less stressful.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6 md:gap-8">
            {benefits.map((benefit, index) => (
              <div
                key={index}
                className="backdrop-blur-md bg-white/10 border border-white/20 rounded-2xl p-6 md:p-8 hover-elevate transition-all"
                data-testid={`card-benefit-${index}`}
              >
                <h3 className="text-xl font-bold text-white mb-2">{benefit.title}</h3>
                <p className="text-white/70 leading-relaxed">{benefit.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="px-4 md:px-6 py-16 md:py-24">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12 md:mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Powerful Features Made Simple
            </h2>
            <p className="text-lg text-white/70 max-w-2xl mx-auto">
              Everything you need to manage your family's schedule and memories in one beautiful app.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6 md:gap-8">
            {features.map((feature, index) => {
              const IconComponent = feature.icon;
              return (
                <div
                  key={index}
                  className="backdrop-blur-md bg-white/10 border border-white/20 rounded-2xl p-6 md:p-8 hover-elevate transition-all"
                  data-testid={`card-feature-${index}`}
                >
                  <div className="flex items-start gap-4">
                    <div className="p-3 rounded-lg bg-white/10">
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
      <section className="px-4 md:px-6 py-16 md:py-24 border-t border-white/10">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
            Ready to Transform Your Family's Schedule?
          </h2>
          <p className="text-lg text-white/70 mb-8">
            Join families who have taken control of their schedules and strengthened their connections.
          </p>
          <Button
            onClick={() => setLocation("/app")}
            size="lg"
            className="bg-white text-slate-900 hover:bg-white/90 text-base font-semibold"
            data-testid="button-start-now"
          >
            Start Now — It's Free
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
