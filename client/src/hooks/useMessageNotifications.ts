import { useEffect, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import { ToastAction } from "@/components/ui/toast";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import { createElement } from "react";

interface NewMessageEvent {
  id: string;
  content: string;
  familyId: string;
  authorName: string;
  authorAvatar: string | null;
}

export function useMessageNotifications() {
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [location, navigate] = useLocation();
  const locationRef = useRef(location);
  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    locationRef.current = location;
  }, [location]);

  useEffect(() => {
    if (!isAuthenticated) return;

    function connect() {
      const es = new EventSource("/api/notifications/stream");
      esRef.current = es;

      es.addEventListener("new-message", (e: MessageEvent) => {
        const data: NewMessageEvent = JSON.parse(e.data);
        const preview =
          data.content.length > 120
            ? data.content.slice(0, 117) + "…"
            : data.content;

        const isOnMessages = locationRef.current === "/messages";

        toast({
          title: `New message from ${data.authorName}`,
          description: preview,
          duration: isOnMessages ? 4000 : 9000,
          action: isOnMessages
            ? undefined
            : createElement(
                ToastAction,
                { altText: "View messages", onClick: () => navigate("/messages") },
                "View"
              ),
        });
      });

      es.onerror = () => {
        es.close();
        esRef.current = null;
        setTimeout(connect, 4000);
      };
    }

    connect();

    return () => {
      esRef.current?.close();
      esRef.current = null;
    };
  }, [isAuthenticated]);
}
