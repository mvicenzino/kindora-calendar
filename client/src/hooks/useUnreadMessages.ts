import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo } from "react";
import { useLocation } from "wouter";
import { useActiveFamily } from "@/contexts/ActiveFamilyContext";
import { useAuth } from "@/hooks/useAuth";

const STORAGE_KEY = "kindora_messages_last_seen";

function getLastSeen(familyId: string): number {
  try {
    const raw = localStorage.getItem(`${STORAGE_KEY}_${familyId}`);
    return raw ? parseInt(raw, 10) : 0;
  } catch {
    return 0;
  }
}

export function markMessagesAsSeen(familyId: string) {
  try {
    localStorage.setItem(`${STORAGE_KEY}_${familyId}`, Date.now().toString());
  } catch {}
}

type FamilyMessage = {
  id: string;
  familyId: string;
  authorUserId: string;
  content: string;
  createdAt: string;
};

export function useUnreadMessages() {
  const { activeFamilyId } = useActiveFamily();
  const { user } = useAuth();
  const [location] = useLocation();

  const { data: messages = [] } = useQuery<FamilyMessage[]>({
    queryKey: ['/api/family-messages?familyId=' + activeFamilyId],
    enabled: !!activeFamilyId,
    refetchInterval: 15000,
  });

  const isOnMessages = location === "/messages";

  useEffect(() => {
    if (isOnMessages && activeFamilyId) {
      markMessagesAsSeen(activeFamilyId);
    }
  }, [isOnMessages, activeFamilyId, messages.length]);

  const unreadCount = useMemo(() => {
    if (!activeFamilyId || !user) return 0;
    const lastSeen = getLastSeen(activeFamilyId);
    return messages.filter(
      (m) =>
        m.authorUserId !== user.id &&
        new Date(m.createdAt).getTime() > lastSeen
    ).length;
  }, [messages, activeFamilyId, user]);

  return { unreadCount };
}
