import * as client from "openid-client";
import { Strategy, type VerifyFunction } from "openid-client/passport";
import passport from "passport";
import session from "express-session";
import type { Express, RequestHandler } from "express";
import memoize from "memoizee";
import connectPg from "connect-pg-simple";
import pg from "pg";
import bcrypt from "bcryptjs";
import { storage } from "./storage";
import { seedDemoAccount } from "./demoSeed";
import { randomUUID, randomBytes, createHash } from "crypto";
import { sendWelcomeEmail, sendPasswordResetEmail, sendVerificationEmail, getAppBaseUrl } from "./emailService";

// Generates a URL-safe random token and its sha256 hash. We email the raw
// token (in a link) but only ever store the hash, so a database leak can't be
// used to reset passwords or verify emails.
function generateToken(): { token: string; tokenHash: string } {
  const token = randomBytes(32).toString("hex");
  const tokenHash = createHash("sha256").update(token).digest("hex");
  return { token, tokenHash };
}

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function sanitizeInput(input: string): string {
  return input.replace(/[<>]/g, '').trim();
}

const getOidcConfig = memoize(
  async () => {
    return await client.discovery(
      new URL(process.env.ISSUER_URL ?? "https://replit.com/oidc"),
      process.env.REPL_ID!
    );
  },
  { maxAge: 3600 * 1000 }
);

export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  const pgStore = connectPg(session);
  const sessionPool = new pg.Pool({
    connectionString: process.env.DATABASE_URL!,
    max: 3,
    min: 2,
    idleTimeoutMillis: 120000,
    connectionTimeoutMillis: 15000,
  });
  sessionPool.on('error', (err: Error) => {
    console.error('Session pool error (non-fatal):', err.message);
  });

  // Keep-alive: ping the database every 60 seconds to prevent Neon from
  // suspending the compute and terminating our connections mid-session.
  const keepAlive = setInterval(() => {
    sessionPool.query('SELECT 1').catch((err: Error) => {
      console.error('Session pool keep-alive failed (non-fatal):', err.message);
    });
  }, 60 * 1000);
  // Don't block process exit on this timer
  if (keepAlive.unref) keepAlive.unref();

  const sessionStore = new pgStore({
    pool: sessionPool,
    createTableIfMissing: true,
    ttl: sessionTtl,
    tableName: "sessions",
    pruneSessionInterval: false,
    errorLog: (err: Error) => {
      console.error('Session store error:', err.message);
    },
  });
  return session({
    secret: process.env.SESSION_SECRET!,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: sessionTtl,
    },
  });
}

export function createLocalUserSession(userId: string, email: string, firstName: string, lastName: string, profileImageUrl?: string | null) {
  return {
    claims: {
      sub: userId,
      email,
      first_name: firstName,
      last_name: lastName,
      profile_image_url: profileImageUrl || null,
      exp: Math.floor(Date.now() / 1000) + 7 * 24 * 3600,
    },
    access_token: "local-auth",
    refresh_token: null,
    expires_at: Math.floor(Date.now() / 1000) + 7 * 24 * 3600,
  };
}

function updateUserSession(
  user: any,
  tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers
) {
  user.claims = tokens.claims();
  user.access_token = tokens.access_token;
  user.refresh_token = tokens.refresh_token;
  user.expires_at = user.claims?.exp;
}

