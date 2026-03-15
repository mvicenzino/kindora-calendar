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

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const callbackURL = resolveCallbackURL();
  console.log(`[Google OAuth] Callback URL: ${callbackURL}`);

  // Step 1: Redirect to Google
  app.get("/api/auth/google", (req, res) => {
    const state = Math.random().toString(36).substring(2);
    (req.session as any).googleOAuthState = state;

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: callbackURL,
      response_type: "code",
      scope: "openid email profile",
      access_type: "offline",
      prompt: "select_account",
      state,
    });

    res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);
  });

  // Step 2: Handle callback — exchange code for tokens manually
  app.get("/api/auth/google/callback", async (req, res) => {
    const { code, state, error } = req.query as Record<string, string>;

    if (error) {
      console.error("[Google OAuth] Google returned error:", error);
      return res.redirect("/?auth_error=google");
    }

    const savedState = (req.session as any).googleOAuthState;
    if (!state || state !== savedState) {
      console.error("[Google OAuth] State mismatch — possible CSRF");
      return res.redirect("/?auth_error=google");
    }
    delete (req.session as any).googleOAuthState;

    if (!code) {
      console.error("[Google OAuth] No code in callback");
      return res.redirect("/?auth_error=google");
    }

    try {
      // Exchange code for tokens
      const tokenBody = new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: callbackURL,
        grant_type: "authorization_code",
      });

      console.log("[Google OAuth] Exchanging code, redirect_uri:", callbackURL);

      const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: tokenBody.toString(),
      });

      const tokenData = await tokenRes.json() as any;

      if (!tokenRes.ok) {
        console.error("[Google OAuth] Token exchange failed:", tokenRes.status, JSON.stringify(tokenData));
        return res.redirect("/?auth_error=google");
      }

      const accessToken = tokenData.access_token;

      // Get user profile
      const profileRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      const profile = await profileRes.json() as any;

      if (!profileRes.ok) {
        console.error("[Google OAuth] Profile fetch failed:", profileRes.status, JSON.stringify(profile));
        return res.redirect("/?auth_error=google");
      }

      console.log("[Google OAuth] Profile fetched for:", profile.email);

      const userId = `google-${profile.id}`;
      const email = profile.email ?? null;
      const firstName = profile.given_name ?? profile.name?.split(" ")[0] ?? null;
      const lastName = profile.family_name ?? profile.name?.split(" ").slice(1).join(" ") ?? null;
      const profileImageUrl = profile.picture ?? null;

      await storage.upsertUser({
        id: userId,
        email,
        firstName,
        lastName,
        profileImageUrl,
        authProvider: "google",
      });

      const sessionUser = createGoogleUserSession(userId, email || "", firstName || "", lastName || "", profileImageUrl);
      // Store in session.passport.user to match what isAuthenticated expects
      if (!(req.session as any).passport) {
        (req.session as any).passport = {};
      }
      (req.session as any).passport.user = sessionUser;

      req.session.save((err) => {
        if (err) {
          console.error("[Google OAuth] Session save error:", err);
          return res.redirect("/?auth_error=google");
        }
        console.log("[Google OAuth] Login successful for:", email);
        return res.redirect("/");
      });
    } catch (err: any) {
      console.error("[Google OAuth] Unexpected error:", err.message || err);
      return res.redirect("/?auth_error=google");
    }
  });
}
