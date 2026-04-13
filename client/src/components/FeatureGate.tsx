import React, { ReactNode } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { UpgradeModal } from "./UpgradeModal";
import { Loader2 } from "lucide-react";

export type FeatureTier = "free" | "family" | "care";

interface FeatureGateProps {
  feature: FeatureTier;
  children: ReactNode;
  fallback?: ReactNode;
  showMessage?: boolean;
}

interface SubscriptionStatus {
  tier: FeatureTier;
  status: string;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
}

/**
 * FeatureGate Component
 * 
 * Guards premium features behind subscription tiers.
 * Shows fallback UI or UpgradeModal when user lacks access.
 * 
 * Usage:
 * <FeatureGate feature="family">
 *   <CaregiverTracking />
 * </FeatureGate>
 */
export function FeatureGate({
  feature,
  children,
  fallback,
  showMessage = true,
}: FeatureGateProps) {
  const { user } = useAuth();
  const [showUpgradeModal, setShowUpgradeModal] = React.useState(false);

  const { data: subscription, isLoading } = useQuery<SubscriptionStatus>({
    queryKey: ["/api/subscription/status"],
    enabled: !!user,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-4">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const userTier = subscription?.tier || "free";
  const tierHierarchy: Record<FeatureTier, number> = {
    free: 0,
    family: 1,
    care: 2,
  };

  const hasAccess = tierHierarchy[userTier] >= tierHierarchy[feature];

  if (!hasAccess) {
    return (
      <>
        {fallback || (
          <div className="rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-900/30 dark:bg-amber-900/10 p-4 space-y-3">
            <div className="flex items-start gap-3">
              <div className="text-amber-600 dark:text-amber-400 mt-0.5">
                <svg
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                  />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="font-medium text-amber-900 dark:text-amber-100">
                  Unlock this feature
                </h3>
                {showMessage && (
                  <p className="text-sm text-amber-800/70 dark:text-amber-200/70 mt-1">
                    Upgrade to the {feature === "care" ? "Care" : "Family"} plan to access this feature.
                  </p>
                )}
              </div>
              <button
                onClick={() => setShowUpgradeModal(true)}
                className="text-sm font-medium text-amber-700 dark:text-amber-300 hover:underline flex-shrink-0"
              >
                Upgrade
              </button>
            </div>
          </div>
        )}
        <UpgradeModal
          isOpen={showUpgradeModal}
          onClose={() => setShowUpgradeModal(false)}
          requiredTier={feature}
        />
      </>
    );
  }

  return <>{children}</>;
}
