import { useState } from "react";
import { Link } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Mail, ArrowLeft, CheckCircle2 } from "lucide-react";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);

  const mutation = useMutation({
    mutationFn: async (data: { email: string }) => {
      const res = await apiRequest("POST", "/api/auth/forgot-password", data);
      return res.json();
    },
    onSuccess: () => setSent(true),
    // We still show the success state on error to avoid leaking which emails
    // are registered, but log for debugging.
    onError: () => setSent(true),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    mutation.mutate({ email });
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle data-testid="text-forgot-title">Reset your password</CardTitle>
          <CardDescription>
            {sent
              ? "Check your email for a link to reset your password."
              : "Enter your email and we'll send you a link to reset your password."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {sent ? (
            <div className="space-y-6">
              <div className="flex items-start gap-3 rounded-md bg-muted p-4">
                <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                <p className="text-sm text-muted-foreground" data-testid="text-sent-confirmation">
                  If an account exists for that email, a reset link is on its way. The link
                  expires in 1 hour.
                </p>
              </div>
              <Button asChild variant="outline" className="w-full">
                <Link href="/" data-testid="link-back-home">
                  <ArrowLeft className="w-4 h-4" />
                  Back to sign in
                </Link>
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-sm text-muted-foreground">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="pl-9"
                    data-testid="input-email"
                  />
                </div>
              </div>
              <Button
                type="submit"
                disabled={mutation.isPending}
                className="w-full"
                data-testid="button-send-reset"
              >
                {mutation.isPending ? "Sending..." : "Send reset link"}
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
