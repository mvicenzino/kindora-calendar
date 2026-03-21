import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation, useSearch } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Check, Crown, User, Loader2, ExternalLink, XCircle, RefreshCw, Users, Upload, Sparkles, CreditCard, Bell, BellOff, Smartphone, Send, Type, Clock, MessageSquare, Mail, Calendar as CalendarIcon, Sun, Moon } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import { useCalendarTextSize, TEXT_SCALE_LABELS, TEXT_SCALE_SIZES } from "@/hooks/useCalendarTextSize";
import type { CalendarTextScale } from "@/hooks/useCalendarTextSize";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import FamilySettings from "./FamilySettings";
import ImportSchedule from "./ImportSchedule";
import KiraProfile from "./KiraProfile";

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

  const [firstName, setFirstName] = useState(user?.firstName || "");
  const [lastName, setLastName] = useState(user?.lastName || "");
  const [profileSaved, setProfileSaved] = useState(false);

  const updateProfileMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("PATCH", "/api/auth/user", { firstName, lastName });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      setProfileSaved(true);
      setTimeout(() => setProfileSaved(false), 3000);
      toast({ title: "Profile updated", description: "Your name has been saved." });
    },
    onError: (error: any) => {
      toast({ title: "Could not update profile", description: error.message || "Please try again.", variant: "destructive" });
    },
  });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <User className="h-4 w-4" />
            Your Profile
          </CardTitle>
          <CardDescription className="text-xs">Update your display name</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">First Name</Label>
              <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="First name" className="h-8 text-sm" data-testid="input-first-name" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Last Name</Label>
              <Input value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Last name" className="h-8 text-sm" data-testid="input-last-name" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={() => updateProfileMutation.mutate()} disabled={updateProfileMutation.isPending || !firstName.trim()} data-testid="button-save-profile">
              {updateProfileMutation.isPending ? "Saving..." : profileSaved ? "Saved!" : "Save Name"}
            </Button>
            {profileSaved && <span className="text-xs text-emerald-400">Changes saved</span>}
          </div>
        </CardContent>
      </Card>

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

      {/* Display Preferences Card */}
      <DisplayPreferencesCard />

      {/* Push Notifications Card */}
      <PushNotificationsCard />
    </div>
  );
}

