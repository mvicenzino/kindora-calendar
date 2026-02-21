import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLocation, Link } from "wouter";
import { Calendar, Zap, Users, Heart, LogOut, Sparkles, Facebook, Instagram, Twitter, HeartHandshake, Clock, Shield, CalendarCheck, DollarSign, Pill, X, Mail, Lock, User as UserIcon, Check, ArrowRight } from "lucide-react";
import heroVideo from "@assets/generated_videos/family_chaos_to_harmony_montage.mp4";
import calendoraIcon from "@assets/generated_images/simple_clean_calendar_logo.png";
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
    <div className="min-h-screen bg-gradient-to-br from-[#3A4550] via-[#4A5560] to-[#5A6570]">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full backdrop-blur-xl bg-white/5 border-b border-white/20 shadow-lg">
        <div className="flex items-center justify-between px-3 sm:px-6 py-2 sm:py-4 gap-2">
          <div className="flex items-center gap-2 sm:gap-3">
            <img src={calendoraIcon} alt="Kindora Calendar" className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg flex-shrink-0" />
            <span className="text-lg sm:text-xl font-bold text-white whitespace-nowrap">
              <span className="text-orange-300">Kindora</span> Calendar
            </span>
          </div>
          <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
            {isAuthenticated ? (
              <>
                <Button
                  size="sm"
                  onClick={() => setLocation("/")}
                  className="bg-white text-slate-900 text-xs sm:text-sm px-2 sm:px-3"
                  data-testid="button-open-app"
                >
                  Open Calendar
                </Button>
                <Button
                  size="sm"
                  onClick={() => (window.location.href = "/api/logout")}
                  variant="outline"
                  className="border-white text-white bg-white/5 backdrop-blur-sm text-xs sm:text-sm px-2 sm:px-3"
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
                  onClick={() => (window.location.href = "/api/login/demo")}
                  className="bg-gradient-to-r from-purple-500 to-teal-500 text-white border-0 text-xs sm:text-sm px-2 sm:px-3"
                  data-testid="button-demo"
                >
                  Try Demo
                </Button>
                <Button
                  size="sm"
                  onClick={() => setAuthMode("login")}
                  variant="outline"
                  className="border-white text-white bg-white/5 backdrop-blur-sm text-xs sm:text-sm px-2 sm:px-3"
                  data-testid="button-login"
                >
                  Sign In
                </Button>
                <Button
                  size="sm"
                  onClick={() => setAuthMode("register")}
                  className="bg-white text-slate-900 text-xs sm:text-sm px-2 sm:px-3"
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
          <div className="relative w-full max-w-md bg-slate-800 border border-white/20 rounded-2xl shadow-2xl p-6 sm:p-8" data-testid="auth-modal">
            <button
              onClick={() => setAuthMode("none")}
              className="absolute top-4 right-4 text-white/60 hover:text-white transition-colors"
              data-testid="button-close-auth"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-6">
              <img src={calendoraIcon} alt="Kindora" className="w-10 h-10 rounded-lg" />
              <div>
                <h2 className="text-xl font-bold text-white">
                  {authMode === "login" ? "Welcome Back" : "Create Account"}
                </h2>
                <p className="text-sm text-white/60">
                  {authMode === "login" ? "Sign in to your account" : "Join Kindora for free"}
                </p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {authMode === "register" && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="firstName" className="text-sm text-white/80">First Name</Label>
                    <div className="relative">
                      <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                      <Input
                        id="firstName"
                        type="text"
                        placeholder="First name"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        required
                        className="pl-9 bg-white/10 border-white/20 text-white placeholder:text-white/40 focus:border-teal-400"
                        data-testid="input-first-name"
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="lastName" className="text-sm text-white/80">Last Name</Label>
                    <Input
                      id="lastName"
                      type="text"
                      placeholder="Last name"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      className="bg-white/10 border-white/20 text-white placeholder:text-white/40 focus:border-teal-400"
                      data-testid="input-last-name"
                    />
                  </div>
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-sm text-white/80">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="pl-9 bg-white/10 border-white/20 text-white placeholder:text-white/40 focus:border-teal-400"
                    data-testid="input-email"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-sm text-white/80">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                  <Input
                    id="password"
                    type="password"
                    placeholder={authMode === "register" ? "At least 6 characters" : "Your password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={authMode === "register" ? 6 : undefined}
                    className="pl-9 bg-white/10 border-white/20 text-white placeholder:text-white/40 focus:border-teal-400"
                    data-testid="input-password"
                  />
                </div>
              </div>

              <Button
                type="submit"
                disabled={isPending}
                className="w-full bg-gradient-to-r from-purple-500 to-teal-500 text-white border-0"
                data-testid="button-submit-auth"
              >
                {isPending ? "Please wait..." : authMode === "login" ? "Sign In" : "Create Account"}
              </Button>
            </form>

            <div className="relative my-5">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-white/20" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-slate-800 px-3 text-white/50">or</span>
              </div>
            </div>

            <Button
              variant="outline"
              onClick={() => { window.location.href = "/api/login"; }}
              className="w-full border-white/20 text-white bg-white/5 backdrop-blur-sm"
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
                <p className="text-sm text-white/60">
                  Don't have an account?{" "}
                  <button
                    onClick={() => { setAuthMode("register"); setEmail(""); setPassword(""); }}
                    className="text-teal-300 hover:text-teal-200 font-medium"
                    data-testid="button-switch-to-register"
                  >
                    Sign up for free
                  </button>
                </p>
              ) : (
                <p className="text-sm text-white/60">
                  Already have an account?{" "}
                  <button
                    onClick={() => { setAuthMode("login"); setEmail(""); setPassword(""); }}
                    className="text-teal-300 hover:text-teal-200 font-medium"
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
          <div className="absolute inset-0 bg-gradient-to-br from-slate-900/80 via-slate-900/70 to-slate-900/80" />
          <div className="absolute inset-0 bg-gradient-to-br from-purple-600/20 via-transparent to-teal-500/20" />
        </div>

        <div className="relative z-10 w-full px-4 md:px-6 py-12 md:py-20">
          <div className="max-w-6xl mx-auto">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-md border border-white/20 mb-6">
                <Sparkles className="w-4 h-4 text-teal-300" />
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
                    onClick={() => setAuthMode("register")}
                    size="lg"
                    className="bg-white text-slate-900"
                    data-testid="button-hero-signup"
                  >
                    Get Started Free
                  </Button>
                  <Button
                    size="lg"
                    onClick={() => (window.location.href = "/api/login/demo")}
                    variant="outline"
                    className="border-white/40 text-white bg-white/5 backdrop-blur-sm"
                    data-testid="button-hero-demo"
                  >
                    Try Demo
                  </Button>
                </div>
              )}

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

      {/* Features Section */}
      <section className="px-4 md:px-6 py-12 md:py-16 relative">
        <div className="absolute inset-0 bg-gradient-to-br from-teal-900/10 via-transparent to-purple-900/10" />
        <div className="max-w-6xl mx-auto relative">
          <div className="text-center mb-8 md:mb-12">
            <h2 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-teal-200 via-white to-purple-200 bg-clip-text text-transparent mb-3">
              Everything Your Family Needs
            </h2>
            <p className="text-lg text-white/70 max-w-2xl mx-auto">
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

      {/* Caregiving Section */}
      <section className="px-4 md:px-6 py-16 md:py-20 relative">
        <div className="absolute inset-0 bg-gradient-to-br from-orange-900/10 via-transparent to-blue-900/10" />
        <div className="max-w-6xl mx-auto relative">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-orange-200 via-white to-blue-200 bg-clip-text text-transparent mb-4">
              Eldercare, Simplified
            </h2>
            <p className="text-lg text-white/70 max-w-3xl mx-auto">
              53 million Americans care for aging parents while raising kids. Kindora gives your entire care team—family, aides, nurses—shared visibility into schedules, medications, and appointments.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5 md:gap-6">
            <div className="backdrop-blur-md bg-white/5 border border-white/20 rounded-2xl p-6 hover-elevate transition-all group">
              <div className="p-3 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 shadow-lg group-hover:shadow-orange-500/50 transition-shadow w-fit mb-4">
                <HeartHandshake className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Trusted Access</h3>
              <p className="text-white/70 leading-relaxed text-sm">
                Invite health aides, nurses, or social workers to view schedules without joining the family
              </p>
            </div>

            <div className="backdrop-blur-md bg-white/5 border border-white/20 rounded-2xl p-6 hover-elevate transition-all group">
              <div className="p-3 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 shadow-lg group-hover:shadow-blue-500/50 transition-shadow w-fit mb-4">
                <CalendarCheck className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Medical Coordination</h3>
              <p className="text-white/70 leading-relaxed text-sm">
                Track doctor appointments, physical therapy sessions, and medication schedules in one place
              </p>
            </div>

            <div className="backdrop-blur-md bg-white/5 border border-white/20 rounded-2xl p-6 hover-elevate transition-all group">
              <div className="p-3 rounded-xl bg-gradient-to-br from-teal-500 to-teal-600 shadow-lg group-hover:shadow-teal-500/50 transition-shadow w-fit mb-4">
                <DollarSign className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Caregiver Time Tracking</h3>
              <p className="text-white/70 leading-relaxed text-sm">
                Caregivers can log hours and track pay. Families see a clear record of care provided.
              </p>
            </div>

            <div className="backdrop-blur-md bg-white/5 border border-white/20 rounded-2xl p-6 hover-elevate transition-all group">
              <div className="p-3 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 shadow-lg group-hover:shadow-purple-500/50 transition-shadow w-fit mb-4">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Peace of Mind</h3>
              <p className="text-white/70 leading-relaxed text-sm">
                Adult children can monitor care from anywhere, ensuring parents never miss critical appointments
              </p>
            </div>
          </div>

          <div className="mt-10 p-6 bg-gradient-to-r from-orange-500/10 to-blue-500/10 border border-white/10 rounded-2xl">
            <div className="grid md:grid-cols-2 gap-6">
              <div className="text-center md:text-left">
                <p className="text-white font-semibold mb-2">For Families</p>
                <p className="text-white/70 text-sm leading-relaxed">
                  Invite caregivers to your calendar. Control what they see. Get peace of mind knowing care is coordinated.
                </p>
              </div>
              <div className="text-center md:text-left">
                <p className="text-white font-semibold mb-2">For Caregivers</p>
                <p className="text-white/70 leading-relaxed text-sm">
                  See your schedule, log medications, track your hours, and calculate your pay—all in one dashboard.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="px-4 md:px-6 py-16 md:py-20 relative" data-testid="section-pricing">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-900/10 via-transparent to-teal-900/10" />
        <div className="max-w-6xl mx-auto relative">
          <div className="text-center mb-10">
            <h2 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-purple-200 via-white to-teal-200 bg-clip-text text-transparent mb-3">
              Simple, Family-Friendly Pricing
            </h2>
            <p className="text-lg text-white/70 max-w-2xl mx-auto">
              Start free. Upgrade when your family needs more.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            <div className="backdrop-blur-md bg-white/5 border border-white/20 rounded-2xl p-6 flex flex-col" data-testid="card-pricing-free">
              <h3 className="text-xl font-bold text-white mb-1" data-testid="text-pricing-free-name">Free</h3>
              <p className="text-white/60 text-sm mb-4">For getting started</p>
              <div className="mb-6">
                <span className="text-4xl font-bold text-white" data-testid="text-pricing-free-price">$0</span>
                <span className="text-white/60 text-sm ml-1">/month</span>
              </div>
              <ul className="space-y-3 mb-6 flex-1">
                {["1 family calendar", "Up to 3 members", "Basic event management", "Color-coded categories", "Mobile-friendly design"].map((item) => (
                  <li key={item} className="flex items-start gap-2 text-sm text-white/80">
                    <Check className="w-4 h-4 text-teal-400 mt-0.5 flex-shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              {!isAuthenticated && (
                <Button
                  onClick={() => setAuthMode("register")}
                  variant="outline"
                  className="w-full border-white/30 text-white bg-white/5 backdrop-blur-sm"
                  data-testid="button-pricing-free"
                >
                  Get Started
                </Button>
              )}
            </div>

            <div className="backdrop-blur-md bg-white/5 border-2 border-teal-400/50 rounded-2xl p-6 flex flex-col relative" data-testid="card-pricing-family">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-gradient-to-r from-purple-500 to-teal-500 rounded-full text-xs font-semibold text-white">
                Most Popular
              </div>
              <h3 className="text-xl font-bold text-white mb-1" data-testid="text-pricing-family-name">Family</h3>
              <p className="text-white/60 text-sm mb-4">For active families</p>
              <div className="mb-6">
                <span className="text-4xl font-bold text-white" data-testid="text-pricing-family-price">$9</span>
                <span className="text-white/60 text-sm ml-1">/month</span>
              </div>
              <ul className="space-y-3 mb-6 flex-1">
                {["Unlimited family calendars", "Up to 10 members", "Recurring events & RRULE", "Weekly email summaries", "Caregiver invitations", "Document vault", "AI schedule import"].map((item) => (
                  <li key={item} className="flex items-start gap-2 text-sm text-white/80">
                    <Check className="w-4 h-4 text-teal-400 mt-0.5 flex-shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              {!isAuthenticated && (
                <Button
                  onClick={() => setAuthMode("register")}
                  className="w-full bg-gradient-to-r from-purple-500 to-teal-500 text-white border-0"
                  data-testid="button-pricing-family"
                >
                  Start Free Trial
                </Button>
              )}
            </div>

            <div className="backdrop-blur-md bg-white/5 border border-white/20 rounded-2xl p-6 flex flex-col" data-testid="card-pricing-pro">
              <h3 className="text-xl font-bold text-white mb-1" data-testid="text-pricing-pro-name">Professional</h3>
              <p className="text-white/60 text-sm mb-4">For care agencies</p>
              <div className="mb-6">
                <span className="text-4xl font-bold text-white" data-testid="text-pricing-pro-price">$29</span>
                <span className="text-white/60 text-sm ml-1">/month</span>
              </div>
              <ul className="space-y-3 mb-6 flex-1">
                {["Everything in Family", "Unlimited members", "Medication tracking & logs", "Caregiver time & pay tracking", "Emergency Bridge Mode", "Priority support", "Custom branding"].map((item) => (
                  <li key={item} className="flex items-start gap-2 text-sm text-white/80">
                    <Check className="w-4 h-4 text-teal-400 mt-0.5 flex-shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              {!isAuthenticated && (
                <Button
                  onClick={() => setAuthMode("register")}
                  variant="outline"
                  className="w-full border-white/30 text-white bg-white/5 backdrop-blur-sm"
                  data-testid="button-pricing-pro"
                >
                  Contact Sales
                </Button>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="px-4 md:px-6 py-16 md:py-20 relative">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Stop Juggling. Start Coordinating.
          </h2>
          <p className="text-lg text-white/70 mb-8 max-w-2xl mx-auto">
            Join families who've traded sticky notes and group texts for one shared calendar that actually works. Free to start, no credit card needed.
          </p>
          {!isAuthenticated && (
            <div className="flex flex-wrap justify-center gap-3">
              <Button
                size="lg"
                onClick={() => setAuthMode("register")}
                className="bg-white text-slate-900"
                data-testid="button-final-cta-signup"
              >
                Create Your Family Calendar
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
              <Button
                size="lg"
                onClick={() => (window.location.href = "/api/login/demo")}
                variant="outline"
                className="border-white/40 text-white bg-white/5 backdrop-blur-sm"
                data-testid="button-final-cta-demo"
              >
                Try the Demo First
              </Button>
            </div>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 px-4 md:px-6 py-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col items-center gap-4">
            <div className="flex items-center gap-4">
              <a
                href="#"
                onClick={handleSocialClick}
                aria-label="Facebook"
                className="w-10 h-10 rounded-full backdrop-blur-xl bg-white/10 border border-white/20 flex items-center justify-center text-white/70 hover:text-white hover:bg-white/20 transition-all hover-elevate"
                data-testid="link-facebook"
              >
                <Facebook className="w-5 h-5" />
              </a>
              <a
                href="#"
                onClick={handleSocialClick}
                aria-label="Instagram"
                className="w-10 h-10 rounded-full backdrop-blur-xl bg-white/10 border border-white/20 flex items-center justify-center text-white/70 hover:text-white hover:bg-white/20 transition-all hover-elevate"
                data-testid="link-instagram"
              >
                <Instagram className="w-5 h-5" />
              </a>
              <a
                href="#"
                onClick={handleSocialClick}
                aria-label="X (Twitter)"
                className="w-10 h-10 rounded-full backdrop-blur-xl bg-white/10 border border-white/20 flex items-center justify-center text-white/70 hover:text-white hover:bg-white/20 transition-all hover-elevate"
                data-testid="link-twitter"
              >
                <Twitter className="w-5 h-5" />
              </a>
            </div>
            
            <div className="text-center space-y-2">
              <div className="flex items-center justify-center gap-4 flex-wrap">
                <Link href="/terms" className="text-white/60 hover:text-white text-sm transition-colors" data-testid="link-terms">Terms of Service</Link>
                <span className="text-white/30">|</span>
                <Link href="/privacy" className="text-white/60 hover:text-white text-sm transition-colors" data-testid="link-privacy">Privacy Policy</Link>
              </div>
              <p className="text-white/60 text-sm">
                © 2026 Kindora Family, Inc. Keeping families connected and coordinated.
              </p>
              <p className="text-white/60 text-sm">
                Visit <a href="https://kindora.ai" target="_blank" rel="noopener noreferrer" className="text-white/90 hover:text-white underline decoration-white/40 hover:decoration-white transition-colors" data-testid="link-kindora-ai">Kindora.ai</a> for instant coaching guidance for your kiddos.
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
