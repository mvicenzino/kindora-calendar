import { useState, useRef, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";
import { Plus, Send, Trash2, MessageSquare, Bot, User, Sparkles, Settings2, RefreshCw, Menu } from "lucide-react";
import type { AdvisorConversation, AdvisorMessage } from "@shared/schema";
import { cn } from "@/lib/utils";

interface AdvisorProfile {
  advisorChildrenContext: string;
  advisorElderContext: string;
  advisorSelfContext: string;
}

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
    <div className={cn("flex gap-2.5 sm:gap-3 items-start", isUser && "flex-row-reverse")}>
      <div className={cn(
        "w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5",
        isUser ? "bg-primary/20 border border-primary/30" : "bg-primary/15 border border-primary/25"
      )}>
        {isUser ? <User className="w-3.5 h-3.5 text-primary" /> : <Bot className="w-3.5 h-3.5 text-primary" />}
      </div>
      <div className={cn(
        "max-w-[85%] sm:max-w-[80%] rounded-2xl px-3.5 py-2.5 sm:px-4 sm:py-3 text-sm leading-relaxed",
        isUser
          ? "bg-primary text-primary-foreground rounded-tr-sm"
          : "bg-muted text-foreground rounded-tl-sm"
      )}>
        {message.content.split("\n").map((line, i, arr) => (
          <span key={i}>{line}{i < arr.length - 1 && <br />}</span>
        ))}
      </div>
    </div>
  );
}

function StreamingBubble({ content }: { content: string }) {
  return (
    <div className="flex gap-2.5 sm:gap-3 items-start">
      <div className="w-7 h-7 rounded-full bg-primary/15 border border-primary/25 flex items-center justify-center flex-shrink-0 mt-0.5">
        <Bot className="w-3.5 h-3.5 text-primary" />
      </div>
      <div className="max-w-[85%] sm:max-w-[80%] bg-muted rounded-2xl rounded-tl-sm px-3.5 py-2.5 sm:px-4 sm:py-3 text-sm leading-relaxed text-foreground">
        {content.split("\n").map((line, i, arr) => (
          <span key={i}>{line}{i < arr.length - 1 && <br />}</span>
        ))}
        <span className="inline-block w-1.5 h-4 bg-primary/60 ml-0.5 align-middle animate-pulse" />
      </div>
    </div>
  );
}

