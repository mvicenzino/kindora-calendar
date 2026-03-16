import type { RequestHandler } from "express";
import { storage } from "./storage";

export type SubscriptionTier = "free" | "family" | "care";

const TIER_RANK: Record<SubscriptionTier, number> = {
  free: 0,
  family: 1,
  care: 2,
};

async function getUserTier(userId: string): Promise<SubscriptionTier> {
  const user = await storage.getUser(userId);
  const tier = (user?.subscriptionTier as SubscriptionTier) || "free";
  return tier in TIER_RANK ? tier : "free";
}

function requireTier(minimumTier: SubscriptionTier): RequestHandler {
  return async (req: any, res, next) => {
    try {
      const userId = req.user?.claims?.sub;
      if (!userId) return res.status(401).json({ message: "Unauthorized" });

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
