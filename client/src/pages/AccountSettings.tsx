import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation, useSearch } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, CreditCard, Check, Crown, Loader2, ExternalLink, XCircle, RefreshCw } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import Header from "@/components/Header";

interface SubscriptionStatus {
  tier: string;
  status: string;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
}

const PLAN_FEATURES = {
  free: [
    "1 family calendar",
    "Up to 3 family members",
    "Basic event management",
    "Day / Week / Month views",
  ],
  family: [
    "Unlimited family calendars",
    "Unlimited family members",
    "Caregiver management & time tracking",
    "Medication tracking & logging",
    "Care Documentation Vault",
    "Emergency Bridge Mode",
    "AI-powered schedule import",
    "Weekly email summaries",
    "Priority support",
  ],
};

export default function AccountSettings() {
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

  const checkoutMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/checkout/create-session");
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
        description: error.message || "Failed to start checkout",
        variant: "destructive",
      });
    },
  });

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
  const isActive = sub?.status === "active";

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="max-w-3xl mx-auto p-4 md:p-6 space-y-6">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/")}
            data-testid="button-back-settings"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold" data-testid="text-settings-title">Account Settings</h1>
            <p className="text-sm text-muted-foreground">Manage your subscription and billing</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <Crown className="h-5 w-5 text-amber-500" />
                <CardTitle>Your Plan</CardTitle>
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
                <Badge variant="secondary" data-testid="badge-plan-tier">Free Plan</Badge>
              )}
            </div>
            <CardDescription>
              {isFamily
                ? isCanceling
                  ? "Your subscription is set to cancel at the end of the billing period."
                  : "You have access to all premium features."
                : "Upgrade to unlock all premium features for your family."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {!isFamily && (
              <div className="grid gap-4 md:grid-cols-2">
                <Card className="border-muted">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">Free</CardTitle>
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-bold">$0</span>
                      <span className="text-muted-foreground">/month</span>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {PLAN_FEATURES.free.map((feature) => (
                        <li key={feature} className="flex items-start gap-2 text-sm">
                          <Check className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>

                <Card className="border-primary/50 relative overflow-visible">
                  <div className="absolute -top-3 left-4">
                    <Badge className="bg-primary text-primary-foreground no-default-hover-elevate no-default-active-elevate">
                      Recommended
                    </Badge>
                  </div>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">Family Plan</CardTitle>
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-bold">$9</span>
                      <span className="text-muted-foreground">/month</span>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <ul className="space-y-2">
                      {PLAN_FEATURES.family.map((feature) => (
                        <li key={feature} className="flex items-start gap-2 text-sm">
                          <Check className="h-4 w-4 mt-0.5 text-primary shrink-0" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                    <Button
                      className="w-full"
                      onClick={() => checkoutMutation.mutate()}
                      disabled={checkoutMutation.isPending}
                      data-testid="button-upgrade-plan"
                    >
                      {checkoutMutation.isPending ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Redirecting to checkout...
                        </>
                      ) : (
                        <>
                          <CreditCard className="h-4 w-4 mr-2" />
                          Upgrade to Family Plan
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>
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
    </div>
  );
}
