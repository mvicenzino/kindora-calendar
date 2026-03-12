import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation, useSearch } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Check, Crown, Loader2, ExternalLink, XCircle, RefreshCw, Users, Upload } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import FamilySettings from "./FamilySettings";
import ImportSchedule from "./ImportSchedule";

interface SubscriptionStatus {
  tier: string;
  status: string;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
}

const PLAN_FEATURES = {
  family: [
    "Unlimited family calendars",
    "Unlimited family members",
    "Caregiver management & time tracking",
    "Medication tracking & logging",
    "Care Documentation Vault",
    "Emergency Bridge Mode",
    "AI-powered schedule import",
    "Weekly email summaries",
    "Day / Week / Month / Timeline views",
  ],
};

function AccountTab() {
  const [, navigate] = useLocation();
  const searchString = useSearch();
  const { toast } = useToast();
  const { user } = useAuth();
  const [showCancelDialog, setShowCancelDialog] = useState(false);

  const subscriptionQuery = useQuery<SubscriptionStatus>({
    queryKey: ["/api/subscription/status"],
    enabled: !!user,
  });

  useEffect(() => {
    const params = new URLSearchParams(searchString);
    if (params.get("subscription") === "success") {
      toast({
        title: "Subscription activated",
        description: "Welcome to Kindora Family Plan! Your premium features are now active.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/subscription/status"] });
      window.history.replaceState({}, "", "/settings");
    } else if (params.get("subscription") === "cancelled") {
      toast({
        title: "Checkout cancelled",
        description: "You can upgrade anytime from your account settings.",
        variant: "destructive",
      });
      window.history.replaceState({}, "", "/settings");
    }
  }, [searchString, toast]);

  const cancelMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/subscription/cancel");
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Subscription cancellation scheduled",
        description: "Your subscription will remain active until the end of your billing period.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/subscription/status"] });
      setShowCancelDialog(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to cancel subscription",
        variant: "destructive",
      });
    },
  });

  const reactivateMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/subscription/reactivate");
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Subscription reactivated",
        description: "Your subscription has been reactivated and will continue as normal.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/subscription/status"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to reactivate subscription",
        variant: "destructive",
      });
    },
  });

  const portalMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/checkout/create-portal-session");
      return res.json();
    },
    onSuccess: (data: { url: string }) => {
      if (data.url) {
        window.location.href = data.url;
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to open billing portal",
        variant: "destructive",
      });
    },
  });

  const sub = subscriptionQuery.data;
  const isFamily = sub?.tier === "family";
  const isCanceling = sub?.status === "canceling";

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <Crown className="h-4 w-4 text-amber-500" />
              <CardTitle className="text-sm">Your Plan</CardTitle>
            </div>
            {subscriptionQuery.isLoading ? (
              <Badge variant="secondary">
                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                Loading
              </Badge>
            ) : isFamily ? (
              <Badge data-testid="badge-plan-tier" className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 no-default-hover-elevate no-default-active-elevate">
                Family Plan
              </Badge>
            ) : (
              <Badge variant="secondary" data-testid="badge-plan-tier">Beta</Badge>
            )}
          </div>
          <CardDescription>
            {isFamily
              ? isCanceling
                ? "Your subscription is set to cancel at the end of the billing period."
                : "You have access to all premium features."
              : "You're in the Kindora beta — full access, on us."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {!isFamily && (
            <div className="space-y-3">
              <ul className="grid gap-2 sm:grid-cols-2">
                {PLAN_FEATURES.family.map((feature) => (
                  <li key={feature} className="flex items-start gap-2 text-sm">
                    <Check className="h-4 w-4 mt-0.5 text-primary shrink-0" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
              <p className="text-xs text-muted-foreground pt-1">
                Kindora is free during beta. Pricing will be introduced soon — beta users will get early notice.
              </p>
            </div>
          )}

          {isFamily && (
            <div className="space-y-4">
              <div className="space-y-3">
                <h3 className="font-medium">Family Plan Features</h3>
                <ul className="grid gap-2 sm:grid-cols-2">
                  {PLAN_FEATURES.family.map((feature) => (
                    <li key={feature} className="flex items-start gap-2 text-sm">
                      <Check className="h-4 w-4 mt-0.5 text-primary shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="flex flex-wrap gap-2 pt-2">
                {sub?.stripeCustomerId && (
                  <Button
                    variant="outline"
                    onClick={() => portalMutation.mutate()}
                    disabled={portalMutation.isPending}
                    data-testid="button-manage-billing"
                  >
                    {portalMutation.isPending ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <ExternalLink className="h-4 w-4 mr-2" />
                    )}
                    Manage Billing
                  </Button>
                )}

                {isCanceling ? (
                  <Button
                    variant="outline"
                    onClick={() => reactivateMutation.mutate()}
                    disabled={reactivateMutation.isPending}
                    data-testid="button-reactivate-subscription"
                  >
                    {reactivateMutation.isPending ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <RefreshCw className="h-4 w-4 mr-2" />
                    )}
                    Reactivate Subscription
                  </Button>
                ) : (
                  <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        className="text-destructive"
                        data-testid="button-cancel-subscription"
                      >
                        <XCircle className="h-4 w-4 mr-2" />
                        Cancel Subscription
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Cancel your subscription?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Your Family Plan will remain active until the end of your current billing period.
                          After that, you'll be downgraded to the Free Plan with limited features.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Keep Subscription</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => cancelMutation.mutate()}
                          className="bg-destructive text-destructive-foreground"
                          data-testid="button-confirm-cancel"
                        >
                          {cancelMutation.isPending ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          ) : null}
                          Yes, Cancel
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function AccountSettings({ initialTab }: { initialTab?: string }) {
  const defaultTab = initialTab || "account";

  return (
    <div className="p-3 md:p-4">
      <div className="max-w-4xl mx-auto space-y-4">
        <div>
          <h1 className="text-sm font-semibold" data-testid="text-settings-title">Settings</h1>
          <p className="text-xs text-muted-foreground">Manage your account, family, and preferences</p>
        </div>

        <Tabs defaultValue={defaultTab} className="space-y-4">
          <TabsList data-testid="settings-tabs">
            <TabsTrigger value="account" data-testid="tab-account">
              <CreditCard className="h-4 w-4 mr-1.5" />
              Account
            </TabsTrigger>
            <TabsTrigger value="family" data-testid="tab-family">
              <Users className="h-4 w-4 mr-1.5" />
              Family
            </TabsTrigger>
            <TabsTrigger value="import" data-testid="tab-import">
              <Upload className="h-4 w-4 mr-1.5" />
              Import
            </TabsTrigger>
          </TabsList>

          <TabsContent value="account" className="mt-0">
            <AccountTab />
          </TabsContent>

          <TabsContent value="family" className="mt-0">
            <FamilySettings />
          </TabsContent>

          <TabsContent value="import" className="mt-0">
            <ImportSchedule />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
