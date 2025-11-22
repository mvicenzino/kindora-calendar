import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { format, parseISO, startOfMonth } from "date-fns";
import { X, Image } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import type { Event, FamilyMember } from "@shared/schema";
import { mapEventFromDb, mapFamilyMemberFromDb } from "@shared/types";
import { useMemo } from "react";

export default function Memories() {
  const [, setLocation] = useLocation();

  // Fetch events with photos
  const { data: rawEvents = [] } = useQuery<Event[]>({
    queryKey: ['/api/events'],
  });

  const { data: rawMembers = [] } = useQuery<FamilyMember[]>({
    queryKey: ['/api/family-members'],
  });

  const members = useMemo(() => rawMembers.map(mapFamilyMemberFromDb), [rawMembers]);
  const events = useMemo(() => rawEvents.map(e => ({
    ...mapEventFromDb(e),
    members: members.filter(m => m.id === e.memberId)
  })), [rawEvents, members]);

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
    <div className="min-h-screen bg-gradient-to-br from-[#4A5A6A] via-[#5A6A7A] to-[#6A7A8A] p-6">
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

                {/* Memory Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {monthEvents.map((event) => (
                    <div
                      key={event.id}
                      className="bg-white rounded-2xl p-4 shadow-lg hover:shadow-xl transition-all cursor-pointer"
                      onClick={() => setLocation('/')}
                      data-testid={`memory-card-${event.id}`}
                    >
                      {/* Photo */}
                      <div className="bg-gray-100 rounded-lg mb-3 overflow-hidden aspect-[4/3]">
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
                        <h3 className="font-semibold text-gray-900 text-lg">{event.title}</h3>
                        <p className="text-sm text-gray-600">{format(event.startTime, 'MMM d')}</p>

                        {/* Member Avatars */}
                        {event.members && event.members.length > 0 && (
                          <div className="flex -space-x-2">
                            {event.members.map((member) => (
                              <Avatar key={member.id} className="h-7 w-7 border-2 border-white">
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
