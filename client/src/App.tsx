import { Switch, Route, Redirect, useLocation } from "wouter";
import { Component, useEffect } from "react";
import type { ReactNode } from "react";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { HelmetProvider } from "react-helmet-async";
import { useAuth } from "@/hooks/useAuth";
import { ActiveFamilyProvider, useActiveFamily } from "@/contexts/ActiveFamilyContext";
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
import About from "@/pages/About";
import Support from "@/pages/Support";
import AccountSettings from "@/pages/AccountSettings";
import Advisor from "@/pages/Advisor";
import NotFound from "@/pages/not-found";
import AppSidebar from "@/components/AppSidebar";
import Header from "@/components/Header";
import ThemeToggle from "@/components/ThemeToggle";
import FamilySelector from "@/components/FamilySelector";
import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { useMessageNotifications } from "@/hooks/useMessageNotifications";
import SmartReminders from "@/components/SmartReminders";

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
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "100svh", padding: "2rem", background: "#111318", color: "#fff", textAlign: "center", gap: "1rem" }}>
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#f97316" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="12"/>
            <line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          <p style={{ fontSize: "1.1rem", fontWeight: 600 }}>Something went wrong</p>
          <p style={{ fontSize: "0.85rem", color: "#aaa", maxWidth: "280px" }}>{this.state.error}</p>
          <button
            onClick={() => window.location.reload()}
            style={{ marginTop: "0.5rem", padding: "0.6rem 1.4rem", borderRadius: "8px", background: "#f97316", color: "#fff", fontWeight: 600, border: "none", cursor: "pointer", fontSize: "0.95rem" }}
          >
            Reload
          </button>
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

function AppShell({ children }: { children: React.ReactNode }) {
  useMessageNotifications();
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
          <main className="flex-1 overflow-y-auto">
            {children}
          </main>
        </SidebarInset>
      </div>
      <SmartReminders />
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
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center">
          <div className="w-12 h-12 border-3 border-primary/30 border-t-primary rounded-full animate-spin mx-auto mb-3" />
          <p className="text-muted-foreground text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <Switch>
      <Route path="/emergency-bridge/:token" component={EmergencyBridge} />
      <Route path="/terms" component={Terms} />
      <Route path="/privacy" component={Privacy} />
      <Route path="/about" component={About} />
      <Route path="/support" component={Support} />
      <Route path="/intro" component={Intro} />
      {!isAuthenticated ? (
        <>
          <Route path="/" component={Landing} />
          <Route component={NotFound} />
        </>
      ) : (
        <>
          <Route path="/onboarding" component={Onboarding} />
          <Route path="/onboarding/wizard" component={EventWizard} />
          <Route path="/demo-welcome" component={DemoWelcome} />
          <NewUserGuard />
          <AppShell>
            <Switch>
              <Route path="/" component={Home} />
              <Route path="/care" component={CaregiverDashboard} />
              <Route path="/messages" component={Messages} />
              <Route path="/documents" component={Documents} />
              <Route path="/memories" component={Memories} />
              <Route path="/advisor" component={Advisor} />
              <Route path="/settings/family">{() => <AccountSettings initialTab="family" />}</Route>
              <Route path="/settings/import">{() => <AccountSettings initialTab="import" />}</Route>
              <Route path="/settings/kira">{() => <AccountSettings initialTab="kira" />}</Route>
              <Route path="/settings">{() => <AccountSettings />}</Route>
              <Route>{() => <Redirect to="/" />}</Route>
            </Switch>
          </AppShell>
        </>
      )}
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <HelmetProvider>
        <QueryClientProvider client={queryClient}>
          <ActiveFamilyProvider>
            <TooltipProvider>
              <Toaster />
              <Router />
            </TooltipProvider>
          </ActiveFamilyProvider>
        </QueryClientProvider>
      </HelmetProvider>
    </ErrorBoundary>
  );
}

export default App;
