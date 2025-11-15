import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { MessageCircle, Calendar } from "lucide-react";
import { format } from "date-fns";
import type { Message, Event } from "@shared/schema";

interface MessagesModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  messages: Message[];
  events: Event[];
}

export default function MessagesModal({
  isOpen,
  onOpenChange,
  messages,
  events,
}: MessagesModalProps) {
  const messagesByEvent = messages.reduce((acc, message) => {
    if (!acc[message.eventId]) {
      acc[message.eventId] = [];
    }
    acc[message.eventId].push(message);
    return acc;
  }, {} as Record<string, Message[]>);

  const eventIds = Object.keys(messagesByEvent);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent 
        className="sm:max-w-3xl max-h-[85vh] backdrop-blur-3xl bg-card/95 border-2 rounded-3xl shadow-2xl"
        data-testid="modal-messages"
      >
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold flex items-center gap-2">
            <MessageCircle className="h-6 w-6" />
            Messages
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="h-[60vh] pr-4">
          {messages.length === 0 ? (
            <div 
              className="flex flex-col items-center justify-center py-12 text-center"
              data-testid="text-no-messages"
            >
              <MessageCircle className="h-16 w-16 text-muted-foreground/30 mb-4" />
              <p className="text-lg font-medium text-muted-foreground">No messages yet</p>
              <p className="text-sm text-muted-foreground/70 mt-2">
                Send messages from event details to see them here
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {eventIds.map((eventId) => {
                const event = events.find((e) => e.id === eventId);
                const eventMessages = messagesByEvent[eventId];

                if (!event) return null;

                return (
                  <div
                    key={eventId}
                    className="p-4 rounded-2xl backdrop-blur-md bg-background/50 border"
                    data-testid={`group-event-${eventId}`}
                  >
                    <div className="flex items-center gap-3 mb-4 pb-3 border-b">
                      <div
                        className="w-1 h-12 rounded-full"
                        style={{ backgroundColor: event.color }}
                      />
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg" data-testid={`text-event-title-${eventId}`}>
                          {event.title}
                        </h3>
                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {format(new Date(event.startTime), 'PPP')}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-3">
                      {eventMessages.map((message) => (
                        <div
                          key={message.id}
                          className="flex gap-3 p-3 rounded-xl backdrop-blur-sm bg-background/30 hover-elevate"
                          data-testid={`message-${message.id}`}
                        >
                          <Avatar className="h-10 w-10 ring-2 ring-border">
                            <AvatarFallback className="text-sm font-semibold">
                              {message.senderName.split(' ').map(n => n[0]).join('')}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-baseline justify-between gap-2 mb-1">
                              <p 
                                className="font-semibold text-sm"
                                data-testid={`text-sender-${message.id}`}
                              >
                                {message.senderName}
                              </p>
                              <p 
                                className="text-xs text-muted-foreground whitespace-nowrap"
                                data-testid={`text-timestamp-${message.id}`}
                              >
                                {format(new Date(message.createdAt), 'MMM d, h:mm a')}
                              </p>
                            </div>
                            <div className="flex items-start gap-2">
                              {message.emoji && (
                                <span className="text-2xl" data-testid={`emoji-${message.id}`}>
                                  {message.emoji}
                                </span>
                              )}
                              <p 
                                className="text-sm break-words flex-1"
                                data-testid={`text-content-${message.id}`}
                                style={{
                                  fontWeight: message.fontWeight || 'normal',
                                  fontStyle: message.fontStyle || 'normal',
                                }}
                              >
                                {message.content}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>

        <div className="flex justify-end pt-4 border-t">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            data-testid="button-close-messages"
            className="backdrop-blur-md hover-elevate active-elevate-2"
          >
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
