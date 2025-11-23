import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { Calendar, Zap, Users, ArrowRight } from "lucide-react";
import calendoraIcon from "@assets/IMG_3242_1763835484659.jpeg";
import { useAuth } from "@/hooks/useAuth";

export default function Landing() {
  const [, setLocation] = useLocation();
  const { isAuthenticated } = useAuth();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900">
      {/* Simple Header */}
      <header className="sticky top-0 z-50 w-full backdrop-blur-xl bg-black/20 border-b border-white/10">
        <div className="flex items-center justify-between px-6 py-4 max-w-7xl mx-auto">
          <div className="flex items-center gap-3">
            <img src={calendoraIcon} alt="Calendora" className="w-10 h-10 rounded-xl shadow-lg" data-testid="icon-logo" />
            <span className="text-xl font-bold text-white">Calendora</span>
          </div>
          {isAuthenticated && (
            <Button
              onClick={() => setLocation("/")}
              variant="outline"
              className="border-white/20 text-white hover:bg-white/10"
              data-testid="button-open-app"
            >
              Open Calendar
            </Button>
          )}
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-600/10 via-transparent to-teal-500/10" />
        
        <div className="relative px-4 md:px-6 py-20 md:py-32">
          <div className="max-w-4xl mx-auto text-center">
            {/* Logo showcase */}
            <div className="flex justify-center mb-8">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-purple-500/30 to-teal-500/30 blur-3xl rounded-full" />
                <img 
                  src={calendoraIcon} 
                  alt="Calendora" 
                  className="relative w-24 h-24 md:w-32 md:h-32 rounded-3xl shadow-2xl ring-1 ring-white/20" 
                  data-testid="img-hero-logo"
                />
              </div>
            </div>

            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-white leading-tight mb-6">
              Your Family's
              <span className="block mt-2 bg-gradient-to-r from-purple-400 via-pink-400 to-teal-400 bg-clip-text text-transparent">
                Perfect Calendar
              </span>
            </h1>
            
            <p className="text-lg md:text-xl text-white/70 mb-12 max-w-2xl mx-auto leading-relaxed">
              Bring order to your busy family life. One beautiful app that keeps everyone on the same page.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
              <Button
                onClick={() => (window.location.href = "/api/login/demo")}
                size="lg"
                className="bg-gradient-to-r from-purple-500 to-teal-500 text-white hover:from-purple-600 hover:to-teal-600 border-0 shadow-xl shadow-purple-500/25 text-lg px-8 group"
                data-testid="button-demo-hero"
              >
                Try Demo Now
                <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
              <Button
                onClick={() => (window.location.href = "/api/login")}
                size="lg"
                variant="outline"
                className="border-white/20 text-white hover:bg-white/10 backdrop-blur-sm text-lg px-8"
                data-testid="button-login"
              >
                Sign In
              </Button>
            </div>

            {/* Trust indicators */}
            <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-white/60">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-teal-400" />
                <span>No credit card</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-purple-400" />
                <span>All devices</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-pink-400" />
                <span>Real-time sync</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Simple Features */}
      <section className="px-4 md:px-6 py-16 md:py-24">
        <div className="max-w-5xl mx-auto">
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: Calendar,
                title: "One Calendar",
                description: "Everyone's schedule in one beautiful view"
              },
              {
                icon: Zap,
                title: "Instant Updates",
                description: "Changes sync across all devices immediately"
              },
              {
                icon: Users,
                title: "Color-Coded",
                description: "See who has what scheduled at a glance"
              }
            ].map((feature, index) => {
              const IconComponent = feature.icon;
              return (
                <div
                  key={index}
                  className="text-center group"
                  data-testid={`card-feature-${index}`}
                >
                  <div className="inline-flex p-4 rounded-2xl bg-gradient-to-br from-white/5 to-white/10 backdrop-blur-sm border border-white/10 mb-4 group-hover:scale-110 transition-transform">
                    <IconComponent className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-2">{feature.title}</h3>
                  <p className="text-white/60 text-sm">{feature.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="px-4 md:px-6 py-16 md:py-20">
        <div className="max-w-3xl mx-auto text-center">
          <div className="backdrop-blur-xl bg-gradient-to-br from-purple-900/40 to-teal-900/40 border border-white/10 rounded-3xl p-8 md:p-12">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Ready to get organized?
            </h2>
            <p className="text-white/70 mb-8 text-lg">
              Try Calendora free — no setup required
            </p>
            <Button
              onClick={() => (window.location.href = "/api/login/demo")}
              size="lg"
              className="bg-white text-slate-900 hover:bg-white/90 text-lg px-8 shadow-xl"
              data-testid="button-demo-bottom"
            >
              Start Demo
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 px-4 md:px-6 py-8">
        <div className="max-w-6xl mx-auto text-center text-white/50 text-sm">
          <p>© 2025 Calendora. Bringing families closer, one calendar at a time.</p>
        </div>
      </footer>
    </div>
  );
}
