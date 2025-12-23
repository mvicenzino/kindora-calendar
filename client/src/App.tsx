import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import { ActiveFamilyProvider } from "@/contexts/ActiveFamilyContext";
import Landing from "@/pages/Landing";
import Home from "@/pages/Home";
import Memories from "@/pages/Memories";
import Onboarding from "@/pages/Onboarding";
import EventWizard from "@/pages/EventWizard";
import DemoWelcome from "@/pages/DemoWelcome";
import FamilySettings from "@/pages/FamilySettings";
import CaregiverDashboard from "@/pages/CaregiverDashboard";
import Messages from "@/pages/Messages";
import Documents from "@/pages/Documents";
import EmergencyBridge from "@/pages/EmergencyBridge";

function Router() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-[#4A5A6A] via-[#5A6A7A] to-[#6A7A8A]">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  return (
    <Switch>
      <Route path="/emergency-bridge/:token" component={EmergencyBridge} />
      {!isAuthenticated ? (
        <Route path="/" component={Landing} />
      ) : (
        <>
          <Route path="/demo-welcome" component={DemoWelcome} />
          <Route path="/" component={Home} />
          <Route path="/care" component={CaregiverDashboard} />
          <Route path="/messages" component={Messages} />
          <Route path="/documents" component={Documents} />
          <Route path="/memories" component={Memories} />
          <Route path="/family" component={FamilySettings} />
          <Route path="/onboarding" component={Onboarding} />
          <Route path="/onboarding/wizard" component={EventWizard} />
        </>
      )}
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ActiveFamilyProvider>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ActiveFamilyProvider>
    </QueryClientProvider>
  );
}

export default App;
