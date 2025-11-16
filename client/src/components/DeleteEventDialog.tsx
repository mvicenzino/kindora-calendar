import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Trash2 } from "lucide-react";

interface DeleteEventDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  eventTitle: string;
}

export default function DeleteEventDialog({
  isOpen,
  onClose,
  onConfirm,
  eventTitle,
}: DeleteEventDialogProps) {
  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent className="backdrop-blur-3xl bg-gradient-to-br from-slate-800/95 via-slate-700/95 to-slate-800/95 border-2 border-white/20 rounded-3xl shadow-2xl">
        <AlertDialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-full bg-red-500/20 backdrop-blur-md flex items-center justify-center border border-red-500/30">
              <Trash2 className="w-5 h-5 text-red-400" />
            </div>
            <AlertDialogTitle className="text-xl font-bold text-white">
              Delete Event?
            </AlertDialogTitle>
          </div>
          <AlertDialogDescription className="text-white/70 text-base leading-relaxed">
            Are you sure you want to delete <span className="font-semibold text-white">"{eventTitle}"</span>? This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="gap-2 sm:gap-3">
          <AlertDialogCancel
            data-testid="button-cancel-delete"
            className="backdrop-blur-md bg-white/10 border-white/30 text-white hover:bg-white/20 hover:text-white rounded-xl"
          >
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            data-testid="button-confirm-delete"
            className="bg-red-500/90 hover:bg-red-500 text-white rounded-xl border-0"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Delete Event
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
