import { useState, useRef, useEffect, KeyboardEvent } from "react";
import { Sparkles, X, ArrowRight, Loader2, CalendarDays, CheckCircle2, Plus } from "lucide-react";
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

const SEARCH_EXAMPLES = [
  "When is Sebby's next doctor visit?",
  "What's happening this weekend?",
  "Any medical appointments next month?",
  "What events does dad have this week?",
];

const CREATE_EXAMPLES = [
  "Add Mike's bday dinner on April 15 in Morristown",
  "Schedule a dentist visit for Tuesday at 10am",
  "Add Carolyn's soccer practice every Friday at 4pm",
  "Book pediatrician checkup next Wednesday at 2pm",
];

const ALL_EXAMPLES = [...SEARCH_EXAMPLES, ...CREATE_EXAMPLES];

export default function CalendarAskBar({ onSelectEvent }: CalendarAskBarProps) {
  const [question, setQuestion] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<AskResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [placeholder, setPlaceholder] = useState(ALL_EXAMPLES[0]);
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const { activeFamilyId } = useActiveFamily();

  useEffect(() => {
    let idx = 0;
    const interval = setInterval(() => {
      idx = (idx + 1) % ALL_EXAMPLES.length;
      setPlaceholder(ALL_EXAMPLES[idx]);
    }, 3500);
    return () => clearInterval(interval);
  }, []);

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
      inputRef.current?.blur();
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
    <div ref={panelRef} className="relative w-full px-3 py-2 border-b border-border bg-background/80 backdrop-blur-sm">
      <div className="max-w-2xl mx-auto">
        {/* Main input row */}
        <div
          className={`flex items-center gap-2 rounded-full px-3 py-2 transition-all duration-200 bg-muted/60 border ${
            isFocused
              ? "border-primary/50 shadow-[0_0_0_3px_hsl(var(--primary)/0.08)]"
              : "border-border hover:border-border/80"
          }`}
        >
          {/* AI badge */}
          <div className="flex items-center gap-1 flex-shrink-0 bg-primary/10 border border-primary/20 rounded-full px-2 py-0.5">
            {isLoading ? (
              <Loader2 className="w-3 h-3 text-primary animate-spin" />
            ) : (
              <Sparkles className="w-3 h-3 text-primary" />
            )}
            <span className="text-[10px] font-semibold text-primary leading-none">AI</span>
          </div>

          <input
            ref={inputRef}
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder={placeholder}
            disabled={isLoading}
            data-testid="input-calendar-ask"
            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground/70 outline-none min-w-0 disabled:opacity-50"
          />

          {/* Hint chips — shown when empty and not focused */}
          {!question && !isFocused && (
            <div className="hidden sm:flex items-center gap-1.5 flex-shrink-0">
              <span className="text-[10px] text-muted-foreground/50 flex items-center gap-0.5">
                <Plus className="w-2.5 h-2.5" />add
              </span>
              <span className="text-[10px] text-muted-foreground/30">·</span>
              <span className="text-[10px] text-muted-foreground/50">search</span>
            </div>
          )}

          {question.trim() && !isLoading && (
            <button
              onClick={handleAsk}
              data-testid="button-calendar-ask-submit"
              aria-label="Ask"
              className="flex-shrink-0 rounded-full p-1 bg-primary text-primary-foreground hover-elevate"
            >
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}

          {hasAnswer && !question.trim() && (
            <button
              onClick={handleClear}
              data-testid="button-calendar-ask-clear"
              aria-label="Clear"
              className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-muted-foreground hover-elevate"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* Floating answer panel */}
        {hasAnswer && (
          <div
            className={`absolute left-3 right-3 top-full mt-1 z-50 rounded-xl overflow-hidden shadow-2xl bg-card border ${
              isCreated ? "border-primary/30" : "border-border"
            }`}
            style={{
              backdropFilter: "blur(24px) saturate(1.6)",
              WebkitBackdropFilter: "blur(24px) saturate(1.6)",
              boxShadow: isCreated
                ? "0 8px 32px rgba(0,0,0,0.15), 0 0 0 1px hsl(var(--primary) / 0.1)"
                : "0 8px 32px rgba(0,0,0,0.12)",
            }}
          >
            {/* Answer header */}
            <div className="flex items-start gap-2.5 p-3 pb-2">
              <div className={`w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center mt-0.5 ${
                isCreated ? "bg-primary/15 border border-primary/30" : "bg-primary/10 border border-primary/20"
              }`}>
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
                  className="w-full text-left rounded-lg px-3 py-2.5 transition-all hover-elevate border border-primary/20 bg-primary/6"
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
                <p className="text-[10px] text-muted-foreground mt-1.5 px-0.5">Tap event to open details</p>
              </div>
            )}

            {/* Relevant events from a query */}
            {!isCreated && result && (result as QueryResult).events?.length > 0 && (
              <div className="px-3 pb-3 space-y-1.5">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground px-0.5">
                  Matching events
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
