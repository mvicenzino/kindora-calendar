import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Calendar, Clock, Edit, MessageCircle, StickyNote } from "lucide-react";
import { format } from "date-fns";
import { useState, useEffect } from "react";

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
  memberId: string;
}

interface EventDetailViewProps {
  isOpen: boolean;
  onClose: () => void;
  onEdit: () => void;
  event?: Event;
  member?: FamilyMember;
}

export default function EventDetailView({
  isOpen,
  onClose,
  onEdit,
  event,
  member,
}: EventDetailViewProps) {
  const [message, setMessage] = useState("");
  const [notes, setNotes] = useState("");

  // Reset message and notes when a new event is opened
  useEffect(() => {
    if (isOpen && event) {
      setMessage("");
      setNotes("");
    }
  }, [isOpen, event?.id]);

  if (!event || !member) return null;

  const isSometimeToday = event.startTime.getHours() === 23 && 
                          event.startTime.getMinutes() === 58 &&
                          event.endTime.getHours() === 23 && 
                          event.endTime.getMinutes() === 59;

  const handleSendMessage = () => {
    // Placeholder for message sending functionality
    console.log("Sending message:", message, "to", member.name);
    setMessage("");
  };

  const handleSaveNotes = () => {
    // Placeholder for notes saving functionality
    console.log("Saving notes:", notes);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl backdrop-blur-3xl bg-card/95 border-2 rounded-3xl shadow-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold flex items-center justify-between">
            Event Details
            <Button
              onClick={onEdit}
              data-testid="button-edit-event"
              variant="outline"
              size="sm"
              className="backdrop-blur-md hover-elevate active-elevate-2"
            >
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Button>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Event Title & Member */}
          <div className="p-4 rounded-2xl backdrop-blur-md" style={{ 
            backgroundColor: `${member.color}10`,
            borderColor: `${member.color}30`
          }}>
            <div className="flex items-start gap-3">
              <Avatar className="h-12 w-12 ring-2" style={{ '--tw-ring-color': member.color } as React.CSSProperties}>
                <AvatarFallback 
                  className="text-white font-semibold text-lg"
                  style={{ backgroundColor: member.color }}
                >
                  {member.name.split(' ').map(n => n[0]).join('')}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <h3 className="text-2xl font-bold mb-1">{event.title}</h3>
                <p className="text-sm text-muted-foreground">Assigned to {member.name}</p>
              </div>
            </div>
          </div>

          {/* Date & Time */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-start gap-3 p-4 rounded-xl backdrop-blur-md bg-background/50">
              <Calendar className="h-5 w-5 mt-0.5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Date</p>
                <p className="text-base font-semibold">{format(event.startTime, 'PPP')}</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-4 rounded-xl backdrop-blur-md bg-background/50">
              <Clock className="h-5 w-5 mt-0.5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Time</p>
                <p className="text-base font-semibold">
                  {isSometimeToday ? (
                    "Sometime today"
                  ) : (
                    `${format(event.startTime, 'h:mm a')} - ${format(event.endTime, 'h:mm a')}`
                  )}
                </p>
              </div>
            </div>
          </div>

          {/* Description */}
          {event.description && (
            <div className="p-4 rounded-xl backdrop-blur-md bg-background/50">
              <p className="text-sm font-medium text-muted-foreground mb-2">Description</p>
              <p className="text-base">{event.description}</p>
            </div>
          )}

          <Separator />

          {/* Message Section */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5 text-muted-foreground" />
              <h4 className="text-lg font-semibold">Message {member.name}</h4>
            </div>
            <div className="space-y-2">
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={`Send a message to ${member.name} about this event...`}
                data-testid="textarea-event-message"
                className="backdrop-blur-md bg-background/50 rounded-xl resize-none min-h-[100px]"
              />
              <div className="flex justify-end">
                <Button
                  onClick={handleSendMessage}
                  disabled={!message.trim()}
                  data-testid="button-send-message"
                  size="sm"
                  className="hover-elevate active-elevate-2"
                >
                  <MessageCircle className="h-4 w-4 mr-2" />
                  Send Message
                </Button>
              </div>
            </div>
          </div>

          <Separator />

          {/* Notes Section */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <StickyNote className="h-5 w-5 text-muted-foreground" />
              <h4 className="text-lg font-semibold">Notes</h4>
            </div>
            <div className="space-y-2">
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add notes about this event..."
                data-testid="textarea-event-notes"
                className="backdrop-blur-md bg-background/50 rounded-xl resize-none min-h-[100px]"
              />
              <div className="flex justify-end">
                <Button
                  onClick={handleSaveNotes}
                  disabled={!notes.trim()}
                  data-testid="button-save-notes"
                  size="sm"
                  variant="outline"
                  className="backdrop-blur-md hover-elevate active-elevate-2"
                >
                  <StickyNote className="h-4 w-4 mr-2" />
                  Save Notes
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <Button
            variant="outline"
            onClick={onClose}
            data-testid="button-close-detail"
            className="backdrop-blur-md hover-elevate active-elevate-2"
          >
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