export async function setupAuth(app: Express) {
  if (!process.env.SESSION_SECRET) {
    throw new Error("SESSION_SECRET environment variable must be set");
  }

  app.set("trust proxy", 1);
  app.use(getSession());
  app.use(passport.initialize());
  app.use(passport.session());

  passport.serializeUser((user: Express.User, cb) => cb(null, user));
  passport.deserializeUser((user: Express.User, cb) => cb(null, user));

  const config = await getOidcConfig();
  const registeredStrategies = new Set<string>();

  const ensureStrategy = (domain: string) => {
    const strategyName = `replitauth:${domain}`;
    if (!registeredStrategies.has(strategyName)) {
      const verify: VerifyFunction = async (
        tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers,
        verified: passport.AuthenticateCallback
      ) => {
        const claims = tokens.claims() as any;
        const user: any = {};
        updateUserSession(user, tokens);

        const existingReplitUser = await storage.getUser(claims["sub"]);
        const isNewReplitUser = !existingReplitUser;

        await storage.upsertUser({
          id: claims["sub"],
          email: claims["email"],
          firstName: claims["first_name"],
          lastName: claims["last_name"],
          profileImageUrl: claims["profile_image_url"],
          authProvider: "replit",
          emailVerified: true,
        });

        if (isNewReplitUser && claims["email"]) {
          sendWelcomeEmail(claims["sub"], claims["email"], claims["first_name"] || '').catch((err: any) =>
            console.error('[Welcome Email] Replit OAuth send failed:', err)
          );
        }

        verified(null, user);
      };

      const strategy = new Strategy(
        {
          name: strategyName,
          config,
          scope: "openid email profile offline_access",
          callbackURL: `https://${domain}/api/callback`,
        },
        verify
      );
      passport.use(strategy);
      registeredStrategies.add(strategyName);
    }
  };

  app.get("/api/login", (req, res, next) => {
    ensureStrategy(req.hostname);
    passport.authenticate(`replitauth:${req.hostname}`, {
      prompt: "login consent",
      scope: ["openid", "email", "profile", "offline_access"],
    })(req, res, next);
  });

  app.get("/api/callback", (req, res, next) => {
    ensureStrategy(req.hostname);
    passport.authenticate(`replitauth:${req.hostname}`, {
      successReturnToOrRedirect: "/",
      failureRedirect: "/",
    })(req, res, next);
  });

  app.post("/api/auth/register", async (req, res) => {
    try {
      const { email, password, firstName, lastName, timezone } = req.body;

      if (!email || !password || !firstName) {
        return res.status(400).json({ message: "Email, password, and first name are required" });
      }

      if (password.length < 6) {
        return res.status(400).json({ message: "Password must be at least 6 characters" });
      }

      const cleanEmail = sanitizeInput(email).toLowerCase();
      const cleanFirstName = sanitizeInput(firstName);
      const cleanLastName = lastName ? sanitizeInput(lastName) : null;

      if (!cleanFirstName) {
        return res.status(400).json({ message: "First name cannot be empty" });
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(cleanEmail)) {
        return res.status(400).json({ message: "Please enter a valid email address" });
      }

      const existingUser = await storage.getUserByEmail(cleanEmail);
      if (existingUser) {
        return res.status(409).json({ message: "An account with this email already exists" });
      }

      const passwordHash = await bcrypt.hash(password, 12);
      const userId = randomUUID();

      // Validate the IANA timezone string. We do a cheap shape check first,
      // then ask Intl to actually round-trip it — anything Intl rejects could
      // later crash the weekly summary cron with a RangeError.
      let cleanTimezone: string | null = null;
      if (
        typeof timezone === "string" &&
        timezone.length > 0 && timezone.length < 64 &&
        /^[A-Za-z_+\-/0-9]+$/.test(timezone)
      ) {
        try {
          new Intl.DateTimeFormat("en-US", { timeZone: timezone }).format(new Date());
          cleanTimezone = timezone;
        } catch {
          cleanTimezone = null;
        }
      }

      // Email verification: store only the hash of a token; email the raw token.
      const { token: verifyToken, tokenHash: verifyHash } = generateToken();
      const verifyExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h

      const user = await storage.upsertUser({
        id: userId,
        email: cleanEmail,
        firstName: cleanFirstName,
        lastName: cleanLastName,
        passwordHash,
        authProvider: "local",
        emailVerified: false,
        emailVerifyToken: verifyHash,
        emailVerifyExpires: verifyExpires,
        ...(cleanTimezone ? { timezone: cleanTimezone } : {}),
      });

      sendWelcomeEmail(userId, cleanEmail, cleanFirstName).catch((err: any) =>
        console.error('[Welcome Email] Local register send failed:', err)
      );

      const verifyLink = `${getAppBaseUrl()}/verify-email?token=${verifyToken}`;
      sendVerificationEmail(cleanEmail, cleanFirstName, verifyLink).catch((err: any) =>
        console.error('[Verify Email] Local register send failed:', err)
      );

      const sessionUser = createLocalUserSession(user.id, user.email!, user.firstName!, user.lastName || "");

      (req as any).session.passport = { user: sessionUser };
      (req as any).session.save((err: any) => {
        if (err) {
          console.error("Session save error during register:", err);
          return res.status(500).json({ message: "Failed to create session" });
        }
        res.json({
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
        });
      });
    } catch (error: any) {
      console.error("Registration error:", error);
      res.status(500).json({ message: "Registration failed" });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ message: "Email and password are required" });
      }

      const user = await storage.getUserByEmail(email);
      if (!user || !user.passwordHash) {
        return res.status(401).json({ message: "Invalid email or password" });
      }

      const isValid = await bcrypt.compare(password, user.passwordHash);
      if (!isValid) {
        return res.status(401).json({ message: "Invalid email or password" });
      }

      const sessionUser = createLocalUserSession(user.id, user.email!, user.firstName!, user.lastName || "");

      (req as any).session.passport = { user: sessionUser };
      (req as any).session.save((err: any) => {
        if (err) {
          console.error("Session save error during login:", err);
          return res.status(500).json({ message: "Failed to create session" });
        }
        res.json({
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
        });
      });
    } catch (error: any) {
      console.error("Login error:", error);
      res.status(500).json({ message: "Login failed" });
    }
  });

  // Password reset — request. Always responds 200 regardless of whether the
  // email exists, to avoid leaking which addresses are registered.
  app.post("/api/auth/forgot-password", async (req, res) => {
    try {
      const { email } = req.body;
      if (!email || typeof email !== "string") {
        return res.status(400).json({ message: "Email is required" });
      }
      const cleanEmail = sanitizeInput(email).toLowerCase();
      const user = await storage.getUserByEmail(cleanEmail);

      // Only send a reset link to local-password accounts. OAuth-only users
      // have no password to reset.
      if (user && user.passwordHash) {
        const { token, tokenHash } = generateToken();
        const expires = new Date(Date.now() + 60 * 60 * 1000); // 1h
        await storage.updateUserSecurityFields(user.id, {
          passwordResetToken: tokenHash,
          passwordResetExpires: expires,
        });
        const resetLink = `${getAppBaseUrl()}/reset-password?token=${token}`;
        sendPasswordResetEmail(user.email!, resetLink).catch((err: any) =>
          console.error("[Reset Email] send failed:", err)
        );
      }

      res.json({ message: "If an account exists for that email, a reset link has been sent." });
    } catch (error: any) {
      console.error("Forgot password error:", error);
      res.status(500).json({ message: "Request failed" });
    }
  });

  // Password reset — set a new password using the emailed token.
  app.post("/api/auth/reset-password", async (req, res) => {
    try {
      const { token, password } = req.body;
      if (!token || typeof token !== "string") {
        return res.status(400).json({ message: "Invalid or expired reset link" });
      }
      if (!password || typeof password !== "string" || password.length < 8) {
        return res.status(400).json({ message: "Password must be at least 8 characters" });
      }

      const user = await storage.getUserByPasswordResetToken(hashToken(token));
      if (!user) {
        return res.status(400).json({ message: "Invalid or expired reset link" });
      }

      const passwordHash = await bcrypt.hash(password, 10);
      await storage.updateUserSecurityFields(user.id, {
        passwordHash,
        passwordResetToken: null,
        passwordResetExpires: null,
      });

      res.json({ message: "Password updated. You can now sign in." });
    } catch (error: any) {
      console.error("Reset password error:", error);
      res.status(500).json({ message: "Reset failed" });
    }
  });

  // Email verification — confirm via the emailed token.
  app.get("/api/auth/verify-email", async (req, res) => {
    try {
      const token = req.query.token;
      if (!token || typeof token !== "string") {
        return res.status(400).json({ message: "Invalid or expired verification link" });
      }
      const user = await storage.getUserByEmailVerifyToken(hashToken(token));
      if (!user) {
        return res.status(400).json({ message: "Invalid or expired verification link" });
      }
      await storage.updateUserSecurityFields(user.id, {
        emailVerified: true,
        emailVerifyToken: null,
        emailVerifyExpires: null,
      });
      res.json({ message: "Your email has been verified." });
    } catch (error: any) {
      console.error("Verify email error:", error);
      res.status(500).json({ message: "Verification failed" });
    }
  });

  // Email verification — resend link to the signed-in user.
  app.post("/api/auth/resend-verification", async (req, res) => {
    try {
      const sessionUser = (req as any).user || (req as any).session?.passport?.user;
      const userId = sessionUser?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ message: "Not signed in" });
      }
      const user = await storage.getUser(userId);
      if (!user || !user.email) {
        return res.status(404).json({ message: "User not found" });
      }
      if (user.emailVerified) {
        return res.json({ message: "Your email is already verified." });
      }
      const { token, tokenHash } = generateToken();
      const expires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h
      await storage.updateUserSecurityFields(user.id, {
        emailVerifyToken: tokenHash,
        emailVerifyExpires: expires,
      });
      const verifyLink = `${getAppBaseUrl()}/verify-email?token=${token}`;
      sendVerificationEmail(user.email, user.firstName || "", verifyLink).catch((err: any) =>
        console.error("[Verify Email] resend failed:", err)
      );
      res.json({ message: "Verification email sent." });
    } catch (error: any) {
      console.error("Resend verification error:", error);
      res.status(500).json({ message: "Resend failed" });
    }
  });

  app.get("/api/logout", (req, res) => {
    const user = (req as any).user || (req as any).session?.passport?.user;
    const isOidcUser = user?.access_token && user.access_token !== "local-auth";

    if (isOidcUser) {
      req.logout(() => {
        res.redirect(
          client.buildEndSessionUrl(config, {
            client_id: process.env.REPL_ID!,
            post_logout_redirect_uri: `${req.protocol}://${req.hostname}`,
          }).href
        );
      });
    } else {
      req.session.destroy((err) => {
        if (err) {
          console.error("Logout error:", err);
        }
        res.redirect("/");
      });
    }
  });

  app.post("/api/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        console.error("Logout error:", err);
      }
      res.json({ success: true });
    });
  });

  app.get("/api/login/demo", async (req, res) => {
    try {
      const demoUserId = `demo-${Date.now()}-${Math.random().toString(36).substring(7)}`;
      const tzOffset = parseInt(req.query.tz as string) || 0;

      await storage.upsertUser({
        id: demoUserId,
        email: `demo-${Date.now()}@example.com`,
        firstName: "Demo",
        lastName: "User",
        authProvider: "demo",
      });

      const existingFamilies = await storage.getUserFamilies(demoUserId);
      if (existingFamilies.length === 0) {
        await storage.createFamily(demoUserId, { name: "Your Family", createdBy: demoUserId });
      }

      const sessionUser = createLocalUserSession(demoUserId, `${demoUserId}@example.com`, "Demo", "User");

      (req as any).session.passport = { user: sessionUser };
      (req as any).session.save((saveErr: any) => {
        if (saveErr) {
          console.error("Session save error:", saveErr);
          return res.redirect("/");
        }
        // Redirect immediately so the browser isn't waiting on seeding
        res.redirect("/");
        // Seed demo data in background after response is sent (in-memory, fast)
        seedDemoAccount(storage, demoUserId, tzOffset).catch((err) => {
          console.error("Background demo seed error:", err);
        });
      });
    } catch (error) {
      console.error("Demo login error:", error);
      res.redirect("/");
    }
  });

  app.post("/api/auth/demo-verify", async (req, res) => {
    try {
      const { demoToken } = req.body;

      if (!demoToken || !demoToken.startsWith("demo-")) {
        return res.status(400).json({ message: "Invalid demo token" });
      }

      const user = await storage.getUser(demoToken);
      if (!user) {
        return res.status(404).json({ message: "Demo user not found" });
      }

      const sessionUser = createLocalUserSession(user.id, user.email || `${demoToken}@example.com`, user.firstName || "Demo", user.lastName || "User");

      (req as any).session.passport = { user: sessionUser };
      (req as any).session.save((saveErr: any) => {
        if (saveErr) {
          console.error("Demo verify session save error:", saveErr);
          return res.status(500).json({ message: "Failed to save session" });
        }
        res.json({ success: true, user: { id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName } });
      });
    } catch (error) {
      console.error("Demo verify error:", error);
      res.status(500).json({ message: "Demo verification failed" });
    }
  });
}

