import { useState, useRef } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { MessageCircle, Reply, Trash2, Send, ChevronDown, ChevronUp, Smile } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

const EMOJI_LIST = [
  '😀', '😃', '😄', '😁', '😅', '😂', '🤣', '😊', '😇', '🙂',
  '😉', '😍', '🥰', '😘', '😋', '😎', '🤗', '🤔', '😮', '😯',
  '👍', '👎', '👏', '🙌', '🤝', '💪', '❤️', '💕', '💖', '💯',
  '✅', '⭐', '🎉', '🎊', '🔥', '✨', '💡', '📌', '📝', '📅',
  '⏰', '🏠', '🚗', '🍎', '☕', '🎂', '🎁', '💊', '🏥', '👶',
];

interface NoteAuthor {
  id: string;
  firstName: string | null;
  lastName: string | null;
  profileImageUrl: string | null;
}

interface EventNote {
  id: string;
  eventId: string;
  familyId: string;
  authorUserId: string;
  parentNoteId: string | null;
  content: string;
  createdAt: string;
  author: NoteAuthor | null;
}

interface EventNotesSectionProps {
  eventId: string;
  familyId: string;
  currentUserId?: string;
  showEmojiPicker?: boolean;
}

export default function EventNotesSection({ eventId, familyId, currentUserId, showEmojiPicker = true }: EventNotesSectionProps) {
  const [newNote, setNewNote] = useState('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState('');
  const [expandedThreads, setExpandedThreads] = useState<Set<string>>(new Set());
  const [showEmojiPopover, setShowEmojiPopover] = useState(false);
  const [showReplyEmojiPopover, setShowReplyEmojiPopover] = useState(false);
  const { toast } = useToast();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const replyTextareaRef = useRef<HTMLTextAreaElement>(null);

  const insertEmoji = (emoji: string, isReply: boolean = false) => {
    if (isReply) {
      setReplyContent(prev => prev + emoji);
      setShowReplyEmojiPopover(false);
    } else {
      setNewNote(prev => prev + emoji);
      setShowEmojiPopover(false);
    }
  };

  const { data: notes = [], isLoading } = useQuery<EventNote[]>({
    queryKey: ['/api/events', eventId, 'notes', familyId],
    queryFn: async () => {
      const res = await fetch(`/api/events/${eventId}/notes?familyId=${familyId}`, {
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to fetch notes');
      return res.json();
    },
    enabled: !!eventId && !!familyId,
  });

  const createNoteMutation = useMutation({
    mutationFn: async ({ content, parentNoteId }: { content: string; parentNoteId?: string }) => {
      const res = await apiRequest('POST', `/api/events/${eventId}/notes?familyId=${familyId}`, {
        content,
        parentNoteId: parentNoteId || null,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/events', eventId, 'notes', familyId] });
      setNewNote('');
      setReplyContent('');
      setReplyingTo(null);
      toast({
        title: "Note added",
        description: "Your note has been added to this event.",
      });
    },
    onError: () => {
      toast({
        title: "Failed to add note",
        description: "Please try again.",
        variant: "destructive",
      });
    },
  });

  const deleteNoteMutation = useMutation({
    mutationFn: async (noteId: string) => {
      await apiRequest('DELETE', `/api/events/${eventId}/notes/${noteId}?familyId=${familyId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/events', eventId, 'notes', familyId] });
      toast({
        title: "Note deleted",
        description: "The note has been removed.",
      });
    },
    onError: () => {
      toast({
        title: "Failed to delete note",
        description: "Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSubmitNote = () => {
    if (!newNote.trim()) return;
    createNoteMutation.mutate({ content: newNote.trim() });
  };

  const handleSubmitReply = (parentNoteId: string) => {
    if (!replyContent.trim()) return;
    createNoteMutation.mutate({ content: replyContent.trim(), parentNoteId });
  };

  const toggleThread = (noteId: string) => {
    setExpandedThreads(prev => {
      const newSet = new Set(prev);
      if (newSet.has(noteId)) {
        newSet.delete(noteId);
      } else {
        newSet.add(noteId);
      }
      return newSet;
    });
  };

  const topLevelNotes = notes.filter(n => !n.parentNoteId);
  const getReplies = (noteId: string) => notes.filter(n => n.parentNoteId === noteId);

  const getAuthorName = (author: NoteAuthor | null) => {
    if (!author) return 'Unknown';
    const firstName = author.firstName || '';
    const lastName = author.lastName || '';
    return `${firstName} ${lastName}`.trim() || 'Unknown';
  };

  const getAuthorInitials = (author: NoteAuthor | null) => {
    if (!author) return '?';
    const firstName = author.firstName || '';
    const lastName = author.lastName || '';
    return `${firstName[0] || ''}${lastName[0] || ''}`.toUpperCase() || '?';
  };

  const renderNote = (note: EventNote, isReply: boolean = false) => {
    const replies = getReplies(note.id);
    const hasReplies = replies.length > 0;
    const isExpanded = expandedThreads.has(note.id);
    const canDelete = currentUserId === note.authorUserId;

    return (
      <div key={note.id} className={`${isReply ? 'ml-6 border-l-2 border-white/20 pl-4' : ''}`}>
        <div className="bg-white/5 rounded-lg p-3 mb-2">
          <div className="flex items-start gap-3">
            <Avatar className="h-8 w-8 flex-shrink-0">
              {note.author?.profileImageUrl ? (
                <AvatarImage src={note.author.profileImageUrl} />
              ) : null}
              <AvatarFallback className="bg-purple-600 text-white text-xs">
                {getAuthorInitials(note.author)}
              </AvatarFallback>
            </Avatar>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-white text-sm">
                    {getAuthorName(note.author)}
                  </span>
                  <span className="text-white/50 text-xs">
                    {formatDistanceToNow(new Date(note.createdAt), { addSuffix: true })}
                  </span>
                </div>
                
                {canDelete && (
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => deleteNoteMutation.mutate(note.id)}
                    className="h-6 w-6 text-white/50 hover:text-red-400 hover:bg-red-400/10"
                    disabled={deleteNoteMutation.isPending}
                    data-testid={`button-delete-note-${note.id}`}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                )}
              </div>
              
              <p className="text-white/90 text-sm mt-1 whitespace-pre-wrap break-words">
                {note.content}
              </p>
              
              <div className="flex items-center gap-3 mt-2">
                {!isReply && (
                  <button
                    onClick={() => setReplyingTo(replyingTo === note.id ? null : note.id)}
                    className="flex items-center gap-1 text-xs text-white/50 hover:text-white/80 transition-colors"
                    data-testid={`button-reply-note-${note.id}`}
                  >
                    <Reply className="h-3 w-3" />
                    Reply
                  </button>
                )}
                
                {hasReplies && !isReply && (
                  <button
                    onClick={() => toggleThread(note.id)}
                    className="flex items-center gap-1 text-xs text-purple-300 hover:text-purple-200 transition-colors"
                    data-testid={`button-toggle-replies-${note.id}`}
                  >
                    {isExpanded ? (
                      <>
                        <ChevronUp className="h-3 w-3" />
                        Hide {replies.length} {replies.length === 1 ? 'reply' : 'replies'}
                      </>
                    ) : (
                      <>
                        <ChevronDown className="h-3 w-3" />
                        Show {replies.length} {replies.length === 1 ? 'reply' : 'replies'}
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
        
        {replyingTo === note.id && (
          <div className="ml-6 mb-3">
            <div className="flex gap-2">
              <Textarea
                ref={replyTextareaRef}
                value={replyContent}
                onChange={(e) => setReplyContent(e.target.value)}
                placeholder="Write a reply..."
                className="bg-white/10 border-white/30 text-white placeholder:text-white/50 text-sm min-h-[60px] resize-none flex-1"
                data-testid={`input-reply-${note.id}`}
              />
              <div className="flex flex-col gap-1">
                {showEmojiPicker && (
                  <Popover open={showReplyEmojiPopover} onOpenChange={setShowReplyEmojiPopover}>
                    <PopoverTrigger asChild>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-10 text-white/60 hover:text-white hover:bg-white/10"
                        data-testid="button-reply-emoji-picker"
                      >
                        <Smile className="h-4 w-4" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-64 p-2 bg-[#4A5A6A] border-white/30" align="end">
                      <div className="grid grid-cols-10 gap-1">
                        {EMOJI_LIST.map((emoji) => (
                          <button
                            key={emoji}
                            onClick={() => insertEmoji(emoji, true)}
                            className="w-6 h-6 flex items-center justify-center hover:bg-white/20 rounded text-base"
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                    </PopoverContent>
                  </Popover>
                )}
                <Button
                  size="icon"
                  onClick={() => handleSubmitReply(note.id)}
                  disabled={!replyContent.trim() || createNoteMutation.isPending}
                  className="bg-purple-600 hover:bg-purple-700 flex-1 w-10"
                  data-testid={`button-submit-reply-${note.id}`}
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        )}
        
        {hasReplies && isExpanded && (
          <div className="mt-2">
            {replies.map(reply => renderNote(reply, true))}
          </div>
        )}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-4">
        <div className="flex items-center gap-2 mb-3 text-white/70">
          <MessageCircle className="w-4 h-4" />
          <span className="text-sm font-medium">Notes</span>
        </div>
        <div className="text-center py-4 text-white/50 text-sm">
          Loading notes...
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-4">
      <div className="flex items-center gap-2 mb-3 text-white/70">
        <MessageCircle className="w-4 h-4" />
        <span className="text-sm font-medium">Notes ({notes.length})</span>
      </div>
      
      <div className="space-y-2 mb-4">
        <div className="flex gap-2">
          <Textarea
            ref={textareaRef}
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            placeholder="Add a note for your family or caregivers..."
            className="bg-white/10 border-white/30 text-white placeholder:text-white/50 text-sm min-h-[60px] resize-none flex-1"
            data-testid="input-new-note"
          />
          <div className="flex flex-col gap-1">
            {showEmojiPicker && (
              <Popover open={showEmojiPopover} onOpenChange={setShowEmojiPopover}>
                <PopoverTrigger asChild>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-10 text-white/60 hover:text-white hover:bg-white/10"
                    data-testid="button-emoji-picker"
                  >
                    <Smile className="h-4 w-4" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-64 p-2 bg-[#4A5A6A] border-white/30" align="end">
                  <div className="grid grid-cols-10 gap-1">
                    {EMOJI_LIST.map((emoji) => (
                      <button
                        key={emoji}
                        onClick={() => insertEmoji(emoji)}
                        className="w-6 h-6 flex items-center justify-center hover:bg-white/20 rounded text-base"
                        data-testid={`emoji-${emoji}`}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
            )}
            <Button
              size="icon"
              onClick={handleSubmitNote}
              disabled={!newNote.trim() || createNoteMutation.isPending}
              className="bg-purple-600 hover:bg-purple-700 flex-1 w-10"
              data-testid="button-submit-note"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
      
      {topLevelNotes.length === 0 ? (
        <div className="text-center py-4 text-white/50 text-sm">
          No notes yet. Add one to share updates with your family!
        </div>
      ) : (
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {topLevelNotes.map(note => renderNote(note))}
        </div>
      )}
    </div>
  );
}
