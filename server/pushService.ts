import webpush from "web-push";
import { db } from "./db";
import { pushSubscriptions } from "@shared/schema";
import { eq } from "drizzle-orm";

const vapidPublicKey = process.env.VAPID_PUBLIC_KEY!;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY!;

if (vapidPublicKey && vapidPrivateKey) {
  webpush.setVapidDetails(
    "mailto:mvicenzino@gmail.com",
    vapidPublicKey,
    vapidPrivateKey
  );
}

export async function saveSubscription(
  userId: string,
  subscription: { endpoint: string; keys: { p256dh: string; auth: string } }
) {
  const existing = await db
    .select()
    .from(pushSubscriptions)
    .where(eq(pushSubscriptions.endpoint, subscription.endpoint))
    .limit(1);

  if (existing.length > 0) {
    return existing[0];
  }

  const [row] = await db
    .insert(pushSubscriptions)
    .values({
      userId,
      endpoint: subscription.endpoint,
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
    })
    .returning();

  return row;
}

export async function deleteSubscription(userId: string, endpoint: string) {
  await db
    .delete(pushSubscriptions)
    .where(eq(pushSubscriptions.endpoint, endpoint));
}

export async function getUserSubscriptions(userId: string) {
  return db
    .select()
    .from(pushSubscriptions)
    .where(eq(pushSubscriptions.userId, userId));
}

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
  tag?: string;
  important?: boolean;
}

export async function sendPushToUser(userId: string, payload: PushPayload) {
  if (!vapidPublicKey || !vapidPrivateKey) return;

  const subs = await getUserSubscriptions(userId);
  const failed: string[] = [];

  await Promise.allSettled(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          JSON.stringify(payload)
        );
      } catch (err: any) {
        // 404/410 = subscription expired, delete it
        if (err.statusCode === 404 || err.statusCode === 410) {
          failed.push(sub.endpoint);
        }
      }
    })
  );

  // Clean up expired subscriptions
  if (failed.length > 0) {
    await Promise.allSettled(
      failed.map((ep) => deleteSubscription(userId, ep))
    );
  }
}