export const isAuthenticated: RequestHandler = async (req, res, next) => {                                                                                     
  // API key bypass for external integrations (Langly/Hermes)                                                                                                  
  const apiKey = req.headers['x-api-key'] as string;                                                                                                           
  if (apiKey && apiKey === process.env.LANGLY_API_KEY) {                                                                                                       
    (req as any).user = {                                                                                                                                      
      claims: { sub: 'langly-api' },                                                                                                                           
      access_token: 'api-key',                                                                                                                                 
      expires_at: Infinity,                                                                                                                                    
    };                                                                                                                                                         
    return next();                                                                                                                                             
  }                                                                                                                                                            

  const user = (req as any).user;                                                                                                                              
  if (user && user.claims?.sub) {                               
    const now = Math.floor(Date.now() / 1000);                                                                                                                 
    if (!user.expires_at || now <= user.expires_at) {                                                                                                          
      return next();                                                                                                                                           
    }                                                                                                                                                          

    if (user.access_token === "local-auth" || user.access_token === "google-auth") {                                                                           
      const newExpiry = Math.floor(Date.now() / 1000) + 7 * 24 * 3600;
      user.expires_at = newExpiry;                                                                                                                             
      if (user.claims) user.claims.exp = newExpiry;                                                                                                            
      return next();                                                                                                                                           
    }                                                                                                                                                          

    if (user.refresh_token) {                                                                                                                                  
      try {                                                                                                                                                    
        const config = await getOidcConfig();                                                                                                                  
        const tokenResponse = await client.refreshTokenGrant(config, user.refresh_token);                                                                      
        updateUserSession(user, tokenResponse);                                                                                                                
        return next();                                                                                                                                         
      } catch (error) {                                                                                                                                        
        return res.status(401).json({ message: "Unauthorized" });                                                                                              
      }                                                                                                                                                        
    }                                                                                                                                                          

    return res.status(401).json({ message: "Unauthorized" });                                                                                                  
  }                                                             

  const sessionData = (req as any).session?.passport?.user;                                                                                                    
  if (sessionData && sessionData.claims?.sub) {                                                                                                                
    const now = Math.floor(Date.now() / 1000);                                                                                                                 
    if (sessionData.access_token === "local-auth" || sessionData.access_token === "google-auth") {                                                             
      const newExpiry = Math.floor(Date.now() / 1000) + 7 * 24 * 3600;                                                                                         
      sessionData.expires_at = newExpiry;                                                                                                                      
      if (sessionData.claims) sessionData.claims.exp = newExpiry;                                                                                              
      (req as any).user = sessionData;                                                                                                                         
      return next();                                                                                                                                           
    }                                                                                                                                                          
    if (!sessionData.expires_at || now <= sessionData.expires_at) {                                                                                            
      (req as any).user = sessionData;                                                                                                                         
      return next();                                                                                                                                           
    }                                                                                                                                                          
  }                                                                                                                                                            

  return res.status(401).json({ message: "Unauthorized" });                                                                                                    
};                                                                                   