import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  UtensilsCrossed, Send, Loader2, Copy, Printer, Mail, Trash2,
  ShoppingCart, ChefHat, Sparkles,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useActiveFamily } from "@/contexts/ActiveFamilyContext";
import type { MealPlan, MealPlanDay, GroceryCategory } from "@shared/schema";

type ChatMsg = { role: "user" | "assistant"; content: string };

const QUICK_START =
  "Hi Kira! I'd like help planning meals for my family this week.";

function planToText(plan: MealPlan): string {
  const days = (plan.days as MealPlanDay[]) ?? [];
  const grocery = (plan.groceryList as GroceryCategory[]) ?? [];
  const lines: string[] = [plan.title];
  if (plan.summary) lines.push(plan.summary);
  lines.push("");
  for (const d of days) {
    lines.push(d.day.toUpperCase());
    for (const m of d.meals) {
      lines.push(`  ${m.name} (${m.mealType})`);
      if (m.description) lines.push(`    ${m.description}`);
      if (m.ingredients.length) lines.push(`    Ingredients: ${m.ingredients.join(", ")}`);
      m.steps.forEach((s, i) => lines.push(`    ${i + 1}. ${s}`));
    }
    lines.push("");
  }
  lines.push("GROCERY LIST");
  for (const g of grocery) {
    lines.push(`  ${g.category}`);
    for (const i of g.items) lines.push(`    - ${i}`);
  }
  return lines.join("\n");
}

