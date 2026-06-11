import { useEffect, useRef, useState } from "react";
import { Link } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { CheckCircle2, AlertCircle, Loader2 } from "lucide-react";

type Status = "loading" | "success" | "error";

export default function VerifyEmail() {
  const [status, setStatus] = useState<Status>("loading");
  const [message, setMessage] = useState("");
  const ranRef = useRef(false);

  useEffect(() => {
    if (ranRef.current) return;
    ranRef.current = true;

    const token = new URLSearchParams(window.location.search).get("token") || "";
    if (!token) {
      setStatus("error");
      setMessage("This verification link is missing or invalid.");
      return;
    }

    (async () => {
      try {
        const res = await apiRequest("GET", `/api/auth/verify-email?token=${encodeURIComponent(token)}`);
        const data = await res.json();
        setStatus("success");
        setMessage(data.message || "Your email has been verified.");
      } catch (error: any) {
        const msg = error?.message?.replace(/^\d+:\s*/, "") || "Verification failed.";
        setStatus("error");
        setMessage(msg);
      }
    })();
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle data-testid="text-verify-title">Email verification</CardTitle>
          <CardDescription>
            {status === "loading" ? "Confirming your email address…" : "Account email confirmation"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {status === "loading" && (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </div>
          )}
          {status === "success" && (
            <div className="flex items-start gap-3 rounded-md bg-muted p-4">
              <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
              <p className="text-sm text-muted-foreground" data-testid="text-verify-message">{message}</p>
            </div>
          )}
          {status === "error" && (
            <div className="flex items-start gap-3 rounded-md bg-muted p-4">
              <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
              <p className="text-sm text-muted-foreground" data-testid="text-verify-message">{message}</p>
            </div>
          )}
          {status !== "loading" && (
            <Button asChild className="w-full">
              <Link href="/" data-testid="link-continue">Continue to Kindora</Link>
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
