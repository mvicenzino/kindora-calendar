import { useQuery } from "@tanstack/react-query";
import type { User } from "@shared/schema";
import { getQueryFn } from "@/lib/queryClient";

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

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
  };
}
