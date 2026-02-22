import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { format, parseISO, startOfMonth } from "date-fns";
import { Image } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useActiveFamily } from "@/contexts/ActiveFamilyContext";
import type { Event, FamilyMember } from "@shared/schema";
import { mapEventFromDb, mapFamilyMemberFromDb } from "@shared/types";
import { useMemo } from "react";

export default function Memories() {
  const [, setLocation] = useLocation();
  const { activeFamilyId } = useActiveFamily();

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

  const getRotation = (id: string) => {
    let hash = 0;
    for (let i = 0; i < id.length; i++) {
      hash = ((hash << 5) - hash) + id.charCodeAt(i);
      hash = hash & hash;
    }
    const rotation = (hash % 7) - 3;
    return rotation;
  };

  const eventsWithPhotos = events.filter(e => e.photoUrl);

  const groupedByMonth = useMemo(() => {
    const groups: { [key: string]: typeof eventsWithPhotos } = {};
    
    eventsWithPhotos.forEach(event => {
      const monthKey = format(startOfMonth(event.startTime), 'MMMM yyyy');
      if (!groups[monthKey]) {
        groups[monthKey] = [];
      }
      groups[monthKey].push(event);
    });

    return Object.entries(groups).sort((a, b) => {
      return new Date(b[0]).getTime() - new Date(a[0]).getTime();
    });
  }, [eventsWithPhotos]);

  return (
    <div className="p-3 md:p-4">
      <div className="max-w-4xl mx-auto space-y-4">
        <div className="bg-card border border-border rounded-md p-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-md bg-purple-500 flex items-center justify-center">
              <Image className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="text-sm font-semibold text-foreground">Memories</h1>
              <p className="text-xs text-muted-foreground">Your photo scrapbook from special moments</p>
            </div>
          </div>
        </div>

        {groupedByMonth.length === 0 ? (
          <div className="bg-card border border-border rounded-md p-3 text-center">
            <Image className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-muted-foreground text-xs font-medium">No memories yet</p>
            <p className="text-muted-foreground text-xs mt-1">Add photos to your events to create your scrapbook</p>
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
                  {monthEvents.map((event) => (
                    <div
                      key={event.id}
                      className="relative cursor-pointer hover:scale-105 transition-transform duration-300"
                      style={{
                        transform: `rotate(${getRotation(event.id)}deg)`,
                      }}
                      onClick={() => setLocation('/')}
                      data-testid={`memory-card-${event.id}`}
                    >
                      <div className="bg-white dark:bg-card rounded-md p-3 pb-12 shadow-2xl">
                        <div className="absolute -top-3 left-8 w-16 h-8 bg-gradient-to-br from-amber-50/90 to-amber-100/80 backdrop-blur-sm rotate-[-5deg] shadow-sm" 
                          style={{
                            clipPath: 'polygon(0% 20%, 100% 0%, 100% 80%, 0% 100%)',
                          }}
                        />
                        <div className="absolute -top-3 right-8 w-16 h-8 bg-gradient-to-br from-amber-50/90 to-amber-100/80 backdrop-blur-sm rotate-[8deg] shadow-sm"
                          style={{
                            clipPath: 'polygon(0% 0%, 100% 20%, 100% 100%, 0% 80%)',
                          }}
                        />

                        <div className="bg-muted mb-4 overflow-hidden aspect-[4/3]">
                          {event.photoUrl ? (
                            <img
                              src={event.photoUrl}
                              alt={event.title}
                              className="w-full h-full object-cover"
                            />
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
                                  <AvatarFallback
                                    className="text-white text-xs font-semibold"
                                    style={{ backgroundColor: member.color }}
                                  >
                                    {member.initials}
                                  </AvatarFallback>
                                </Avatar>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
