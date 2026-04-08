import { useState, useRef, useEffect, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";
import {
  Bot, User, Send, Sparkles, X, ExternalLink,
  CheckCircle2, XCircle, Calendar, Activity, Plus,
  ChevronLeft, MessageSquare, Clock, Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useKiraPanel } from "@/contexts/KiraPanelContext";
import type { AdvisorConversation, AdvisorMessage } from "@shared/schema";
import { formatDistanceToNow } from "date-fns";

const PANEL_CONV_KEY = "kira_panel_conv_id";

const QUICK_PROMPTS = [
  { label: "Schedule an appointment", prompt: "Can you schedule a doctor appointment on the calendar?" },
  { label: "Log a health note", prompt: "Log a health note for me today." },
  { label: "I'm overwhelmed", prompt: "I'm feeling overwhelmed trying to manage everything. Where do I start?" },
  { label: "Caregiver advice", prompt: "I need advice on caring for an aging parent." },
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

  return (
    <div className={cn(
      "flex items-start gap-2 px-3 py-2 rounded-lg border text-xs my-1",
      tool.success
        ? "bg-green-500/10 border-green-500/20"
        : "bg-red-500/10 border-red-500/20"
    )}>
      <div className="flex-shrink-0 mt-0.5">
        {tool.success
          ? <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
          : <XCircle className="w-3.5 h-3.5 text-red-400" />}
      </div>
      <div className="flex-1 min-w-0 space-y-0.5">
        <div className="flex items-center gap-1">
          {isEvent && <Calendar className="w-3 h-3 text-muted-foreground" />}
          {isHealth && <Activity className="w-3 h-3 text-muted-foreground" />}
          <span className="font-medium text-foreground/90">{tool.summary}</span>
        </div>
        {tool.success && (
          <button
            onClick={() => { closePanel(); navigate(isEvent ? "/" : "/health"); }}
            className="text-primary hover:underline underline-offset-2 block"
          >
            {isEvent ? "View on calendar →" : "View in Health →"}
          </button>
        )}
      </div>
    </div>
  );
}

function MessageBubble({ message }: { message: AdvisorMessage }) {
  const isUser = message.role === "user";
  let tools: KiraToolResult[] = [];
  if (message.metadata) {
    try { const p = JSON.parse(message.metadata); if (Array.isArray(p.tools)) tools = p.tools; } catch {}
  }

  return (
    <div className={cn("flex gap-2 items-end", isUser && "flex-row-reverse")}>
      {!isUser && (
        <div className="w-6 h-6 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center flex-shrink-0 mb-0.5">
          <Sparkles className="w-3 h-3 text-primary" />
        </div>
      )}
      <div className={cn("max-w-[84%] space-y-1", isUser ? "items-end" : "items-start")}>
        {tools.length > 0 && (
          <div>{tools.map((t, i) => <PanelActionCard key={i} tool={t} />)}</div>
        )}
        {message.content && (
          <div className={cn(
            "px-3 py-2 rounded-2xl text-sm leading-relaxed",
            isUser
              ? "bg-primary text-primary-foreground rounded-br-sm"
              : "bg-muted/80 text-foreground rounded-bl-sm"
          )}>
            {message.content.split("\n").map((line, i, arr) => (
              <span key={i}>{line}{i < arr.length - 1 && <br />}</span>
            ))}
          </div>
        )}
      </div>
      {isUser && (
        <div className="w-6 h-6 rounded-full bg-muted border border-border/60 flex items-center justify-center flex-shrink-0 mb-0.5">
          <User className="w-3 h-3 text-muted-foreground" />
        </div>
      )}
    </div>
  );
}

function StreamingBubble({ content, tools }: { content: string; tools: KiraToolResult[] }) {
  return (
    <div className="flex gap-2 items-end">
      <div className="w-6 h-6 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center flex-shrink-0 mb-0.5">
        <Sparkles className="w-3 h-3 text-primary" />
      </div>
      <div className="max-w-[84%] space-y-1">
        {tools.length > 0 && <div>{tools.map((t, i) => <PanelActionCard key={i} tool={t} />)}</div>}
        <div className="bg-muted/80 text-foreground rounded-2xl rounded-bl-sm px-3 py-2 text-sm leading-relaxed">
          {content ? content.split("\n").map((line, i, arr) => (
            <span key={i}>{line}{i < arr.length - 1 && <br />}</span>
          )) : (
            <span className="flex gap-1 items-center h-4">
              {[0, 1, 2].map(i => (
                <span key={i} className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50"
                  style={{ animation: `bounce 1.2s ${i * 0.2}s ease-in-out infinite` }} />
              ))}
            </span>
          )}
          {content && <span className="inline-block w-1 h-4 bg-primary/70 ml-0.5 align-middle animate-pulse rounded-sm" />}
        </div>
      </div>
    </div>
  );
}

function ConversationHistory({
  onSelect,
  activeConvId,
}: {
  onSelect: (id: number) => void;
  activeConvId: number | null;
}) {
  const { data: conversations = [] } = useQuery<AdvisorConversation[]>({
    queryKey: ["/api/advisor/conversations"],
    staleTime: 30000,
  });

  const queryClient = useQueryClient();

  const handleDelete = async (e: { stopPropagation: () => void }, id: number) => {
    e.stopPropagation();
    await apiRequest("DELETE", `/api/advisor/conversations/${id}`);
    queryClient.invalidateQueries({ queryKey: ["/api/advisor/conversations"] });
    if (id === activeConvId) {
      localStorage.removeItem(PANEL_CONV_KEY);
    }
  };

  const visible = conversations.filter(c => !c.archived);
  const archived = conversations.filter(c => c.archived);

  if (conversations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-40 text-center px-6">
        <MessageSquare className="w-8 h-8 text-muted-foreground/30 mb-2" />
        <p className="text-xs text-muted-foreground">No conversations yet</p>
      </div>
    );
  }

  const ConvItem = ({ conv }: { conv: AdvisorConversation }) => (
    <button
      onClick={() => onSelect(conv.id)}
      className={cn(
        "w-full text-left px-4 py-3 flex items-start gap-3 hover-elevate transition-colors group",
        activeConvId === conv.id && "bg-primary/8"
      )}
    >
      <div className={cn(
        "w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5",
        activeConvId === conv.id ? "bg-primary/20 border border-primary/30" : "bg-muted border border-border/50"
      )}>
        <Sparkles className={cn("w-3 h-3", activeConvId === conv.id ? "text-primary" : "text-muted-foreground")} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-foreground truncate">{conv.title}</p>
        <p className="text-[10px] text-muted-foreground mt-0.5 flex items-center gap-1">
          <Clock className="w-2.5 h-2.5" />
          {formatDistanceToNow(new Date(conv.createdAt), { addSuffix: true })}
          {conv.archived && <span className="ml-1 text-[9px] bg-muted px-1 py-0.5 rounded">archived</span>}
        </p>
      </div>
      <button
        onClick={(e) => handleDelete(e, conv.id)}
        className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:text-destructive text-muted-foreground"
        title="Delete"
      >
        <Trash2 className="w-3 h-3" />
      </button>
    </button>
  );

  return (
    <div className="flex-1 overflow-y-auto">
      {visible.length > 0 && (
        <div>
          <p className="px-4 pt-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">Recent</p>
          {visible.map(c => <ConvItem key={c.id} conv={c} />)}
        </div>
      )}
      {archived.length > 0 && (
        <div>
          <p className="px-4 pt-4 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">Archived</p>
          {archived.map(c => <ConvItem key={c.id} conv={c} />)}
        </div>
      )}
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

  const [view, setView] = useState<"chat" | "history">("chat");
  const [input, setInput] = useState("");
  const [streamingContent, setStreamingContent] = useState("");
  const [streamingTools, setStreamingTools] = useState<KiraToolResult[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const { data: convData } = useQuery<AdvisorConversation & { messages: AdvisorMessage[] }>({
    queryKey: ["/api/advisor/conversations", convId],
    enabled: !!convId,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  });

  const messages = convData?.messages ?? [];

  useEffect(() => {
    if (isOpen && prefillMessage) {
      setInput(prefillMessage);
      clearPrefill();
      setView("chat");
      setTimeout(() => textareaRef.current?.focus(), 150);
    }
  }, [isOpen, prefillMessage, clearPrefill]);

  useEffect(() => {
    if (isOpen && view === "chat") {
      setTimeout(() => textareaRef.current?.focus(), 150);
    }
  }, [isOpen, view]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingContent, streamingTools]);

  const startNewConversation = useCallback(() => {
    abortRef.current?.abort();
    setConvId(null);
    setStreamingContent("");
    setStreamingTools([]);
    setIsStreaming(false);
    setView("chat");
    localStorage.removeItem(PANEL_CONV_KEY);
  }, []);

  const selectConversation = useCallback((id: number) => {
    setConvId(id);
    localStorage.setItem(PANEL_CONV_KEY, String(id));
    setView("chat");
  }, []);

  const resizeTextarea = (el: HTMLTextAreaElement) => {
    el.style.height = "38px";
    el.style.height = Math.min(el.scrollHeight, 120) + "px";
  };

  const sendMessage = useCallback(async (text?: string) => {
    const content = (text ?? input).trim();
    if (!content || isStreaming) return;

    let cid = convId;
    if (!cid) {
      const res = await apiRequest("POST", "/api/advisor/conversations", { title: content.slice(0, 60) });
      const conv: AdvisorConversation = await res.json();
      queryClient.invalidateQueries({ queryKey: ["/api/advisor/conversations"] });
      cid = conv.id;
      setConvId(conv.id);
      localStorage.setItem(PANEL_CONV_KEY, String(conv.id));
    }

    setInput("");
    if (textareaRef.current) textareaRef.current.style.height = "38px";
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
              if (evt.tool) { setStreamingTools(prev => [...prev, evt.tool]); }
              if (evt.done) {
                setStreamingContent("");
                setStreamingTools([]);
                setIsStreaming(false);
                queryClient.invalidateQueries({ queryKey: ["/api/advisor/conversations", cid] });
                queryClient.invalidateQueries({ queryKey: ["/api/advisor/conversations"] });
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

  const handleKeyDown = (e: { key: string; shiftKey: boolean; preventDefault: () => void }) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  const isEmpty = messages.length === 0 && !isStreaming;

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop for mobile */}
      <div
        className="fixed inset-0 z-40 bg-black/20 backdrop-blur-[1px] sm:hidden"
        onClick={closePanel}
      />

      {/* Panel */}
      <div
        className={cn(
          "fixed top-0 right-0 bottom-0 z-50 flex flex-col",
          "w-full sm:w-[400px]",
          "bg-background border-l border-border/50",
          "shadow-2xl",
          "transition-transform duration-300 ease-out",
        )}
        data-testid="kira-side-panel"
        style={{ animation: "slideInRight 0.25s cubic-bezier(0.16,1,0.3,1)" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border/40 bg-background/95 backdrop-blur-sm flex-shrink-0">
          <div className="flex items-center gap-2.5">
            {view === "history" ? (
              <button
                onClick={() => setView("chat")}
                className="w-7 h-7 rounded-full flex items-center justify-center hover-elevate text-muted-foreground"
                title="Back to chat"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            ) : (
              <div className="w-8 h-8 rounded-xl bg-primary/15 border border-primary/25 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-primary" />
              </div>
            )}
            <div>
              <h2 className="text-sm font-semibold text-foreground leading-tight">
                {view === "history" ? "Conversations" : "Kira"}
              </h2>
              {view === "chat" && (
                <p className="text-[10px] text-muted-foreground leading-tight">Your family advisor</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-0.5">
            {view === "chat" && (
              <>
                <Button size="icon" variant="ghost" onClick={() => setView("history")} title="Conversation history" className="h-8 w-8" data-testid="button-kira-history">
                  <MessageSquare className="w-3.5 h-3.5" />
                </Button>
                <Button size="icon" variant="ghost" onClick={startNewConversation} title="New conversation" className="h-8 w-8" data-testid="button-kira-new">
                  <Plus className="w-3.5 h-3.5" />
                </Button>
                <Button size="icon" variant="ghost" onClick={() => { closePanel(); navigate("/advisor"); }} title="Open full Kira page" className="h-8 w-8" data-testid="button-kira-fullpage">
                  <ExternalLink className="w-3.5 h-3.5" />
                </Button>
              </>
            )}
            <Button size="icon" variant="ghost" onClick={closePanel} className="h-8 w-8" data-testid="button-kira-close">
              <X className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>

        {/* History view */}
        {view === "history" && (
          <ConversationHistory onSelect={selectConversation} activeConvId={convId} />
        )}

        {/* Chat view */}
        {view === "chat" && (
          <>
            {/* Messages */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4">
              {isEmpty ? (
                <div className="flex flex-col items-center justify-center min-h-[280px] text-center">
                  <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-4">
                    <Sparkles className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="text-sm font-semibold text-foreground mb-1.5">How can I help?</h3>
                  <p className="text-xs text-muted-foreground mb-6 max-w-[210px] leading-relaxed">
                    Advice, calendar events, health notes — just ask.
                  </p>
                  <div className="grid grid-cols-1 gap-2 w-full max-w-[260px]">
                    {QUICK_PROMPTS.map((p) => (
                      <button
                        key={p.label}
                        onClick={() => sendMessage(p.prompt)}
                        className="text-left text-xs px-3.5 py-2.5 rounded-xl bg-muted/60 hover-elevate border border-border/40 text-foreground/75 leading-snug"
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {messages.map((msg) => (
                    <MessageBubble key={msg.id} message={msg} />
                  ))}
                  {isStreaming && (
                    <StreamingBubble content={streamingContent} tools={streamingTools} />
                  )}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>

            {/* Input */}
            <div className="border-t border-border/40 bg-background/95 backdrop-blur-sm px-3 py-3 flex-shrink-0">
              <div className="flex items-end gap-2">
                <Textarea
                  ref={textareaRef}
                  value={input}
                  onChange={(e) => { setInput(e.target.value); resizeTextarea(e.target); }}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask Kira anything…"
                  rows={1}
                  className="flex-1 resize-none text-sm leading-5 min-h-[38px] max-h-[120px] bg-muted/50 border-border/50"
                  style={{ height: "38px" }}
                  data-testid="input-kira-panel-message"
                />
                <Button
                  size="icon"
                  onClick={() => sendMessage()}
                  disabled={!input.trim() || isStreaming}
                  data-testid="button-kira-panel-send"
                  className="flex-shrink-0 h-9 w-9"
                >
                  <Send className="w-3.5 h-3.5" />
                </Button>
              </div>
              <p className="text-[10px] text-muted-foreground/50 text-center mt-2">
                Kira can make mistakes. Verify important info.
              </p>
            </div>
          </>
        )}
      </div>

      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
      `}</style>
    </>
  );
}
