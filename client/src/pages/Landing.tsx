import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLocation, Link } from "wouter";
import { Calendar, Zap, Users, Heart, LogOut, Sparkles, Facebook, Instagram, Twitter, HeartHandshake, Clock, Shield, CalendarCheck, DollarSign, Pill, X, Mail, Lock, User as UserIcon, Check, ArrowRight } from "lucide-react";
import heroVideo from "@assets/generated_videos/family_chaos_to_harmony_montage.mp4";

const logo = "/kindora-logo.jpeg";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";

type AuthMode = "none" | "login" | "register";

export default function Landing() {
  const [, setLocation] = useLocation();
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [authMode, setAuthMode] = useState<AuthMode>("none");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const inviteCode = urlParams.get('invite');
    if (inviteCode) {
      localStorage.setItem('pendingInviteCode', inviteCode);
    }
    const authError = urlParams.get('auth_error');
    if (authError) {
      toast({
        title: "Sign-in issue",
        description: "There was a problem signing in. Please try again.",
        variant: "destructive",
      });
      window.history.replaceState({}, '', '/');
    }
  }, []);

  const loginMutation = useMutation({
    mutationFn: async (data: { email: string; password: string }) => {
      const res = await apiRequest("POST", "/api/auth/login", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      setAuthMode("none");
      setEmail("");
      setPassword("");
    },
    onError: (error: Error) => {
      const msg = error.message.includes("401") ? "Invalid email or password" : "Login failed. Please try again.";
      toast({ title: "Sign-in failed", description: msg, variant: "destructive" });
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (data: { email: string; password: string; firstName: string; lastName: string }) => {
      const res = await apiRequest("POST", "/api/auth/register", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      setAuthMode("none");
      setEmail("");
      setPassword("");
      setFirstName("");
      setLastName("");
    },
    onError: (error: Error) => {
      const msg = error.message.includes("409") ? "An account with this email already exists. Try signing in instead." : "Registration failed. Please try again.";
      toast({ title: "Sign-up failed", description: msg, variant: "destructive" });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (authMode === "login") {
      loginMutation.mutate({ email, password });
    } else if (authMode === "register") {
      registerMutation.mutate({ email, password, firstName, lastName });
    }
  };

  const handleSocialClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    toast({
      title: "Socials Coming Soon!",
      description: "We're excited to connect with you. Follow us soon for updates and family calendar tips!",
    });
  };

  const features = [
    {
      icon: Calendar,
      title: "Unified Family Calendar",
      description: "One calendar for soccer practice, doctor visits, and grandma's physical therapy. Color-coded by category so nothing gets lost."
    },
    {
      icon: Zap,
      title: "Smart Recurring Events",
      description: "Set it once and forget it. Weekly tutoring, biweekly check-ups, monthly bill reminders—all auto-generated with flexible end dates."
    },
    {
      icon: Users,
      title: "Multi-Family Support",
      description: "Manage separate calendars for your household, your parents' care team, and your in-laws. Switch between families in one tap."
    },
    {
      icon: Pill,
      title: "Medication Tracking",
      description: "Log medications, dosages, and administration times. Caregivers confirm when meds are given. Nothing falls through the cracks."
    },
    {
      icon: Clock,
      title: "Caregiver Time & Pay",
      description: "Professional caregivers clock in, track hours, and calculate pay—all in one dashboard families can review."
    },
    {
      icon: Shield,
      title: "Care Document Vault",
      description: "Store insurance cards, prescriptions, and legal documents securely. Share with trusted providers when needed."
    }
  ];

  const isPending = loginMutation.isPending || registerMutation.isPending;

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 w-full backdrop-blur-xl bg-background/80 border-b border-border/50">
        <div className="flex items-center justify-between px-3 sm:px-6 py-2 sm:py-4 gap-2">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <img src={logo} alt="Kindora" className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg flex-shrink-0" />
            <span className="text-lg sm:text-xl font-bold text-foreground truncate">
              <span className="text-primary">Kindora</span>
            </span>
          </div>
          <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
            {isAuthenticated ? (
              <>
                <Button
                  size="sm"
                  onClick={() => setLocation("/")}
                  className="text-xs sm:text-sm"
                  data-testid="button-open-app"
                >
                  Open Calendar
                </Button>
                <Button
                  size="sm"
                  onClick={() => (window.location.href = "/api/logout")}
                  variant="outline"
                  className="text-xs sm:text-sm"
                  data-testid="button-logout"
                >
                  <LogOut className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                  <span className="hidden sm:inline">Sign Out</span>
                  <span className="sm:hidden">Out</span>
                </Button>
              </>
            ) : (
              <>
                <Button
                  size="sm"
                  onClick={() => (window.location.href = `/intro?mode=demo&tz=${new Date().getTimezoneOffset()}`)}
                  variant="secondary"
                  className="text-xs sm:text-sm"
                  data-testid="button-demo"
                >
                  Try Demo
                </Button>
                <Button
                  size="sm"
                  onClick={() => setAuthMode("login")}
                  variant="outline"
                  className="text-xs sm:text-sm"
                  data-testid="button-login"
                >
                  Sign In
                </Button>
                <Button
                  size="sm"
                  onClick={() => setAuthMode("register")}
                  className="text-xs sm:text-sm"
                  data-testid="button-register"
                >
                  Sign Up
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Auth Modal Overlay */}
      {authMode !== "none" && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setAuthMode("none")} />
          <div className="relative w-full max-w-md bg-card border border-border rounded-2xl shadow-2xl p-6 sm:p-8" data-testid="auth-modal">
            <button
              onClick={() => setAuthMode("none")}
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors"
              data-testid="button-close-auth"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-6">
              <img src={logo} alt="Kindora" className="w-10 h-10 rounded-lg" />
              <div>
                <h2 className="text-xl font-bold text-foreground">
                  {authMode === "login" ? "Welcome Back" : "Create Account"}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {authMode === "login" ? "Sign in to your account" : "Join Kindora for free"}
                </p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {authMode === "register" && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="firstName" className="text-sm text-muted-foreground">First Name</Label>
                    <div className="relative">
                      <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="firstName"
                        type="text"
                        placeholder="First name"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        required
                        className="pl-9"
                        data-testid="input-first-name"
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="lastName" className="text-sm text-muted-foreground">Last Name</Label>
                    <Input
                      id="lastName"
                      type="text"
                      placeholder="Last name"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      className=""
                      data-testid="input-last-name"
                    />
                  </div>
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-sm text-muted-foreground">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="pl-9"
                    data-testid="input-email"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-sm text-muted-foreground">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    placeholder={authMode === "register" ? "At least 6 characters" : "Your password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={authMode === "register" ? 6 : undefined}
                    className="pl-9"
                    data-testid="input-password"
                  />
                </div>
              </div>

              <Button
                type="submit"
                disabled={isPending}
                className="w-full"
                data-testid="button-submit-auth"
              >
                {isPending ? "Please wait..." : authMode === "login" ? "Sign In" : "Create Account"}
              </Button>
            </form>

            <div className="relative my-5">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-card px-3 text-muted-foreground">or</span>
              </div>
            </div>

            <Button
              variant="outline"
              onClick={() => { window.location.href = "/api/login"; }}
              className="w-full"
              data-testid="button-google-signin"
            >
              <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
              Continue with Google
            </Button>

            <div className="mt-5 text-center">
              {authMode === "login" ? (
                <p className="text-sm text-muted-foreground">
                  Don't have an account?{" "}
                  <button
                    onClick={() => { setAuthMode("register"); setEmail(""); setPassword(""); }}
                    className="text-primary hover:text-primary/80 font-medium"
                    data-testid="button-switch-to-register"
                  >
                    Sign up for free
                  </button>
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Already have an account?{" "}
                  <button
                    onClick={() => { setAuthMode("login"); setEmail(""); setPassword(""); }}
                    className="text-primary hover:text-primary/80 font-medium"
                    data-testid="button-switch-to-login"
                  >
                    Sign in
                  </button>
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Hero Section */}
      <section className="relative overflow-hidden min-h-[90vh] flex items-center">
        <div className="absolute inset-0 w-full h-full">
          <video
            src={heroVideo}
            autoPlay
            loop
            muted
            playsInline
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-br from-black/80 via-black/70 to-black/80" />
          <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-transparent to-primary/10" />
        </div>

        <div className="relative z-10 w-full px-4 md:px-6 py-12 md:py-20">
          <div className="max-w-6xl mx-auto">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-md border border-white/20 mb-6">
                <Sparkles className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium text-white">Built for the Sandwich Generation</span>
              </div>
              
              <h1 className="text-5xl md:text-7xl font-bold text-white leading-tight mb-6 bg-gradient-to-r from-white via-purple-100 to-teal-100 bg-clip-text text-transparent">
                Kids. Parents. Caregivers. One Calendar.
              </h1>
              
              <p className="text-xl md:text-2xl text-white/90 mb-8 leading-relaxed">
                You're managing soccer practice and mom's doctor appointments. Kindora brings your whole care circle into one shared calendar—so nothing falls through the cracks.
              </p>

              {!isAuthenticated && (
                <div className="flex flex-wrap gap-3 mb-8">
                  <Button
                    onClick={() => { window.location.href = "/intro"; }}
                    size="lg"
                    data-testid="button-hero-signup"
                  >
                    Get Started Free
                  </Button>
                  <Button
                    size="lg"
                    onClick={() => (window.location.href = `/intro?mode=demo&tz=${new Date().getTimezoneOffset()}`)}
                    variant="outline"
                    className="backdrop-blur-sm bg-white/10"
                    data-testid="button-hero-demo"
                  >
                    Try Demo
                  </Button>
                </div>
              )}

              <div className="flex flex-wrap gap-6 text-sm text-white/80">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                  <span>No credit card required</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary/70" />
                  <span>Works on all devices</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-destructive/70" />
                  <span>Instant sync</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="px-4 md:px-6 py-12 md:py-16 relative">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/3" />
        <div className="max-w-6xl mx-auto relative">
          <div className="text-center mb-8 md:mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-3">
              Everything Your Family Needs
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              From school schedules to eldercare coordination—Kindora handles the logistics so you can focus on what matters.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6">
            {features.map((feature, index) => {
              const IconComponent = feature.icon;
              const iconColors = [
                'bg-gradient-to-br from-purple-500 to-purple-600',
                'bg-gradient-to-br from-teal-500 to-teal-600',
                'bg-gradient-to-br from-pink-500 to-pink-600',
                'bg-gradient-to-br from-blue-500 to-blue-600',
                'bg-gradient-to-br from-orange-500 to-orange-600',
                'bg-gradient-to-br from-emerald-500 to-emerald-600',
              ];
              const glowColors = [
                'group-hover:shadow-purple-500/50',
                'group-hover:shadow-teal-500/50',
                'group-hover:shadow-pink-500/50',
                'group-hover:shadow-blue-500/50',
                'group-hover:shadow-orange-500/50',
                'group-hover:shadow-emerald-500/50',
              ];
              return (
                <div
                  key={index}
                  className="bg-card border border-border rounded-xl p-5 md:p-6 hover-elevate transition-all group"
                  data-testid={`card-feature-${index}`}
                >
                  <div className="flex items-start gap-4">
                    <div className={`p-3 rounded-xl ${iconColors[index]} shadow-lg ${glowColors[index]} transition-shadow`}>
                      <IconComponent className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-foreground mb-2">{feature.title}</h3>
                      <p className="text-muted-foreground leading-relaxed">{feature.description}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Caregiving Section */}
      <section className="px-4 md:px-6 py-16 md:py-20 relative">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/3" />
        <div className="max-w-6xl mx-auto relative">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Eldercare, Simplified
            </h2>
            <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
              53 million Americans care for aging parents while raising kids. Kindora gives your entire care team—family, aides, nurses—shared visibility into schedules, medications, and appointments.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5 md:gap-6">
            <div className="bg-card border border-border rounded-xl p-6 hover-elevate transition-all group">
              <div className="p-3 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 shadow-lg group-hover:shadow-orange-500/50 transition-shadow w-fit mb-4">
                <HeartHandshake className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-lg font-bold text-foreground mb-2">Trusted Access</h3>
              <p className="text-muted-foreground leading-relaxed text-sm">
                Invite health aides, nurses, or social workers to view schedules without joining the family
              </p>
            </div>

            <div className="bg-card border border-border rounded-xl p-6 hover-elevate transition-all group">
              <div className="p-3 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 shadow-lg group-hover:shadow-blue-500/50 transition-shadow w-fit mb-4">
                <CalendarCheck className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-lg font-bold text-foreground mb-2">Medical Coordination</h3>
              <p className="text-muted-foreground leading-relaxed text-sm">
                Track doctor appointments, physical therapy sessions, and medication schedules in one place
              </p>
            </div>

            <div className="bg-card border border-border rounded-xl p-6 hover-elevate transition-all group">
              <div className="p-3 rounded-xl bg-gradient-to-br from-teal-500 to-teal-600 shadow-lg group-hover:shadow-teal-500/50 transition-shadow w-fit mb-4">
                <DollarSign className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-lg font-bold text-foreground mb-2">Caregiver Time Tracking</h3>
              <p className="text-muted-foreground leading-relaxed text-sm">
                Caregivers can log hours and track pay. Families see a clear record of care provided.
              </p>
            </div>

            <div className="bg-card border border-border rounded-xl p-6 hover-elevate transition-all group">
              <div className="p-3 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 shadow-lg group-hover:shadow-purple-500/50 transition-shadow w-fit mb-4">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-lg font-bold text-foreground mb-2">Peace of Mind</h3>
              <p className="text-muted-foreground leading-relaxed text-sm">
                Adult children can monitor care from anywhere, ensuring parents never miss critical appointments
              </p>
            </div>
          </div>

          <div className="mt-10 p-6 bg-card border border-border rounded-xl">
            <div className="grid md:grid-cols-2 gap-6">
              <div className="text-center md:text-left">
                <p className="text-foreground font-semibold mb-2">For Families</p>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  Invite caregivers to your calendar. Control what they see. Get peace of mind knowing care is coordinated.
                </p>
              </div>
              <div className="text-center md:text-left">
                <p className="text-foreground font-semibold mb-2">For Caregivers</p>
                <p className="text-muted-foreground leading-relaxed text-sm">
                  See your schedule, log medications, track your hours, and calculate your pay—all in one dashboard.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="px-4 md:px-6 py-16 md:py-20 relative" data-testid="section-pricing">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/3" />
        <div className="max-w-6xl mx-auto relative">
          <div className="text-center mb-10">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-3">
              Simple, Family-Friendly Pricing
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              One plan. Everything included. Try free for 14 days.
            </p>
          </div>

          <div className="max-w-lg mx-auto">
            <div className="bg-card border-2 border-primary/50 rounded-xl p-8 flex flex-col relative" data-testid="card-pricing-family">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-primary rounded-full text-xs font-semibold text-primary-foreground">
                14-Day Free Trial
              </div>
              <h3 className="text-2xl font-bold text-foreground mb-1" data-testid="text-pricing-family-name">Kindora Family Plan</h3>
              <p className="text-muted-foreground text-sm mb-5">Everything your family needs to stay coordinated</p>
              <div className="mb-6">
                <span className="text-5xl font-bold text-foreground" data-testid="text-pricing-family-price">$7</span>
                <span className="text-muted-foreground text-sm ml-1">/month</span>
                <span className="text-muted-foreground text-xs ml-2">after trial</span>
              </div>
              <div className="grid sm:grid-cols-2 gap-x-6 gap-y-3 mb-8">
                {[
                  "Unlimited family calendars",
                  "Unlimited family members",
                  "Recurring events & reminders",
                  "Weekly email summaries",
                  "Caregiver invitations & permissions",
                  "Caregiver time & pay tracking",
                  "Medication tracking & logging",
                  "Care Documentation Vault",
                  "Emergency Bridge Mode",
                  "AI-powered schedule import",
                  "Color-coded categories",
                  "Day / Week / Month / Timeline views",
                ].map((item) => (
                  <div key={item} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <Check className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
              {!isAuthenticated && (
                <Button
                  size="lg"
                  onClick={() => setAuthMode("register")}
                  className="w-full"
                  data-testid="button-pricing-family"
                >
                  Start Your 14-Day Free Trial
                </Button>
              )}
              <p className="text-xs text-muted-foreground text-center mt-3">No credit card required to start. Cancel anytime.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="px-4 md:px-6 py-16 md:py-20 relative">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Stop Juggling. Start Coordinating.
          </h2>
          <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
            Join families who've traded sticky notes and group texts for one shared calendar that actually works. Try free for 14 days, no credit card needed.
          </p>
          {!isAuthenticated && (
            <div className="flex flex-wrap justify-center gap-3">
              <Button
                size="lg"
                onClick={() => setAuthMode("register")}
                data-testid="button-final-cta-signup"
              >
                Create Your Family Calendar
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
              <Button
                size="lg"
                onClick={() => (window.location.href = `/intro?mode=demo&tz=${new Date().getTimezoneOffset()}`)}
                variant="outline"
                data-testid="button-final-cta-demo"
              >
                Try the Demo First
              </Button>
            </div>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border px-4 md:px-6 py-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col items-center gap-4">
            <div className="flex items-center gap-4">
              <a
                href="#"
                onClick={handleSocialClick}
                aria-label="Facebook"
                className="w-10 h-10 rounded-full bg-muted/50 border border-border flex items-center justify-center text-muted-foreground hover:text-foreground transition-all hover-elevate"
                data-testid="link-facebook"
              >
                <Facebook className="w-5 h-5" />
              </a>
              <a
                href="#"
                onClick={handleSocialClick}
                aria-label="Instagram"
                className="w-10 h-10 rounded-full bg-muted/50 border border-border flex items-center justify-center text-muted-foreground hover:text-foreground transition-all hover-elevate"
                data-testid="link-instagram"
              >
                <Instagram className="w-5 h-5" />
              </a>
              <a
                href="#"
                onClick={handleSocialClick}
                aria-label="X (Twitter)"
                className="w-10 h-10 rounded-full bg-muted/50 border border-border flex items-center justify-center text-muted-foreground hover:text-foreground transition-all hover-elevate"
                data-testid="link-twitter"
              >
                <Twitter className="w-5 h-5" />
              </a>
            </div>
            
            <div className="text-center space-y-2">
              <div className="flex items-center justify-center gap-4 flex-wrap">
                <Link href="/terms" className="text-muted-foreground hover:text-foreground text-sm transition-colors" data-testid="link-terms">Terms of Service</Link>
                <span className="text-muted-foreground/50">|</span>
                <Link href="/privacy" className="text-muted-foreground hover:text-foreground text-sm transition-colors" data-testid="link-privacy">Privacy Policy</Link>
              </div>
              <p className="text-muted-foreground text-sm">
                © 2026 Kindora Family, Inc. Keeping families connected and coordinated.
              </p>
              <p className="text-muted-foreground text-sm">
                Visit <a href="https://kindora.ai" target="_blank" rel="noopener noreferrer" className="text-foreground hover:text-foreground/80 underline decoration-border hover:decoration-foreground transition-colors" data-testid="link-kindora-ai">Kindora.ai</a> for instant coaching guidance for your kiddos.
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
