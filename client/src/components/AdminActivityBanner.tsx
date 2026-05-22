import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { Sparkles, ChevronDown, ChevronUp, X, Users } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import type { User as UserType } from "@shared/schema";

const ADMIN_ID = "google-110610540501901085708";

function isAdminUser(user: any) {
  return user?.id === ADMIN_ID || user?.email === "mvicenzino@gmail.com";
}

export default function AdminActivityBanner() {
  const { user } = useAuth();
  const [expanded, setExpanded] = useState(false);
  const [dismissedKey, setDismissedKey] = useState<string | null>(() => {
    try { return localStorage.getItem("admin_banner_dismissed_until"); } catch { return null; }
  });

  const admin = isAdminUser(user);

  const { data: users } = useQuery<UserType[]>({
    queryKey: ["/api/admin/users"],
    enabled: admin,
    refetchInterval: 60_000,
    staleTime: 30_000,
  });

  if (!admin) return null;

  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;

  const recent = (users || [])
    .filter((u) => !u.id?.startsWith("demo-"))
    .filter((u) => u.createdAt && now - new Date(u.createdAt).getTime() < 7 * dayMs)
    .sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime());

  if (recent.length === 0) return null;

  const newest = recent[0];
  const newestTs = new Date(newest.createdAt!).getTime();
  const dismissTs = dismissedKey ? parseInt(dismissedKey, 10) : 0;
  if (dismissTs && dismissTs >= newestTs) return null;

  const todayCount = recent.filter((u) => now - new Date(u.createdAt!).getTime() < dayMs).length;
  const weekCount = recent.length;

  function dismiss() {
    const until = String(newestTs);
    try { localStorage.setItem("admin_banner_dismissed_until", until); } catch {}
    setDismissedKey(until);
  }

  return (
    <div className="border-b border-primary/20 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent" data-testid="admin-activity-banner">
      <div className="px-4 py-2 flex items-center gap-3 flex-wrap">
        <div className="w-7 h-7 rounded-md bg-primary/15 border border-primary/25 flex items-center justify-center flex-shrink-0">
          <Sparkles className="w-3.5 h-3.5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold text-foreground flex items-center gap-2 flex-wrap">
            <span data-testid="text-admin-banner-summary">
              {todayCount > 0
                ? `${todayCount} new sign-up${todayCount === 1 ? "" : "s"} today`
                : `${weekCount} new sign-up${weekCount === 1 ? "" : "s"} this week`}
            </span>
            <span className="text-xs font-normal text-muted-foreground">
              Newest: {newest.firstName || newest.email?.split("@")[0]} · {formatDistanceToNow(new Date(newest.createdAt!), { addSuffix: true })}
            </span>
          </div>
        </div>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => setExpanded((v) => !v)}
          className="gap-1 h-7 text-xs"
          data-testid="button-admin-banner-toggle"
        >
          <Users className="w-3.5 h-3.5" />
          {expanded ? "Hide" : `View ${weekCount}`}
          {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </Button>
        <Button
          size="icon"
          variant="ghost"
          onClick={dismiss}
          className="h-7 w-7"
          title="Dismiss until next sign-up"
          data-testid="button-admin-banner-dismiss"
        >
          <X className="w-3.5 h-3.5" />
        </Button>
      </div>
      {expanded && (
        <div className="px-4 pb-3 max-h-72 overflow-y-auto">
          <div className="rounded-md border border-border bg-card divide-y divide-border">
            {recent.map((u) => (
              <div key={u.id} className="flex items-center gap-3 px-3 py-2 text-sm" data-testid={"row-signup-" + u.id}>
                <div className="w-7 h-7 rounded-full bg-primary/15 border border-primary/25 flex items-center justify-center text-xs font-semibold text-primary flex-shrink-0">
                  {(u.firstName?.[0] || u.email?.[0] || "?").toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-foreground truncate">
                    {u.firstName || u.email?.split("@")[0]} {u.lastName || ""}
                  </div>
                  <a href={"mailto:" + u.email} className="text-xs text-muted-foreground truncate hover:text-primary transition-colors block">
                    {u.email}
                  </a>
                </div>
                <div className="text-xs text-muted-foreground flex-shrink-0 text-right">
                  <div>{formatDistanceToNow(new Date(u.createdAt!), { addSuffix: true })}</div>
                  <div className="text-[10px] opacity-70">{u.id?.startsWith("google-") ? "Google" : u.id?.startsWith("replit-") ? "Replit" : "Email"}</div>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-2 text-right">
            <a href="/admin" className="text-xs text-primary hover:underline" data-testid="link-admin-dashboard">Open full admin dashboard →</a>
          </div>
        </div>
      )}
    </div>
  );
}
