import { Switch, Route, Redirect, useLocation } from "wouter";
import { Component, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { HelmetProvider } from "react-helmet-async";
import { X } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { ActiveFamilyProvider, useActiveFamily } from "@/contexts/ActiveFamilyContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import Landing from "@/pages/Landing";
import Intro from "@/pages/Intro";
import Home from "@/pages/Home";
import Memories from "@/pages/Memories";
import Onboarding from "@/pages/Onboarding";
import EventWizard from "@/pages/EventWizard";
import DemoWelcome from "@/pages/DemoWelcome";
import CaregiverDashboard from "@/pages/CaregiverDashboard";
import Messages from "@/pages/Messages";
import Documents from "@/pages/Documents";
import EmergencyBridge from "@/pages/EmergencyBridge";
import Terms from "@/pages/Terms";
import Privacy from "@/pages/Privacy";
import Help from "@/pages/Help";
import About from "@/pages/About";
import Support from "@/pages/Support";
import PublicResources from "@/pages/PublicResources";
import AccountSettings from "@/pages/AccountSettings";
import Advisor from "@/pages/Advisor";
import Health from "@/pages/Health";
import NotFound from "@/pages/not-found";
import AppSidebar from "@/components/AppSidebar";
import Header from "@/components/Header";
import ThemeToggle from "@/components/ThemeToggle";
import FamilySelector from "@/components/FamilySelector";
import FeedbackButton from "@/components/FeedbackButton";
import AdminFeedback from "@/pages/AdminFeedback";
import AdminDashboard from "@/pages/AdminDashboard";
import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { useMessageNotifications } from "@/hooks/useMessageNotifications";
import SmartReminders from "@/components/SmartReminders";
import WelcomeModal from "@/components/WelcomeModal";
import { KiraPanelProvider, useKiraPanel } from "@/contexts/KiraPanelContext";
import { KiraSidePanel } from "@/components/KiraSidePanel";
import { Sparkles } from "lucide-react";

class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean; error: string }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: "" };
  }
  static getDerivedStateFromError(err: Error) {
    return { hasError: true, error: err?.message || "Unknown error" };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "100svh", padding: "2rem", background: "#1a1a2e", color: "#fff", textAlign: "center", gap: "1.25rem" }}>
          <div style={{ width: 72, height: 72, borderRadius: "50%", background: "#f97316", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "0.5rem" }}>
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="8" x2="12" y2="12"/>
              <line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
          </div>
          <p style={{ fontSize: "1.5rem", fontWeight: 700, letterSpacing: "-0.02em" }}>Kindora</p>
          <p style={{ fontSize: "1rem", fontWeight: 600, color: "#fff" }}>Something went wrong</p>
          <p style={{ fontSize: "0.85rem", color: "rgba(255,255,255,0.55)", maxWidth: "300px", lineHeight: 1.5 }}>{this.state.error || "An unexpected error occurred."}</p>
          <button
            onClick={() => window.location.reload()}
            style={{ marginTop: "0.5rem", padding: "0.75rem 2rem", borderRadius: "10px", background: "#f97316", color: "#fff", fontWeight: 700, border: "none", cursor: "pointer", fontSize: "1rem", letterSpacing: "0.01em" }}
          >
            Reload App
          </button>
          <p style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.3)", marginTop: "0.25rem" }}>If this keeps happening, contact support@kindora.ai</p>
        </div>
      );
    }
    return this.props.children;
  }
}

const sidebarStyle = {
  "--sidebar-width": "12rem",
  "--sidebar-width-icon": "3rem",
};

const DEMO_BANNER_HIDDEN_KEY = "kindora-demo-banner-hidden";