function DisplayPreferencesCard() {
  const { scale, updateScale } = useCalendarTextSize();
  const previewSizes = TEXT_SCALE_SIZES[scale];
  const { theme, setTheme } = useTheme();

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Type className="h-4 w-4 text-muted-foreground" />
          <CardTitle className="text-sm">Display</CardTitle>
        </div>
        <CardDescription>Adjust appearance and how calendar events look on screen.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Theme picker */}
        <div className="space-y-2">
          <p className="text-sm font-medium text-foreground">Color theme</p>
          <div className="flex gap-2">
            <button
              onClick={() => setTheme("light")}
              data-testid="button-theme-light"
              className={`
                flex-1 flex items-center justify-center gap-2 rounded-lg border px-4 py-3
                text-sm font-medium transition-all duration-200
                ${theme === "light"
                  ? "bg-primary/10 border-primary/40 text-primary"
                  : "bg-card border-border text-muted-foreground hover-elevate"}
              `}
            >
              <Sun className="w-4 h-4" />
              Light
            </button>
            <button
              onClick={() => setTheme("dark")}
              data-testid="button-theme-dark"
              className={`
                flex-1 flex items-center justify-center gap-2 rounded-lg border px-4 py-3
                text-sm font-medium transition-all duration-200
                ${theme === "dark"
                  ? "bg-primary/10 border-primary/40 text-primary"
                  : "bg-card border-border text-muted-foreground hover-elevate"}
              `}
            >
              <Moon className="w-4 h-4" />
              Dark
            </button>
          </div>
        </div>

        <div className="border-t border-border/50" />

        {/* Slider control */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-foreground">Calendar text size</p>
            <span className="text-xs font-semibold text-primary" data-testid="text-scale-label">
              {TEXT_SCALE_LABELS[scale]}
            </span>
          </div>
          <Slider
            min={1}
            max={5}
            step={1}
            value={[scale]}
            onValueChange={([v]) => updateScale(v as CalendarTextScale)}
            data-testid="slider-calendar-text-size"
            className="w-full"
          />
          <div className="flex justify-between">
            {([1, 2, 3, 4, 5] as CalendarTextScale[]).map((s) => (
              <span key={s} className="text-[10px] text-muted-foreground">{TEXT_SCALE_LABELS[s]}</span>
            ))}
          </div>
        </div>

        {/* Live preview */}
        <div
          className="rounded-xl border border-border/50 overflow-hidden"
          style={{ background: "hsl(var(--card))" }}
          aria-label="Preview of calendar event text size"
          data-testid="preview-calendar-text"
        >
          <div className="px-3 py-2 border-b border-border/40">
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Preview</p>
          </div>
          {[
            { title: "Dr. Johnson – Annual checkup", time: "9:00 AM – 10:00 AM", color: "#f97316" },
            { title: "School pick-up", time: "3:15 PM – 3:30 PM", color: "#3b82f6" },
            { title: "Mom's physical therapy", time: "2:00 PM – 3:00 PM", color: "#8b5cf6" },
          ].map((item, i) => (
            <div
              key={i}
              className="flex items-center gap-3 px-3 py-2.5 border-b border-border/30 last:border-0"
            >
              <div
                className="w-1 self-stretch rounded-full flex-shrink-0"
                style={{ background: item.color, minHeight: "32px" }}
              />
              <div className="flex-1 min-w-0">
                <p
                  className="font-semibold text-foreground truncate"
                  style={{ fontSize: previewSizes.title }}
                >
                  {item.title}
                </p>
                <p
                  className="text-muted-foreground flex items-center gap-1 mt-0.5"
                  style={{ fontSize: previewSizes.meta }}
                >
                  <Clock style={{ width: previewSizes.meta, height: previewSizes.meta }} />
                  {item.time}
                </p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function PushNotificationsCard() {
  const { toast } = useToast();
  const {
    isSupported,
    isPwaInstalled,
    permission,
    isSubscribed,
    isLoading,
    subscribe,
    unsubscribe,
    sendTest,
  } = usePushNotifications();

  const handleToggle = async (checked: boolean) => {
    if (checked) {
      const ok = await subscribe();
      if (ok) {
        toast({ title: "Notifications enabled", description: "You'll get reminders for important events." });
      } else if (permission === "denied") {
        toast({ title: "Permission denied", description: "Enable notifications in your iPhone Settings > Kindora.", variant: "destructive" });
      }
    } else {
      await unsubscribe();
      toast({ title: "Notifications turned off", description: "You won't receive push reminders anymore." });
    }
  };

  const handleTest = async () => {
    await sendTest();
    toast({ title: "Test sent!", description: "Check for a notification from Kindora." });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Bell className="h-4 w-4 text-primary" />
          <CardTitle className="text-sm">iPhone Notifications</CardTitle>
        </div>
        <CardDescription>
          Get reminder banners on your iPhone for upcoming and important events.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!isSupported ? (
          <div className="rounded-xl bg-muted/60 border border-border p-4 space-y-2">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Smartphone className="h-4 w-4 flex-shrink-0" />
              <p className="text-sm font-medium">Not available in this browser</p>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Push notifications require iOS 16.4 or later and the app must be added to your Home Screen.
            </p>
            <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
              <li>Open <strong>kindora.ai</strong> in Safari on your iPhone</li>
              <li>Tap the Share button <strong>⎋</strong> at the bottom</li>
              <li>Tap <strong>"Add to Home Screen"</strong></li>
              <li>Open Kindora from your Home Screen and return here</li>
            </ol>
          </div>
        ) : !isPwaInstalled ? (
          <div className="rounded-xl bg-muted/60 border border-border p-4 space-y-2">
            <div className="flex items-center gap-2 text-amber-500 dark:text-amber-400">
              <Smartphone className="h-4 w-4 flex-shrink-0" />
              <p className="text-sm font-medium">Add Kindora to your Home Screen first</p>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              iPhone push notifications only work when Kindora is installed as a Home Screen app (PWA).
            </p>
            <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
              <li>Tap the Share button <strong>⎋</strong> in Safari</li>
              <li>Tap <strong>"Add to Home Screen"</strong></li>
              <li>Open Kindora from your Home Screen and come back here</li>
            </ol>
          </div>
        ) : permission === "denied" ? (
          <div className="rounded-xl bg-destructive/10 border border-destructive/20 p-4">
            <div className="flex items-center gap-2 text-destructive mb-1">
              <BellOff className="h-4 w-4 flex-shrink-0" />
              <p className="text-sm font-medium">Notifications blocked</p>
            </div>
            <p className="text-xs text-muted-foreground">
              Go to <strong>iPhone Settings → Kindora → Notifications</strong> and enable "Allow Notifications", then return here.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div className="space-y-0.5">
                <p className="text-sm font-medium text-foreground">
                  {isSubscribed ? "Push notifications on" : "Enable push notifications"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {isSubscribed
                    ? "Kindora will send banners for upcoming important events."
                    : "Tap to allow Kindora to send you reminder banners."}
                </p>
              </div>
              {isLoading ? (
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground flex-shrink-0" />
              ) : (
                <Switch
                  checked={isSubscribed}
                  onCheckedChange={handleToggle}
                  data-testid="toggle-push-notifications"
                />
              )}
            </div>

            {isSubscribed && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleTest}
                data-testid="button-test-notification"
                className="gap-2"
              >
                <Send className="h-3.5 w-3.5" />
                Send a test notification
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function FeedbackReview() {
  const { data: entries = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/admin/feedback"],
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <MessageSquare className="w-8 h-8 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No feedback submitted yet.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">{entries.length} submission{entries.length !== 1 ? "s" : ""}</p>
      </div>
      {entries.map((entry: any) => (
        <Card key={entry.id} data-testid={`card-feedback-${entry.id}`}>
          <CardContent className="p-4 space-y-2">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <span className="text-[11px] font-semibold text-primary">{entry.name?.[0]?.toUpperCase() || "?"}</span>
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">{entry.name}</p>
                  <a href={`mailto:${entry.email}`} className="text-xs text-primary flex items-center gap-1 hover:underline">
                    <Mail className="w-3 h-3" />
                    {entry.email}
                  </a>
                </div>
              </div>
              <div className="flex items-center gap-1 text-xs text-muted-foreground flex-shrink-0">
                <CalendarIcon className="w-3 h-3" />
                {entry.createdAt ? new Date(entry.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" }) : "—"}
              </div>
            </div>
            <div className="bg-muted/40 rounded-md px-3 py-2.5 border border-border">
              <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{entry.comments}</p>
            </div>
            {entry.userId && (
              <p className="text-[10px] text-muted-foreground/60">User ID: {entry.userId}</p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

const ADMIN_USER_ID = "google-110610540501901085708";
const ADMIN_EMAIL = "mvicenzino@gmail.com";

export default function AccountSettings({ initialTab }: { initialTab?: string }) {
  const { user } = useAuth();
  const isAdmin = user?.id === ADMIN_USER_ID || user?.email === ADMIN_EMAIL;
  const defaultTab = initialTab || "account";

  return (
    <div className="p-3 md:p-4">
      <div className="max-w-4xl mx-auto space-y-4">
        <div>
          <h1 className="text-sm font-semibold" data-testid="text-settings-title">Settings</h1>
          <p className="text-xs text-muted-foreground">Manage your account, family, and preferences</p>
        </div>

        <Tabs defaultValue={defaultTab} className="space-y-4">
          <TabsList className="w-full" data-testid="settings-tabs">
            <TabsTrigger value="account" className="flex-1" data-testid="tab-account">
              <CreditCard className="h-4 w-4 sm:mr-1.5" />
              <span className="hidden sm:inline">Account</span>
            </TabsTrigger>
            <TabsTrigger value="family" className="flex-1" data-testid="tab-family">
              <Users className="h-4 w-4 sm:mr-1.5" />
              <span className="hidden sm:inline">Family</span>
            </TabsTrigger>
            <TabsTrigger value="import" className="flex-1" data-testid="tab-import">
              <Upload className="h-4 w-4 sm:mr-1.5" />
              <span className="hidden sm:inline">Import</span>
            </TabsTrigger>
            <TabsTrigger value="kira" className="flex-1" data-testid="tab-kira">
              <Sparkles className="h-4 w-4 sm:mr-1.5" />
              <span className="hidden sm:inline">Kira</span>
            </TabsTrigger>
            {isAdmin && (
              <TabsTrigger value="feedback" className="flex-1" data-testid="tab-feedback">
                <MessageSquare className="h-4 w-4 sm:mr-1.5" />
                <span className="hidden sm:inline">Feedback</span>
              </TabsTrigger>
            )}
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

          <TabsContent value="kira" className="mt-0">
            <KiraProfile />
          </TabsContent>

          {isAdmin && (
            <TabsContent value="feedback" className="mt-0">
              <FeedbackReview />
            </TabsContent>
          )}
        </Tabs>
      </div>
    </div>
  );
}
