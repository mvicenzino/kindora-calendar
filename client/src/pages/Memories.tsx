import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { format, parseISO, startOfMonth } from "date-fns";
import { X, Image } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useActiveFamily } from "@/contexts/ActiveFamilyContext";
import type { Event, FamilyMember } from "@shared/schema";
import { mapEventFromDb, mapFamilyMemberFromDb } from "@shared/types";
import { useMemo } from "react";

export default function Memories() {
  const [, setLocation] = useLocation();
  const { activeFamilyId } = useActiveFamily();

  // Fetch events with photos
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

  // Generate consistent random rotation for each event
  const getRotation = (id: string) => {
    let hash = 0;
    for (let i = 0; i < id.length; i++) {
      hash = ((hash << 5) - hash) + id.charCodeAt(i);
      hash = hash & hash;
    }
    const rotation = (hash % 7) - 3; // -3 to +3 degrees
    return rotation;
  };

  // Filter events that have photos
  const eventsWithPhotos = events.filter(e => e.photoUrl);

  // Group by month
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
    <div className="min-h-screen bg-gradient-to-br from-[#3A4550] via-[#4A5560] to-[#5A6570] p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl p-6 mb-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-purple-500 flex items-center justify-center">
                <Image className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white">Memories</h1>
                <p className="text-sm text-white/70">Your photo scrapbook from special moments</p>
              </div>
            </div>
            <button
              onClick={() => setLocation('/')}
              className="w-10 h-10 rounded-full bg-white/15 border border-white/30 flex items-center justify-center text-white hover:bg-white/20 transition-all"
              data-testid="button-close-memories"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Memory Groups */}
        {groupedByMonth.length === 0 ? (
          <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl p-12 text-center">
            <Image className="w-16 h-16 text-white/30 mx-auto mb-4" />
            <p className="text-white/70 text-lg">No memories yet</p>
            <p className="text-white/50 text-sm mt-2">Add photos to your events to create your scrapbook</p>
          </div>
        ) : (
          <div className="space-y-6">
            {groupedByMonth.map(([month, monthEvents]) => (
              <div key={month} className="space-y-4">
                {/* Month Header */}
                <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-4">
                  <h2 className="text-2xl font-bold text-white">{month}</h2>
                  <p className="text-sm text-white/70">{monthEvents.length} {monthEvents.length === 1 ? 'memory' : 'memories'}</p>
                </div>

                {/* Memory Grid - Scrapbook Style */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
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
                      {/* Polaroid Card */}
                      <div className="bg-white rounded-sm p-5 pb-16 shadow-2xl">
                        {/* Tape on corners */}
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

                        {/* Photo */}
                        <div className="bg-gray-100 mb-4 overflow-hidden aspect-[4/3]">
                          {event.photoUrl ? (
                            <img
                              src={event.photoUrl}
                              alt={event.title}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Image className="w-12 h-12 text-gray-300" />
                            </div>
                          )}
                        </div>

                        {/* Event Info */}
                        <div className="space-y-2">
                          <h3 className="font-semibold text-gray-900 text-base">{event.title}</h3>
                          <p className="text-xs text-gray-500 font-medium">{format(event.startTime, 'MMM d, yyyy')}</p>

                          {/* Member Avatars */}
                          {event.members && event.members.length > 0 && (
                            <div className="flex -space-x-2 pt-1">
                              {event.members.map((member) => (
                                <Avatar key={member.id} className="h-6 w-6 border-2 border-white">
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
