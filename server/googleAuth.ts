import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import passport from "passport";
import type { Express } from "express";
import { storage } from "./storage";

function createGoogleUserSession(
  userId: string,
  email: string,
  firstName: string,
  lastName: string,
  profileImageUrl?: string | null
) {
  const expiry = Math.floor(Date.now() / 1000) + 7 * 24 * 3600;
  return {
    claims: {
      sub: userId,
      email,
      first_name: firstName,
      last_name: lastName,
      profile_image_url: profileImageUrl || null,
      exp: expiry,
    },
    access_token: "google-auth",
    refresh_token: null,
    expires_at: expiry,
  };
}

function resolveCallbackURL(): string {
  if (process.env.GOOGLE_CALLBACK_URL) return process.env.GOOGLE_CALLBACK_URL;
  if (process.env.NODE_ENV === "production") return "https://kindora.ai/api/auth/google/callback";
  // In Replit dev, REPLIT_DOMAINS is a comma-separated list of available domains
  const domain = (process.env.REPLIT_DOMAINS || "").split(",")[0].trim();
  return domain
    ? `https://${domain}/api/auth/google/callback`
    : "http://localhost:5000/api/auth/google/callback";
}

export function setupGoogleAuth(app: Express) {
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    console.log("[Google OAuth] Skipping — GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET not set");
    return;
  }

  const callbackURL = resolveCallbackURL();
  console.log(`[Google OAuth] Callback URL: ${callbackURL}`);

  passport.use(
    "google",
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL,
      },
      async (_accessToken, _refreshToken, profile, done) => {
        try {
          const email = profile.emails?.[0]?.value ?? null;
          const firstName = profile.name?.givenName ?? profile.displayName ?? null;
          const lastName = profile.name?.familyName ?? null;
          const profileImageUrl = profile.photos?.[0]?.value ?? null;

          // Prefix with "google-" so IDs never collide with Replit OIDC subs
          const userId = `google-${profile.id}`;

          await storage.upsertUser({
            id: userId,
            email,
            firstName,
            lastName,
            profileImageUrl,
            authProvider: "google",
          });

          const sessionUser = createGoogleUserSession(
            userId,
            email || "",
            firstName || "",
            lastName || "",
            profileImageUrl
          );

          return done(null, sessionUser as any);
        } catch (err) {
          return done(err as Error);
        }
      }
    )
  );

  // Initiate Google OAuth — prompt for account picker every time so users can switch accounts
  app.get("/api/auth/google", passport.authenticate("google", {
    scope: ["profile", "email"],
    prompt: "select_account",
  }));

  // Google OAuth callback
  app.get(
    "/api/auth/google/callback",
    passport.authenticate("google", {
      successReturnToOrRedirect: "/",
      failureRedirect: "/",
    })
  );
}
