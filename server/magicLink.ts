import crypto from "crypto";

// Magic-link tokens for one-click "View Calendar" auto-login from emails.
// Tokens are stateless: a base64url(payload).base64url(signature) string
// signed with HMAC-SHA256 using SESSION_SECRET. No DB table needed.
//
// Trade-offs:
//   - Stateless tokens cannot be revoked individually before they expire.
//   - They are single-purpose ("magic-login" scope) and short-lived (default
//     14 days), so an email link stays usable for the next ~2 weeks.
//   - Email clients often pre-fetch links; we deliberately allow re-use
//     within the TTL rather than burning the token on first hit.

interface MagicPayload {
  uid: string;        // user id
  exp: number;        // unix seconds
  scope: "magic-login";
}

const DEFAULT_TTL_SEC = 14 * 24 * 3600;

function getSecret(): string {
  const s = process.env.SESSION_SECRET;
  if (!s) throw new Error("SESSION_SECRET must be set to issue magic links");
  return s;
}

function b64url(buf: Buffer | string): string {
  const b = typeof buf === "string" ? Buffer.from(buf) : buf;
  return b.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromB64url(s: string): Buffer {
  const pad = s.length % 4 === 0 ? 0 : 4 - (s.length % 4);
  return Buffer.from(s.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat(pad), "base64");
}

function sign(payloadB64: string): string {
  return b64url(crypto.createHmac("sha256", getSecret()).update(payloadB64).digest());
}

export function signMagicToken(userId: string, ttlSec: number = DEFAULT_TTL_SEC): string {
  const payload: MagicPayload = {
    uid: userId,
    exp: Math.floor(Date.now() / 1000) + ttlSec,
    scope: "magic-login",
  };
  const payloadB64 = b64url(JSON.stringify(payload));
  const sigB64 = sign(payloadB64);
  return `${payloadB64}.${sigB64}`;
}

export function verifyMagicToken(token: string): { ok: true; userId: string } | { ok: false; reason: string } {
  if (typeof token !== "string" || token.length > 1024) {
    return { ok: false, reason: "invalid token shape" };
  }
  const dot = token.indexOf(".");
  if (dot <= 0 || dot === token.length - 1) {
    return { ok: false, reason: "malformed token" };
  }
  const payloadB64 = token.slice(0, dot);
  const sigB64 = token.slice(dot + 1);

  const expectedSig = sign(payloadB64);
  // Constant-time comparison to avoid timing attacks
  const a = Buffer.from(sigB64);
  const b = Buffer.from(expectedSig);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return { ok: false, reason: "bad signature" };
  }

  let payload: MagicPayload;
  try {
    payload = JSON.parse(fromB64url(payloadB64).toString("utf8"));
  } catch {
    return { ok: false, reason: "unparseable payload" };
  }
  if (payload.scope !== "magic-login" || typeof payload.uid !== "string" || !payload.uid) {
    return { ok: false, reason: "invalid payload" };
  }
  if (typeof payload.exp !== "number" || payload.exp < Math.floor(Date.now() / 1000)) {
    return { ok: false, reason: "expired" };
  }
  return { ok: true, userId: payload.uid };
}

// Builds the absolute URL we put in the email's "View Calendar" button.
// Includes the magic token plus an optional `next` redirect path.
export function buildMagicCalendarUrl(userId: string, baseUrl: string, nextPath: string = "/"): string {
  const token = signMagicToken(userId);
  const safeNext = nextPath.startsWith("/") ? nextPath : "/";
  const u = new URL("/api/auth/magic-login", baseUrl);
  u.searchParams.set("token", token);
  u.searchParams.set("next", safeNext);
  return u.toString();
}

// Resolve the public-facing base URL the email links should point to.
// Order: explicit APP_PUBLIC_URL > Replit dev domain > kindora.ai default.
// APP_PUBLIC_URL lets us override per environment (staging, custom domain,
// etc.) without code changes.
export function getPublicBaseUrl(): string {
  const explicit = (process.env.APP_PUBLIC_URL || "").trim();
  if (explicit) return explicit.replace(/\/+$/, "");
  if (process.env.NODE_ENV === "production") return "https://kindora.ai";
  const domain = (process.env.REPLIT_DOMAINS || "").split(",")[0].trim();
  if (domain) return `https://${domain}`;
  return "https://kindora.replit.app";
}
