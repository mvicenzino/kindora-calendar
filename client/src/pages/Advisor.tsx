import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { apiRequest } from "@/lib/queryClient";
import { Plus, Send, Trash2, MessageSquare, Bot, User, Sparkles } from "lucide-react";
import type { AdvisorConversation, AdvisorMessage } from "@shared/schema";
import { cn } from "@/lib/utils";

const SUGGESTED_TOPICS = [
  { label: "Toddler won't eat", prompt: "My toddler refuses to eat most foods and mealtimes have become a battle. What can I do?" },
  { label: "Potty training struggles", prompt: "We've been potty training for weeks and my child still has accidents constantly. I'm feeling frustrated — any advice?" },
  { label: "Child biting or hitting", prompt: "My toddler has started biting other kids at daycare. How do I handle this?" },
  { label: "Parent with dementia", prompt: "My mother has dementia and keeps forgetting things. I find myself getting frustrated and then feeling guilty about it. How do I cope?" },
  { label: "Caregiver burnout", prompt: "I'm exhausted from caring for both my kids and my aging parents. I feel like I'm failing everyone. Where do I start?" },
  { label: "Difficult conversations", prompt: "I need to talk to my dad about giving up his car keys, but he gets defensive every time I bring it up. How should I approach this?" },
];

type ConversationWithMessages = AdvisorConversation & { messages: AdvisorMessage[] };

function TypingIndicator() {
  return (
    <div className="flex gap-3 items-start">
      <div className="w-7 h-7 rounded-full bg-primary/15 border border-primary/25 flex items-center justify-center flex-shrink-0 mt-0.5">
        <Bot className="w-3.5 h-3.5 text-primary" />
      </div>
      <div className="bg-muted rounded-2xl rounded-tl-sm px-4 py-3">
        <div className="flex gap-1 items-center h-4">
          {[0, 1, 2].map((i) => (
            <div key={i} className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50"
              style={{ animation: `bounce 1.2s ${i * 0.2}s ease-in-out infinite` }} />
          ))}
        </div>
      </div>
    </div>
  );
}

function MessageBubble({ message }: { message: AdvisorMessage }) {
  const isUser = message.role === "user";
  return (
    <div className={cn("flex gap-3 items-start", isUser && "flex-row-reverse")}>
      <div className={cn(
        "w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5",
        isUser ? "bg-primary/20 border border-primary/30" : "bg-primary/15 border border-primary/25"
      )}>
        {isUser ? <User className="w-3.5 h-3.5 text-primary" /> : <Bot className="w-3.5 h-3.5 text-primary" />}
      </div>
      <div className={cn(
        "max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed",
        isUser
          ? "bg-primary text-primary-foreground rounded-tr-sm"
          : "bg-muted text-foreground rounded-tl-sm"
      )}>
        {message.content.split("\n").map((line, i) => (
          <span key={i}>{line}{i < message.content.split("\n").length - 1 && <br />}</span>
        ))}
      </div>
    </div>
  );
}

