import { useState, useRef, useEffect, useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useActiveFamily } from "@/contexts/ActiveFamilyContext";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { format, isToday, isYesterday, parseISO } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Send, 
  MessageCircle,
  Users,
  Calendar,
  MessageSquare
} from "lucide-react";
import type { Family } from "@shared/schema";

type MessageAuthor = {
  id: string;
  firstName: string;
  lastName: string;
  profileImageUrl: string | null;
  role: string;
};

type FamilyMessage = {
  id: string;
  familyId: string;
  authorUserId: string;
  content: string;
  createdAt: string;
  parentMessageId: string | null;
  author: MessageAuthor | null;
};

type EventNoteWithContext = {
  id: string;
  eventId: string;
  eventTitle: string;
  eventColor: string;
  eventStartTime: string;
  content: string;
  createdAt: string;
  parentNoteId: string | null;
  author: {
    id: string;
    firstName: string;
    lastName: string;
    profileImageUrl: string | null;
  } | null;
};

function formatMessageTime(dateString: string): string {
  const date = typeof dateString === 'string' ? parseISO(dateString) : new Date(dateString);
  if (isToday(date)) {
    return format(date, 'h:mm a');
  }
  if (isYesterday(date)) {
    return 'Yesterday ' + format(date, 'h:mm a');
  }
  return format(date, 'MMM d, h:mm a');
}

function formatDateDivider(dateString: string): string {
  const date = typeof dateString === 'string' ? parseISO(dateString) : new Date(dateString);
  if (isToday(date)) return 'Today';
  if (isYesterday(date)) return 'Yesterday';
  return format(date, 'EEEE, MMMM d');
}

function shouldShowDateDivider(currentMsg: FamilyMessage, prevMsg: FamilyMessage | null): boolean {
  if (!prevMsg) return true;
  const currentDate = typeof currentMsg.createdAt === 'string' ? parseISO(currentMsg.createdAt) : new Date(currentMsg.createdAt);
  const prevDate = typeof prevMsg.createdAt === 'string' ? parseISO(prevMsg.createdAt) : new Date(prevMsg.createdAt);
  return currentDate.toDateString() !== prevDate.toDateString();
}

