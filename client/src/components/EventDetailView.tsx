import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Calendar, Clock, Edit, MessageCircle, ChevronDown, Image as ImageIcon, X } from "lucide-react";
import { format } from "date-fns";
import { useState, useEffect, useRef } from "react";
import { useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { InsertMessage } from "@shared/schema";
import { ObjectUploader } from "./ObjectUploader";
import type { UploadResult } from "@uppy/core";

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
  photoUrl?: string;
}

interface EventDetailViewProps {
  isOpen: boolean;
  onClose: () => void;
  onEdit: () => void;
  event?: Event;
  members?: FamilyMember[];
  allMembers?: FamilyMember[];
}

export default function EventDetailView({
  isOpen,
  onClose,
  onEdit,
  event,
  members = [],
  allMembers = [],
}: EventDetailViewProps) {
  const [message, setMessage] = useState("");
  const [selectedEmoji, setSelectedEmoji] = useState<string>("");
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);
  const [selectedRecipientId, setSelectedRecipientId] = useState<string>("");
  const [isLoveNoteExpanded, setIsLoveNoteExpanded] = useState(false);
  const [photoUrl, setPhotoUrl] = useState<string>("");
  const pendingObjectPath = useRef<string>("");
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
      
      // Show success toast with random loving message
      const randomMessage = loveMessages[Math.floor(Math.random() * loveMessages.length)];
      toast({
        description: randomMessage,
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

  // Attach photo mutation
  const attachPhotoMutation = useMutation({
    mutationFn: async ({ eventId, photoUrl }: { eventId: string; photoUrl: string }) => {
      const res = await apiRequest('PUT', '/api/event-photos', { eventId, photoUrl });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/events'] });
      toast({
        description: "Photo added to event!",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to attach photo. Please try again.",
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
      setIsLoveNoteExpanded(false);
      setPhotoUrl(event.photoUrl || "");
      pendingObjectPath.current = "";
      // Auto-select first family member as default recipient
      setSelectedRecipientId(allMembers.length > 0 ? allMembers[0].id : "");
    }
  }, [isOpen, event?.id, allMembers]);

  const loveEmojis = ["❤️", "💕", "💖", "💝", "🌹", "💐", "🥰", "😍", "💗", "💓"];
  
  const loveMessages = [
    "Family love sent!",
    "Your heart is full!",
    "Love makes everything better!",
    "Family is everything!",
    "Spreading the love!",
    "You're the best!",
    "Love never fails!",
    "Together is our favorite place!",
    "Family first, always!",
    "Your love lights up their day!",
    "Making memories with love!",
    "Love you to the moon and back!",
    "Home is wherever you are!",
    "Love grows here!",
    "The best things in life are family!",
  ];

  if (!event || members.length === 0) return null;

  const isSometimeToday = event.startTime.getHours() === 23 && 
                          event.startTime.getMinutes() === 58 &&
                          event.endTime.getHours() === 23 && 
                          event.endTime.getMinutes() === 59;

  const handleSendMessage = async () => {
    if (!event || members.length === 0 || !message.trim() || !selectedRecipientId) return;
    
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

  const handleGetUploadParameters = async () => {
    const res = await apiRequest('POST', '/api/objects/upload', {});
    const data = await res.json();
    pendingObjectPath.current = data.objectPath;
    return {
      method: 'PUT' as const,
      url: data.uploadURL,
    };
  };

  const handleUploadComplete = async (result: UploadResult<Record<string, unknown>, Record<string, unknown>>) => {
    if (result.successful && result.successful.length > 0 && event) {
      const objectPath = pendingObjectPath.current;
      if (objectPath) {
        attachPhotoMutation.mutate(
          { eventId: event.id, photoUrl: objectPath },
          {
            onSuccess: (data) => {
              setPhotoUrl(data.photoUrl);
              pendingObjectPath.current = "";
            },
          }
        );
      }
    }
  };

  const handleRemovePhoto = async () => {
    if (event) {
      try {
        await apiRequest('PUT', '/api/event-photos', { eventId: event.id, photoUrl: null });
        setPhotoUrl("");
        queryClient.invalidateQueries({ queryKey: ['/api/events'] });
        toast({
          description: "Photo removed from event",
        });
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to remove photo. Please try again.",
          variant: "destructive",
        });
      }
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col backdrop-blur-3xl bg-gradient-to-br from-slate-800/95 via-slate-700/95 to-slate-800/95 border-2 border-white/20 rounded-3xl shadow-2xl">
        <button
          onClick={onEdit}
          data-testid="button-edit-event"
          className="absolute right-16 top-6 w-8 h-8 rounded-full backdrop-blur-xl bg-gradient-to-br from-white/40 to-white/10 flex items-center justify-center border-2 border-white/50 shadow-lg shadow-white/20 hover:from-white/50 hover:to-white/20 transition-all active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-white/30 focus:ring-offset-0 z-40"
          aria-label="Edit event"
        >
          <Edit className="w-4 h-4 text-white drop-shadow-md" strokeWidth={2.5} />
        </button>
        <DialogHeader className="flex-shrink-0 pb-4 border-b border-white/10">
          <DialogTitle className="text-2xl font-bold text-white pr-20">
            Event Details
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-4 overflow-y-auto flex-1 custom-scrollbar">
          {/* Event Title & Members */}
          <div className="p-5 rounded-2xl backdrop-blur-md bg-white/10 border border-white/20">
            <div className="flex items-start gap-3">
              <div className="flex -space-x-2">
                {members.map(member => (
                  <Avatar key={member.id} className="h-12 w-12 ring-2 ring-white/30" style={{ '--tw-ring-color': `${member.color}80` } as React.CSSProperties}>
                    <AvatarFallback 
                      className="text-white font-semibold text-lg"
                      style={{ backgroundColor: member.color }}
                    >
                      {member.name.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                ))}
              </div>
              <div className="flex-1">
                <h3 className="text-2xl font-bold mb-1 text-white">{event.title}</h3>
                <p className="text-sm text-white/70">
                  Assigned to {members.map(m => m.name).join(', ')}
                </p>
              </div>
            </div>
          </div>

          {/* Event Photo */}
          {photoUrl && (
            <div className="relative rounded-2xl overflow-hidden backdrop-blur-md bg-white/10 border border-white/20">
              <img 
                src={photoUrl} 
                alt={event.title}
                className="w-full h-64 object-cover"
                data-testid="img-event-photo"
              />
              <Button
                type="button"
                size="icon"
                variant="destructive"
                onClick={handleRemovePhoto}
                className="absolute top-2 right-2 hover-elevate active-elevate-2"
                data-testid="button-remove-photo-detail"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}

          {/* Date & Time */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-start gap-3 p-4 rounded-xl backdrop-blur-md bg-white/10 border border-white/20">
              <Calendar className="h-5 w-5 mt-0.5 text-white/70" />
              <div>
                <p className="text-xs font-medium text-white/60 mb-1">Date</p>
                <p className="text-base font-semibold text-white">{format(event.startTime, 'PPP')}</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-4 rounded-xl backdrop-blur-md bg-white/10 border border-white/20">
              <Clock className="h-5 w-5 mt-0.5 text-white/70" />
              <div>
                <p className="text-xs font-medium text-white/60 mb-1">Time</p>
                <p className="text-base font-semibold text-white">
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
            <div className="p-4 rounded-xl backdrop-blur-md bg-white/10 border border-white/20">
              <p className="text-xs font-medium text-white/60 mb-2">Description</p>
              <p className="text-base text-white">{event.description}</p>
            </div>
          )}

          <Separator className="bg-white/10" />

          {/* Upload Photo Section */}
          {!photoUrl && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ImageIcon className="h-4 w-4 text-white/70" />
                  <h4 className="text-sm font-medium text-white/80">Event Photo</h4>
                </div>
                <span className="text-xs text-white/60">Optional</span>
              </div>
              <p className="text-xs text-white/60">Add a photo to remember this moment</p>
              <ObjectUploader
                maxNumberOfFiles={1}
                maxFileSize={10485760}
                onGetUploadParameters={handleGetUploadParameters}
                onComplete={handleUploadComplete}
                buttonClassName="w-full backdrop-blur-md bg-white/10 border border-white/20 hover-elevate active-elevate-2 text-white"
              >
                <div className="flex items-center justify-center gap-2 py-2">
                  <ImageIcon className="h-5 w-5" />
                  <span>Add Photo</span>
                </div>
              </ObjectUploader>
            </div>
          )}

          {/* Message Section - Collapsible */}
          <div className="space-y-3">
            <button
              type="button"
              onClick={() => setIsLoveNoteExpanded(!isLoveNoteExpanded)}
              className="w-full flex items-center justify-between p-3 rounded-xl backdrop-blur-md bg-white/10 border border-white/20 hover-elevate active-elevate-2 transition-all"
              data-testid="button-toggle-love-note"
              aria-expanded={isLoveNoteExpanded}
              aria-controls="love-note-panel"
            >
              <div className="flex items-center gap-2">
                <MessageCircle className="h-5 w-5 text-white/70" />
                <h4 className="text-base font-medium text-white">Send a Love Note</h4>
              </div>
              <ChevronDown 
                className={`h-5 w-5 text-white/70 transition-transform duration-300 motion-reduce:transition-none ${
                  isLoveNoteExpanded ? 'rotate-180' : ''
                }`}
              />
            </button>
            
            {isLoveNoteExpanded && (
              <div id="love-note-panel" className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-300 motion-reduce:animate-none">
                {/* Combined Send To & Formatting */}
                <div className="p-4 rounded-xl backdrop-blur-md bg-white/10 border border-white/20 space-y-3">
                  {/* Send to & Text style row */}
                  <div className="flex flex-wrap items-start gap-4">
                    {/* Recipient Selector */}
                    <div className="flex-1 min-w-[200px] space-y-2">
                      <p className="text-xs font-medium text-white/60">Send to</p>
                      <div className="flex flex-wrap gap-2">
                        {allMembers.map((recipient) => (
                          <button
                            key={recipient.id}
                            type="button"
                            onClick={() => setSelectedRecipientId(recipient.id)}
                            className={`relative group transition-all ${
                              selectedRecipientId === recipient.id ? 'scale-110' : 'hover:scale-105'
                            }`}
                            data-testid={`button-recipient-${recipient.id}`}
                            aria-label={`Send to ${recipient.name}`}
                          >
                            <Avatar className={`h-10 w-10 ring-2 transition-all ${
                              selectedRecipientId === recipient.id 
                                ? 'ring-white/50 shadow-lg' 
                                : 'ring-white/20 hover:ring-white/30'
                            }`}>
                              <AvatarFallback 
                                className="text-white text-sm font-semibold"
                                style={{ backgroundColor: recipient.color }}
                              >
                                {recipient.name.split(' ').map(n => n[0]).join('')}
                              </AvatarFallback>
                            </Avatar>
                          </button>
                        ))}
                        {allMembers.length === 0 && (
                          <p className="text-sm text-white/60">No family members available</p>
                        )}
                      </div>
                    </div>

                    {/* Text style */}
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-white/60">Text style</p>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant={isBold ? "default" : "outline"}
                          onClick={() => setIsBold(!isBold)}
                          className={`font-bold hover-elevate active-elevate-2 ${
                            !isBold ? "bg-white/20 border-white/30 text-white" : ""
                          }`}
                          data-testid="button-bold"
                        >
                          Bold
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant={isItalic ? "default" : "outline"}
                          onClick={() => setIsItalic(!isItalic)}
                          className={`italic hover-elevate active-elevate-2 ${
                            !isItalic ? "bg-white/20 border-white/30 text-white" : ""
                          }`}
                          data-testid="button-italic"
                        >
                          Italic
                        </Button>
                      </div>
                    </div>
                  </div>
                  
                  {/* Emoji selector */}
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-white/60">Add an emoji</p>
                    <div className="flex flex-wrap gap-2">
                      {loveEmojis.map((emoji) => (
                        <Button
                          key={emoji}
                          type="button"
                          size="sm"
                          variant={selectedEmoji === emoji ? "default" : "outline"}
                          onClick={() => setSelectedEmoji(selectedEmoji === emoji ? "" : emoji)}
                          className={`text-lg h-10 w-10 p-0 hover-elevate active-elevate-2 ${
                            selectedEmoji !== emoji ? "bg-white/20 border-white/30" : ""
                          }`}
                          data-testid={`button-emoji-${emoji}`}
                        >
                          {emoji}
                        </Button>
                      ))}
                    </div>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder={`Write your love note to ${allMembers.find(m => m.id === selectedRecipientId)?.name || 'family member'}...`}
                    data-testid="textarea-event-message"
                    className="backdrop-blur-md bg-white/10 border-white/20 rounded-xl resize-none min-h-[100px] text-white placeholder:text-white/50"
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
            )}
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-white/10 flex-shrink-0">
          <Button
            variant="outline"
            onClick={onClose}
            data-testid="button-close-detail"
            className="backdrop-blur-md border-white/30 text-white hover:text-white hover-elevate active-elevate-2"
          >
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
