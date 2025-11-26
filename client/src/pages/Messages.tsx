import { useState, useRef, useEffect, useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useActiveFamily } from "@/contexts/ActiveFamilyContext";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { format, isToday, isYesterday, formatDistanceToNow, parseISO } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { 
  Send, 
  MessageCircle,
  Users,
  ArrowLeft,
  Trash2
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

function getRoleBadgeVariant(role: string): "default" | "secondary" | "outline" {
  switch (role) {
    case 'owner': return 'default';
    case 'caregiver': return 'secondary';
    default: return 'outline';
  }
}

function getInitials(firstName: string, lastName: string): string {
  return `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase();
}

export default function Messages() {
  const { user } = useAuth();
  const { activeFamilyId } = useActiveFamily();
  const { toast } = useToast();
  const [newMessage, setNewMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  const { data: messages = [], isLoading } = useQuery<FamilyMessage[]>({
    queryKey: ['/api/family-messages?familyId=' + activeFamilyId],
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

  const deleteMessageMutation = useMutation({
    mutationFn: async (messageId: string) => {
      await apiRequest('DELETE', `/api/family-messages/${messageId}?familyId=${activeFamilyId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/family-messages?familyId=' + activeFamilyId] });
      toast({
        title: "Message deleted",
      });
    },
    onError: () => {
      toast({
        title: "Failed to delete message",
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

  const canDeleteMessage = (message: FamilyMessage) => {
    return message.authorUserId === user?.id;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#4A5A6A] via-[#5A6A7A] to-[#6A7A8A]">
      <Header currentView="day" onViewChange={() => {}} />
      <div className="container mx-auto px-4 py-6 max-w-4xl">
        <div className="flex items-center gap-3 mb-6">
          <Link href="/">
            <Button variant="ghost" size="icon" className="text-white/70 hover:text-white hover:bg-white/10" data-testid="button-back-home">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <MessageCircle className="h-6 w-6" />
              Family Messages
            </h1>
            <p className="text-white/70 text-sm">
              Stay connected with everyone in the family
            </p>
          </div>
        </div>

        <Card className="bg-white/10 backdrop-blur-xl border-white/20 shadow-2xl h-[calc(100vh-200px)] flex flex-col">
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
              <div className="py-4 space-y-3">
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
                    const showAvatar = !prevMessage || prevMessage.authorUserId !== message.authorUserId || showDateDivider;

                    return (
                      <div key={message.id}>
                        {showDateDivider && (
                          <div className="flex items-center justify-center my-4">
                            <div className="bg-white/10 px-3 py-1 rounded-full text-white/60 text-xs">
                              {formatDateDivider(message.createdAt)}
                            </div>
                          </div>
                        )}
                        <div 
                          className={`flex gap-2 ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
                          data-testid={`message-${message.id}`}
                        >
                          {!isOwnMessage && showAvatar && message.author && (
                            <Avatar className="h-8 w-8 mt-1">
                              {message.author.profileImageUrl && (
                                <AvatarImage src={message.author.profileImageUrl} />
                              )}
                              <AvatarFallback className="bg-gradient-to-br from-emerald-500 to-teal-500 text-white text-xs">
                                {getInitials(message.author.firstName, message.author.lastName)}
                              </AvatarFallback>
                            </Avatar>
                          )}
                          {!isOwnMessage && !showAvatar && (
                            <div className="w-8" />
                          )}
                          <div className={`max-w-[70%] ${isOwnMessage ? 'items-end' : 'items-start'} flex flex-col`}>
                            {showAvatar && message.author && !isOwnMessage && (
                              <div className="flex items-center gap-2 mb-1 px-1">
                                <span className="text-white/80 text-sm font-medium">
                                  {message.author.firstName} {message.author.lastName}
                                </span>
                                <Badge 
                                  variant={getRoleBadgeVariant(message.author.role)} 
                                  className="text-xs py-0 px-1.5 h-4"
                                >
                                  {message.author.role}
                                </Badge>
                              </div>
                            )}
                            <div className={`group relative rounded-2xl px-4 py-2.5 ${
                              isOwnMessage 
                                ? 'bg-blue-500 text-white rounded-br-md' 
                                : 'bg-white/15 text-white rounded-bl-md'
                            }`}>
                              <p className="text-sm whitespace-pre-wrap break-words" data-testid={`text-message-content-${message.id}`}>
                                {message.content}
                              </p>
                              <div className={`text-xs mt-1 ${isOwnMessage ? 'text-blue-100' : 'text-white/50'}`}>
                                {formatMessageTime(message.createdAt)}
                              </div>
                              {canDeleteMessage(message) && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="absolute -top-2 -right-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity bg-red-500/80 hover:bg-red-500 text-white rounded-full"
                                  onClick={() => deleteMessageMutation.mutate(message.id)}
                                  data-testid={`button-delete-message-${message.id}`}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              )}
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
      </div>
    </div>
  );
}
