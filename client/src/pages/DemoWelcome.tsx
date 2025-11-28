import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { 
  Calendar, 
  Users, 
  Heart, 
  LogOut, 
  Sparkles, 
  ArrowRight,
  Baby,
  Stethoscope,
  Shield,
  Clock,
  Camera,
  Bell,
  DollarSign,
  Pill,
  ClipboardList,
  MessageSquare,
  Loader2
} from "lucide-react";
import heroVideo from "@assets/generated_videos/family_chaos_to_harmony_montage.mp4";
import calendoraIcon from "@assets/generated_images/simple_clean_calendar_logo.png";

type Persona = "family" | "caregiver";

export default function DemoWelcome() {
  const [, setLocation] = useLocation();
  const [persona, setPersona] = useState<Persona>("family");
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationError, setVerificationError] = useState<string | null>(null);

  // Check if we have a demo token in the URL (fallback for when cookies don't work)
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const demoToken = urlParams.get("demo_token");
    const nextPath = urlParams.get("next") || "/care"; // Default to Caregiver Dashboard
    
    if (demoToken) {
      // Store the token and destination
      localStorage.setItem("demo_token", demoToken);
      
      // Clean up the URL
      const newUrl = window.location.pathname;
      window.history.replaceState({}, "", newUrl);
      
      // Try to verify the token and establish session
      setIsVerifying(true);
      fetch("/api/auth/demo-verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ demoToken }),
        credentials: "include",
      })
        .then(async (res) => {
          if (res.ok) {
            // Session established, navigate to destination (Caregiver Dashboard by default)
            window.location.href = nextPath;
          } else {
            const data = await res.json();
            setVerificationError(data.message || "Failed to verify demo session");
          }
        })
        .catch((err) => {
          console.error("Demo verification error:", err);
          setVerificationError("Failed to connect to server");
        })
        .finally(() => {
          setIsVerifying(false);
        });
    }
  }, []);

  // Show loading state while verifying demo token
  if (isVerifying) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#4A5A6A] via-[#5A6A7A] to-[#6A7A8A] flex items-center justify-center">
        <div className="text-center text-white">
          <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4" />
          <p className="text-xl">Setting up your demo account...</p>
        </div>
      </div>
    );
  }

  // Show error if verification failed
  if (verificationError) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#4A5A6A] via-[#5A6A7A] to-[#6A7A8A] flex items-center justify-center">
        <div className="text-center text-white max-w-md px-4">
          <p className="text-xl mb-4">Something went wrong</p>
          <p className="text-white/70 mb-6">{verificationError}</p>
          <Button
            onClick={() => window.location.href = "/api/login/demo"}
            className="bg-gradient-to-r from-purple-500 to-teal-500 text-white"
          >
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#4A5A6A] via-[#5A6A7A] to-[#6A7A8A]">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full backdrop-blur-xl bg-white/5 border-b border-white/20 shadow-lg">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <img src={calendoraIcon} alt="Kindora Calendar" className="w-10 h-10 rounded-lg" />
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
          <div className="absolute inset-0 bg-gradient-to-br from-slate-900/80 via-slate-900/70 to-slate-900/80" />
          <div className="absolute inset-0 bg-gradient-to-br from-purple-600/20 via-transparent to-teal-500/20" />
        </div>

        {/* Content */}
        <div className="relative z-10 w-full px-4 md:px-6 py-12 md:py-20">
          <div className="max-w-6xl mx-auto">
            <div className="max-w-3xl">
              {/* Persona Toggle */}
              <div className="inline-flex items-center gap-1 p-1 rounded-full bg-white/10 backdrop-blur-md border border-white/20 mb-6">
                <button
                  onClick={() => setPersona("family")}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                    persona === "family"
                      ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg"
                      : "text-white/70 hover:text-white hover:bg-white/10"
                  }`}
                  data-testid="toggle-persona-family"
                >
                  <span className="flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    I'm a Family
                  </span>
                </button>
                <button
                  onClick={() => setPersona("caregiver")}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                    persona === "caregiver"
                      ? "bg-gradient-to-r from-teal-500 to-amber-500 text-white shadow-lg"
                      : "text-white/70 hover:text-white hover:bg-white/10"
                  }`}
                  data-testid="toggle-persona-caregiver"
                >
                  <span className="flex items-center gap-2">
                    <Heart className="w-4 h-4" />
                    I'm a Caregiver
                  </span>
                </button>
              </div>
              
              {/* Dynamic Hero Content */}
              {persona === "family" ? (
                <>
                  <h1 className="text-5xl md:text-7xl font-bold text-white leading-tight mb-6 bg-gradient-to-r from-white via-purple-100 to-teal-100 bg-clip-text text-transparent">
                    Made for the Sandwich Generation
                  </h1>
                  
                  <p className="text-xl md:text-2xl text-white/90 mb-8 leading-relaxed">
                    You're juggling soccer practice and doctor's appointments. School plays and physical therapy. Kids' homework and Mom's medications. <strong className="text-teal-300">We get it.</strong>
                  </p>

                  <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-6 mb-8">
                    <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                      <ArrowRight className="w-5 h-5 text-teal-400" />
                      Explore Two Demo Calendars
                    </h3>
                    <p className="text-white/80 mb-4">
                      This demo includes <strong>Your Family calendar</strong> (kids, activities, school) and <strong>Mom's Care Calendar</strong> (caregivers, appointments, medications). Switch between them to see the full picture.
                    </p>
                    <div className="flex flex-wrap gap-3">
                      <Button
                        onClick={() => setLocation("/")}
                        className="bg-gradient-to-r from-purple-500 to-teal-500 text-white hover:from-purple-600 hover:to-teal-600 border-0"
                        data-testid="button-continue-demo"
                      >
                        Start Coordinating Now
                      </Button>
                      <Button
                        onClick={() => (window.location.href = "/api/login")}
                        variant="outline"
                        className="border-white text-white hover:bg-white/10 bg-white/5 backdrop-blur-sm"
                        data-testid="button-sign-in-now"
                      >
                        Sign In to Start
                      </Button>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <h1 className="text-5xl md:text-7xl font-bold text-white leading-tight mb-6 bg-gradient-to-r from-white via-teal-100 to-amber-100 bg-clip-text text-transparent">
                    Your Care Work, Valued
                  </h1>
                  
                  <p className="text-xl md:text-2xl text-white/90 mb-8 leading-relaxed">
                    Track your hours, log medications, and stay connected with the families you care for. <strong className="text-amber-300">All in one place.</strong>
                  </p>

                  <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-6 mb-8">
                    <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                      <ArrowRight className="w-5 h-5 text-amber-400" />
                      How It Works for Caregivers
                    </h3>
                    <p className="text-white/80 mb-4">
                      Families invite you to their care calendar. You'll see your schedule, log medication doses, track your hours, and calculate your pay - all from one dashboard.
                    </p>
                    <div className="flex flex-wrap gap-3">
                      <Button
                        onClick={() => setLocation("/")}
                        className="bg-gradient-to-r from-teal-500 to-amber-500 text-white hover:from-teal-600 hover:to-amber-600 border-0"
                        data-testid="button-continue-demo-caregiver"
                      >
                        See the Caregiver Dashboard
                      </Button>
                      <Button
                        onClick={() => (window.location.href = "/api/login")}
                        variant="outline"
                        className="border-white text-white hover:bg-white/10 bg-white/5 backdrop-blur-sm"
                        data-testid="button-get-invited"
                      >
                        Get Invited by a Family
                      </Button>
                    </div>
                  </div>
                </>
              )}

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

      {/* Two Worlds Section */}
      <section className="relative py-20 px-4 md:px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
              One App, Two Worlds
            </h2>
            <p className="text-xl text-white/70 max-w-2xl mx-auto">
              Seamlessly manage your family's busy life while coordinating care for your aging parents
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {/* Family Calendar Card */}
            <div className="relative group p-8 rounded-3xl backdrop-blur-xl bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-400/20 hover:border-purple-400/40 transition-all">
              <div className="absolute top-4 right-4">
                <div className="px-3 py-1 rounded-full bg-purple-500/20 border border-purple-400/30 text-xs font-medium text-purple-300">
                  Family Calendar
                </div>
              </div>
              
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500/30 to-pink-500/30 flex items-center justify-center mb-6 border border-purple-400/30">
                <Baby className="w-8 h-8 text-purple-300" />
              </div>
              
              <h3 className="text-2xl font-bold text-white mb-4">Kids, School & Activities</h3>
              
              <ul className="space-y-3 mb-6">
                <li className="flex items-center gap-3 text-white/80">
                  <div className="w-2 h-2 rounded-full bg-pink-400" />
                  Soccer games & ballet recitals
                </li>
                <li className="flex items-center gap-3 text-white/80">
                  <div className="w-2 h-2 rounded-full bg-purple-400" />
                  Parent-teacher conferences
                </li>
                <li className="flex items-center gap-3 text-white/80">
                  <div className="w-2 h-2 rounded-full bg-blue-400" />
                  Dentist appointments & checkups
                </li>
                <li className="flex items-center gap-3 text-white/80">
                  <div className="w-2 h-2 rounded-full bg-teal-400" />
                  Date nights & family outings
                </li>
              </ul>

              <p className="text-white/60 text-sm italic">
                "Finally, my husband and I can see Emma's ballet AND Lucas's basketball on the same calendar!"
              </p>
            </div>

            {/* Care Calendar Card */}
            <div className="relative group p-8 rounded-3xl backdrop-blur-xl bg-gradient-to-br from-teal-500/10 to-amber-500/10 border border-teal-400/20 hover:border-teal-400/40 transition-all">
              <div className="absolute top-4 right-4">
                <div className="px-3 py-1 rounded-full bg-teal-500/20 border border-teal-400/30 text-xs font-medium text-teal-300">
                  Care Calendar
                </div>
              </div>
              
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-teal-500/30 to-amber-500/30 flex items-center justify-center mb-6 border border-teal-400/30">
                <Stethoscope className="w-8 h-8 text-teal-300" />
              </div>
              
              <h3 className="text-2xl font-bold text-white mb-4">Eldercare & Caregivers</h3>
              
              <ul className="space-y-3 mb-6">
                <li className="flex items-center gap-3 text-white/80">
                  <div className="w-2 h-2 rounded-full bg-amber-400" />
                  Home health aide visits
                </li>
                <li className="flex items-center gap-3 text-white/80">
                  <div className="w-2 h-2 rounded-full bg-teal-400" />
                  Physical therapy sessions
                </li>
                <li className="flex items-center gap-3 text-white/80">
                  <div className="w-2 h-2 rounded-full bg-purple-400" />
                  Doctor appointments & follow-ups
                </li>
                <li className="flex items-center gap-3 text-white/80">
                  <div className="w-2 h-2 rounded-full bg-pink-400" />
                  Medication schedules & reminders
                </li>
              </ul>

              <p className="text-white/60 text-sm italic">
                "My brother and I can finally coordinate Mom's care without 50 text messages a day."
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* For Caregivers Section */}
      <section className="relative py-20 px-4 md:px-6 bg-gradient-to-b from-black/10 to-transparent">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-teal-500/20 to-amber-500/20 backdrop-blur-md border border-teal-400/30 mb-4">
              <Heart className="w-4 h-4 text-teal-300" />
              <span className="text-sm font-medium text-white">For Professional Caregivers</span>
            </div>
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
              Tools Built for Your Workday
            </h2>
            <p className="text-xl text-white/70 max-w-2xl mx-auto">
              Everything you need to manage your care work professionally
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Time Tracking */}
            <div className="group p-6 rounded-2xl backdrop-blur-xl bg-gradient-to-br from-teal-500/10 to-amber-500/10 border border-teal-400/20 hover:border-teal-400/40 transition-all">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-teal-500/30 to-amber-500/30 flex items-center justify-center mb-4 border border-teal-400/30">
                <Clock className="w-6 h-6 text-teal-300" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Time Tracking</h3>
              <p className="text-white/70 text-sm leading-relaxed">
                Log your hours with one tap. Track weekly and total time across all the families you work with.
              </p>
            </div>

            {/* Pay Calculator */}
            <div className="group p-6 rounded-2xl backdrop-blur-xl bg-gradient-to-br from-teal-500/10 to-amber-500/10 border border-teal-400/20 hover:border-teal-400/40 transition-all">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-teal-500/30 to-amber-500/30 flex items-center justify-center mb-4 border border-teal-400/30">
                <DollarSign className="w-6 h-6 text-amber-300" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Pay Visibility</h3>
              <p className="text-white/70 text-sm leading-relaxed">
                Set your hourly rate and see your earnings calculated automatically. Know exactly what you've earned.
              </p>
            </div>

            {/* Medication Logging */}
            <div className="group p-6 rounded-2xl backdrop-blur-xl bg-gradient-to-br from-teal-500/10 to-amber-500/10 border border-teal-400/20 hover:border-teal-400/40 transition-all">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-teal-500/30 to-amber-500/30 flex items-center justify-center mb-4 border border-teal-400/30">
                <Pill className="w-6 h-6 text-teal-300" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Medication Logging</h3>
              <p className="text-white/70 text-sm leading-relaxed">
                Record when medications are given, skipped, or refused. Create a clear record for the family.
              </p>
            </div>

            {/* Family Messaging */}
            <div className="group p-6 rounded-2xl backdrop-blur-xl bg-gradient-to-br from-teal-500/10 to-amber-500/10 border border-teal-400/20 hover:border-teal-400/40 transition-all">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-teal-500/30 to-amber-500/30 flex items-center justify-center mb-4 border border-teal-400/30">
                <MessageSquare className="w-6 h-6 text-amber-300" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Family Messaging</h3>
              <p className="text-white/70 text-sm leading-relaxed">
                Stay connected with the family through threaded messages. Share updates, ask questions, coordinate care.
              </p>
            </div>
          </div>

          <div className="mt-12 text-center">
            <p className="text-white/60 text-lg italic mb-6">
              "I used to lose track of my hours and forget what I was owed. Now it's all in one place."
            </p>
            <p className="text-white/40 text-sm">— Maya, Home Health Aide</p>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="relative py-20 px-4 md:px-6 bg-gradient-to-b from-transparent to-black/20">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
              Built for Real Families
            </h2>
            <p className="text-xl text-white/70">
              Features designed by caregivers, for caregivers
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {/* Feature 1 */}
            <div className="group p-6 rounded-2xl backdrop-blur-xl bg-white/5 border border-white/10 hover:border-white/30 transition-all hover-elevate">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500/20 to-teal-500/20 flex items-center justify-center mb-4 border border-white/20">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">Role-Based Access</h3>
              <p className="text-white/70 text-sm leading-relaxed">
                Invite caregivers to view and complete tasks without letting them change your family's schedule. You control who sees what.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="group p-6 rounded-2xl backdrop-blur-xl bg-white/5 border border-white/10 hover:border-white/30 transition-all hover-elevate">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500/20 to-teal-500/20 flex items-center justify-center mb-4 border border-white/20">
                <Users className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">Multiple Calendars</h3>
              <p className="text-white/70 text-sm leading-relaxed">
                Keep your family's chaos separate from Mom's care schedule. Switch between calendars with one tap.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="group p-6 rounded-2xl backdrop-blur-xl bg-white/5 border border-white/10 hover:border-white/30 transition-all hover-elevate">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500/20 to-teal-500/20 flex items-center justify-center mb-4 border border-white/20">
                <Calendar className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">Color-Coded Members</h3>
              <p className="text-white/70 text-sm leading-relaxed">
                Each family member gets their own color. See at a glance who has what scheduled - kids, parents, or caregivers.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="group p-6 rounded-2xl backdrop-blur-xl bg-white/5 border border-white/10 hover:border-white/30 transition-all hover-elevate">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500/20 to-teal-500/20 flex items-center justify-center mb-4 border border-white/20">
                <Camera className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">Photo Memories</h3>
              <p className="text-white/70 text-sm leading-relaxed">
                Attach photos to events and turn your calendar into a family scrapbook. Remember the soccer goals and the grandkid visits.
              </p>
            </div>

            {/* Feature 5 */}
            <div className="group p-6 rounded-2xl backdrop-blur-xl bg-white/5 border border-white/10 hover:border-white/30 transition-all hover-elevate">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500/20 to-teal-500/20 flex items-center justify-center mb-4 border border-white/20">
                <Clock className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">Complete & Track</h3>
              <p className="text-white/70 text-sm leading-relaxed">
                Mark events as done. Know when the home aide finished their visit or when medications were given.
              </p>
            </div>

            {/* Feature 6 */}
            <div className="group p-6 rounded-2xl backdrop-blur-xl bg-white/5 border border-white/10 hover:border-white/30 transition-all hover-elevate">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500/20 to-teal-500/20 flex items-center justify-center mb-4 border border-white/20">
                <Heart className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">Share with Love</h3>
              <p className="text-white/70 text-sm leading-relaxed">
                Invite siblings to coordinate care, share calendars with healthcare providers, and keep everyone in the loop.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative py-20 px-4 md:px-6">
        <div className="max-w-4xl mx-auto text-center">
          {persona === "family" ? (
            <>
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
                Ready to bring calm to the chaos?
              </h2>
              <p className="text-xl text-white/70 mb-8">
                Start with the demo, then create your real account to keep your data forever.
              </p>
              <div className="flex flex-wrap justify-center gap-4">
                <Button
                  onClick={() => setLocation("/")}
                  size="lg"
                  className="bg-gradient-to-r from-purple-500 to-teal-500 text-white hover:from-purple-600 hover:to-teal-600 border-0 px-8"
                  data-testid="button-explore-demo-bottom"
                >
                  Start Coordinating Now
                </Button>
                <Button
                  onClick={() => (window.location.href = "/api/login")}
                  size="lg"
                  variant="outline"
                  className="border-white text-white hover:bg-white/10 px-8"
                  data-testid="button-sign-in-bottom"
                >
                  Sign In Now
                </Button>
              </div>
            </>
          ) : (
            <>
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
                Ready to simplify your care work?
              </h2>
              <p className="text-xl text-white/70 mb-8">
                Ask the families you work with to invite you to their Kindora Calendar.
              </p>
              <div className="flex flex-wrap justify-center gap-4">
                <Button
                  onClick={() => setLocation("/")}
                  size="lg"
                  className="bg-gradient-to-r from-teal-500 to-amber-500 text-white hover:from-teal-600 hover:to-amber-600 border-0 px-8"
                  data-testid="button-explore-demo-bottom-caregiver"
                >
                  See the Caregiver Dashboard
                </Button>
                <Button
                  onClick={() => (window.location.href = "/api/login")}
                  size="lg"
                  variant="outline"
                  className="border-white text-white hover:bg-white/10 px-8"
                  data-testid="button-get-invited-bottom"
                >
                  Get Invited by a Family
                </Button>
              </div>
            </>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 py-8 px-4 md:px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <img src={calendoraIcon} alt="Kindora Calendar" className="w-8 h-8 rounded-lg" />
            <span className="text-sm text-white/60">
              Kindora Calendar - Made with love for caregivers everywhere
            </span>
          </div>
          <p className="text-sm text-white/40">
            © 2025 Kindora Family, Inc. Keeping families connected and coordinated.
          </p>
        </div>
      </footer>
    </div>
  );
}
