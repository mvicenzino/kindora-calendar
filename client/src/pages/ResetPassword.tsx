import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Lock, ArrowLeft, CheckCircle2, AlertCircle } from "lucide-react";

function getTokenFromUrl(): string {
  const params = new URLSearchParams(window.location.search);
  return params.get("token") || "";
}

export default function ResetPassword() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const token = getTokenFromUrl();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [done, setDone] = useState(false);

  const mutation = useMutation({
    mutationFn: async (data: { token: string; password: string }) => {
      const res = await apiRequest("POST", "/api/auth/reset-password", data);
      return res.json();
    },
    onSuccess: () => setDone(true),
    onError: (error: any) => {
      const msg = error?.message?.replace(/^\d+:\s*/, "") || "Reset failed";
      toast({ title: "Couldn't reset password", description: msg, variant: "destructive" });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      toast({ title: "Password too short", description: "Use at least 8 characters.", variant: "destructive" });
      return;
    }
    if (password !== confirm) {
      toast({ title: "Passwords don't match", description: "Please re-enter your new password.", variant: "destructive" });
      return;
    }
    mutation.mutate({ token, password });
  };

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-background">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle data-testid="text-reset-title">Invalid reset link</CardTitle>
            <CardDescription>This password reset link is missing or invalid.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-3 rounded-md bg-muted p-4">
              <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
              <p className="text-sm text-muted-foreground">
                Please request a new reset link and try again.
              </p>
            </div>
            <Button asChild variant="outline" className="w-full">
              <Link href="/forgot-password" data-testid="link-request-new">Request a new link</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle data-testid="text-reset-title">Choose a new password</CardTitle>
          <CardDescription>
            {done ? "Your password has been updated." : "Enter a new password for your account."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {done ? (
            <div className="space-y-6">
              <div className="flex items-start gap-3 rounded-md bg-muted p-4">
                <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                <p className="text-sm text-muted-foreground" data-testid="text-reset-success">
                  All set. You can now sign in with your new password.
                </p>
              </div>
              <Button className="w-full" onClick={() => navigate("/")} data-testid="button-go-signin">
                Go to sign in
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-sm text-muted-foreground">New password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="At least 8 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={8}
                    className="pl-9"
                    data-testid="input-new-password"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="confirm" className="text-sm text-muted-foreground">Confirm password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="confirm"
                    type="password"
                    placeholder="Re-enter your password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    required
                    minLength={8}
                    className="pl-9"
                    data-testid="input-confirm-password"
                  />
                </div>
              </div>
              <Button
                type="submit"
                disabled={mutation.isPending}
                className="w-full"
                data-testid="button-reset-password"
              >
                {mutation.isPending ? "Updating..." : "Update password"}
              </Button>
              <Button asChild variant="ghost" className="w-full">
                <Link href="/" data-testid="link-back-signin">
                  <ArrowLeft className="w-4 h-4" />
                  Back to sign in
                </Link>
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