function EmptyStateGeneric({ onSuggest }: { onSuggest: (prompt: string) => void }) {
  return (
    <div className="flex flex-col items-center justify-center h-full px-4 py-8 sm:py-12 text-center">
      <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-3 sm:mb-4">
        <Sparkles className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
      </div>
      <h3 className="text-base font-semibold text-foreground mb-1.5">Meet Kira, your family advisor</h3>
      <p className="text-sm text-muted-foreground max-w-xs mb-5 sm:mb-6 leading-relaxed">
        Ask anything about parenting challenges, caring for aging parents, or managing caregiver stress. You're not alone in this.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-sm sm:max-w-md">
        {SUGGESTED_TOPICS.map((topic) => (
          <button
            key={topic.label}
            onClick={() => onSuggest(topic.prompt)}
            className="text-left text-xs px-3 py-3 sm:py-2.5 rounded-xl bg-muted hover-elevate transition-colors border border-border/50 text-foreground/80 active:scale-[0.98]"
            data-testid={`suggestion-${topic.label.toLowerCase().replace(/\s+/g, "-")}`}
          >
            {topic.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function ConversationList({
  conversations,
  activeId,
  onSelect,
  onDelete,
  onNew,
  profileHasContent,
  generateGreeting,
  handleNewChat,
}: {
  conversations: AdvisorConversation[];
  activeId: number | null;
  onSelect: (id: number) => void;
  onDelete: (id: number) => void;
  onNew: () => void;
  profileHasContent: boolean;
  generateGreeting: () => void;
  handleNewChat: () => void;
}) {
  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b border-border/40">
        <Button
          size="sm"
          className="w-full gap-1.5 text-xs"
          onClick={() => {
            handleNewChat();
            onNew();
            if (profileHasContent) {
              setTimeout(() => generateGreeting(), 50);
            }
          }}
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
            <div
              key={conv.id}
              role="button"
              tabIndex={0}
              onClick={() => onSelect(conv.id)}
              onKeyDown={(e) => e.key === "Enter" && onSelect(conv.id)}
              className={cn(
                "w-full text-left px-3 py-2.5 sm:py-2 rounded-lg text-xs transition-colors group flex items-center gap-2 cursor-pointer",
                activeId === conv.id
                  ? "bg-primary/10 text-primary font-medium"
                  : "text-foreground/70 hover:bg-muted hover:text-foreground"
              )}
              data-testid={`conv-${conv.id}`}
            >
              <MessageSquare className="w-3 h-3 flex-shrink-0 opacity-60" />
              <span className="truncate flex-1">{conv.title}</span>
              <button
                onClick={(e) => { e.stopPropagation(); onDelete(conv.id); }}
                className="opacity-0 group-hover:opacity-100 hover:text-destructive transition-opacity flex-shrink-0 p-1 rounded"
                data-testid={`delete-conv-${conv.id}`}
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      </ScrollArea>
      <div className="p-3 border-t border-border/40">
        <p className="text-[10px] text-muted-foreground/60 leading-snug">
          Kira is a supportive resource, not a licensed therapist or medical provider.
        </p>
      </div>
    </div>
  );
}

export default function Advisor() {
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();
  const [activeId, setActiveId] = useState<number | null>(null);
  const [input, setInput] = useState("");
  const [streamingContent, setStreamingContent] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const [greeting, setGreeting] = useState<string>("");
  const [isGreeting, setIsGreeting] = useState(false);
  const [greetingDone, setGreetingDone] = useState(false);
  const greetingAbortRef = useRef<AbortController | null>(null);

  const { data: conversations = [] } = useQuery<AdvisorConversation[]>({
    queryKey: ["/api/advisor/conversations"],
  });

  const { data: profile } = useQuery<AdvisorProfile>({
    queryKey: ["/api/advisor/profile"],
  });

  const profileHasContent = !!(
    profile?.advisorChildrenContext?.trim() ||
    profile?.advisorElderContext?.trim() ||
    profile?.advisorSelfContext?.trim()
  );

  const profileIsEmpty = profile && !profileHasContent;

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
  }, [messages, streamingContent, greeting]);

  const generateGreeting = useCallback(async () => {
    if (isGreeting || greetingDone) return;

    greetingAbortRef.current?.abort();
    const abort = new AbortController();
    greetingAbortRef.current = abort;

    setIsGreeting(true);
    setGreeting("");

    try {
      const res = await fetch("/api/advisor/greet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: abort.signal,
      });

      if (!res.ok) { setIsGreeting(false); return; }

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
              if (evt.content) { full += evt.content; setGreeting(full); }
              if (evt.done) { setIsGreeting(false); setGreetingDone(true); }
            } catch {}
          }
        }
      }
    } catch (err: any) {
      if (err?.name !== "AbortError") setIsGreeting(false);
    }
  }, [isGreeting, greetingDone]);

  useEffect(() => {
    if (profileHasContent && !activeId && !greetingDone && !isGreeting && profile) {
      generateGreeting();
    }
  }, [profileHasContent, activeId, profile]);

  const handleNewChat = () => {
    abortRef.current?.abort();
    setActiveId(null);
    setIsStreaming(false);
    setStreamingContent("");
    setGreeting("");
    setGreetingDone(false);
    setIsGreeting(false);
  };

  const handleSelectConversation = (id: number) => {
    setActiveId(id);
    setSidebarOpen(false);
  };

  const sendMessage = async (text?: string) => {
    const content = (text ?? input).trim();
    if (!content || isStreaming) return;

    const priorGreeting = greeting || undefined;

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

    queryClient.setQueryData(["/api/advisor/conversations", convId], (old: any) => {
      const existingMessages = old?.messages ?? [];
      const greetingMsg = priorGreeting && existingMessages.length === 0
        ? [{
            id: Date.now() - 1,
            conversationId: convId,
            role: "assistant",
            content: priorGreeting,
            createdAt: new Date().toISOString(),
          }]
        : [];
      return {
        ...old,
        messages: [
          ...existingMessages,
          ...greetingMsg,
          {
            id: Date.now(),
            conversationId: convId,
            role: "user",
            content,
            createdAt: new Date().toISOString(),
          },
        ],
      };
    });

    try {
      const abort = new AbortController();
      abortRef.current = abort;

      const res = await fetch(`/api/advisor/conversations/${convId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, priorGreeting }),
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

  const showGreeting = !activeId && (greeting || isGreeting);
  const showGenericEmpty = !activeId && !greeting && !isGreeting;

  const conversationListProps = {
    conversations,
    activeId,
    onSelect: handleSelectConversation,
    onDelete: (id: number) => deleteConversation.mutate(id),
    onNew: () => {},
    profileHasContent,
    generateGreeting,
    handleNewChat,
  };

  return (
    <div className="flex h-full">
      {/* Desktop sidebar */}
      <div className="hidden sm:flex w-56 border-r border-border/40 flex-col bg-muted/30 flex-shrink-0">
        <ConversationList {...conversationListProps} />
      </div>

      {/* Mobile conversations drawer */}
      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetContent side="left" className="p-0 w-72 flex flex-col">
          <SheetHeader className="px-4 pt-4 pb-0">
            <SheetTitle className="text-sm font-semibold">Conversations</SheetTitle>
          </SheetHeader>
          <div className="flex-1 overflow-hidden">
            <ConversationList {...conversationListProps} onSelect={handleSelectConversation} />
          </div>
        </SheetContent>
      </Sheet>

      {/* Main chat area */}
      <div className="flex flex-col flex-1 min-w-0">
        {/* Header */}
        <div className="flex items-center gap-2 px-3 sm:px-4 py-2.5 sm:py-3 border-b border-border/40">
          {/* Mobile menu button */}
          <Button
            size="icon"
            variant="ghost"
            className="sm:hidden flex-shrink-0"
            onClick={() => setSidebarOpen(true)}
            data-testid="button-conversations-menu"
          >
            <Menu className="w-4 h-4" />
          </Button>

          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div className="w-7 h-7 rounded-full bg-primary/15 border border-primary/25 flex items-center justify-center flex-shrink-0">
              <Bot className="w-3.5 h-3.5 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground leading-none">Kira</p>
              <p className="text-[10px] text-muted-foreground mt-0.5 hidden xs:block">Family Advisor · AI-powered</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 flex-shrink-0">
            {profileIsEmpty && (
              <Button
                size="sm"
                variant="outline"
                className="text-xs gap-1 h-8 px-2.5"
                onClick={() => navigate("/settings/kira")}
                data-testid="button-setup-kira-profile"
              >
                <Settings2 className="w-3 h-3" />
                <span className="hidden sm:inline">Set up profile</span>
                <span className="sm:hidden">Profile</span>
              </Button>
            )}
            {activeId && (
              <Button
                size="sm"
                variant="ghost"
                onClick={handleNewChat}
                className="text-xs text-muted-foreground gap-1 h-8 px-2.5"
                data-testid="button-new-chat"
              >
                <Plus className="w-3 h-3" />
                <span className="hidden sm:inline">New chat</span>
              </Button>
            )}
          </div>
        </div>

        {/* Messages / Greeting / Empty state */}
        <ScrollArea className="flex-1 px-3 sm:px-4 py-3 sm:py-4">
          {activeId && (
            <div className="space-y-3 sm:space-y-4 max-w-2xl mx-auto">
              {messages.map((msg) => (
                <MessageBubble key={msg.id} message={msg} />
              ))}
              {isStreaming && streamingContent && <StreamingBubble content={streamingContent} />}
              {isStreaming && !streamingContent && <TypingIndicator />}
              <div ref={messagesEndRef} />
            </div>
          )}

          {showGreeting && (
            <div className="max-w-2xl mx-auto space-y-3 sm:space-y-4">
              <div className="flex gap-2.5 sm:gap-3 items-start">
                <div className="w-7 h-7 rounded-full bg-primary/15 border border-primary/25 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Bot className="w-3.5 h-3.5 text-primary" />
                </div>
                <div className="max-w-[85%] bg-muted rounded-2xl rounded-tl-sm px-3.5 py-2.5 sm:px-4 sm:py-3 text-sm leading-relaxed text-foreground">
                  {greeting ? (
                    <>
                      {greeting.split("\n").map((line, i, arr) => (
                        <span key={i}>{line}{i < arr.length - 1 && <br />}</span>
                      ))}
                      {isGreeting && (
                        <span className="inline-block w-1.5 h-4 bg-primary/60 ml-0.5 align-middle animate-pulse" />
                      )}
                    </>
                  ) : (
                    <div className="flex gap-1 items-center h-4">
                      {[0, 1, 2].map((i) => (
                        <div key={i} className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50"
                          style={{ animation: `bounce 1.2s ${i * 0.2}s ease-in-out infinite` }} />
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {greetingDone && (
                <div className="flex justify-end">
                  <button
                    onClick={() => {
                      setGreeting("");
                      setGreetingDone(false);
                      setIsGreeting(false);
                      setTimeout(() => generateGreeting(), 50);
                    }}
                    className="text-[10px] text-muted-foreground/50 hover:text-muted-foreground flex items-center gap-1 transition-colors"
                    data-testid="button-regenerate-greeting"
                  >
                    <RefreshCw className="w-2.5 h-2.5" />
                    Refresh
                  </button>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          )}

          {showGenericEmpty && (
            <EmptyStateGeneric onSuggest={(prompt) => sendMessage(prompt)} />
          )}
        </ScrollArea>

        {/* Input area */}
        <div className="px-3 sm:px-4 py-3 border-t border-border/40">
          <div className="max-w-2xl mx-auto flex gap-2 items-end">
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={greeting ? "Reply to Kira…" : "Ask Kira anything…"}
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
          <p className="text-center text-[10px] text-muted-foreground/50 mt-2 hidden sm:block">
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
