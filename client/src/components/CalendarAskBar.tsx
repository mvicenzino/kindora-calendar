import { useState, useRef, useEffect, KeyboardEvent } from "react";
import { Sparkles, X, ArrowRight, Loader2, CalendarDays, CheckCircle2 } from "lucide-react";
import { format } from "date-fns";
import { useActiveFamily } from "@/contexts/ActiveFamilyContext";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Event } from "@shared/schema";
import { mapEventFromDb, type UiEvent } from "@shared/types";

interface QueryResult {
  type?: undefined;
  answer: string;
  events: Event[];
}

interface CreateResult {
  type: 'event_created';
  answer: string;
  event: Event;
}

type AskResult = QueryResult | CreateResult;

interface CalendarAskBarProps {
  onSelectEvent: (event: UiEvent) => void;
}

const EXAMPLE_QUESTIONS = [
  "When is Sebby's next doctor visit?",
  "What's happening this weekend?",
  "Add Mike's bday dinner on April 15 in Morristown",
  "Any medical appointments next month?",
  "Schedule a dentist visit for Tuesday at 10am",
  "What events does dad have this week?",
  "Add Carolyn's soccer practice every Friday at 4pm",
];

export default function CalendarAskBar({ onSelectEvent }: CalendarAskBarProps) {
  const [question, setQuestion] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<AskResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [placeholder, setPlaceholder] = useState(EXAMPLE_QUESTIONS[0]);
  const inputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const { activeFamilyId } = useActiveFamily();

  // Rotate placeholder examples
  useEffect(() => {
    let idx = 0;
    const interval = setInterval(() => {
      idx = (idx + 1) % EXAMPLE_QUESTIONS.length;
      setPlaceholder(EXAMPLE_QUESTIONS[idx]);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  // Close answer panel on outside click
  useEffect(() => {
    if (!result && !error) return;
    const handleClick = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setResult(null);
        setError(null);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [result, error]);

  const handleAsk = async () => {
    const q = question.trim();
    if (!q || isLoading) return;

    setIsLoading(true);
    setResult(null);
    setError(null);

    try {
      const response = await apiRequest("POST", "/api/calendar/ask", {
        question: q,
        familyId: activeFamilyId,
      });
      const data = await response.json();
      if (data.error) {
        setError(data.error);
      } else {
        setResult(data);
        // If an event was created, refresh the calendar
        if (data.type === 'event_created') {
          queryClient.invalidateQueries({ queryKey: ['/api/events?familyId=' + activeFamilyId] });
          setQuestion("");
        }
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") handleAsk();
    if (e.key === "Escape") {
      setResult(null);
      setError(null);
      setQuestion("");
    }
  };

  const handleClear = () => {
    setResult(null);
    setError(null);
    setQuestion("");
    inputRef.current?.focus();
  };

  const handleEventClick = (event: Event) => {
    setResult(null);
    setError(null);
    onSelectEvent(mapEventFromDb(event as any));
  };

  const hasAnswer = !!(result || error);
  const isCreated = result?.type === 'event_created';

  return (
    <div ref={panelRef} className="relative w-full">
      {/* Input bar */}
      <div
        className="w-full px-3 py-2 border-b border-white/[0.06] dark:border-white/[0.05]"
        style={{
          background: "linear-gradient(180deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%)",
          backdropFilter: "blur(20px) saturate(1.3)",
          WebkitBackdropFilter: "blur(20px) saturate(1.3)",
        }}
      >
        <div
          className="flex items-center gap-2 rounded-full px-3 py-1.5 transition-all"
          style={{
            background: "linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.03) 100%)",
            border: "1px solid rgba(255,255,255,0.12)",
            boxShadow: "inset 0 1px 0 rgba(255,255,255,0.12), 0 2px 8px rgba(0,0,0,0.08)",
          }}
        >
          {isLoading ? (
            <Loader2 className="w-4 h-4 text-primary flex-shrink-0 animate-spin" />
          ) : (
            <Sparkles className="w-4 h-4 text-primary flex-shrink-0" />
          )}

          <input
            ref={inputRef}
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={isLoading}
            data-testid="input-calendar-ask"
            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground/60 outline-none min-w-0 disabled:opacity-50"
          />

          {question.trim() && !isLoading && (
            <button
              onClick={handleAsk}
              data-testid="button-calendar-ask-submit"
              aria-label="Ask"
              className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-primary hover:bg-primary/10 transition-colors"
            >
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}

          {hasAnswer && (
            <button
              onClick={handleClear}
              data-testid="button-calendar-ask-clear"
              aria-label="Clear"
              className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* Floating answer panel */}
      {hasAnswer && (
        <div
          className="absolute left-3 right-3 top-full mt-1 z-50 rounded-xl overflow-hidden shadow-2xl bg-card/95"
          style={{
            backdropFilter: "blur(24px) saturate(1.6)",
            WebkitBackdropFilter: "blur(24px) saturate(1.6)",
            border: `1px solid ${isCreated ? 'hsl(var(--primary) / 0.3)' : 'hsl(var(--border))'}`,
            boxShadow: isCreated
              ? "0 8px 32px rgba(0,0,0,0.18), 0 2px 8px rgba(0,0,0,0.10), 0 0 0 1px hsl(var(--primary) / 0.1)"
              : "0 8px 32px rgba(0,0,0,0.18), 0 2px 8px rgba(0,0,0,0.10)",
          }}
        >
          {/* Answer header */}
          <div className="flex items-start gap-2.5 p-3 pb-2">
            <div
              className="w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center mt-0.5"
              style={{
                background: isCreated
                  ? "linear-gradient(135deg, hsl(var(--primary) / 0.2) 0%, hsl(var(--primary) / 0.1) 100%)"
                  : "linear-gradient(135deg, hsl(var(--primary) / 0.15) 0%, hsl(var(--primary) / 0.08) 100%)",
                border: `1px solid hsl(var(--primary) / ${isCreated ? '0.35' : '0.2'})`,
              }}
            >
              {isCreated
                ? <CheckCircle2 className="w-3.5 h-3.5 text-primary" />
                : <Sparkles className="w-3.5 h-3.5 text-primary" />
              }
            </div>
            <div className="flex-1 min-w-0">
              {error ? (
                <p className="text-sm text-destructive">{error}</p>
              ) : (
                <p className="text-sm text-foreground leading-relaxed">{result?.answer}</p>
              )}
            </div>
            <button
              onClick={handleClear}
              className="flex-shrink-0 text-muted-foreground hover:text-foreground p-0.5 rounded transition-colors"
              data-testid="button-answer-dismiss"
              aria-label="Dismiss"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Created event card */}
          {isCreated && result.type === 'event_created' && (
            <div className="px-3 pb-3">
              <button
                onClick={() => handleEventClick(result.event)}
                data-testid="ask-created-event"
                className="w-full text-left rounded-lg px-3 py-2.5 transition-all hover-elevate bg-primary/8 border border-primary/20"
                style={{ background: 'hsl(var(--primary) / 0.06)' }}
              >
                <div className="flex items-center gap-2.5">
                  <div
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: getCategoryColor(result.event.category) }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{result.event.title}</p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                      <CalendarDays className="w-3 h-3" />
                      {format(new Date(result.event.startTime), "EEE, MMM d")} at{" "}
                      {format(new Date(result.event.startTime), "h:mm a")}
                    </p>
                    {result.event.description && (
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">{result.event.description}</p>
                    )}
                  </div>
                </div>
              </button>
              <p className="text-[10px] text-muted-foreground mt-1.5 px-0.5">Tap to open event details</p>
            </div>
          )}

          {/* Relevant events from a query */}
          {!isCreated && result && (result as QueryResult).events?.length > 0 && (
            <div className="px-3 pb-3 space-y-1.5">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground px-0.5">
                Relevant events
              </p>
              {(result as QueryResult).events.map((event) => (
                <button
                  key={event.id}
                  onClick={() => handleEventClick(event)}
                  data-testid={`ask-result-event-${event.id}`}
                  className="w-full text-left rounded-lg px-3 py-2 transition-all hover-elevate bg-muted/40 border border-border"
                >
                  <div className="flex items-center gap-2.5">
                    <div
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ backgroundColor: getCategoryColor(event.category) }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{event.title}</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                        <CalendarDays className="w-3 h-3" />
                        {format(new Date(event.startTime), "EEE, MMM d")} at{" "}
                        {format(new Date(event.startTime), "h:mm a")}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function getCategoryColor(category?: string | null): string {
  const colors: Record<string, string> = {
    medical: "#E53E3E",
    school: "#3B82F6",
    activities: "#8B5CF6",
    errands: "#F59E0B",
    financial: "#10B981",
    social: "#EC4899",
    caregiving: "#F97316",
    work: "#6366F1",
    other: "#64748B",
  };
  return colors[category || "other"] || colors.other;
}
