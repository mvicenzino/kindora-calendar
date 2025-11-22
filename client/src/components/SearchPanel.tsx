import { useState, useMemo } from "react";
import { X, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";
import type { UiEvent } from "@shared/types";

interface SearchPanelProps {
  isOpen: boolean;
  onClose: () => void;
  events: UiEvent[];
  onSelectEvent: (event: UiEvent) => void;
}

export default function SearchPanel({ isOpen, onClose, events, onSelectEvent }: SearchPanelProps) {
  const [query, setQuery] = useState("");

  const filteredEvents = useMemo(() => {
    if (!query.trim()) return [];
    
    const lowerQuery = query.toLowerCase();
    return events.filter(event => 
      event.title.toLowerCase().includes(lowerQuery) ||
      event.description?.toLowerCase().includes(lowerQuery)
    );
  }, [query, events]);

  const handleSelectEvent = (event: UiEvent) => {
    onSelectEvent(event);
    setQuery("");
    onClose();
  };

  return (
    <>
      {/* Slide down panel */}
      <div 
        className={`fixed top-0 left-0 right-0 z-[60] transition-all duration-300 ease-out transform ${
          isOpen ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0 pointer-events-none'
        }`}
      >
        <div className="backdrop-blur-xl bg-gradient-to-br from-[#4A5A6A]/95 via-[#5A6A7A]/95 to-[#6A7A8A]/95 border-b border-white/20 shadow-2xl">
          <div className="max-w-4xl mx-auto px-4 md:px-6 py-6">
            {/* Search Input */}
            <div className="flex gap-3 items-center mb-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/50 pointer-events-none" />
                <Input
                  type="text"
                  placeholder="Search events..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  autoFocus
                  className="pl-10 bg-white/15 border border-white/30 text-white placeholder:text-white/50 focus-visible:ring-white/50 rounded-lg h-10"
                  data-testid="input-search"
                />
              </div>
              <button
                onClick={onClose}
                className="w-10 h-10 rounded-lg bg-white/15 border border-white/30 flex items-center justify-center text-white hover:bg-white/20 transition-all"
                data-testid="button-close-search"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Results */}
            {query.trim() && (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {filteredEvents.length === 0 ? (
                  <p className="text-white/60 text-center py-8">No events found</p>
                ) : (
                  filteredEvents.map((event) => (
                    <button
                      key={event.id}
                      onClick={() => handleSelectEvent(event)}
                      className="w-full text-left bg-white/10 hover:bg-white/15 border border-white/20 rounded-lg p-3 transition-colors cursor-pointer"
                      data-testid={`search-result-${event.id}`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <h3 className="text-white font-semibold truncate">{event.title}</h3>
                          {event.description && (
                            <p className="text-white/60 text-sm truncate">{event.description}</p>
                          )}
                          <p className="text-white/50 text-xs mt-1">
                            {format(event.startTime, 'MMM d, yyyy')} at {format(event.startTime, 'h:mm a')}
                          </p>
                        </div>
                        <div 
                          className="w-3 h-3 rounded-full flex-shrink-0 mt-1"
                          style={{ backgroundColor: event.color }}
                          data-testid={`color-indicator-${event.id}`}
                        />
                      </div>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-[55] bg-black/20 backdrop-blur-sm"
          onClick={onClose}
          data-testid="search-backdrop"
        />
      )}
    </>
  );
}
