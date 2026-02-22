import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { HelmetProvider } from "react-helmet-async";
import { useAuth } from "@/hooks/useAuth";
import { ActiveFamilyProvider } from "@/contexts/ActiveFamilyContext";
import Landing from "@/pages/Landing";
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
import AccountSettings from "@/pages/AccountSettings";
import AppSidebar from "@/components/AppSidebar";
import Header from "@/components/Header";
import ThemeToggle from "@/components/ThemeToggle";
import FamilySelector from "@/components/FamilySelector";
import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";

const sidebarStyle = {
  "--sidebar-width": "14rem",
  "--sidebar-width-icon": "3.5rem",
};

function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider style={sidebarStyle as React.CSSProperties}>
      <div className="flex h-screen w-full bg-background">
        <AppSidebar />
        <SidebarInset className="flex flex-col flex-1 min-w-0">
          <header className="sticky top-0 z-50 flex items-center justify-between gap-2 px-3 py-2 border-b border-border/50 bg-background/80 backdrop-blur-xl" data-testid="header-main">
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
    </SidebarProvider>
  );
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
      {!isAuthenticated ? (
        <Route path="/" component={Landing} />
      ) : (
        <>
          <Route path="/onboarding" component={Onboarding} />
          <Route path="/onboarding/wizard" component={EventWizard} />
          <Route path="/demo-welcome" component={DemoWelcome} />
          <AppShell>
            <Switch>
              <Route path="/" component={Home} />
              <Route path="/care" component={CaregiverDashboard} />
              <Route path="/messages" component={Messages} />
              <Route path="/documents" component={Documents} />
              <Route path="/memories" component={Memories} />
              <Route path="/settings/family">{() => <AccountSettings initialTab="family" />}</Route>
              <Route path="/settings/import">{() => <AccountSettings initialTab="import" />}</Route>
              <Route path="/settings">{() => <AccountSettings />}</Route>
            </Switch>
          </AppShell>
        </>
      )}
    </Switch>
  );
}

function App() {
  return (
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
  );
}

export default App;
