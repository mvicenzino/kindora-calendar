import { useState, useEffect, useRef } from 'react';

interface Event {
  id: string;
  title: string;
  description?: string;
  startTime: Date;
  endTime: Date;
  memberId: string;
}

interface NotificationState {
  event: Event | null;
  isOpen: boolean;
}

export function useEventNotifications(events: Event[]) {
  const [notification, setNotification] = useState<NotificationState>({
    event: null,
    isOpen: false,
  });
  
  // Track which events have already been notified
  const notifiedEventsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const checkForNotifications = () => {
      const now = new Date();
      
      // Find events that should be notified (within 10 minutes and not yet notified)
      const upcomingEvent = events.find(event => {
        // Skip if already notified
        if (notifiedEventsRef.current.has(event.id)) {
          return false;
        }

        const startTime = new Date(event.startTime);
        const timeDiff = startTime.getTime() - now.getTime();
        const minutesUntilStart = timeDiff / (1000 * 60);
        
        // Notify if event starts within 10 minutes but hasn't started yet
        // This ensures we catch events even if the app is loaded when they're already close
        return minutesUntilStart > 0 && minutesUntilStart <= 10;
      });

      if (upcomingEvent) {
        // Mark as notified
        notifiedEventsRef.current.add(upcomingEvent.id);
        
        // Show notification
        setNotification({
          event: upcomingEvent,
          isOpen: true,
        });
      }
    };

    // Initial check when component mounts or events change
    checkForNotifications();

    // Check for upcoming events every 30 seconds
    const checkInterval = setInterval(checkForNotifications, 30000);

    return () => clearInterval(checkInterval);
  }, [events]);

  // Clean up old notifications from the set periodically
  useEffect(() => {
    const cleanupInterval = setInterval(() => {
      const now = new Date();
      const validEventIds = new Set(
        events
          .filter(event => new Date(event.startTime).getTime() > now.getTime())
          .map(event => event.id)
      );
      
      // Remove IDs of events that have already passed
      notifiedEventsRef.current.forEach(id => {
        if (!validEventIds.has(id)) {
          notifiedEventsRef.current.delete(id);
        }
      });
    }, 5 * 60 * 1000); // Clean up every 5 minutes

    return () => clearInterval(cleanupInterval);
  }, [events]);

  const closeNotification = () => {
    setNotification({
      event: null,
      isOpen: false,
    });
  };

  return {
    notificationEvent: notification.event,
    isNotificationOpen: notification.isOpen,
    closeNotification,
  };
}
