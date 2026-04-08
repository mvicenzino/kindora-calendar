import { useState, useRef, useEffect, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";
import {
  Bot, User, Send, Sparkles, X, ExternalLink,
  CheckCircle2, XCircle, Calendar, Activity, Plus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useKiraPanel } from "@/contexts/KiraPanelContext";
import type { AdvisorConversation, AdvisorMessage } from "@shared/schema";

const PANEL_CONV_KEY = "kira_panel_conv_id";

const QUICK_PROMPTS = [
  { label: "Schedule an appointment", prompt: "Can you add a doctor appointment to the calendar?" },
  { label: "Log a health note", prompt: "Log a health note for me today." },
  { label: "Caregiver burnout", prompt: "I'm exhausted caring for everyone. Where do I start?" },
  { label: "Talk through something", prompt: "I need to talk through something that's been weighing on me." },
];

interface KiraToolResult {
  name: string;
  success: boolean;
  summary: string;
  data?: Record<string, unknown>;
  error?: string;
}

function PanelActionCard({ tool }: { tool: KiraToolResult }) {
  const [, navigate] = useLocation();
  const { closePanel } = useKiraPanel();
  const isEvent = tool.name === "create_calendar_event";
  const isHealth = tool.name === "log_health_note";

  const handleLink = () => {
    closePanel();
    navigate(isEvent ? "/" : "/health");
  };

  return (
    <div className={cn(
      "flex items-start gap-2.5 px-3 py-2.5 rounded-xl border text-xs",
      tool.success
        ? "bg-green-500/8 border-green-500/20"
        : "bg-destructive/8 border-destructive/20"
    )}>
      <div className="flex-shrink-0 mt-0.5">
        {tool.success
          ? <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
          : <XCircle className="w-3.5 h-3.5 text-destructive" />}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          {isEvent && <Calendar className="w-3 h-3 text-muted-foreground" />}
          {isHealth && <Activity className="w-3 h-3 text-muted-foreground" />}
          <span className="font-medium text-foreground/90">{tool.summary}</span>
        </div>
        {tool.success && (
          <button onClick={handleLink} className="text-primary underline-offset-2 hover:underline mt-0.5 block">
            {isEvent ? "View on calendar" : "View in Health"}
          </button>
        )}
      </div>
    </div>
  );
}

function PanelMessageBubble({ message }: { message: AdvisorMessage }) {
  const isUser = message.role === "user";

  let tools: KiraToolResult[] = [];
  if (message.metadata) {
    try {
      const parsed = JSON.parse(message.metadata);
      if (Array.isArray(parsed.tools)) tools = parsed.tools;
    } catch {}
  }

  return (
    <div className={cn("flex gap-2 items-start", isUser && "flex-row-reverse")}>
      <div className={cn(
        "w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5",
        isUser ? "bg-primary/20 border border-primary/30" : "bg-primary/15 border border-primary/25"
      )}>
        {isUser
          ? <User className="w-3 h-3 text-primary" />
          : <Bot className="w-3 h-3 text-primary" />}
      </div>
      <div className={cn("max-w-[82%] space-y-1.5", isUser ? "items-end" : "items-start")}>
        {tools.length > 0 && (
          <div className="space-y-1">
            {tools.map((t, i) => <PanelActionCard key={i} tool={t} />)}
          </div>
        )}
        {message.content && (
          <div className={cn(
            "rounded-2xl px-3 py-2 text-sm leading-relaxed",
            isUser
              ? "bg-primary text-primary-foreground rounded-tr-sm"
              : "bg-muted text-foreground rounded-tl-sm"
          )}>
            {message.content.split("\n").map((line, i, arr) => (
              <span key={i}>{line}{i < arr.length - 1 && <br />}</span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function PanelStreamingBubble({ content, tools }: { content: string; tools: KiraToolResult[] }) {
  return (
    <div className="flex gap-2 items-start">
      <div className="w-6 h-6 rounded-full bg-primary/15 border border-primary/25 flex items-center justify-center flex-shrink-0 mt-0.5">
        <Bot className="w-3 h-3 text-primary" />
      </div>
      <div className="max-w-[82%] space-y-1.5">
        {tools.length > 0 && (
          <div className="space-y-1">
            {tools.map((t, i) => <PanelActionCard key={i} tool={t} />)}
          </div>
        )}
        {(content || tools.length === 0) && (
          <div className="bg-muted rounded-2xl rounded-tl-sm px-3 py-2 text-sm leading-relaxed text-foreground">
            {content.split("\n").map((line, i, arr) => (
              <span key={i}>{line}{i < arr.length - 1 && <br />}</span>
            ))}
            <span className="inline-block w-1.5 h-3.5 bg-primary/60 ml-0.5 align-middle animate-pulse" />
          </div>
        )}
      </div>
    </div>
  );
}

export function KiraSidePanel() {
  const { isOpen, closePanel, prefillMessage, clearPrefill } = useKiraPanel();
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();

  const [convId, setConvId] = useState<number | null>(() => {
    const saved = localStorage.getItem(PANEL_CONV_KEY);
    return saved ? parseInt(saved, 10) : null;
  });

  const [input, setInput] = useState("");
  const [streamingContent, setStreamingContent] = useState("");
  const [streamingTools, setStreamingTools] = useState<KiraToolResult[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const { data: convData } = useQuery<AdvisorConversation & { messages: AdvisorMessage[] }>({
    queryKey: ["/api/advisor/conversations", convId],
    enabled: !!convId,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  });

  const messages = convData?.messages ?? [];

  // Handle prefill from context
  useEffect(() => {
    if (isOpen && prefillMessage) {
      setInput(prefillMessage);
      clearPrefill();
      textareaRef.current?.focus();
    }
  }, [isOpen, prefillMessage, clearPrefill]);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingContent, streamingTools]);

  // Focus input when panel opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => textareaRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const sendMessage = useCallback(async (text?: string) => {
    const content = (text ?? input).trim();
    if (!content || isStreaming) return;

    let cid = convId;
    if (!cid) {
      const res = await apiRequest("POST", "/api/advisor/conversations", {
        title: content.slice(0, 60),
      });
      const conv: AdvisorConversation = await res.json();
      queryClient.invalidateQueries({ queryKey: ["/api/advisor/conversations"] });
      cid = conv.id;
      setConvId(conv.id);
      localStorage.setItem(PANEL_CONV_KEY, String(conv.id));
    }

    setInput("");
    setIsStreaming(true);
    setStreamingContent("");
    setStreamingTools([]);

    queryClient.setQueryData(["/api/advisor/conversations", cid], (old: any) => ({
      ...old,
      messages: [
        ...(old?.messages ?? []),
        { id: Date.now(), conversationId: cid, role: "user", content, createdAt: new Date().toISOString() },
      ],
    }));

    try {
      const abort = new AbortController();
      abortRef.current = abort;

      const res = await fetch(`/api/advisor/conversations/${cid}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
        signal: abort.signal,
      });

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
              if (evt.tool) { setStreamingTools(prev => [...prev, evt.tool as KiraToolResult]); }
              if (evt.done) {
                setStreamingContent("");
                setStreamingTools([]);
                setIsStreaming(false);
                queryClient.invalidateQueries({ queryKey: ["/api/advisor/conversations", cid] });
              }
            } catch {}
          }
        }
      }
    } catch (err: any) {
      if (err?.name !== "AbortError") {
        setStreamingContent("");
        setStreamingTools([]);
        setIsStreaming(false);
      }
    }
  }, [input, convId, isStreaming, queryClient]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const startNewConversation = () => {
    abortRef.current?.abort();
    setConvId(null);
    setStreamingContent("");
    setStreamingTools([]);
    setIsStreaming(false);
    localStorage.removeItem(PANEL_CONV_KEY);
  };

  const isEmpty = messages.length === 0 && !streamingContent && !isStreaming;

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && closePanel()}>
      <SheetContent
        side="right"
        className="p-0 flex flex-col gap-0 w-[420px] sm:max-w-[420px] [&>button:first-child]:hidden"
        data-testid="kira-side-panel"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border/50 flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-primary/15 border border-primary/25 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-foreground leading-tight">Kira</h2>
              <p className="text-[10px] text-muted-foreground leading-tight">Your family advisor</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {messages.length > 0 && (
              <Button
                size="icon"
                variant="ghost"
                onClick={startNewConversation}
                title="New conversation"
                data-testid="button-kira-panel-new"
                className="h-8 w-8"
              >
                <Plus className="w-3.5 h-3.5" />
              </Button>
            )}
            <Button
              size="icon"
              variant="ghost"
              onClick={() => { closePanel(); navigate("/advisor"); }}
              title="Open full Kira page"
              data-testid="button-kira-panel-fullpage"
              className="h-8 w-8"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              onClick={closePanel}
              data-testid="button-kira-panel-close"
              className="h-8 w-8"
            >
              <X className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>

        {/* Messages area */}
        <ScrollArea className="flex-1 px-4 py-3">
          {isEmpty ? (
            <div className="flex flex-col items-center justify-center h-full min-h-[300px] text-center py-8">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-3">
                <Sparkles className="w-5 h-5 text-primary" />
              </div>
              <h3 className="text-sm font-semibold text-foreground mb-1">How can I help?</h3>
              <p className="text-xs text-muted-foreground mb-5 max-w-[220px] leading-relaxed">
                Ask for advice, schedule events, log health notes — I'm here for all of it.
              </p>
              <div className="grid grid-cols-1 gap-2 w-full max-w-[260px]">
                {QUICK_PROMPTS.map((p) => (
                  <button
                    key={p.label}
                    onClick={() => sendMessage(p.prompt)}
                    className="text-left text-xs px-3 py-2.5 rounded-xl bg-muted hover-elevate border border-border/50 text-foreground/80"
                    data-testid={`kira-panel-prompt-${p.label.toLowerCase().replace(/\s+/g, "-")}`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {messages.map((msg) => (
                <PanelMessageBubble key={msg.id} message={msg} />
              ))}
              {isStreaming && (streamingContent || streamingTools.length > 0)
                ? <PanelStreamingBubble content={streamingContent} tools={streamingTools} />
                : isStreaming
                  ? (
                    <div className="flex gap-2 items-start">
                      <div className="w-6 h-6 rounded-full bg-primary/15 border border-primary/25 flex items-center justify-center flex-shrink-0">
                        <Bot className="w-3 h-3 text-primary" />
                      </div>
                      <div className="bg-muted rounded-2xl rounded-tl-sm px-3 py-2">
                        <div className="flex gap-1 items-center h-3.5">
                          {[0, 1, 2].map((i) => (
                            <div key={i} className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50"
                              style={{ animation: `bounce 1.2s ${i * 0.2}s ease-in-out infinite` }} />
                          ))}
                        </div>
                      </div>
                    </div>
                  )
                  : null}
              <div ref={messagesEndRef} />
            </div>
          )}
        </ScrollArea>

        {/* Input area */}
        <div className="border-t border-border/50 px-3 py-3 flex-shrink-0">
          <div className="flex items-end gap-2">
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask Kira anything…"
              rows={1}
              className="flex-1 resize-none text-sm min-h-[38px] max-h-[120px] leading-5"
              style={{ height: "38px" }}
              onInput={(e) => {
                const t = e.currentTarget;
                t.style.height = "38px";
                t.style.height = Math.min(t.scrollHeight, 120) + "px";
              }}
              data-testid="input-kira-panel-message"
            />
            <Button
              size="icon"
              onClick={() => sendMessage()}
              disabled={!input.trim() || isStreaming}
              data-testid="button-kira-panel-send"
              className="flex-shrink-0"
            >
              <Send className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
