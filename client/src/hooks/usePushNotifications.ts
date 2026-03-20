import { useState, useEffect, useCallback } from "react";
import { apiRequest } from "@/lib/queryClient";

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY as string;

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  return Uint8Array.from(Array.from(rawData).map((char) => char.charCodeAt(0)));
}

export type PushPermission = "default" | "granted" | "denied" | "unsupported";

export function usePushNotifications() {
  const [permission, setPermission] = useState<PushPermission>("default");
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isPwaInstalled, setIsPwaInstalled] = useState(false);

  const isSupported =
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window &&
    !!VAPID_PUBLIC_KEY;

  useEffect(() => {
    // Check if running as installed PWA
    const mq = window.matchMedia("(display-mode: standalone)");
    setIsPwaInstalled(mq.matches || (navigator as any).standalone === true);
    const handler = (e: MediaQueryListEvent) => setIsPwaInstalled(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  useEffect(() => {
    if (!isSupported) {
      setPermission("unsupported");
      return;
    }
    setPermission(Notification.permission as PushPermission);

    // Check current subscription state
    navigator.serviceWorker.ready.then((reg) => {
      reg.pushManager.getSubscription().then((sub) => {
        setIsSubscribed(!!sub);
      });
    });
  }, [isSupported]);

  const registerServiceWorker = useCallback(async () => {
    if (!("serviceWorker" in navigator)) return null;
    try {
      const existing = await navigator.serviceWorker.getRegistration("/sw.js");
      if (existing) return existing;
      return await navigator.serviceWorker.register("/sw.js", { scope: "/" });
    } catch (err) {
      console.error("SW registration failed:", err);
      return null;
    }
  }, []);

  const subscribe = useCallback(async () => {
    if (!isSupported) return false;
    setIsLoading(true);
    try {
      const reg = await registerServiceWorker();
      if (!reg) return false;

      const perm = await Notification.requestPermission();
      setPermission(perm as PushPermission);
      if (perm !== "granted") return false;

      const existing = await reg.pushManager.getSubscription();
      if (existing) await existing.unsubscribe();

      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });

      const subJson = sub.toJSON() as {
        endpoint: string;
        keys: { p256dh: string; auth: string };
      };

      await apiRequest("POST", "/api/push/subscribe", {
        endpoint: subJson.endpoint,
        keys: subJson.keys,
      });

      setIsSubscribed(true);
      return true;
    } catch (err) {
      console.error("Push subscribe error:", err);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [isSupported, registerServiceWorker]);

  const unsubscribe = useCallback(async () => {
    if (!isSupported) return;
    setIsLoading(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await apiRequest("DELETE", "/api/push/subscribe", {
          endpoint: sub.endpoint,
        });
        await sub.unsubscribe();
      }
      setIsSubscribed(false);
    } catch (err) {
      console.error("Push unsubscribe error:", err);
    } finally {
      setIsLoading(false);
    }
  }, [isSupported]);

  const sendTest = useCallback(async () => {
    await apiRequest("POST", "/api/push/test", {});
  }, []);

  return {
    isSupported,
    isPwaInstalled,
    permission,
    isSubscribed,
    isLoading,
    subscribe,
    unsubscribe,
    sendTest,
  };
}
