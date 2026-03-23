import { useQuery, useMutation } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import {
  Users, LayoutDashboard, MessageSquarePlus, Mail,
  Download, Clock, Shield, Calendar, Home,
  CreditCard, User, ChevronRight, TrendingUp,
  BarChart3, DollarSign, UserCheck, Loader2, ExternalLink,
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import {
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, Cell,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/useAuth";
import { Redirect } from "wouter";
import type { BetaFeedback, User as UserType } from "@shared/schema";

const ADMIN_ID = "google-110610540501901085708";

function isAdminUser(user: any) {
  return user?.id === ADMIN_ID || user?.email === "mvicenzino@gmail.com";
}

interface AdminAnalytics {
  totalUsers: number;
  newUsersThisWeek: number;
  newUsersThisMonth: number;
  googleUsers: number;
  emailUsers: number;
  replitUsers: number;
  activeSubscribers: number;
  trialSubscribers: number;
  freeUsers: number;
  estimatedMrr: number;
  totalFamilies: number;
  newFamiliesThisWeek: number;
  totalEvents: number;
  totalMessages: number;
  totalSymptomEntries: number;
  totalMedications: number;
  totalDocuments: number;
  totalMedicationLogs: number;
  totalFeedback: number;
  weeklySignups: { week: string; count: number }[];
}

function StatCard({
  icon: Icon, label, value, sub, accent,
}: {
  icon: any; label: string; value: number | string; sub?: string; accent?: string;
}) {
  return (
    <Card>
      <CardContent className="pt-5 pb-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-xs text-muted-foreground mb-1">{label}</p>
            <p className="text-2xl font-bold text-foreground">{value}</p>
            {sub && <p className="text-[11px] text-muted-foreground mt-0.5">{sub}</p>}
          </div>
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${accent ?? "bg-primary/10"}`}>
            <Icon className={`w-4 h-4 ${accent ? "text-white" : "text-primary"}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function MiniBarRow({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-muted-foreground w-24 shrink-0">{label}</span>
      <div className="flex-1 h-2 rounded-full bg-muted/40 overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-medium text-foreground w-6 text-right">{value}</span>
    </div>
  );
}

function authProviderBadge(provider: string | null | undefined) {
  if (provider === "google") return <Badge variant="outline" className="text-[10px] no-default-hover-elevate no-default-active-elevate">Google</Badge>;
  if (provider === "local") return <Badge variant="outline" className="text-[10px] no-default-hover-elevate no-default-active-elevate">Email</Badge>;
  return <Badge variant="outline" className="text-[10px] no-default-hover-elevate no-default-active-elevate">{provider ?? "?"}</Badge>;
}

function subStatusBadge(status: string | null | undefined) {
  if (status === "active") return <Badge className="text-[10px] bg-green-500/20 text-green-700 dark:text-green-400 no-default-hover-elevate no-default-active-elevate">Active</Badge>;
  if (status === "trialing") return <Badge className="text-[10px] bg-blue-500/20 text-blue-700 dark:text-blue-400 no-default-hover-elevate no-default-active-elevate">Trial</Badge>;
  return <Badge variant="outline" className="text-[10px] no-default-hover-elevate no-default-active-elevate">{status ?? "Free"}</Badge>;
}

export default function AdminDashboard() {
  const { user, isLoading: authLoading } = useAuth();

  const enabled = !authLoading && isAdminUser(user);

  const checkoutMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/checkout/create-session");
      return res.json() as Promise<{ url: string }>;
    },
    onSuccess: (data) => {
      window.location.href = data.url;
    },
  });

  const { data: stats, isLoading: statsLoading } = useQuery<{ totalUsers: number; totalFamilies: number; totalEvents: number; totalFeedback: number }>({
    queryKey: ["/api/admin/stats"],
    enabled,
  });

  const { data: analytics, isLoading: analyticsLoading } = useQuery<AdminAnalytics>({
    queryKey: ["/api/admin/analytics"],
    enabled,
  });

  const { data: allUsers = [], isLoading: usersLoading } = useQuery<UserType[]>({
    queryKey: ["/api/admin/users"],
    enabled,
  });

  const { data: feedback = [], isLoading: feedbackLoading } = useQuery<BetaFeedback[]>({
    queryKey: ["/api/admin/feedback"],
    enabled,
  });

  if (authLoading) return null;
  if (!isAdminUser(user)) return <Redirect to="/" />;

  function downloadUsersCsv() {
    const header = "Joined,Name,Email,ID,Auth,Subscription,Status";
    const rows = allUsers.map(u => [
      u.createdAt ? format(new Date(u.createdAt), "yyyy-MM-dd") : "",
      `"${[u.firstName, u.lastName].filter(Boolean).join(" ").replace(/"/g, '""')}"`,
      u.email ?? "",
      u.id,
      u.authProvider ?? "local",
      u.subscriptionTier ?? "free",
      u.subscriptionStatus ?? "inactive",
    ].join(","));
    const blob = new Blob([[header, ...rows].join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `kindora-users-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function downloadFeedbackCsv() {
    const header = "Submitted,Name,Email,User ID,Comments";
    const rows = [...feedback].reverse().map(e => [
      e.createdAt ? format(new Date(e.createdAt), "yyyy-MM-dd HH:mm") : "",
      `"${(e.name ?? "").replace(/"/g, '""')}"`,
      e.email ?? "",
      e.userId ?? "anonymous",
      `"${(e.comments ?? "").replace(/"/g, '""').replace(/\n/g, " ")}"`,
    ].join(","));
    const blob = new Blob([[header, ...rows].join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `kindora-feedback-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const featureMax = Math.max(
    analytics?.totalEvents ?? 0,
    analytics?.totalMessages ?? 0,
    analytics?.totalSymptomEntries ?? 0,
    analytics?.totalMedications ?? 0,
    analytics?.totalDocuments ?? 0,
    1,
  );

  const authMax = Math.max(
    analytics?.googleUsers ?? 0,
    analytics?.emailUsers ?? 0,
    analytics?.replitUsers ?? 0,
    1,
  );

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
          <Shield className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-foreground">Admin</h1>
          <p className="text-xs text-muted-foreground">Kindora Beta Dashboard</p>
        </div>
      </div>

      <Tabs defaultValue="analytics">
        <TabsList className="w-full justify-start">
          <TabsTrigger value="analytics" data-testid="tab-admin-analytics">
            <BarChart3 className="w-3.5 h-3.5 mr-1.5" />Analytics
          </TabsTrigger>
          <TabsTrigger value="overview" data-testid="tab-admin-overview">
            <LayoutDashboard className="w-3.5 h-3.5 mr-1.5" />Overview
          </TabsTrigger>
          <TabsTrigger value="users" data-testid="tab-admin-users">
            <Users className="w-3.5 h-3.5 mr-1.5" />Users
          </TabsTrigger>
          <TabsTrigger value="feedback" data-testid="tab-admin-feedback">
            <MessageSquarePlus className="w-3.5 h-3.5 mr-1.5" />Feedback
          </TabsTrigger>
          <TabsTrigger value="stripe" data-testid="tab-admin-stripe">
            <CreditCard className="w-3.5 h-3.5 mr-1.5" />Stripe
          </TabsTrigger>
        </TabsList>

        {/* ── Analytics ─────────────────────────────────────────── */}
        <TabsContent value="analytics" className="mt-5 space-y-5">
          {analyticsLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                <div key={i} className="h-24 rounded-lg bg-muted/20 animate-pulse" />
              ))}
            </div>
          ) : (
            <>
              {/* Revenue & Subscriptions */}
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Revenue</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <StatCard
                    icon={DollarSign}
                    label="Est. MRR"
                    value={`$${analytics?.estimatedMrr ?? 0}`}
                    sub="active × $7/mo"
                    accent="bg-green-500"
                  />
                  <StatCard
                    icon={UserCheck}
                    label="Active subscribers"
                    value={analytics?.activeSubscribers ?? 0}
                    sub="paying now"
                  />
                  <StatCard
                    icon={CreditCard}
                    label="Trialing"
                    value={analytics?.trialSubscribers ?? 0}
                    sub="14-day trial"
                  />
                  <StatCard
                    icon={Users}
                    label="Free users"
                    value={analytics?.freeUsers ?? 0}
                    sub="no subscription"
                  />
                </div>
              </div>

              {/* Growth */}
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Growth</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                  <StatCard icon={Users} label="Total users" value={analytics?.totalUsers ?? 0} />
                  <StatCard icon={TrendingUp} label="New this week" value={analytics?.newUsersThisWeek ?? 0} />
                  <StatCard icon={TrendingUp} label="New this month" value={analytics?.newUsersThisMonth ?? 0} />
                  <StatCard icon={Home} label="Families" value={analytics?.totalFamilies ?? 0} sub={`+${analytics?.newFamiliesThisWeek ?? 0} this week`} />
                </div>

                {(analytics?.weeklySignups?.length ?? 0) > 0 ? (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Weekly signups (last 8 weeks)</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={160}>
                        <BarChart data={analytics!.weeklySignups} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                          <XAxis
                            dataKey="week"
                            tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                            tickFormatter={w => {
                              try { return format(parseISO(w), "MMM d"); } catch { return w; }
                            }}
                          />
                          <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} allowDecimals={false} />
                          <Tooltip
                            contentStyle={{ fontSize: 12, background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 6 }}
                            labelFormatter={w => {
                              try { return `Week of ${format(parseISO(w), "MMM d, yyyy")}`; } catch { return w; }
                            }}
                          />
                          <Bar dataKey="count" name="New users" radius={[3, 3, 0, 0]}>
                            {analytics!.weeklySignups.map((_, i) => (
                              <Cell key={i} fill="hsl(var(--primary))" opacity={0.8} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                ) : (
                  <Card>
                    <CardContent className="py-8 text-center text-muted-foreground text-sm">
                      Not enough signup history yet to show a chart.
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Feature Usage */}
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Feature usage</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm">Content created</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <MiniBarRow label="Events" value={analytics?.totalEvents ?? 0} max={featureMax} color="bg-primary" />
                      <MiniBarRow label="Messages" value={analytics?.totalMessages ?? 0} max={featureMax} color="bg-blue-500" />
                      <MiniBarRow label="Health logs" value={analytics?.totalSymptomEntries ?? 0} max={featureMax} color="bg-rose-500" />
                      <MiniBarRow label="Medications" value={analytics?.totalMedications ?? 0} max={featureMax} color="bg-violet-500" />
                      <MiniBarRow label="Documents" value={analytics?.totalDocuments ?? 0} max={featureMax} color="bg-emerald-500" />
                      <MiniBarRow label="Med administrations" value={analytics?.totalMedicationLogs ?? 0} max={featureMax} color="bg-amber-500" />
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm">Sign-in methods</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <MiniBarRow label="Google" value={analytics?.googleUsers ?? 0} max={authMax} color="bg-blue-500" />
                      <MiniBarRow label="Email/Password" value={analytics?.emailUsers ?? 0} max={authMax} color="bg-amber-500" />
                      <MiniBarRow label="Replit OIDC" value={analytics?.replitUsers ?? 0} max={authMax} color="bg-violet-500" />
                    </CardContent>
                  </Card>
                </div>
              </div>
            </>
          )}
        </TabsContent>

        {/* ── Overview ─────────────────────────────────────────────── */}
        <TabsContent value="overview" className="mt-5 space-y-4">
          {statsLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[1, 2, 3, 4].map(i => <div key={i} className="h-24 rounded-lg bg-muted/20 animate-pulse" />)}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <StatCard icon={Users} label="Total users" value={stats?.totalUsers ?? 0} />
              <StatCard icon={Home} label="Families" value={stats?.totalFamilies ?? 0} />
              <StatCard icon={Calendar} label="Events" value={stats?.totalEvents ?? 0} />
              <StatCard icon={MessageSquarePlus} label="Feedback" value={stats?.totalFeedback ?? 0} />
            </div>
          )}

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Quick access</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              {[
                { label: "View all users", tab: "users", icon: Users },
                { label: "View feedback", tab: "feedback", icon: MessageSquarePlus },
              ].map(item => (
                <button
                  key={item.tab}
                  className="flex items-center justify-between w-full px-3 py-2 rounded-md text-sm text-foreground hover-elevate"
                  data-testid={`link-admin-${item.tab}`}
                >
                  <span className="flex items-center gap-2">
                    <item.icon className="w-3.5 h-3.5 text-muted-foreground" />
                    {item.label}
                  </span>
                  <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
                </button>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Users ────────────────────────────────────────────────── */}
        <TabsContent value="users" className="mt-5 space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <p className="text-sm text-muted-foreground">
              {usersLoading ? "Loading…" : `${allUsers.length} registered user${allUsers.length !== 1 ? "s" : ""}`}
            </p>
            {allUsers.length > 0 && (
              <Button variant="outline" size="sm" onClick={downloadUsersCsv} data-testid="button-download-users-csv">
                <Download className="w-4 h-4 mr-2" />Export CSV
              </Button>
            )}
          </div>

          {usersLoading && (
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map(i => <div key={i} className="h-16 rounded-lg bg-muted/20 animate-pulse" />)}
            </div>
          )}

          {!usersLoading && allUsers.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">No users yet.</p>
            </div>
          )}

          {!usersLoading && allUsers.map(u => {
            const fullName = [u.firstName, u.lastName].filter(Boolean).join(" ") || "—";
            const joined = u.createdAt ? format(new Date(u.createdAt), "MMM d, yyyy") : "—";
            return (
              <div key={u.id} className="flex items-start gap-3 px-3 py-3 rounded-lg bg-muted/20 border border-border/40" data-testid={`row-user-${u.id}`}>
                <div className="w-8 h-8 rounded-full bg-primary/15 flex items-center justify-center flex-shrink-0 text-xs font-bold text-primary">
                  {(u.firstName?.[0] ?? u.email?.[0] ?? "?").toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-foreground">{fullName}</span>
                    {authProviderBadge(u.authProvider)}
                    {subStatusBadge(u.subscriptionStatus)}
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{u.email ?? "no email"}</p>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                      <Clock className="w-2.5 h-2.5" />Joined {joined}
                    </span>
                    {u.stripeCustomerId && (
                      <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                        <CreditCard className="w-2.5 h-2.5" />{u.subscriptionTier}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </TabsContent>

        {/* ── Feedback ─────────────────────────────────────────────── */}
        <TabsContent value="feedback" className="mt-5 space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <p className="text-sm text-muted-foreground">
              {feedbackLoading ? "Loading…" : `${feedback.length} submission${feedback.length !== 1 ? "s" : ""}`}
            </p>
            {feedback.length > 0 && (
              <Button variant="outline" size="sm" onClick={downloadFeedbackCsv} data-testid="button-download-feedback-csv">
                <Download className="w-4 h-4 mr-2" />Export CSV
              </Button>
            )}
          </div>

          {feedbackLoading && (
            <div className="space-y-3">
              {[1, 2, 3].map(i => <div key={i} className="h-28 rounded-lg bg-muted/20 animate-pulse" />)}
            </div>
          )}

          {!feedbackLoading && feedback.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <MessageSquarePlus className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">No feedback submitted yet.</p>
            </div>
          )}

          {!feedbackLoading && [...feedback].reverse().map(entry => (
            <Card key={entry.id} data-testid={`card-feedback-${entry.id}`}>
              <CardHeader className="pb-2 flex flex-row items-start justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2 min-w-0">
                  <User className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                  <span className="text-sm font-semibold text-foreground truncate">{entry.name}</span>
                  <a
                    href={`mailto:${entry.email}`}
                    className="flex items-center gap-1 text-xs text-primary hover:underline"
                    data-testid={`link-email-${entry.id}`}
                  >
                    <Mail className="w-3 h-3" />
                    {entry.email}
                  </a>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {entry.userId && (
                    <Badge variant="outline" className="text-[10px] no-default-hover-elevate no-default-active-elevate">
                      {entry.userId.startsWith("google-") ? "Google" : entry.userId.startsWith("demo-") ? "Demo" : "Email"}
                    </Badge>
                  )}
                  {entry.createdAt && (
                    <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                      <Clock className="w-3 h-3" />
                      {format(new Date(entry.createdAt), "MMM d, yyyy · h:mm a")}
                    </span>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{entry.comments}</p>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        {/* ── Stripe ───────────────────────────────────────────────── */}
        <TabsContent value="stripe" className="mt-5 space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-primary" />
                Test checkout flow
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Launches the real Stripe checkout using your account. In development, this uses <strong>test mode</strong> — no real charge. Use test card <code className="bg-muted px-1 rounded text-xs">4242 4242 4242 4242</code> with any future expiry and any CVV.
              </p>
              <div className="rounded-md border border-border bg-muted/20 p-3 space-y-1">
                <p className="text-xs font-medium text-foreground">What this tests end-to-end:</p>
                <ul className="text-xs text-muted-foreground space-y-0.5 list-disc list-inside">
                  <li>Stripe customer creation (or reuse)</li>
                  <li>Checkout session + 14-day trial setup</li>
                  <li>Webhook receipt &amp; subscription status update in your DB</li>
                  <li>Redirect back to <code className="bg-muted px-1 rounded">/settings?subscription=success</code></li>
                </ul>
              </div>
              <div className="flex items-center gap-3 flex-wrap">
                <Button
                  onClick={() => checkoutMutation.mutate()}
                  disabled={checkoutMutation.isPending}
                  data-testid="button-test-stripe-checkout"
                >
                  {checkoutMutation.isPending ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <ExternalLink className="w-4 h-4 mr-2" />
                  )}
                  Launch test checkout
                </Button>
                {checkoutMutation.isError && (
                  <p className="text-xs text-destructive">
                    Failed to create session — check server logs.
                  </p>
                )}
              </div>
              <p className="text-xs text-muted-foreground pt-1">
                After a successful test, check your <a href="https://dashboard.stripe.com/test/payments" target="_blank" rel="noopener noreferrer" className="text-primary underline">Stripe test dashboard</a> to confirm the payment and subscription appear there too.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
