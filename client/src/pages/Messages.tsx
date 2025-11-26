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

function getMessageBubbleStyle(role: string): string {
  switch (role) {
    case 'caregiver':
      return 'bg-emerald-500/20 border border-emerald-500/30 text-white';
    default:
      return 'bg-white/15 text-white';
  }
}

function getRoleLabel(role: string): string {
  switch (role) {
    case 'owner': return 'Family Admin';
    case 'member': return 'Family';
    case 'caregiver': return 'Caregiver';
    default: return role;
  }
}

function getRoleLabelColor(role: string): string {
  switch (role) {
    case 'owner': return 'text-blue-300';
    case 'member': return 'text-purple-300';
    case 'caregiver': return 'text-emerald-300';
    default: return 'text-white/60';
  }
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
                    const nextMessage = index < sortedMessages.length - 1 ? sortedMessages[index + 1] : null;
                    const isOwnMessage = message.authorUserId === user?.id;
                    const showDateDivider = shouldShowDateDivider(message, prevMessage);
                    const isFirstInGroup = !prevMessage || prevMessage.authorUserId !== message.authorUserId || showDateDivider;
                    const isLastInGroup = !nextMessage || nextMessage.authorUserId !== message.authorUserId || shouldShowDateDivider(nextMessage, message);
                    const authorRole = message.author?.role || 'member';
                    const isCaregiver = authorRole === 'caregiver';

                    return (
                      <div key={message.id}>
                        {showDateDivider && (
                          <div className="flex items-center justify-center my-6">
                            <div className="bg-white/10 backdrop-blur-sm px-4 py-1.5 rounded-full text-white/70 text-xs font-medium shadow-sm">
                              {formatDateDivider(message.createdAt)}
                            </div>
                          </div>
                        )}
                        <div 
                          className={`flex gap-3 ${isOwnMessage ? 'flex-row-reverse' : 'flex-row'} ${isFirstInGroup ? 'mt-4' : 'mt-0.5'}`}
                          data-testid={`message-${message.id}`}
                        >
                          {/* Avatar column - only show for others' messages */}
                          {!isOwnMessage && (
                            <div className="flex-shrink-0 w-9">
                              {isLastInGroup && message.author ? (
                                <Avatar className="h-9 w-9 ring-2 ring-white/20 shadow-lg">
                                  {message.author.profileImageUrl && (
                                    <AvatarImage src={message.author.profileImageUrl} />
                                  )}
                                  <AvatarFallback className={`bg-gradient-to-br ${getAvatarGradient(authorRole)} text-white text-xs font-semibold`}>
                                    {getInitials(message.author.firstName, message.author.lastName)}
                                  </AvatarFallback>
                                </Avatar>
                              ) : (
                                <div className="w-9" />
                              )}
                            </div>
                          )}

                          {/* Message content */}
                          <div className={`max-w-[75%] flex flex-col ${isOwnMessage ? 'items-end' : 'items-start'}`}>
                            {/* Author name and role - only for first message in group from others */}
                            {isFirstInGroup && message.author && !isOwnMessage && (
                              <div className="flex items-center gap-2 mb-1.5 px-2">
                                <span className="text-white/90 text-sm font-semibold">
                                  {message.author.firstName}
                                </span>
                                <span className={`text-xs font-medium ${getRoleLabelColor(authorRole)}`}>
                                  {getRoleLabel(authorRole)}
                                </span>
                              </div>
                            )}

                            {/* Message bubble */}
                            <div className={`group relative px-4 py-2.5 shadow-md ${
                              isOwnMessage 
                                ? `bg-gradient-to-br from-blue-500 to-blue-600 text-white ${
                                    isFirstInGroup && isLastInGroup ? 'rounded-2xl rounded-br-lg' :
                                    isFirstInGroup ? 'rounded-2xl rounded-br-md' :
                                    isLastInGroup ? 'rounded-2xl rounded-tr-md rounded-br-lg' :
                                    'rounded-2xl rounded-r-md'
                                  }`
                                : `${getMessageBubbleStyle(authorRole)} ${
                                    isFirstInGroup && isLastInGroup ? 'rounded-2xl rounded-bl-lg' :
                                    isFirstInGroup ? 'rounded-2xl rounded-bl-md' :
                                    isLastInGroup ? 'rounded-2xl rounded-tl-md rounded-bl-lg' :
                                    'rounded-2xl rounded-l-md'
                                  }`
                            }`}>
                              <p className="text-sm whitespace-pre-wrap break-words leading-relaxed" data-testid={`text-message-content-${message.id}`}>
                                {message.content}
                              </p>
                              
                              {/* Timestamp - show on last message of group or on hover */}
                              <div className={`text-[10px] mt-1.5 transition-opacity ${
                                isLastInGroup ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                              } ${isOwnMessage ? 'text-blue-100' : isCaregiver ? 'text-emerald-200/70' : 'text-white/50'}`}>
                                {formatMessageTime(message.createdAt)}
                              </div>

                              {/* Delete button for own messages */}
                              {canDeleteMessage(message) && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="absolute -top-2 -right-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity bg-red-500/90 hover:bg-red-600 text-white rounded-full shadow-lg"
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
