import { useQuery } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import { MessageSquarePlus, Mail, User, Clock, Download } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { Redirect } from "wouter";
import type { BetaFeedback } from "@shared/schema";

const ADMIN_ID = "google-110610540501901085708";

export default function AdminFeedback() {
  const { user, isLoading: authLoading } = useAuth();

  const { data: entries = [], isLoading } = useQuery<BetaFeedback[]>({
    queryKey: ["/api/admin/feedback"],
    enabled: !authLoading && !!user,
  });

  if (authLoading) return null;

  const isAdmin = (user as any)?.id === ADMIN_ID || (user as any)?.email === "mvicenzino@gmail.com";
  if (!isAdmin) return <Redirect to="/" />;

  function downloadCsv() {
    const header = "Submitted,Name,Email,User ID,Comments";
    const rows = entries.map(e => [
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

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
            <MessageSquarePlus className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">Beta Feedback</h1>
            <p className="text-sm text-muted-foreground">
              {isLoading ? "Loading…" : `${entries.length} submission${entries.length !== 1 ? "s" : ""}`}
            </p>
          </div>
        </div>
        {entries.length > 0 && (
          <Button variant="outline" size="sm" onClick={downloadCsv} data-testid="button-download-csv">
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
        )}
      </div>

      {isLoading && (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-28 rounded-lg bg-muted/20 animate-pulse" />
          ))}
        </div>
      )}

      {!isLoading && entries.length === 0 && (
        <div className="text-center py-16 text-muted-foreground">
          <MessageSquarePlus className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">No feedback submitted yet.</p>
        </div>
      )}

      {!isLoading && entries.length > 0 && (
        <div className="space-y-3">
          {[...entries].reverse().map(entry => (
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
                      {entry.userId.startsWith("google-") ? "Google" : entry.userId.startsWith("demo-") ? "Demo" : "User"}
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
        </div>
      )}
    </div>
  );
}