function EmptyState({ onSuggest }: { onSuggest: (prompt: string) => void }) {
  return (
    <div className="flex flex-col items-center justify-center h-full px-6 py-12 text-center">
      <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-4">
        <Sparkles className="w-6 h-6 text-primary" />
      </div>
      <h3 className="text-base font-semibold text-foreground mb-1.5">Meet Kira, your family advisor</h3>
      <p className="text-sm text-muted-foreground max-w-xs mb-6 leading-relaxed">
        Ask anything about parenting challenges, caring for aging parents, or managing caregiver stress. You're not alone in this.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-md">
        {SUGGESTED_TOPICS.map((topic) => (
          <button
            key={topic.label}
            onClick={() => onSuggest(topic.prompt)}
            className="text-left text-xs px-3 py-2.5 rounded-xl bg-muted hover-elevate transition-colors border border-border/50 text-foreground/80"
            data-testid={`suggestion-${topic.label.toLowerCase().replace(/\s+/g, "-")}`}
          >
            {topic.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function Advisor() {
  const queryClient = useQueryClient();
  const [activeId, setActiveId] = useState<number | null>(null);
  const [input, setInput] = useState("");
  const [streamingContent, setStreamingContent] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const { data: conversations = [] } = useQuery<AdvisorConversation[]>({
    queryKey: ["/api/advisor/conversations"],
  });

  const { data: activeConv } = useQuery<ConversationWithMessages>({
    queryKey: ["/api/advisor/conversations", activeId],
    enabled: activeId !== null,
  });

  const createConversation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/advisor/conversations", { title: "New conversation" }),
    onSuccess: async (res) => {
      const conv: AdvisorConversation = await res.json();
      await queryClient.invalidateQueries({ queryKey: ["/api/advisor/conversations"] });
      setActiveId(conv.id);
    },
  });

  const deleteConversation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/advisor/conversations/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/advisor/conversations"] });
      setActiveId(null);
    },
  });

  const messages = activeConv?.messages ?? [];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingContent]);

  const sendMessage = async (text?: string) => {
    const content = (text ?? input).trim();
    if (!content || isStreaming) return;

    let convId = activeId;
    if (!convId) {
      const res = await apiRequest("POST", "/api/advisor/conversations", {
        title: content.slice(0, 60),
      });
      const conv: AdvisorConversation = await res.json();
      await queryClient.invalidateQueries({ queryKey: ["/api/advisor/conversations"] });
      convId = conv.id;
      setActiveId(conv.id);
    }

    setInput("");
    setIsStreaming(true);
    setStreamingContent("");

    // Optimistically add the user message
    queryClient.setQueryData(["/api/advisor/conversations", convId], (old: any) => ({
      ...old,
      messages: [...(old?.messages ?? []), {
        id: Date.now(),
        conversationId: convId,
        role: "user",
        content,
        createdAt: new Date().toISOString(),
      }],
    }));

    try {
      const abort = new AbortController();
      abortRef.current = abort;

      const res = await fetch(`/api/advisor/conversations/${convId}/messages`, {
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
              if (evt.content) {
                full += evt.content;
                setStreamingContent(full);
              }
              if (evt.done) {
                setStreamingContent("");
                setIsStreaming(false);
                await queryClient.invalidateQueries({ queryKey: ["/api/advisor/conversations", convId] });
              }
            } catch {}
          }
        }
      }
    } catch (err: any) {
      if (err?.name !== "AbortError") {
        setStreamingContent("");
        setIsStreaming(false);
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="flex h-full">
      {/* Sidebar */}
      <div className="w-56 border-r border-border/40 flex flex-col bg-muted/30 flex-shrink-0">
        <div className="p-3 border-b border-border/40">
          <Button
            size="sm"
            className="w-full gap-1.5 text-xs"
            onClick={() => { setActiveId(null); createConversation.mutate(); }}
            data-testid="button-new-conversation"
          >
            <Plus className="w-3.5 h-3.5" />
            New conversation
          </Button>
        </div>
        <ScrollArea className="flex-1">
          <div className="p-2 space-y-0.5">
            {conversations.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-6 px-3">
                Start a conversation to get support
              </p>
            )}
            {conversations.map((conv) => (
              <button
                key={conv.id}
                onClick={() => setActiveId(conv.id)}
                className={cn(
                  "w-full text-left px-3 py-2 rounded-lg text-xs transition-colors group flex items-center gap-2",
                  activeId === conv.id
                    ? "bg-primary/10 text-primary font-medium"
                    : "text-foreground/70 hover:bg-muted hover:text-foreground"
                )}
                data-testid={`conv-${conv.id}`}
              >
                <MessageSquare className="w-3 h-3 flex-shrink-0 opacity-60" />
                <span className="truncate flex-1">{conv.title}</span>
                <button
                  onClick={(e) => { e.stopPropagation(); deleteConversation.mutate(conv.id); }}
                  className="opacity-0 group-hover:opacity-100 hover:text-destructive transition-opacity flex-shrink-0"
                  data-testid={`delete-conv-${conv.id}`}
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </button>
            ))}
          </div>
        </ScrollArea>
        <div className="p-3 border-t border-border/40">
          <p className="text-[10px] text-muted-foreground/60 leading-snug">
            Kira is a supportive resource, not a licensed therapist or medical provider.
          </p>
        </div>
      </div>

      {/* Main chat area */}
      <div className="flex flex-col flex-1 min-w-0">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border/40">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-full bg-primary/15 border border-primary/25 flex items-center justify-center">
              <Bot className="w-3.5 h-3.5 text-primary" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground leading-none">Kira</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">Family Advisor · AI-powered</p>
            </div>
          </div>
          {activeId && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => { setActiveId(null); }}
              className="text-xs text-muted-foreground gap-1.5"
              data-testid="button-new-chat"
            >
              <Plus className="w-3 h-3" />
              New chat
            </Button>
          )}
        </div>

        {/* Messages */}
        <ScrollArea className="flex-1 px-4 py-4">
          {!activeId && !isStreaming ? (
            <EmptyState onSuggest={(prompt) => sendMessage(prompt)} />
          ) : (
            <div className="space-y-4 max-w-2xl mx-auto">
              {messages.map((msg) => (
                <MessageBubble key={msg.id} message={msg} />
              ))}
              {isStreaming && streamingContent && (
                <div className="flex gap-3 items-start">
                  <div className="w-7 h-7 rounded-full bg-primary/15 border border-primary/25 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Bot className="w-3.5 h-3.5 text-primary" />
                  </div>
                  <div className="max-w-[80%] bg-muted rounded-2xl rounded-tl-sm px-4 py-3 text-sm leading-relaxed text-foreground">
                    {streamingContent.split("\n").map((line, i) => (
                      <span key={i}>{line}{i < streamingContent.split("\n").length - 1 && <br />}</span>
                    ))}
                    <span className="inline-block w-1.5 h-4 bg-primary/60 ml-0.5 align-middle animate-pulse" />
                  </div>
                </div>
              )}
              {isStreaming && !streamingContent && <TypingIndicator />}
              <div ref={messagesEndRef} />
            </div>
          )}
        </ScrollArea>

        {/* Input */}
        <div className="px-4 py-3 border-t border-border/40">
          <div className="max-w-2xl mx-auto flex gap-2 items-end">
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask Kira anything…"
              className="resize-none min-h-[44px] max-h-32 text-sm"
              rows={1}
              disabled={isStreaming}
              data-testid="input-advisor-message"
            />
            <Button
              size="icon"
              onClick={() => sendMessage()}
              disabled={!input.trim() || isStreaming}
              data-testid="button-send-message"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
          <p className="text-center text-[10px] text-muted-foreground/50 mt-2">
            Press Enter to send · Shift+Enter for new line
          </p>
        </div>
      </div>

      <style>{`
        @keyframes bounce {
          0%, 80%, 100% { transform: translateY(0); }
          40% { transform: translateY(-4px); }
        }
      `}</style>
    </div>
  );
}
