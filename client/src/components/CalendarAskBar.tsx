import { useState, useRef, useEffect, useCallback, KeyboardEvent } from "react";
import { Sparkles, X, ArrowRight, Loader2, CalendarDays, CheckCircle2, Plus, Mic, MicOff } from "lucide-react";
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

type VoiceState = 'idle' | 'listening' | 'processing' | 'denied' | 'unsupported';

export default function CalendarAskBar({ onSelectEvent }: CalendarAskBarProps) {
  const [question, setQuestion] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<AskResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [placeholder, setPlaceholder] = useState(ALL_EXAMPLES[0]);
  const [isFocused, setIsFocused] = useState(false);
  const [voiceState, setVoiceState] = useState<VoiceState>('idle');

  const inputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const submitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { activeFamilyId } = useActiveFamily();

  // Detect speech recognition support
  const speechSupported = typeof window !== 'undefined' &&
    !!(( window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);

  useEffect(() => {
    if (!speechSupported) setVoiceState('unsupported');
  }, [speechSupported]);

  // Rotate placeholder
  useEffect(() => {
    let idx = 0;
    const interval = setInterval(() => {
      idx = (idx + 1) % ALL_EXAMPLES.length;
      setPlaceholder(ALL_EXAMPLES[idx]);
    }, 3500);
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

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      recognitionRef.current?.abort();
      if (submitTimerRef.current) clearTimeout(submitTimerRef.current);
    };
  }, []);

  const handleAsk = useCallback(async (overrideQuestion?: string) => {
    const q = (overrideQuestion ?? question).trim();
    if (!q || isLoading) return;

    setIsLoading(true);
    setResult(null);
    setError(null);
    setInterimTranscript("");

    try {
      const response = await apiRequest("POST", "/api/calendar/ask", {
        question: q,
        familyId: activeFamilyId,
        localNow: new Date().toISOString(),
        tzOffsetMinutes: new Date().getTimezoneOffset(),
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
  }, [question, isLoading, activeFamilyId]);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    setVoiceState('idle');
    setInterimTranscript("");
    if (submitTimerRef.current) clearTimeout(submitTimerRef.current);
  }, []);

  const handleMicClick = useCallback(() => {
    if (voiceState === 'listening') {
      stopListening();
      return;
    }

    if (!speechSupported) return;

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();

    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setVoiceState('listening');
      setResult(null);
      setError(null);
      setQuestion("");
      setInterimTranscript("");
    };

    recognition.onresult = (event: any) => {
      let interim = '';
      let final = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          final += transcript;
        } else {
          interim += transcript;
        }
      }

      if (interim) setInterimTranscript(interim);

      if (final) {
        setQuestion(final);
        setInterimTranscript("");
        setVoiceState('processing');
        // Short delay so user sees the transcription before submitting
        submitTimerRef.current = setTimeout(() => {
          handleAsk(final);
          setVoiceState('idle');
        }, 400);
      }
    };

    recognition.onerror = (event: any) => {
      if (event.error === 'not-allowed' || event.error === 'permission-denied') {
        setVoiceState('denied');
        setError("Microphone access was denied. Please allow microphone in your browser settings and try again.");
      } else if (event.error === 'no-speech') {
        setVoiceState('idle');
        setInterimTranscript("");
      } else {
        setVoiceState('idle');
        setInterimTranscript("");
      }
    };

    recognition.onend = () => {
      if (voiceState === 'listening') setVoiceState('idle');
      setInterimTranscript("");
      recognitionRef.current = null;
    };

    recognitionRef.current = recognition;
    try {
      recognition.start();
      inputRef.current?.focus();
    } catch {
      setVoiceState('idle');
    }
  }, [voiceState, speechSupported, stopListening, handleAsk]);

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") handleAsk();
    if (e.key === "Escape") {
      stopListening();
      setResult(null);
      setError(null);
      setQuestion("");
      inputRef.current?.blur();
    }
  };

  const handleClear = () => {
    stopListening();
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
  const isListening = voiceState === 'listening';
  const isProcessingVoice = voiceState === 'processing';
  const displayText = isListening ? interimTranscript : question;

  const micLabel = isListening
    ? "Stop listening"
    : voiceState === 'denied'
    ? "Microphone blocked"
    : "Use voice input";

  return (
    <div ref={panelRef} className="relative w-full px-3 py-2 border-b border-border bg-background/80 backdrop-blur-sm">
      <div className="max-w-2xl mx-auto">
        {/* Main input row */}
        <div
          className={`flex items-center gap-2 rounded-full px-3 py-2 transition-all duration-200 border ${
            isListening
              ? "bg-red-500/8 border-red-400/40 shadow-[0_0_0_3px_rgba(239,68,68,0.08)]"
              : isFocused
              ? "bg-muted/60 border-primary/50 shadow-[0_0_0_3px_hsl(var(--primary)/0.08)]"
              : "bg-muted/60 border-border"
          }`}
        >
          {/* AI badge */}
          <div className={`flex items-center gap-1 flex-shrink-0 rounded-full px-2 py-0.5 border transition-colors ${
            isListening
              ? "bg-red-500/15 border-red-400/30"
              : "bg-primary/10 border-primary/20"
          }`}>
            {(isLoading || isProcessingVoice) ? (
              <Loader2 className="w-3 h-3 text-primary animate-spin" />
            ) : isListening ? (
              <span className="w-3 h-3 flex items-center justify-center">
                <span className="block w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              </span>
            ) : (
              <Sparkles className="w-3 h-3 text-primary" />
            )}
            <span className={`text-[10px] font-semibold leading-none ${isListening ? "text-red-500" : "text-primary"}`}>
              {isListening ? "Listening" : "AI"}
            </span>
          </div>

          {/* Input field */}
          <input
            ref={inputRef}
            type="text"
            value={displayText}
            onChange={(e) => {
              if (!isListening) setQuestion(e.target.value);
            }}
            onKeyDown={handleKeyDown}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder={isListening ? "Speak now..." : placeholder}
            disabled={isLoading || isProcessingVoice}
            readOnly={isListening}
            data-testid="input-calendar-ask"
            className={`flex-1 bg-transparent text-sm outline-none min-w-0 transition-colors ${
              isListening
                ? "text-muted-foreground placeholder:text-red-400/50 italic"
                : "text-foreground placeholder:text-muted-foreground/70 disabled:opacity-50"
            }`}
          />

          {/* Hint chips — shown when empty and idle */}
          {!question && !isFocused && !isListening && (
            <div className="hidden sm:flex items-center gap-1.5 flex-shrink-0">
              <span className="text-[10px] text-muted-foreground/50 flex items-center gap-0.5">
                <Plus className="w-2.5 h-2.5" />add
              </span>
              <span className="text-[10px] text-muted-foreground/30">·</span>
              <span className="text-[10px] text-muted-foreground/50">search</span>
            </div>
          )}

          {/* Submit button */}
          {question.trim() && !isLoading && !isListening && (
            <button
              onClick={() => handleAsk()}
              data-testid="button-calendar-ask-submit"
              aria-label="Ask"
              className="flex-shrink-0 rounded-full p-1 bg-primary text-primary-foreground hover-elevate"
            >
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Clear button */}
          {hasAnswer && !question.trim() && !isListening && (
            <button
              onClick={handleClear}
              data-testid="button-calendar-ask-clear"
              aria-label="Clear"
              className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-muted-foreground hover-elevate"
            >
              <X className="w-3 h-3" />
            </button>
          )}

          {/* Mic button */}
          {speechSupported && !isLoading && !isProcessingVoice && (
            <button
              onClick={handleMicClick}
              data-testid="button-calendar-voice"
              aria-label={micLabel}
              title={micLabel}
              className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center transition-all ${
                isListening
                  ? "bg-red-500 text-white hover-elevate"
                  : voiceState === 'denied'
                  ? "text-destructive/60"
                  : "text-muted-foreground hover-elevate"
              }`}
            >
              {voiceState === 'denied'
                ? <MicOff className="w-3.5 h-3.5" />
                : <Mic className={`w-3.5 h-3.5 ${isListening ? "animate-pulse" : ""}`} />
              }
            </button>
          )}
        </div>

        {/* Permission denied banner */}
        {voiceState === 'denied' && (
          <div className="mt-1.5 flex items-start gap-2 px-3 py-2 bg-destructive/8 border border-destructive/20 rounded-lg">
            <MicOff className="w-3.5 h-3.5 text-destructive flex-shrink-0 mt-0.5" />
            <p className="text-xs text-destructive leading-snug">
              Microphone access blocked. Enable it in your browser settings, then refresh the page.
              <span className="text-muted-foreground"> Wispr Flow and Typeless work automatically — just focus the input and dictate.</span>
            </p>
            <button onClick={() => setVoiceState('idle')} className="flex-shrink-0 text-destructive/60 hover:text-destructive">
              <X className="w-3 h-3" />
            </button>
          </div>
        )}

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
                  className="w-full text-left rounded-lg px-3 py-2.5 transition-all hover-elevate border border-primary/20"
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
