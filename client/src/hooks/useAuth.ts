import { useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import type { User } from "@shared/schema";
import { apiRequest, getQueryFn, queryClient } from "@/lib/queryClient";

export function useAuth() {
  const { data: user, isLoading } = useQuery<User | null>({
    queryKey: ["/api/auth/user"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    // Retry up to 3 times on server errors (e.g. DB cold start / Neon wake-up).
    // 401 → returnNull (not an error), so retries only fire for 500-level issues.
    retry: (failureCount, error: any) => {
      if (error?.message?.startsWith('401')) return false;
      return failureCount < 3;
    },
    retryDelay: 1500,
  });

  // Auto-capture the user's timezone on first authenticated visit if it has
  // not been set yet (e.g. they signed up via OAuth and there was no chance
  // to ask the browser at registration time). This makes weekly summary
  // emails render times in the user's local zone.
  const autoDetectedRef = useRef(false);
  useEffect(() => {
    if (!user || autoDetectedRef.current) return;
    if ((user as any).timezone) return;

    let detected: string | null = null;
    try {
      detected = Intl.DateTimeFormat().resolvedOptions().timeZone || null;
    } catch {
      detected = null;
    }
    if (!detected) return;

    autoDetectedRef.current = true;
    apiRequest("PATCH", "/api/auth/user/timezone", { timezone: detected })
      .then(() => queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] }))
      .catch((err) => console.warn("[useAuth] timezone auto-detect failed:", err));
  }, [user]);

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
  };
}