function getInitials(firstName: string, lastName: string): string {
  return `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase();
}

function getAvatarGradient(role: string): string {
  switch (role) {
    case 'owner':
      return 'from-blue-500 to-indigo-600';
    case 'member':
      return 'from-purple-500 to-pink-500';
    case 'caregiver':
      return 'from-emerald-500 to-teal-600';
    default:
      return 'from-gray-500 to-gray-600';
  }
}

function getBubbleColors(role: string): { bg: string; border: string } {
  switch (role) {
    case 'caregiver':
      return {
        bg: 'rgba(16,185,129,0.18)',
        border: 'rgba(52,211,153,0.28)',
      };
    default:
      return {
        bg: 'rgba(255,255,255,0.09)',
        border: 'rgba(255,255,255,0.14)',
      };
  }
}

export default function Messages() {
  const { user } = useAuth();
  const { activeFamilyId } = useActiveFamily();
  const { toast } = useToast();
  const [newMessage, setNewMessage] = useState("");
  const [activeTab, setActiveTab] = useState("conversations");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  const { data: messages = [], isLoading } = useQuery<FamilyMessage[]>({
    queryKey: ['/api/family-messages?familyId=' + activeFamilyId],
    enabled: !!activeFamilyId,
    refetchInterval: 10000,
  });

  const { data: eventNotes = [], isLoading: notesLoading } = useQuery<EventNoteWithContext[]>({
    queryKey: ['/api/all-event-notes?familyId=' + activeFamilyId],
    enabled: !!activeFamilyId,
    refetchInterval: 10000,
  });

  const { data: family } = useQuery<Family>({
    queryKey: ['/api/family?familyId=' + activeFamilyId],
    enabled: !!activeFamilyId,
  });

  const { data: userRole } = useQuery<{ role: string }>({
    queryKey: ['/api/family/' + activeFamilyId + '/role'],
    enabled: !!activeFamilyId,
  });
  const isCaregiver = userRole?.role === 'caregiver';
  const isOwnerOrMember = userRole?.role === 'owner' || userRole?.role === 'member';

  const sendMessageMutation = useMutation({
    mutationFn: async ({ content, messageType }: { content: string; messageType: string }) => {
      const res = await apiRequest('POST', '/api/family-messages', {
        content,
        familyId: activeFamilyId,
        messageType,
      });
      return await res.json();
    },
    onSuccess: () => {
      setNewMessage("");
      queryClient.invalidateQueries({ queryKey: ['/api/family-messages?familyId=' + activeFamilyId] });
    },
    onError: () => {
      toast({
        title: "Failed to send message",
        description: "Please try again.",
        variant: "destructive",
      });
    },
  });

  const sortedMessages = useMemo(() => {
    return [...messages].sort((a, b) => 
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
  }, [messages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [sortedMessages]);

  const [activeMsgTab, setActiveMsgTab] = useState<'family' | 'caregiver'>('family');

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (newMessage.trim() && !sendMessageMutation.isPending) {
      const messageType = isCaregiver ? 'caregiver' : activeMsgTab;
      sendMessageMutation.mutate({ content: newMessage.trim(), messageType });
    }
  };

  const familyMessages = sortedMessages.filter(m => (m as any).messageType !== 'caregiver');
  const caregiverMessages = sortedMessages.filter(m => (m as any).messageType === 'caregiver');
  const displayedMessages = isCaregiver ? sortedMessages : (activeMsgTab === 'family' ? familyMessages : caregiverMessages);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(e);
    }
  };

  return (
    <div className="p-3 md:p-4">
      <div className="max-w-3xl mx-auto space-y-4">
        <div>
          <h1 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <MessageCircle className="h-4 w-4" />
            Messages
          </h1>
          <p className="text-muted-foreground text-xs">
            Family conversations and event notes
          </p>
        </div>

        {/* Message type tabs for owners/members */}
        {isOwnerOrMember && (
          <div className="flex gap-2 mb-3">
            <button onClick={() => setActiveMsgTab('family')} className={"flex-1 py-1.5 px-3 rounded-lg text-xs font-medium border transition-all " + (activeMsgTab === 'family' ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border text-muted-foreground hover:border-primary/30")}>
              Family
              {familyMessages.length > 0 && <span className="ml-1.5 opacity-60">{familyMessages.length}</span>}
            </button>
            <button onClick={() => setActiveMsgTab('caregiver')} className={"flex-1 py-1.5 px-3 rounded-lg text-xs font-medium border transition-all " + (activeMsgTab === 'caregiver' ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border text-muted-foreground hover:border-primary/30")}>
              Care Team
              {caregiverMessages.length > 0 && <span className="ml-1.5 opacity-60">{caregiverMessages.length}</span>}
            </button>
          </div>
        )}
        {isCaregiver && (
          <div className="mb-3 px-3 py-2 rounded-lg bg-primary/5 border border-primary/20">
            <p className="text-xs text-primary font-medium">Care Team Messages</p>
            <p className="text-xs text-muted-foreground mt-0.5">Messages visible to family and caregivers</p>
          </div>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab} className="h-[calc(100dvh-200px)]">
          <TabsList className="w-full rounded-md mb-3 p-0.5">
            <TabsTrigger 
              value="conversations" 
              className="flex-1 rounded-md text-xs"
              data-testid="tab-conversations"
            >
              <Users className="w-4 h-4 sm:mr-1" />
              <span className="hidden sm:inline">Conversations </span>({messages.length})
            </TabsTrigger>
            <TabsTrigger 
              value="event-notes" 
              className="flex-1 rounded-md text-xs"
              data-testid="tab-event-notes"
            >
              <Calendar className="w-4 h-4 sm:mr-1" />
              <span className="hidden sm:inline">Event </span>Notes ({eventNotes.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="conversations" className="mt-0 h-[calc(100%-60px)]">
            <Card className="h-full flex flex-col">
              <CardHeader className="border-b border-border pb-3 flex flex-row items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
                    <Users className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-sm" data-testid="text-family-name">
                      {family?.name || 'Family Chat'}
                    </CardTitle>
                    <p className="text-muted-foreground text-xs">
                      {messages.length} message{messages.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
              </CardHeader>

          <CardContent className="flex-1 p-0 overflow-hidden flex flex-col">
            <ScrollArea className="flex-1 px-4" ref={scrollAreaRef}>
              <div className="py-4 space-y-1.5">
                {isLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="text-muted-foreground">Loading messages...</div>
                  </div>
                ) : sortedMessages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-6 text-center">
                    <MessageCircle className="h-8 w-8 text-muted-foreground mb-3" />
                    <h3 className="text-foreground text-xs font-medium mb-1">No messages yet</h3>
                    <p className="text-muted-foreground text-xs max-w-xs">
                      Start a conversation with your family members. Everyone can see and reply to messages here.
                    </p>
                  </div>
                ) : (
                  displayedMessages.map((message, index) => {
                    const prevMessage = index > 0 ? sortedMessages[index - 1] : null;
                    const isOwnMessage = message.authorUserId === user?.id;
                    const showDateDivider = shouldShowDateDivider(message, prevMessage);
                    const authorRole = message.author?.role || 'member';

                    return (
                      <div key={message.id} className="space-y-0.5">
                        {showDateDivider && (
                          <div className="flex items-center justify-center my-5">
                            <div
                              className="px-3 py-1 text-[11px] font-medium text-muted-foreground"
                              style={{
                                background: "rgba(255,255,255,0.07)",
                                backdropFilter: "blur(12px)",
                                WebkitBackdropFilter: "blur(12px)",
                                borderRadius: 999,
                                border: "1px solid rgba(255,255,255,0.10)",
                              }}
                            >
                              {formatDateDivider(message.createdAt)}
                            </div>
                          </div>
                        )}
                        
                        <div 
                          className={`flex items-end gap-1.5 ${isOwnMessage ? 'flex-row-reverse' : 'flex-row'}`}
                          data-testid={`message-${message.id}`}
                        >
                          {/* Avatar — always shown */}
                          <Avatar className="h-7 w-7 flex-shrink-0 mb-1">
                            {message.author?.profileImageUrl && (
                              <AvatarImage src={message.author.profileImageUrl} />
                            )}
                            <AvatarFallback className={`bg-gradient-to-br ${getAvatarGradient(authorRole)} text-white text-[10px] font-bold tracking-tight`}>
                              {message.author ? getInitials(message.author.firstName, message.author.lastName) : '?'}
                            </AvatarFallback>
                          </Avatar>

                          <div className={`max-w-[72%] flex flex-col ${isOwnMessage ? 'items-end' : 'items-start'}`}>
                            {/* Sender name (others only) */}
                            {!isOwnMessage && message.author && (
                              <span className={`text-[11px] font-semibold mb-1 ml-1 ${
                                authorRole === 'caregiver' ? 'text-emerald-400' : 'text-muted-foreground'
                              }`}>
                                {message.author.firstName}
                                {authorRole === 'caregiver' && <span className="ml-1 font-normal opacity-60">· Caregiver</span>}
                              </span>
                            )}

                            {/* Bubble */}
                            {isOwnMessage ? (
                              <div
                                className="relative px-3.5 py-2.5"
                                style={{
                                  background: "linear-gradient(135deg, rgba(249,115,22,1) 0%, rgba(234,88,12,0.92) 100%)",
                                  backdropFilter: "blur(16px) saturate(160%)",
                                  WebkitBackdropFilter: "blur(16px) saturate(160%)",
                                  borderRadius: "22px 22px 6px 22px",
                                  boxShadow: "0 4px 20px rgba(249,115,22,0.35), inset 0 1px 0 rgba(255,255,255,0.25)",
                                }}
                                data-testid={`text-message-content-${message.id}`}
                              >
                                {/* glass shimmer */}
                                <div className="absolute inset-0 pointer-events-none rounded-[inherit]"
                                  style={{ background: "linear-gradient(135deg, rgba(255,255,255,0.22) 0%, rgba(255,255,255,0.04) 55%, transparent 100%)" }} />
                                <p className="relative text-[13px] text-white whitespace-pre-wrap break-words leading-relaxed">
                                  {message.content}
                                </p>
                                <p className="relative text-[10px] text-white/60 mt-1 text-right">
                                  {formatMessageTime(message.createdAt)}
                                </p>
                              </div>
                            ) : (
                              (() => {
                                const { bg, border } = getBubbleColors(authorRole);
                                return (
                                  <div
                                    className="relative px-3.5 py-2.5"
                                    style={{
                                      background: bg,
                                      backdropFilter: "blur(20px) saturate(180%)",
                                      WebkitBackdropFilter: "blur(20px) saturate(180%)",
                                      border: `1px solid ${border}`,
                                      borderRadius: "22px 22px 22px 6px",
                                      boxShadow: "0 2px 12px rgba(0,0,0,0.18), inset 0 1px 0 rgba(255,255,255,0.10)",
                                    }}
                                    data-testid={`text-message-content-${message.id}`}
                                  >
                                    {/* glass shimmer */}
                                    <div className="absolute inset-0 pointer-events-none rounded-[inherit]"
                                      style={{ background: "linear-gradient(135deg, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0.02) 60%, transparent 100%)" }} />
                                    <p className="relative text-[13px] text-foreground whitespace-pre-wrap break-words leading-relaxed">
                                      {message.content}
                                    </p>
                                    <p className="relative text-[10px] text-muted-foreground mt-1">
                                      {formatMessageTime(message.createdAt)}
                                    </p>
                                  </div>
                                );
                              })()
                            )}
                          </div>

                          {/* Avatar placeholder for own messages to keep alignment */}
                          {isOwnMessage && <div className="w-7 flex-shrink-0" />}
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

              <form 
                onSubmit={handleSendMessage}
                className="p-3 border-t border-border flex gap-2"
              >
                <Textarea
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Type a message..."
                  className="flex-1 min-h-[36px] max-h-24 resize-none text-xs"
                  data-testid="input-message"
                />
                <Button
                  type="submit"
                  size="icon"
                  disabled={!newMessage.trim() || sendMessageMutation.isPending}
                  data-testid="button-send-message"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="event-notes" className="mt-0 h-[calc(100%-60px)]">
          <Card className="h-full flex flex-col">
            <CardHeader className="border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center">
                  <MessageSquare className="h-4 w-4 text-white" />
                </div>
                <div>
                  <CardTitle className="text-sm">Event Notes</CardTitle>
                  <p className="text-muted-foreground text-xs">
                    Notes and updates from calendar events
                  </p>
                </div>
              </div>
            </CardHeader>

            <CardContent className="flex-1 p-0 overflow-hidden">
              <ScrollArea className="h-full px-4">
                <div className="py-4 space-y-3">
                  {notesLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <div className="text-muted-foreground">Loading event notes...</div>
                    </div>
                  ) : eventNotes.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-6 text-center">
                      <MessageSquare className="h-8 w-8 text-muted-foreground mb-3" />
                      <h3 className="text-foreground text-xs font-medium mb-1">No event notes yet</h3>
                      <p className="text-muted-foreground text-xs max-w-xs">
                        Notes added to calendar events will appear here for easy reference.
                      </p>
                    </div>
                  ) : (
                    eventNotes.map((note) => (
                      <div 
                        key={note.id} 
                        className="bg-muted/50 border border-border rounded-md p-3 hover-elevate transition-colors"
                        data-testid={`event-note-${note.id}`}
                      >
                        <div className="flex items-start gap-2">
                          <div 
                            className="w-2.5 h-2.5 rounded-full mt-1 flex-shrink-0"
                            style={{ backgroundColor: note.eventColor }}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                              <span className="text-foreground font-medium text-xs truncate">
                                {note.eventTitle}
                              </span>
                              <span className="text-muted-foreground text-[10px]">
                                {format(parseISO(note.eventStartTime), 'MMM d')}
                              </span>
                            </div>
                            <p className="text-foreground text-xs mb-1.5">{note.content}</p>
                            <div className="flex items-center gap-2 text-muted-foreground text-xs">
                              {note.author && (
                                <div className="flex items-center gap-1">
                                  <Avatar className="h-4 w-4">
                                    {note.author.profileImageUrl && (
                                      <AvatarImage src={note.author.profileImageUrl} />
                                    )}
                                    <AvatarFallback className="text-[8px] bg-gradient-to-br from-purple-500 to-pink-500 text-white">
                                      {getInitials(note.author.firstName, note.author.lastName)}
                                    </AvatarFallback>
                                  </Avatar>
                                  <span>{note.author.firstName}</span>
                                </div>
                              )}
                              <span>{formatMessageTime(note.createdAt)}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      </div>
    </div>
  );
}
