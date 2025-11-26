import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { MessageSquare, Reply, Trash2, Send, ChevronDown, ChevronUp } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

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

interface NotesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventId: string;
  eventTitle: string;
  familyId: string;
  currentUserId?: string;
}

export default function NotesModal({ 
  open, 
  onOpenChange, 
  eventId, 
  eventTitle,
  familyId, 
  currentUserId 
}: NotesModalProps) {
  const [newNote, setNewNote] = useState('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState('');
  const [expandedThreads, setExpandedThreads] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  const { data: notes = [], isLoading } = useQuery<EventNote[]>({
    queryKey: ['/api/events', eventId, 'notes', familyId],
    queryFn: async () => {
      const res = await fetch(`/api/events/${eventId}/notes?familyId=${familyId}`, {
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to fetch notes');
      return res.json();
    },
    enabled: open && !!eventId && !!familyId,
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
      queryClient.invalidateQueries({ queryKey: ['/api/events'] });
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
      queryClient.invalidateQueries({ queryKey: ['/api/events'] });
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
      <div key={note.id} className={`${isReply ? 'ml-6 border-l-2 border-border pl-4' : ''}`}>
        <div className="bg-muted/50 rounded-lg p-3 mb-2">
          <div className="flex items-start gap-3">
            <Avatar className="h-8 w-8 flex-shrink-0">
              {note.author?.profileImageUrl ? (
                <AvatarImage src={note.author.profileImageUrl} />
              ) : null}
              <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                {getAuthorInitials(note.author)}
              </AvatarFallback>
            </Avatar>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-foreground text-sm">
                    {getAuthorName(note.author)}
                  </span>
                  <span className="text-muted-foreground text-xs">
                    {formatDistanceToNow(new Date(note.createdAt), { addSuffix: true })}
                  </span>
                </div>
                
                {canDelete && (
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => deleteNoteMutation.mutate(note.id)}
                    className="h-6 w-6 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                    disabled={deleteNoteMutation.isPending}
                    data-testid={`button-delete-note-${note.id}`}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                )}
              </div>
              
              <p className="text-foreground text-sm mt-1 whitespace-pre-wrap break-words">
                {note.content}
              </p>
              
              <div className="flex items-center gap-3 mt-2">
                {!isReply && (
                  <button
                    onClick={() => setReplyingTo(replyingTo === note.id ? null : note.id)}
                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                    data-testid={`button-reply-note-${note.id}`}
                  >
                    <Reply className="h-3 w-3" />
                    Reply
                  </button>
                )}
                
                {hasReplies && !isReply && (
                  <button
                    onClick={() => toggleThread(note.id)}
                    className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors"
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
                value={replyContent}
                onChange={(e) => setReplyContent(e.target.value)}
                placeholder="Write a reply..."
                className="text-sm min-h-[60px] resize-none flex-1"
                data-testid={`input-reply-${note.id}`}
              />
              <Button
                size="icon"
                onClick={() => handleSubmitReply(note.id)}
                disabled={!replyContent.trim() || createNoteMutation.isPending}
                className="h-[60px] w-10"
                data-testid={`button-submit-reply-${note.id}`}
              >
                <Send className="h-4 w-4" />
              </Button>
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5" />
            Notes for "{eventTitle}"
          </DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              Loading notes...
            </div>
          ) : (
            <>
              <div className="flex gap-2 mb-4">
                <Textarea
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  placeholder="Add a note for your family or caregivers..."
                  className="text-sm min-h-[70px] resize-none flex-1"
                  data-testid="input-new-note-modal"
                />
                <Button
                  size="icon"
                  onClick={handleSubmitNote}
                  disabled={!newNote.trim() || createNoteMutation.isPending}
                  className="h-[70px] w-10"
                  data-testid="button-submit-note-modal"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
              
              {topLevelNotes.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  No notes yet. Add one to share updates with your family!
                </div>
              ) : (
                <div className="space-y-2">
                  {topLevelNotes.map(note => renderNote(note))}
                </div>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
