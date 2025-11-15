import { Dialog, DialogContent } from "@/components/ui/dialog";
import { format } from "date-fns";
import type { Message } from "@shared/schema";

interface LoveNotePopupProps {
  isOpen: boolean;
  onClose: () => void;
  message?: Message;
}

export default function LoveNotePopup({
  isOpen,
  onClose,
  message,
}: LoveNotePopupProps) {
  if (!message) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent 
        className="sm:max-w-md backdrop-blur-3xl bg-card/95 border-2 rounded-3xl shadow-2xl"
        data-testid="popup-love-note"
      >
        <div className="space-y-4 py-2">
          {/* Emoji Header */}
          {message.emoji && (
            <div className="flex justify-center">
              <span className="text-6xl animate-in zoom-in duration-300">
                {message.emoji}
              </span>
            </div>
          )}

          {/* Message Content */}
          <div className="text-center space-y-3 px-4">
            <p 
              className="text-lg leading-relaxed"
              style={{
                fontWeight: message.fontWeight || 'normal',
                fontStyle: message.fontStyle || 'normal',
              }}
              data-testid="text-love-note-content"
            >
              {message.content}
            </p>
            
            {/* Sender & Timestamp */}
            <div className="flex flex-col gap-1 pt-2 border-t">
              <p className="text-sm font-semibold" data-testid="text-love-note-sender">
                {message.senderName}
              </p>
              <p className="text-xs text-muted-foreground" data-testid="text-love-note-timestamp">
                {format(new Date(message.createdAt), 'PPP · p')}
              </p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
