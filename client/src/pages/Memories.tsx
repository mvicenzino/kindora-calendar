import { useQuery } from "@tanstack/react-query";
import { format, startOfMonth } from "date-fns";
import { Image, X, Calendar, ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useActiveFamily } from "@/contexts/ActiveFamilyContext";
import { useLocation } from "wouter";
import type { Event, FamilyMember } from "@shared/schema";
import { mapEventFromDb, mapFamilyMemberFromDb } from "@shared/types";
import { useMemo, useState } from "react";

type MemoryEvent = ReturnType<typeof mapEventFromDb> & { members: ReturnType<typeof mapFamilyMemberFromDb>[] };

export default function Memories() {
  const { activeFamilyId } = useActiveFamily();
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [, navigate] = useLocation();

  const { data: rawEvents = [] } = useQuery<Event[]>({
    queryKey: ['/api/events?familyId=' + activeFamilyId],
    enabled: !!activeFamilyId,
  });

  const { data: rawMembers = [] } = useQuery<FamilyMember[]>({
    queryKey: ['/api/family-members', activeFamilyId],
    enabled: !!activeFamilyId,
  });

  const members = useMemo(() => rawMembers.map(mapFamilyMemberFromDb), [rawMembers]);
  const events = useMemo(() => rawEvents.map(e => ({
    ...mapEventFromDb(e),
    members: members.filter(m => e.memberIds.includes(m.id))
  })), [rawEvents, members]);

  const eventsWithPhotos: MemoryEvent[] = useMemo(
    () => events.filter(e => e.photoUrl),
    [events]
  );

  const getRotation = (id: string) => {
    let hash = 0;
    for (let i = 0; i < id.length; i++) {
      hash = ((hash << 5) - hash) + id.charCodeAt(i);
      hash = hash & hash;
    }
    return (hash % 7) - 3;
  };

  const groupedByMonth = useMemo(() => {
    const groups: { [key: string]: MemoryEvent[] } = {};
    eventsWithPhotos.forEach(event => {
      const monthKey = format(startOfMonth(event.startTime), 'MMMM yyyy');
      if (!groups[monthKey]) groups[monthKey] = [];
      groups[monthKey].push(event);
    });
    return Object.entries(groups).sort((a, b) => new Date(b[0]).getTime() - new Date(a[0]).getTime());
  }, [eventsWithPhotos]);

  const flatList = useMemo(() => eventsWithPhotos, [eventsWithPhotos]);
  const lightboxEvent = lightboxIndex !== null ? flatList[lightboxIndex] : null;

  const goNext = () => setLightboxIndex(i => i !== null && i < flatList.length - 1 ? i + 1 : i);
  const goPrev = () => setLightboxIndex(i => i !== null && i > 0 ? i - 1 : i);

  return (
    <div className="p-3 md:p-4">
      <div className="max-w-4xl mx-auto space-y-4">
        <div className="bg-card border border-border rounded-md p-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-md bg-purple-500 flex items-center justify-center">
                <Image className="w-4 h-4 text-white" />
              </div>
              <div>
                <h1 className="text-sm font-semibold text-foreground">Memories</h1>
                <p className="text-xs text-muted-foreground">Photos from your calendar events</p>
              </div>
            </div>
            <Button
              size="sm"
              onClick={() => navigate("/")}
              className="gap-1.5 text-xs"
              data-testid="button-add-memory"
            >
              <Plus className="w-3.5 h-3.5" />
              Add memory
            </Button>
          </div>
        </div>

        {groupedByMonth.length === 0 ? (
          <div className="bg-card border border-border rounded-md p-8 text-center space-y-3">
            <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center mx-auto">
              <Image className="w-6 h-6 text-purple-400" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">No memories yet</p>
              <p className="text-xs text-muted-foreground mt-1 max-w-xs mx-auto leading-relaxed">
                Memories are photos you add to calendar events. Create an event, attach a photo, and it shows up here as a keepsake.
              </p>
            </div>
            <Button
              size="sm"
              onClick={() => navigate("/")}
              className="gap-1.5"
              data-testid="button-add-first-memory"
            >
              <Calendar className="w-3.5 h-3.5" />
              Go to calendar to add one
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {groupedByMonth.map(([month, monthEvents]) => (
              <div key={month} className="space-y-3">
                <div className="bg-card border border-border rounded-md p-3">
                  <h2 className="text-xs font-semibold text-foreground">{month}</h2>
                  <p className="text-xs text-muted-foreground">{monthEvents.length} {monthEvents.length === 1 ? 'memory' : 'memories'}</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {monthEvents.map((event) => {
                    const globalIndex = flatList.findIndex(e => e.id === event.id);
                    return (
                      <div
                        key={event.id}
                        className="relative cursor-pointer hover-elevate transition-transform duration-200"
                        style={{ transform: `rotate(${getRotation(event.id)}deg)` }}
                        onClick={() => setLightboxIndex(globalIndex)}
                        data-testid={`memory-card-${event.id}`}
                        role="button"
                        aria-label={`View photo for ${event.title}`}
                        tabIndex={0}
                        onKeyDown={(e) => e.key === 'Enter' && setLightboxIndex(globalIndex)}
                      >
                        <div className="bg-white dark:bg-card rounded-md p-3 pb-12 shadow-2xl">
                          <div className="absolute -top-3 left-8 w-16 h-8 bg-gradient-to-br from-amber-50/90 to-amber-100/80 backdrop-blur-sm rotate-[-5deg] shadow-sm"
                            style={{ clipPath: 'polygon(0% 20%, 100% 0%, 100% 80%, 0% 100%)' }}
                          />
                          <div className="absolute -top-3 right-8 w-16 h-8 bg-gradient-to-br from-amber-50/90 to-amber-100/80 backdrop-blur-sm rotate-[8deg] shadow-sm"
                            style={{ clipPath: 'polygon(0% 0%, 100% 20%, 100% 100%, 0% 80%)' }}
                          />

                          <div className="bg-muted mb-4 overflow-hidden aspect-[4/3]">
                            {event.photoUrl ? (
                              <img src={event.photoUrl} alt={event.title} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <Image className="w-12 h-12 text-muted-foreground" />
                              </div>
                            )}
                          </div>

                          <div className="space-y-1">
                            <h3 className="font-semibold text-foreground text-xs">{event.title}</h3>
                            <p className="text-[10px] text-muted-foreground font-medium">{format(event.startTime, 'MMM d, yyyy')}</p>
                            {event.members && event.members.length > 0 && (
                              <div className="flex -space-x-2 pt-1">
                                {event.members.map((member) => (
                                  <Avatar key={member.id} className="h-6 w-6 border-2 border-white dark:border-card">
                                    <AvatarFallback className="text-white text-xs font-semibold" style={{ backgroundColor: member.color }}>
                                      {member.initials}
                                    </AvatarFallback>
                                  </Avatar>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Lightbox */}
      <Dialog open={lightboxIndex !== null} onOpenChange={(open) => !open && setLightboxIndex(null)}>
        <DialogContent className="max-w-3xl w-[calc(100vw-2rem)] p-0 border-0 bg-black/95 rounded-2xl overflow-hidden">
          <DialogTitle className="sr-only">{lightboxEvent?.title}</DialogTitle>
          <DialogDescription className="sr-only">Photo for {lightboxEvent?.title}</DialogDescription>

          {/* Top bar */}
          <div className="flex items-center justify-between px-4 py-3 bg-black/60">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-white truncate">{lightboxEvent?.title}</p>
              <p className="text-xs text-white/60 flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {lightboxEvent && format(lightboxEvent.startTime, 'MMMM d, yyyy')}
              </p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {flatList.length > 1 && (
                <span className="text-xs text-white/50">
                  {lightboxIndex !== null ? lightboxIndex + 1 : 0} / {flatList.length}
                </span>
              )}
              <Button size="icon" variant="ghost" className="text-white/70 hover:text-white" onClick={() => setLightboxIndex(null)} data-testid="button-close-lightbox">
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Image */}
          <div className="relative flex items-center justify-center bg-black min-h-[40vh] max-h-[70vh]">
            {lightboxEvent?.photoUrl && (
              <img
                src={lightboxEvent.photoUrl}
                alt={lightboxEvent.title}
                className="max-w-full max-h-[70vh] object-contain"
              />
            )}
            {flatList.length > 1 && (
              <>
                <button
                  onClick={goPrev}
                  disabled={lightboxIndex === 0}
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/50 flex items-center justify-center text-white disabled:opacity-30 hover-elevate"
                  data-testid="button-lightbox-prev"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  onClick={goNext}
                  disabled={lightboxIndex === flatList.length - 1}
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/50 flex items-center justify-center text-white disabled:opacity-30 hover-elevate"
                  data-testid="button-lightbox-next"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </>
            )}
          </div>

          {/* Member avatars in footer */}
          {lightboxEvent?.members && lightboxEvent.members.length > 0 && (
            <div className="flex items-center gap-2 px-4 py-3 bg-black/60">
              <span className="text-xs text-white/50">With</span>
              <div className="flex -space-x-1">
                {lightboxEvent.members.map(m => (
                  <Avatar key={m.id} className="h-6 w-6 border border-white/20">
                    <AvatarFallback className="text-white text-[10px] font-semibold" style={{ backgroundColor: m.color }}>
                      {m.initials}
                    </AvatarFallback>
                  </Avatar>
                ))}
              </div>
              <span className="text-xs text-white/60">{lightboxEvent.members.map(m => m.name).join(', ')}</span>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
