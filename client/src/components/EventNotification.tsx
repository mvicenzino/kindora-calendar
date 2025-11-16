import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Clock, Bell } from "lucide-react";
import { format } from "date-fns";
import { useEffect, useRef } from "react";

interface FamilyMember {
  id: string;
  name: string;
  color: string;
}

interface Event {
  id: string;
  title: string;
  description?: string;
  startTime: Date;
  endTime: Date;
  memberIds: string[];
}

interface EventNotificationProps {
  isOpen: boolean;
  onClose: () => void;
  event?: Event;
  member?: FamilyMember;
}

export default function EventNotification({
  isOpen,
  onClose,
  event,
  member,
}: EventNotificationProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Play a calming notification sound using Web Audio API
  const playNotificationSound = () => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      // Create a gentle chime sound (two soft tones)
      const playTone = (frequency: number, startTime: number, duration: number) => {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.value = frequency;
        oscillator.type = 'sine';
        
        // Gentle fade in and out
        gainNode.gain.setValueAtTime(0, audioContext.currentTime + startTime);
        gainNode.gain.linearRampToValueAtTime(0.15, audioContext.currentTime + startTime + 0.1);
        gainNode.gain.linearRampToValueAtTime(0, audioContext.currentTime + startTime + duration);
        
        oscillator.start(audioContext.currentTime + startTime);
        oscillator.stop(audioContext.currentTime + startTime + duration);
      };
      
      // Play two gentle tones (calming chime)
      playTone(523.25, 0, 0.4);    // C5
      playTone(659.25, 0.2, 0.5);  // E5
      
    } catch (error) {
      // Silently fail if Web Audio API is not supported
      console.log('Audio playback not available');
    }
  };

  useEffect(() => {
    if (isOpen && event) {
      // Play notification sound
      playNotificationSound();
    }
  }, [isOpen, event]);

  if (!event || !member) return null;

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent 
          className="sm:max-w-md backdrop-blur-3xl bg-gradient-to-br from-blue-900/95 via-purple-900/95 to-blue-900/95 border-2 border-white/30 rounded-3xl shadow-2xl animate-in fade-in zoom-in duration-500"
          data-testid="dialog-event-notification"
        >
          <div className="space-y-6 py-4">
            {/* Bell Icon with pulsing animation */}
            <div className="flex justify-center">
              <div className="relative">
                <div className="absolute inset-0 bg-blue-500/30 rounded-full blur-2xl animate-pulse" />
                <div className="relative w-20 h-20 rounded-full bg-gradient-to-br from-blue-500/40 to-purple-600/40 backdrop-blur-xl border-2 border-white/40 flex items-center justify-center shadow-lg animate-bounce">
                  <Bell className="w-10 h-10 text-white" />
                </div>
              </div>
            </div>

            {/* Notification Title */}
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-bold text-white">
                Upcoming Event
              </h2>
              <p className="text-white/70 text-sm">
                Starting in 10 minutes
              </p>
            </div>

            {/* Event Details */}
            <div className="p-5 rounded-2xl backdrop-blur-md bg-white/10 border border-white/20 space-y-4">
              <div>
                <h3 className="text-xl font-bold text-white mb-1">
                  {event.title}
                </h3>
                {event.description && (
                  <p className="text-sm text-white/70">
                    {event.description}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-3 text-white/80">
                <Clock className="w-4 h-4" />
                <span className="text-sm">
                  {format(event.startTime, 'h:mm a')} - {format(event.endTime, 'h:mm a')}
                </span>
              </div>

              {member && (
                <div className="flex items-center gap-2 pt-2 border-t border-white/10">
                  <div 
                    className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold text-white border-2 border-white/40"
                    style={{ backgroundColor: member.color }}
                  >
                    {member.name.split(' ').map(n => n[0]).join('')}
                  </div>
                  <span className="text-sm text-white/80">
                    {member.name}
                  </span>
                </div>
              )}
            </div>

            {/* Action Button */}
            <div className="flex justify-center pt-2">
              <Button
                onClick={onClose}
                data-testid="button-dismiss-notification"
                size="lg"
                className="px-8 hover-elevate active-elevate-2 bg-gradient-to-r from-blue-500/80 to-purple-600/80 hover:from-blue-500/90 hover:to-purple-600/90 border-2 border-white/30"
              >
                Got it
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