function PlanView({ plan }: { plan: MealPlan }) {
  const days = (plan.days as MealPlanDay[]) ?? [];
  const grocery = (plan.groceryList as GroceryCategory[]) ?? [];
  return (
    <div className="space-y-4" data-testid={`plan-view-${plan.id}`}>
      <div>
        <h3 className="text-lg font-semibold" data-testid={`text-plan-title-${plan.id}`}>{plan.title}</h3>
        {plan.summary && <p className="text-sm text-muted-foreground">{plan.summary}</p>}
      </div>

      <Accordion type="multiple" className="w-full">
        {days.map((d, di) => (
          <AccordionItem key={di} value={`day-${di}`} data-testid={`accordion-day-${di}`}>
            <AccordionTrigger className="text-base font-medium">{d.day}</AccordionTrigger>
            <AccordionContent>
              <div className="space-y-4">
                {d.meals.map((m, mi) => (
                  <div key={mi} className="space-y-2" data-testid={`meal-${di}-${mi}`}>
                    <div className="flex items-center gap-2 flex-wrap">
                      <ChefHat className="w-4 h-4 text-primary shrink-0" />
                      <span className="font-medium">{m.name}</span>
                      <Badge variant="secondary">{m.mealType}</Badge>
                    </div>
                    {m.description && <p className="text-sm text-muted-foreground">{m.description}</p>}
                    {m.ingredients.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-1">Ingredients</p>
                        <ul className="list-disc pl-5 text-sm space-y-0.5">
                          {m.ingredients.map((ing, ii) => <li key={ii}>{ing}</li>)}
                        </ul>
                      </div>
                    )}
                    {m.steps.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-1">Steps</p>
                        <ol className="list-decimal pl-5 text-sm space-y-0.5">
                          {m.steps.map((s, si) => <li key={si}>{s}</li>)}
                        </ol>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>

      {grocery.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <ShoppingCart className="w-4 h-4" /> Grocery List
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            {grocery.map((g, gi) => (
              <div key={gi} data-testid={`grocery-cat-${gi}`}>
                <p className="font-medium text-sm mb-1">{g.category}</p>
                <ul className="list-disc pl-5 text-sm space-y-0.5">
                  {g.items.map((it, ii) => <li key={ii}>{it}</li>)}
                </ul>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default function MealPlanner() {
  const { activeFamilyId } = useActiveFamily();
  const { toast } = useToast();

  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const [currentPlan, setCurrentPlan] = useState<MealPlan | null>(null);
  const [viewPlan, setViewPlan] = useState<MealPlan | null>(null);
  const [emailTarget, setEmailTarget] = useState<MealPlan | null>(null);
  const [emailAddr, setEmailAddr] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  // Custom queryFn: the list route is GET /api/meals?familyId=, but the default
  // join-based fetcher would build /api/meals/<familyId> and hit GET /api/meals/:id.
  const { data: savedPlans = [], isLoading: loadingSaved } = useQuery<MealPlan[]>({
    queryKey: ["/api/meals", activeFamilyId],
    enabled: !!activeFamilyId,
    queryFn: async () => {
      const res = await fetch(`/api/meals?familyId=${activeFamilyId}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load meal plans");
      return res.json();
    },
  });

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, streamingContent, currentPlan]);

  const deleteMutation = useMutation({
    mutationFn: async (id: string) =>
      apiRequest("DELETE", `/api/meals/${id}?familyId=${activeFamilyId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/meals"] });
      toast({ title: "Plan deleted" });
    },
    onError: () => toast({ title: "Could not delete plan", variant: "destructive" }),
  });

  const emailMutation = useMutation({
    mutationFn: async ({ id, to }: { id: string; to: string }) =>
      apiRequest("POST", `/api/meals/${id}/email`, { familyId: activeFamilyId, to }),
    onSuccess: () => {
      toast({ title: "Email sent!", description: "Your meal plan is on its way." });
      setEmailTarget(null);
      setEmailAddr("");
    },
    onError: () => toast({ title: "Could not send email", description: "Please try again.", variant: "destructive" }),
  });

  const send = async (text: string) => {
    if (!text.trim() || isStreaming || !activeFamilyId) return;
    const userMsg: ChatMsg = { role: "user", content: text.trim() };
    const history = [...messages, userMsg];
    setMessages(history);
    setInput("");
    setIsStreaming(true);
    setStreamingContent("");
    setCurrentPlan(null);

    try {
      const res = await fetch("/api/meals/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ familyId: activeFamilyId, messages: history }),
      });

      if (!res.ok) {
        let msg = "Please try again.";
        try { const j = await res.json(); if (j?.error) msg = j.error; } catch {}
        setIsStreaming(false);
        toast({ title: "Could not reach Kira", description: msg, variant: "destructive" });
        return;
      }

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let full = "";

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";
          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            try {
              const evt = JSON.parse(line.slice(6));
              if (evt.content) { full += evt.content; setStreamingContent(full); }
              if (evt.plan) {
                setCurrentPlan(evt.plan as MealPlan);
                queryClient.invalidateQueries({ queryKey: ["/api/meals"] });
              }
              if (evt.error) {
                toast({ title: "Something went wrong", description: evt.error, variant: "destructive" });
              }
              if (evt.done) {
                if (full) setMessages((prev) => [...prev, { role: "assistant", content: full }]);
                setStreamingContent("");
                setIsStreaming(false);
              }
            } catch {}
          }
        }
      }
    } catch {
      setStreamingContent("");
      setIsStreaming(false);
      toast({ title: "Connection error", description: "Please try again.", variant: "destructive" });
    }
  };

  const copyPlan = async (plan: MealPlan) => {
    try {
      await navigator.clipboard.writeText(planToText(plan));
      toast({ title: "Copied to clipboard" });
    } catch {
      toast({ title: "Could not copy", variant: "destructive" });
    }
  };

  const printPlan = (plan: MealPlan) => {
    const w = window.open("", "_blank");
    if (!w) return;
    const days = (plan.days as MealPlanDay[]) ?? [];
    const grocery = (plan.groceryList as GroceryCategory[]) ?? [];
    const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    w.document.write(`<html><head><title>${esc(plan.title)}</title>
      <style>body{font-family:-apple-system,Segoe UI,Roboto,sans-serif;max-width:720px;margin:24px auto;padding:0 16px;color:#111;}
      h1{margin-bottom:4px;}h2{border-top:1px solid #ddd;padding-top:12px;margin-top:24px;}h3{margin-bottom:4px;}
      .desc{color:#666;}ul,ol{margin:4px 0 12px;}.meal{margin-bottom:14px;}</style></head><body>
      <h1>${esc(plan.title)}</h1>${plan.summary ? `<p class="desc">${esc(plan.summary)}</p>` : ""}
      ${days.map((d) => `<h3>${esc(d.day)}</h3>${d.meals.map((m) => `<div class="meal"><strong>${esc(m.name)}</strong> (${esc(m.mealType)})
        ${m.description ? `<div class="desc">${esc(m.description)}</div>` : ""}
        ${m.ingredients.length ? `<ul>${m.ingredients.map((i) => `<li>${esc(i)}</li>`).join("")}</ul>` : ""}
        ${m.steps.length ? `<ol>${m.steps.map((s) => `<li>${esc(s)}</li>`).join("")}</ol>` : ""}</div>`).join("")}`).join("")}
      <h2>Grocery List</h2>
      ${grocery.map((g) => `<h3>${esc(g.category)}</h3><ul>${g.items.map((i) => `<li>${esc(i)}</li>`).join("")}</ul>`).join("")}
      </body></html>`);
    w.document.close();
    w.focus();
    w.print();
  };

  if (!activeFamilyId) {
    return (
      <div className="container mx-auto p-4 md:p-6 max-w-4xl">
        <p className="text-sm text-muted-foreground" data-testid="text-no-family">
          Select or create a family to start planning meals.
        </p>
      </div>
    );
  }

  const planActions = (plan: MealPlan) => (
    <div className="flex flex-wrap gap-2">
      <Button size="sm" variant="outline" onClick={() => copyPlan(plan)} data-testid={`button-copy-${plan.id}`}>
        <Copy className="w-4 h-4" /> Copy
      </Button>
      <Button size="sm" variant="outline" onClick={() => printPlan(plan)} data-testid={`button-print-${plan.id}`}>
        <Printer className="w-4 h-4" /> Print
      </Button>
      <Button size="sm" variant="outline" onClick={() => { setEmailTarget(plan); setEmailAddr(""); }} data-testid={`button-email-${plan.id}`}>
        <Mail className="w-4 h-4" /> Email
      </Button>
    </div>
  );

  return (
    <div className="container mx-auto p-4 md:p-6 max-w-5xl">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
          <UtensilsCrossed className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold" data-testid="text-page-title">Meal Planner</h1>
          <p className="text-sm text-muted-foreground">Chat with Kira to plan your family's meals.</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        {/* Chat + current plan */}
        <div className="space-y-4">
          <Card className="flex flex-col" style={{ minHeight: "480px" }}>
            <CardContent className="flex-1 overflow-y-auto p-4 space-y-4" ref={scrollRef} style={{ maxHeight: "60vh" }}>
              {messages.length === 0 && !isStreaming && (
                <div className="h-full flex flex-col items-center justify-center text-center py-10 gap-4">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <Sparkles className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">Hi, I'm Kira</p>
                    <p className="text-sm text-muted-foreground max-w-sm">
                      I'll ask you a few quick questions, then build a week of meals and a grocery list.
                    </p>
                  </div>
                  <Button onClick={() => send(QUICK_START)} data-testid="button-quick-start">
                    <ChefHat className="w-4 h-4" /> Start planning
                  </Button>
                </div>
              )}

              {messages.map((m, i) => (
                <div key={i} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
                  <div
                    className={
                      m.role === "user"
                        ? "bg-primary text-primary-foreground rounded-md px-3 py-2 max-w-[85%] text-sm whitespace-pre-wrap"
                        : "bg-muted rounded-md px-3 py-2 max-w-[85%] text-sm whitespace-pre-wrap"
                    }
                    data-testid={`msg-${m.role}-${i}`}
                  >
                    {m.content}
                  </div>
                </div>
              ))}

              {isStreaming && streamingContent && (
                <div className="flex justify-start">
                  <div className="bg-muted rounded-md px-3 py-2 max-w-[85%] text-sm whitespace-pre-wrap" data-testid="msg-streaming">
                    {streamingContent}
                  </div>
                </div>
              )}

              {isStreaming && !streamingContent && (
                <div className="flex justify-start">
                  <div className="bg-muted rounded-md px-3 py-2 text-sm flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" /> Kira is thinking…
                  </div>
                </div>
              )}
            </CardContent>

            <div className="border-t p-3 flex items-end gap-2">
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input); }
                }}
                placeholder="Type your answer…"
                className="resize-none min-h-9"
                rows={1}
                disabled={isStreaming}
                data-testid="input-chat"
              />
              <Button size="icon" onClick={() => send(input)} disabled={isStreaming || !input.trim()} data-testid="button-send">
                {isStreaming ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </Button>
            </div>
          </Card>

          {currentPlan && (
            <Card data-testid="card-current-plan">
              <CardHeader className="flex flex-row items-center justify-between gap-2 flex-wrap space-y-0">
                <CardTitle className="text-base">Your new plan</CardTitle>
                {planActions(currentPlan)}
              </CardHeader>
              <CardContent>
                <PlanView plan={currentPlan} />
              </CardContent>
            </Card>
          )}
        </div>

        {/* Saved plans */}
        <div className="space-y-3">
          <h2 className="text-sm font-medium text-muted-foreground">Saved plans</h2>
          {loadingSaved ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" /> Loading…
            </div>
          ) : savedPlans.length === 0 ? (
            <p className="text-sm text-muted-foreground" data-testid="text-no-saved">
              Your saved meal plans will appear here.
            </p>
          ) : (
            savedPlans.map((plan) => (
              <Card key={plan.id} className="hover-elevate" data-testid={`card-saved-${plan.id}`}>
                <CardContent className="p-3 space-y-2">
                  <button
                    className="text-left w-full"
                    onClick={() => setViewPlan(plan)}
                    data-testid={`button-open-${plan.id}`}
                  >
                    <p className="font-medium text-sm">{plan.title}</p>
                    {plan.summary && <p className="text-xs text-muted-foreground line-clamp-2">{plan.summary}</p>}
                  </button>
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <Button size="sm" variant="ghost" onClick={() => setViewPlan(plan)} data-testid={`button-view-${plan.id}`}>
                      View
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => deleteMutation.mutate(plan.id)}
                      disabled={deleteMutation.isPending}
                      data-testid={`button-delete-${plan.id}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>

      {/* View saved plan dialog */}
      <Dialog open={!!viewPlan} onOpenChange={(o) => !o && setViewPlan(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{viewPlan?.title}</DialogTitle>
            {viewPlan?.summary && <DialogDescription>{viewPlan.summary}</DialogDescription>}
          </DialogHeader>
          {viewPlan && (
            <div className="space-y-4">
              {planActions(viewPlan)}
              <PlanView plan={viewPlan} />
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Email dialog */}
      <Dialog open={!!emailTarget} onOpenChange={(o) => !o && setEmailTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Email this meal plan</DialogTitle>
            <DialogDescription>
              Leave blank to send to your own account email.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="email-addr">Email address (optional)</Label>
            <Input
              id="email-addr"
              type="email"
              placeholder="you@example.com"
              value={emailAddr}
              onChange={(e) => setEmailAddr(e.target.value)}
              data-testid="input-email"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEmailTarget(null)} data-testid="button-cancel-email">
              Cancel
            </Button>
            <Button
              onClick={() => emailTarget && emailMutation.mutate({ id: emailTarget.id, to: emailAddr.trim() })}
              disabled={emailMutation.isPending}
              data-testid="button-confirm-email"
            >
              {emailMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
              Send
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
