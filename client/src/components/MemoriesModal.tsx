import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { X, Images, Camera } from "lucide-react";
import { format, startOfMonth, isSameMonth } from "date-fns";
import { useState } from "react";

interface Event {
  id: string;
  title: string;
  startTime: Date;
  photoUrl?: string;
  memberIds: string[];
}

interface FamilyMember {
  id: string;
  name: string;
  color: string;
  initials: string;
}

interface MemoriesModalProps {
  isOpen: boolean;
  onClose: () => void;
  events: Event[];
  members: FamilyMember[];
}

export default function MemoriesModal({ isOpen, onClose, events, members }: MemoriesModalProps) {
  // Filter events that have photos
  const eventsWithPhotos = events.filter(e => e.photoUrl);

  // Group events by month
  const eventsByMonth = eventsWithPhotos.reduce((acc, event) => {
    const monthKey = format(event.startTime, 'MMMM yyyy');
    if (!acc[monthKey]) {
      acc[monthKey] = [];
    }
    acc[monthKey].push(event);
    return acc;
  }, {} as Record<string, Event[]>);

  // Sort months in descending order (newest first)
  const sortedMonths = Object.keys(eventsByMonth).sort((a, b) => {
    const dateA = new Date(a);
    const dateB = new Date(b);
    return dateB.getTime() - dateA.getTime();
  });

  const [selectedImage, setSelectedImage] = useState<{ url: string; title: string; date: string } | null>(null);

  const handleImageClick = (event: Event) => {
    setSelectedImage({
      url: event.photoUrl!,
      title: event.title,
      date: format(event.startTime, 'MMMM d, yyyy')
    });
  };

  const handleCloseImagePreview = () => {
    setSelectedImage(null);
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-6xl max-h-[90vh] backdrop-blur-3xl bg-gradient-to-br from-slate-800/95 via-slate-700/95 to-slate-800/95 border-2 border-white/20 rounded-3xl shadow-2xl flex flex-col">
          <DialogHeader className="pb-4 border-b border-white/10 relative flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                <Images className="w-5 h-5 text-white" strokeWidth={2} />
              </div>
              <div>
                <DialogTitle className="text-2xl font-bold text-white">
                  Memories
                </DialogTitle>
                <p className="text-sm text-white/60 mt-0.5">Your photo scrapbook from special moments</p>
              </div>
            </div>
          </DialogHeader>

          <div className="overflow-y-auto flex-1 min-h-0 p-4 space-y-8">
            {sortedMonths.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-purple-500/20 to-pink-500/20 border-2 border-white/20 flex items-center justify-center mb-4">
                  <Camera className="w-10 h-10 text-white/70" strokeWidth={1.5} />
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">No Memories Yet</h3>
                <p className="text-white/60 max-w-md">
                  Start adding photos to your events to create your family scrapbook!
                </p>
              </div>
            ) : (
              sortedMonths.map(month => (
                <div key={month} className="space-y-4">
                  {/* Month Header */}
                  <div className="sticky top-0 z-10 backdrop-blur-xl bg-slate-800/80 -mx-4 px-4 py-3 border-b border-white/10">
                    <h3 className="text-xl font-bold text-white">{month}</h3>
                    <p className="text-sm text-white/60">{eventsByMonth[month].length} {eventsByMonth[month].length === 1 ? 'memory' : 'memories'}</p>
                  </div>

                  {/* Photo Grid - Scrapbook Style */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                    {eventsByMonth[month].map((event, index) => {
                      const eventMembers = members.filter(m => event.memberIds.includes(m.id));
                      const rotation = ['-rotate-2', 'rotate-1', '-rotate-1', 'rotate-2'][index % 4];
                      
                      return (
                        <button
                          key={event.id}
                          type="button"
                          onClick={() => handleImageClick(event)}
                          data-testid={`memory-card-${event.id}`}
                          className={`group relative ${rotation} hover:scale-105 hover:rotate-0 hover:z-20 transition-all duration-300 cursor-pointer`}
                        >
                          {/* Polaroid-style card */}
                          <div className="bg-white rounded-lg shadow-2xl overflow-hidden p-2 sm:p-3">
                            {/* Photo */}
                            <div className="aspect-square bg-slate-200 rounded overflow-hidden mb-2 sm:mb-3">
                              <img
                                src={event.photoUrl}
                                alt={event.title}
                                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                              />
                            </div>
                            
                            {/* Caption area */}
                            <div className="space-y-1 sm:space-y-2">
                              <p className="text-xs sm:text-sm font-semibold text-slate-800 truncate">
                                {event.title}
                              </p>
                              <p className="text-[10px] sm:text-xs text-slate-500">
                                {format(event.startTime, 'MMM d')}
                              </p>
                              
                              {/* Member avatars */}
                              {eventMembers.length > 0 && (
                                <div className="flex -space-x-2">
                                  {eventMembers.slice(0, 3).map(member => (
                                    <div
                                      key={member.id}
                                      className="w-5 h-5 sm:w-6 sm:h-6 rounded-full border-2 border-white flex items-center justify-center text-[8px] sm:text-xs font-medium text-white"
                                      style={{ backgroundColor: member.color }}
                                      title={member.name}
                                    >
                                      {member.initials}
                                    </div>
                                  ))}
                                  {eventMembers.length > 3 && (
                                    <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full border-2 border-white bg-slate-600 flex items-center justify-center text-[8px] sm:text-xs font-medium text-white">
                                      +{eventMembers.length - 3}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Full-size Image Preview */}
      {selectedImage && (
        <Dialog open={!!selectedImage} onOpenChange={handleCloseImagePreview}>
          <DialogContent className="sm:max-w-4xl max-h-[95vh] backdrop-blur-3xl bg-slate-900/95 border-2 border-white/20 rounded-3xl shadow-2xl p-0 overflow-hidden">
            <div className="relative">
              {/* Close button */}
              <button
                type="button"
                onClick={handleCloseImagePreview}
                className="absolute top-4 right-4 z-20 w-10 h-10 rounded-full backdrop-blur-xl bg-black/50 border border-white/20 flex items-center justify-center hover:bg-black/70 transition-all"
                data-testid="button-close-preview"
              >
                <X className="w-5 h-5 text-white" />
              </button>

              {/* Image */}
              <div className="relative">
                <img
                  src={selectedImage.url}
                  alt={selectedImage.title}
                  className="w-full h-auto max-h-[80vh] object-contain"
                />
              </div>

              {/* Caption */}
              <div className="p-6 backdrop-blur-xl bg-slate-800/90 border-t border-white/10">
                <h3 className="text-xl font-bold text-white mb-1">{selectedImage.title}</h3>
                <p className="text-sm text-white/60">{selectedImage.date}</p>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
