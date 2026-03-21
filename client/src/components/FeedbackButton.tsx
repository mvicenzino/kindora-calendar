import { useState } from "react";
import { MessageSquarePlus, X, Send, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/queryClient";

export default function FeedbackButton() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [comments, setComments] = useState("");

  // Pre-fill from logged-in user when panel opens
  function handleOpen() {
    if (!open) {
      setName((user as any)?.firstName ? `${(user as any).firstName} ${(user as any).lastName ?? ""}`.trim() : name);
      setEmail((user as any)?.email ?? email);
    }
    setOpen(o => !o);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !comments.trim()) return;
    setPending(true);
    try {
      await apiRequest("POST", "/api/feedback", { name: name.trim(), email: email.trim(), comments: comments.trim() });
      toast({ title: "Feedback sent", description: "Thanks for helping improve Kindora!" });
      setComments("");
      setOpen(false);
    } catch {
      toast({ title: "Couldn't send feedback", description: "Please try again.", variant: "destructive" });
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="fixed bottom-5 right-5 z-[200] flex flex-col items-end gap-2">
      {open && (
        <div className="w-80 rounded-xl border border-border/60 bg-background shadow-xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border/40 bg-muted/30">
            <div>
              <p className="text-sm font-semibold text-foreground">Share feedback</p>
              <p className="text-[11px] text-muted-foreground">Bugs, ideas, or anything on your mind</p>
            </div>
            <Button size="icon" variant="ghost" onClick={() => setOpen(false)} data-testid="button-close-feedback">
              <X className="w-4 h-4" />
            </Button>
          </div>
          <form onSubmit={handleSubmit} className="p-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Name</Label>
                <Input
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Your name"
                  className="h-8 text-xs"
                  required
                  data-testid="input-feedback-name"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Email</Label>
                <Input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@email.com"
                  className="h-8 text-xs"
                  required
                  data-testid="input-feedback-email"
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">What's on your mind?</Label>
              <Textarea
                value={comments}
                onChange={e => setComments(e.target.value)}
                placeholder="Tell us what you found, what you'd like, or what confused you..."
                className="text-xs resize-none"
                rows={4}
                required
                data-testid="textarea-feedback-comments"
              />
            </div>
            <Button
              type="submit"
              className="w-full"
              disabled={pending || !name.trim() || !email.trim() || !comments.trim()}
              data-testid="button-submit-feedback"
            >
              {pending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
              {pending ? "Sending…" : "Send feedback"}
            </Button>
          </form>
        </div>
      )}
      <Button
        onClick={handleOpen}
        size="sm"
        className="shadow-lg gap-1.5"
        data-testid="button-open-feedback"
      >
        <MessageSquarePlus className="w-4 h-4" />
        Feedback
      </Button>
    </div>
  );
}
