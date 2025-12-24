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
  ArrowLeft,
  Calendar,
  MessageSquare
} from "lucide-react";
import { Link } from "wouter";
import Header from "@/components/Header";
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

function getBubbleStyle(role: string, isOwn: boolean): string {
  if (isOwn) {
    return 'bg-blue-500 text-white';
  }
  switch (role) {
    case 'caregiver':
      return 'bg-emerald-500/25 text-white border border-emerald-400/40';
    default:
      return 'bg-white/20 text-white';
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

  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      const res = await apiRequest('POST', '/api/family-messages', {
        content,
        familyId: activeFamilyId,
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

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (newMessage.trim() && !sendMessageMutation.isPending) {
      sendMessageMutation.mutate(newMessage.trim());
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(e);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#4A5A6A] via-[#5A6A7A] to-[#6A7A8A]">
      <Header />
      <div className="container mx-auto px-4 py-6 max-w-3xl">
        <div className="flex items-center gap-3 mb-6">
          <Link href="/">
            <Button variant="ghost" size="icon" className="text-white/70 hover:text-white hover:bg-white/10" data-testid="button-back-home">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <MessageCircle className="h-6 w-6" />
              Messages
            </h1>
            <p className="text-white/70 text-sm">
              Family conversations and event notes
            </p>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="h-[calc(100vh-200px)]">
          <TabsList className="w-full bg-white/10 border border-white/20 rounded-xl mb-4 p-1">
            <TabsTrigger 
              value="conversations" 
              className="flex-1 data-[state=active]:bg-white/20 data-[state=active]:text-white text-white/70 rounded-lg"
              data-testid="tab-conversations"
            >
              <Users className="w-4 h-4 mr-2" />
              Conversations ({messages.length})
            </TabsTrigger>
            <TabsTrigger 
              value="event-notes" 
              className="flex-1 data-[state=active]:bg-white/20 data-[state=active]:text-white text-white/70 rounded-lg"
              data-testid="tab-event-notes"
            >
              <Calendar className="w-4 h-4 mr-2" />
              Event Notes ({eventNotes.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="conversations" className="mt-0 h-[calc(100%-60px)]">
            <Card className="bg-white/10 backdrop-blur-xl border-white/20 shadow-2xl h-full flex flex-col">
              <CardHeader className="border-b border-white/10 pb-4 flex flex-row items-center justify-between gap-2">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
                    <Users className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-white text-lg" data-testid="text-family-name">
                      {family?.name || 'Family Chat'}
                    </CardTitle>
                    <p className="text-white/60 text-sm">
                      {messages.length} message{messages.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
              </CardHeader>

          <CardContent className="flex-1 p-0 overflow-hidden flex flex-col">
            <ScrollArea className="flex-1 px-4" ref={scrollAreaRef}>
              <div className="py-4 space-y-4">
                {isLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="text-white/60">Loading messages...</div>
                  </div>
                ) : sortedMessages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <MessageCircle className="h-12 w-12 text-white/30 mb-4" />
                    <h3 className="text-white/80 font-medium mb-2">No messages yet</h3>
                    <p className="text-white/50 text-sm max-w-xs">
                      Start a conversation with your family members. Everyone can see and reply to messages here.
                    </p>
                  </div>
                ) : (
                  sortedMessages.map((message, index) => {
                    const prevMessage = index > 0 ? sortedMessages[index - 1] : null;
                    const isOwnMessage = message.authorUserId === user?.id;
                    const showDateDivider = shouldShowDateDivider(message, prevMessage);
                    const authorRole = message.author?.role || 'member';

                    return (
                      <div key={message.id}>
                        {showDateDivider && (
                          <div className="flex items-center justify-center my-4">
                            <div className="bg-white/10 backdrop-blur-sm px-4 py-1.5 rounded-full text-white/70 text-xs font-medium">
                              {formatDateDivider(message.createdAt)}
                            </div>
                          </div>
                        )}
                        
                        <div 
                          className={`flex items-end gap-2 ${isOwnMessage ? 'flex-row-reverse' : 'flex-row'}`}
                          data-testid={`message-${message.id}`}
                        >
                          {/* Avatar - always visible */}
                          <Avatar className={`h-8 w-8 flex-shrink-0 ${isOwnMessage ? 'ring-2 ring-blue-400/50' : 'ring-2 ring-white/20'}`}>
                            {message.author?.profileImageUrl && (
                              <AvatarImage src={message.author.profileImageUrl} />
                            )}
                            <AvatarFallback className={`bg-gradient-to-br ${getAvatarGradient(authorRole)} text-white text-xs font-semibold`}>
                              {message.author ? getInitials(message.author.firstName, message.author.lastName) : '?'}
                            </AvatarFallback>
                          </Avatar>

                          {/* Message bubble */}
                          <div className={`max-w-[70%] flex flex-col ${isOwnMessage ? 'items-end' : 'items-start'}`}>
                            {/* Author name - show for other people's messages */}
                            {!isOwnMessage && message.author && (
                              <span className={`text-xs font-medium mb-1 ml-2 ${
                                authorRole === 'caregiver' ? 'text-emerald-300' : 'text-white/70'
                              }`}>
                                {message.author.firstName}
                                {authorRole === 'caregiver' && <span className="ml-1 opacity-75">(Caregiver)</span>}
                              </span>
                            )}
                            
                            <div className={`px-4 py-2.5 rounded-2xl ${getBubbleStyle(authorRole, isOwnMessage)} ${
                              isOwnMessage ? 'rounded-br-md' : 'rounded-bl-md'
                            }`}>
                              <p className="text-sm whitespace-pre-wrap break-words leading-relaxed" data-testid={`text-message-content-${message.id}`}>
                                {message.content}
                              </p>
                              <div className={`text-[10px] mt-1 ${
                                isOwnMessage ? 'text-blue-100/70' : 
                                authorRole === 'caregiver' ? 'text-emerald-200/60' : 'text-white/40'
                              }`}>
                                {formatMessageTime(message.createdAt)}
                              </div>
                            </div>
                          </div>
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
                className="p-4 border-t border-white/10 flex gap-3"
              >
                <Textarea
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Type a message..."
                  className="flex-1 min-h-[44px] max-h-32 resize-none bg-white/10 border-white/20 text-white placeholder:text-white/50 focus-visible:ring-white/30"
                  data-testid="input-message"
                />
                <Button
                  type="submit"
                  disabled={!newMessage.trim() || sendMessageMutation.isPending}
                  className="h-11 w-11 bg-blue-500 hover:bg-blue-600 text-white rounded-full p-0"
                  data-testid="button-send-message"
                >
                  <Send className="h-5 w-5" />
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="event-notes" className="mt-0 h-[calc(100%-60px)]">
          <Card className="bg-white/10 backdrop-blur-xl border-white/20 shadow-2xl h-full flex flex-col">
            <CardHeader className="border-b border-white/10 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center">
                  <MessageSquare className="h-5 w-5 text-white" />
                </div>
                <div>
                  <CardTitle className="text-white text-lg">Event Notes</CardTitle>
                  <p className="text-white/60 text-sm">
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
                      <div className="text-white/60">Loading event notes...</div>
                    </div>
                  ) : eventNotes.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <MessageSquare className="h-12 w-12 text-white/30 mb-4" />
                      <h3 className="text-white/80 font-medium mb-2">No event notes yet</h3>
                      <p className="text-white/50 text-sm max-w-xs">
                        Notes added to calendar events will appear here for easy reference.
                      </p>
                    </div>
                  ) : (
                    eventNotes.map((note) => (
                      <div 
                        key={note.id} 
                        className="bg-white/5 border border-white/10 rounded-xl p-4 hover:bg-white/10 transition-colors"
                        data-testid={`event-note-${note.id}`}
                      >
                        <div className="flex items-start gap-3">
                          <div 
                            className="w-3 h-3 rounded-full mt-1.5 flex-shrink-0"
                            style={{ backgroundColor: note.eventColor }}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-white font-medium text-sm truncate">
                                {note.eventTitle}
                              </span>
                              <span className="text-white/40 text-xs">
                                {format(parseISO(note.eventStartTime), 'MMM d')}
                              </span>
                            </div>
                            <p className="text-white/90 text-sm mb-2">{note.content}</p>
                            <div className="flex items-center gap-2 text-white/50 text-xs">
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
