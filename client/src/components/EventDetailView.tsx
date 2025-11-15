import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Calendar, Clock, Edit, MessageCircle } from "lucide-react";
import { format } from "date-fns";
import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { InsertMessage } from "@shared/schema";

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
  allMembers?: FamilyMember[];
}

export default function EventDetailView({
  isOpen,
  onClose,
  onEdit,
  event,
  member,
  allMembers = [],
}: EventDetailViewProps) {
  const [message, setMessage] = useState("");
  const [selectedEmoji, setSelectedEmoji] = useState<string>("");
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);
  const [selectedRecipientId, setSelectedRecipientId] = useState<string>("");
  const { toast } = useToast();

  // Create message mutation
  const createMessageMutation = useMutation({
    mutationFn: async (messageData: InsertMessage) => {
      const res = await apiRequest('POST', '/api/messages', messageData);
      return await res.json();
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['/api/messages'] });
      const recipient = allMembers.find(m => m.id === variables.recipientId);
      
      // Clear all form states
      setMessage("");
      setSelectedEmoji("");
      setIsBold(false);
      setIsItalic(false);
      
      // Show success toast
      toast({
        title: "Love note sent",
        description: `Your love note was sent to ${recipient?.name || 'family member'}`,
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Reset message when a new event is opened
  useEffect(() => {
    if (isOpen && event) {
      setMessage("");
      setSelectedEmoji("");
      setIsBold(false);
      setIsItalic(false);
      // Auto-select first available recipient (not event owner)
      const otherMembers = allMembers.filter(m => m.id !== event.memberId);
      setSelectedRecipientId(otherMembers.length > 0 ? otherMembers[0].id : "");
    }
  }, [isOpen, event?.id, event?.memberId, allMembers]);

  const loveEmojis = ["❤️", "💕", "💖", "💝", "🌹", "💐", "🥰", "😍", "💗", "💓"];

  if (!event || !member) return null;

  const isSometimeToday = event.startTime.getHours() === 23 && 
                          event.startTime.getMinutes() === 58 &&
                          event.endTime.getHours() === 23 && 
                          event.endTime.getMinutes() === 59;

  const handleSendMessage = async () => {
    if (!event || !member || !message.trim() || !selectedRecipientId) return;
    
    const recipient = allMembers.find(m => m.id === selectedRecipientId);
    if (!recipient) return;
    
    await createMessageMutation.mutateAsync({
      eventId: event.id,
      senderName: "You",
      recipientId: selectedRecipientId,
      content: message.trim(),
      fontWeight: isBold ? "bold" : undefined,
      fontStyle: isItalic ? "italic" : undefined,
      emoji: selectedEmoji || undefined,
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col backdrop-blur-3xl bg-card/95 border-2 rounded-3xl shadow-2xl">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="text-2xl font-bold flex items-center justify-between pr-8">
            Event Details
            <Button
              onClick={onEdit}
              data-testid="button-edit-event"
              size="icon"
              variant="ghost"
              className="hover-elevate active-elevate-2"
            >
              <Edit className="h-5 w-5" />
            </Button>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4 overflow-y-auto flex-1">
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
              <h4 className="text-lg font-semibold">Send a Love Note</h4>
            </div>
            
            {/* Recipient Selector */}
            <div className="p-3 rounded-xl backdrop-blur-md bg-background/50 space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Send to</p>
              <div className="flex flex-wrap gap-2">
                {allMembers
                  .filter(m => m.id !== event.memberId)
                  .map((recipient) => (
                    <Button
                      key={recipient.id}
                      type="button"
                      size="sm"
                      variant={selectedRecipientId === recipient.id ? "default" : "outline"}
                      onClick={() => setSelectedRecipientId(recipient.id)}
                      className="hover-elevate active-elevate-2"
                      data-testid={`button-recipient-${recipient.id}`}
                    >
                      <Avatar className="h-5 w-5 mr-2 ring-1" style={{ '--tw-ring-color': recipient.color } as React.CSSProperties}>
                        <AvatarFallback 
                          className="text-white text-xs font-semibold"
                          style={{ backgroundColor: recipient.color }}
                        >
                          {recipient.name.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      {recipient.name}
                    </Button>
                  ))}
                {allMembers.filter(m => m.id !== event.memberId).length === 0 && (
                  <p className="text-sm text-muted-foreground">No other family members to send to</p>
                )}
              </div>
            </div>
            
            {/* Formatting Controls */}
            <div className="p-3 rounded-xl backdrop-blur-md bg-background/50 space-y-3">
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">Add an emoji</p>
                <div className="flex flex-wrap gap-2">
                  {loveEmojis.map((emoji) => (
                    <Button
                      key={emoji}
                      type="button"
                      size="sm"
                      variant={selectedEmoji === emoji ? "default" : "outline"}
                      onClick={() => setSelectedEmoji(selectedEmoji === emoji ? "" : emoji)}
                      className="text-lg h-10 w-10 p-0 hover-elevate active-elevate-2"
                      data-testid={`button-emoji-${emoji}`}
                    >
                      {emoji}
                    </Button>
                  ))}
                </div>
              </div>
              
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">Text style</p>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant={isBold ? "default" : "outline"}
                    onClick={() => setIsBold(!isBold)}
                    className="font-bold hover-elevate active-elevate-2"
                    data-testid="button-bold"
                  >
                    Bold
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={isItalic ? "default" : "outline"}
                    onClick={() => setIsItalic(!isItalic)}
                    className="italic hover-elevate active-elevate-2"
                    data-testid="button-italic"
                  >
                    Italic
                  </Button>
                </div>
              </div>
            </div>
            
            <div className="space-y-2">
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={`Write your love note to ${allMembers.find(m => m.id === selectedRecipientId)?.name || 'family member'}...`}
                data-testid="textarea-event-message"
                className="backdrop-blur-md bg-background/50 rounded-xl resize-none min-h-[100px]"
                style={{
                  fontWeight: isBold ? 'bold' : 'normal',
                  fontStyle: isItalic ? 'italic' : 'normal',
                }}
              />
              <div className="flex justify-end">
                <Button
                  onClick={handleSendMessage}
                  disabled={!message.trim() || !selectedRecipientId || createMessageMutation.isPending}
                  data-testid="button-send-message"
                  size="sm"
                  className="hover-elevate active-elevate-2"
                >
                  <MessageCircle className="h-4 w-4 mr-2" />
                  {createMessageMutation.isPending ? "Sending..." : "Send Love Note"}
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t flex-shrink-0">
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
