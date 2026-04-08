import { useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Mail, MessageSquare, CheckCircle2, ArrowRight, Clock, Heart } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

const logo = "/kindora-logo.jpeg";

const SUBJECT_OPTIONS = [
  "General question",
  "Bug report",
  "Feature request",
  "Account or billing",
  "Beta feedback",
  "Other",
];

export default function Support() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState(SUBJECT_OPTIONS[0]);
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !message.trim()) {
      toast({ title: "Please fill in all fields", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await apiRequest("POST", "/api/support", { name, email, subject, message });
      if (!res.ok) throw new Error("Failed to send");
      setSubmitted(true);
    } catch {
      toast({
        title: "Something went wrong",
        description: "Please try again or email us directly at mike@kindora.ai",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Nav */}
      <header className="border-b border-border px-4 md:px-6 py-4 sticky top-0 z-50 bg-background/95 backdrop-blur-sm">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-2.5">
            <img src={logo} alt="Kindora" className="w-8 h-8 rounded-lg object-cover" />
            <span className="font-bold text-foreground text-lg">Kindora</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/about">
              <Button variant="ghost" size="sm" data-testid="link-about">About</Button>
            </Link>
            <Link href="/">
              <Button size="sm" data-testid="link-get-started">Get Started</Button>
            </Link>
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 md:px-6 py-12 md:py-16">
        <div className="grid md:grid-cols-5 gap-10 md:gap-16 items-start">

          {/* Left: info */}
          <div className="md:col-span-2">
            <div className="inline-flex items-center gap-2 bg-primary/10 text-primary text-sm font-semibold px-4 py-1.5 rounded-full mb-5 border border-primary/20">
              <MessageSquare className="w-4 h-4" />
              Support
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-4 leading-tight">
              We're here to help
            </h1>
            <p className="text-muted-foreground leading-relaxed mb-8">
              During beta, every support message goes directly to our founder. We read every one and typically respond within 24 hours.
            </p>

            <div className="space-y-5">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Mail className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="font-semibold text-foreground text-sm">Email us directly</p>
                  <a
                    href="mailto:mike@kindora.ai"
                    className="text-sm text-primary hover:underline"
                    data-testid="link-email-direct"
                  >
                    mike@kindora.ai
                  </a>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Clock className="w-4 h-4 text-blue-500" />
                </div>
                <div>
                  <p className="font-semibold text-foreground text-sm">Response time</p>
                  <p className="text-sm text-muted-foreground">Usually within 24 hours</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-pink-500/10 border border-pink-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Heart className="w-4 h-4 text-pink-500" />
                </div>
                <div>
                  <p className="font-semibold text-foreground text-sm">Beta feedback welcome</p>
                  <p className="text-sm text-muted-foreground">Feature ideas, bug reports, and honest opinions all help us build a better Kindora</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right: form */}
          <div className="md:col-span-3">
            <div className="bg-card border border-border rounded-2xl p-6 md:p-8">
              {submitted ? (
                <div className="text-center py-8">
                  <div className="w-14 h-14 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-4">
                    <CheckCircle2 className="w-7 h-7 text-primary" />
                  </div>
                  <h2 className="text-xl font-bold text-foreground mb-2">Message sent!</h2>
                  <p className="text-muted-foreground mb-6">
                    Thanks for reaching out, {name.split(" ")[0]}. We'll get back to you at <span className="text-foreground font-medium">{email}</span> within 24 hours.
                  </p>
                  <div className="flex items-center justify-center gap-3 flex-wrap">
                    <Button variant="outline" onClick={() => { setSubmitted(false); setName(""); setEmail(""); setMessage(""); setSubject(SUBJECT_OPTIONS[0]); }} data-testid="button-send-another">
                      Send another message
                    </Button>
                    <Link href="/">
                      <Button data-testid="link-back-home">
                        Back to Kindora
                        <ArrowRight className="w-4 h-4 ml-1" />
                      </Button>
                    </Link>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div>
                    <h2 className="text-xl font-bold text-foreground mb-1">Send us a message</h2>
                    <p className="text-sm text-muted-foreground">All fields are required.</p>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="support-name" className="text-sm font-medium">Your name</Label>
                      <Input
                        id="support-name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Jane Smith"
                        data-testid="input-support-name"
                        disabled={isSubmitting}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="support-email" className="text-sm font-medium">Email address</Label>
                      <Input
                        id="support-email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="jane@example.com"
                        data-testid="input-support-email"
                        disabled={isSubmitting}
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="support-subject" className="text-sm font-medium">Subject</Label>
                    <select
                      id="support-subject"
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      data-testid="select-support-subject"
                      disabled={isSubmitting}
                      className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm text-foreground shadow-sm focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50"
                    >
                      {SUBJECT_OPTIONS.map((opt) => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="support-message" className="text-sm font-medium">Message</Label>
                    <Textarea
                      id="support-message"
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="Tell us what's on your mind — a bug you found, a feature you'd love, or just how Kindora is working for your family..."
                      rows={5}
                      data-testid="textarea-support-message"
                      disabled={isSubmitting}
                      className="resize-none"
                    />
                  </div>

                  <Button
                    type="submit"
                    className="w-full"
                    disabled={isSubmitting || !name.trim() || !email.trim() || !message.trim()}
                    data-testid="button-support-submit"
                  >
                    {isSubmitting ? "Sending..." : "Send message"}
                    {!isSubmitting && <ArrowRight className="w-4 h-4 ml-1" />}
                  </Button>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-border px-4 md:px-6 py-6 mt-8">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 flex-wrap">
          <p className="text-sm text-muted-foreground">© 2026 Kindora Family, Inc.</p>
          <div className="flex items-center gap-4 flex-wrap">
            <Link href="/about" className="text-sm text-muted-foreground hover:text-foreground transition-colors">About</Link>
            <Link href="/support" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Support</Link>
            <Link href="/terms" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Terms</Link>
            <Link href="/privacy" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Privacy</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