function DemoBanner() {
  const { user } = useAuth();
  const [hidden, setHidden] = useState(() => localStorage.getItem(DEMO_BANNER_HIDDEN_KEY) === "1");

  if (!user?.id?.startsWith('demo-')) return null;
  if (hidden) return null;

  return (
    <div
      className="flex items-center justify-between gap-3 px-4 py-2 text-sm font-medium"
      style={{ background: "rgba(249,115,22,0.12)", borderBottom: "1px solid rgba(249,115,22,0.25)", color: "rgba(249,115,22,0.95)" }}
      data-testid="banner-demo-mode"
    >
      <span className="flex items-center gap-1.5 flex-wrap flex-1 justify-center">
        <span className="inline-block w-2 h-2 rounded-full bg-orange-400 animate-pulse" />
        <span>You&apos;re in demo mode — events and changes are temporary and won&apos;t be saved</span>
        <a
          href="/api/logout"
          className="underline underline-offset-2 font-semibold hover:opacity-80 transition-opacity whitespace-nowrap"
          data-testid="link-demo-signup"
        >
          Sign up free to save your data
        </a>
      </span>
      <button
        onClick={() => { localStorage.setItem(DEMO_BANNER_HIDDEN_KEY, "1"); setHidden(true); }}
        className="shrink-0 p-1 rounded opacity-60 hover:opacity-100 transition-opacity"
        title="Hide banner"
        data-testid="button-dismiss-demo-banner"
        aria-label="Dismiss demo banner"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

function KiraFAB() {
  const { openPanel } = useKiraPanel();
  const [location] = useLocation();
  if (location === "/advisor") return null;
  return (
    <button
      onClick={() => openPanel()}
      data-testid="button-kira-fab"
      className="fixed bottom-[64px] right-5 z-40 flex items-center gap-2 bg-primary text-primary-foreground rounded-full shadow-lg px-4 py-2.5 text-sm font-semibold hover-elevate active-elevate-2 transition-all"
      aria-label="Open Kira advisor"
    >
      <Sparkles className="w-4 h-4" />
      Ask Kira
    </button>
  );
}

function AppShell({ children }: { children: React.ReactNode }) {
  useMessageNotifications();
  const { user } = useAuth();
  const isDemo = user?.id?.startsWith("demo-") ?? false;
  return (
    <SidebarProvider style={sidebarStyle as React.CSSProperties}>
      <div className="flex h-screen w-full bg-background">
        <AppSidebar />
        <SidebarInset className="flex flex-col flex-1 min-w-0">
          <header className="sticky top-0 z-50 flex items-center justify-between gap-2 px-3 py-1.5 border-b border-border/40 bg-background/90 backdrop-blur-xl" data-testid="header-main">
            <div className="flex items-center gap-2">
              <SidebarTrigger data-testid="button-sidebar-toggle" />
              <FamilySelector />
            </div>
            <div className="flex items-center gap-1">
              <ThemeToggle />
              <Header />
            </div>
          </header>
          <DemoBanner />
          <main className="flex-1 overflow-y-auto">
            {children}
          </main>
        </SidebarInset>
      </div>
      <SmartReminders />
      {!isDemo && <FeedbackButton />}
      <WelcomeModal />
      <KiraFAB />
      <KiraSidePanel />
    </SidebarProvider>
  );
}

// Redirects freshly-signed-up users (no family yet) to onboarding
function NewUserGuard() {
  const { families, familiesLoaded } = useActiveFamily();
  const [location, navigate] = useLocation();
  useEffect(() => {
    const exemptPaths = ["/onboarding", "/onboarding/wizard", "/demo-welcome"];
    if (familiesLoaded && families !== undefined && families.length === 0 && !exemptPaths.includes(location)) {
      navigate("/onboarding");
    }
  }, [families, familiesLoaded, location, navigate]);
  return null;
}

function Router() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen" style={{ background: "#111318" }}>
        <div className="text-center">
          <div className="w-14 h-14 border-4 border-white/10 border-t-orange-500 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-lg font-semibold text-white mb-1">Kindora</p>
          <p className="text-sm text-white/50">Loading your family calendar…</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* NewUserGuard must live OUTSIDE Switch — components with no `path` prop
          are treated as "*" catch-alls by wouter's Switch, so placing it inside
          caused it to intercept every URL before AppShell could render. */}
      {isAuthenticated && <NewUserGuard />}
      <Switch>
        <Route path="/emergency-bridge/:token" component={EmergencyBridge} />
        <Route path="/resources" component={PublicResources} />
        <Route path="/terms" component={Terms} />
        <Route path="/privacy" component={Privacy} />
        <Route path="/help" component={Help} />
        <Route path="/about" component={About} />
        <Route path="/support" component={Support} />
        <Route path="/intro" component={Intro} />
        {!isAuthenticated ? (
          <>
            <Route path="/" component={Landing} />
            <Route>{() => <Redirect to="/" />}</Route>
          </>
        ) : (
          <>
            <Route path="/onboarding" component={Onboarding} />
            <Route path="/onboarding/wizard" component={EventWizard} />
            <Route path="/demo-welcome" component={DemoWelcome} />
            {/* Catch-all Route renders AppShell for all other authenticated paths */}
            <Route>
              {() => (
                <KiraPanelProvider>
                <AppShell>
                  <Switch>
                    <Route path="/" component={Home} />
                    <Route path="/care" component={CaregiverDashboard} />
                    <Route path="/messages" component={Messages} />
                    <Route path="/documents" component={Documents} />
                    <Route path="/memories" component={Memories} />
                    <Route path="/advisor" component={Advisor} />
                    <Route path="/health" component={Health} />
                    <Route path="/settings/family">{() => <AccountSettings initialTab="family" />}</Route>
                    <Route path="/settings/import">{() => <AccountSettings initialTab="import" />}</Route>
                    <Route path="/settings/kira">{() => <AccountSettings initialTab="kira" />}</Route>
                    <Route path="/settings">{() => <AccountSettings />}</Route>
                    <Route path="/admin" component={AdminDashboard} />
                    <Route path="/admin/feedback" component={AdminFeedback} />
                    <Route>{() => <Redirect to="/" />}</Route>
                  </Switch>
                </AppShell>
                </KiraPanelProvider>
              )}
            </Route>
          </>
        )}
      </Switch>
    </>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <HelmetProvider>
        <ThemeProvider>
          <QueryClientProvider client={queryClient}>
            <ActiveFamilyProvider>
              <TooltipProvider>
                <Toaster />
                <Router />
              </TooltipProvider>
            </ActiveFamilyProvider>
          </QueryClientProvider>
        </ThemeProvider>
      </HelmetProvider>
    </ErrorBoundary>
  );
}

export default App;
