import type { RequestHandler } from "express";
import { storage } from "./storage";

export type SubscriptionTier = "free" | "family" | "care";

const TIER_RANK: Record<SubscriptionTier, number> = {
  free: 0,
  family: 1,
  care: 2,
};

const BETA_MODE = process.env.BETA_MODE === "true";

async function getUserTier(userId: string): Promise<SubscriptionTier> {
  const user = await storage.getUser(userId);
  if (!user) return "free";

  // Trialing or active Stripe subscribers get full Family access even if
  // the tier column wasn't explicitly set by the webhook.
  const status = user.subscriptionStatus;
  if (status === "trialing" || status === "active") {
    const tier = (user.subscriptionTier as SubscriptionTier) || "family";
    return tier in TIER_RANK ? tier : "family";
  }

  const tier = (user.subscriptionTier as SubscriptionTier) || "free";
  return tier in TIER_RANK ? tier : "free";
}

function requireTier(minimumTier: SubscriptionTier): RequestHandler {
  return async (req: any, res, next) => {
    if (BETA_MODE) return next();

    try {
      const userId = req.user?.claims?.sub;
      if (!userId) return res.status(401).json({ message: "Unauthorized" });

      // Demo users bypass tier gating — the demo is a sales surface and
      // must show every feature working.
      if (userId.startsWith("demo-")) return next();

      const userTier = await getUserTier(userId);

      if (TIER_RANK[userTier] >= TIER_RANK[minimumTier]) {
        return next();
      }

      return res.status(403).json({
        message: "Upgrade required",
        requiredTier: minimumTier,
        currentTier: userTier,
        upgradeUrl: "/settings?upgrade=true",
      });
    } catch (error) {
      console.error("[TierMiddleware] Error checking subscription tier:", error);
      return res.status(500).json({ message: "Failed to verify subscription" });
    }
  };
}

export const requireFamily = requireTier("family");
export const requireCare = requireTier("care");
