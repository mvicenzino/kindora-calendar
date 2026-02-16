import * as client from "openid-client";
import { Strategy, type VerifyFunction } from "openid-client/passport";

import passport from "passport";
import session from "express-session";
import type { Express, RequestHandler } from "express";
import memoize from "memoizee";
import connectPg from "connect-pg-simple";
import pg from "pg";
import { storage } from "./storage";
import { seedDemoAccount } from "./demoSeed";

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
  const dbUrl = process.env.DATABASE_URL!;
  const poolerUrl = dbUrl.replace(
    /(@ep-[^.]+)(\.)/,
    '$1-pooler$2'
  );
  const sessionPool = new pg.Pool({
    connectionString: poolerUrl,
    max: 1,
    min: 0,
    idleTimeoutMillis: 5000,
    connectionTimeoutMillis: 3000,
    allowExitOnIdle: true,
  });
  sessionPool.on('error', (err: Error) => {
    console.error('Session pool error (non-fatal):', err.message);
  });
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
      secure: true,
      sameSite: "none",
      maxAge: sessionTtl,
    },
  });
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

async function upsertUser(
  claims: any,
) {
  await storage.upsertUser({
    id: String(claims["sub"]),
    email: claims["email"],
    firstName: claims["first_name"],
    lastName: claims["last_name"],
    profileImageUrl: claims["profile_image_url"],
  });
}

export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());
  app.use(passport.initialize());
  app.use(passport.session());

  const config = await getOidcConfig();

  const verify: VerifyFunction = async (
    tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers,
    verified: passport.AuthenticateCallback
  ) => {
    const user = {};
    updateUserSession(user, tokens);
    const claims = tokens.claims();
    if (claims) {
      await upsertUser(claims);
      
      // Seed demo account if this is a demo user (for testing)
      const userId = String(claims["sub"]);
      if (userId.startsWith("demo-")) {
        try {
          await seedDemoAccount(storage, userId);
        } catch (error) {
          console.log("Demo seeding (may already be seeded):", error);
        }
      }
    }
    
    verified(null, user);
  };

  // Keep track of registered strategies
  const registeredStrategies = new Set<string>();

  // Helper function to ensure strategy exists for a domain
  const ensureStrategy = (domain: string) => {
    const strategyName = `replitauth:${domain}`;
    if (!registeredStrategies.has(strategyName)) {
      const strategy = new Strategy(
        {
          name: strategyName,
          config,
          scope: "openid email profile offline_access",
          callbackURL: `https://${domain}/api/callback`,
        },
        verify,
      );
      passport.use(strategy);
      registeredStrategies.add(strategyName);
    }
  };

  passport.serializeUser((user: Express.User, cb) => cb(null, user));
  passport.deserializeUser((user: Express.User, cb) => cb(null, user));

  app.get("/api/login", (req, res, next) => {
    ensureStrategy(req.hostname);
    passport.authenticate(`replitauth:${req.hostname}`, {
      prompt: "login consent",
      scope: ["openid", "email", "profile", "offline_access"],
    })(req, res, next);
  });

  app.get("/api/callback", (req, res, next) => {
    ensureStrategy(req.hostname);
    passport.authenticate(`replitauth:${req.hostname}`, (err: any, user: any, info: any) => {
      if (err) {
        console.error("Auth callback error:", err?.message || err);
        return res.redirect("/?auth_error=callback_failed");
      }
      if (!user) {
        console.error("Auth callback: no user returned", info);
        return res.redirect("/?auth_error=no_user");
      }
      req.logIn(user, (loginErr) => {
        if (loginErr) {
          console.error("Auth login error:", loginErr);
          return res.redirect("/?auth_error=login_failed");
        }
        req.session.save((saveErr) => {
          if (saveErr) {
            console.error("Auth session save error:", saveErr);
          }
          return res.redirect("/");
        });
      });
    })(req, res, next);
  });

  app.get("/api/logout", (req, res) => {
    req.logout(() => {
      res.redirect(
        client.buildEndSessionUrl(config, {
          client_id: process.env.REPL_ID!,
          post_logout_redirect_uri: `${req.protocol}://${req.hostname}`,
        }).href
      );
    });
  });

  // Demo/Guest login for testing
  app.get("/api/login/demo", async (req, res) => {
    try {
      // Generate a unique demo user ID
      const demoUserId = `demo-${Date.now()}-${Math.random().toString(36).substring(7)}`;
      
      // Create demo user claims
      const demoClaims = {
        sub: demoUserId,
        email: `demo-${Date.now()}@example.com`,
        first_name: "Demo",
        last_name: "User",
        profile_image_url: null,
        exp: Math.floor(Date.now() / 1000) + 86400, // 24 hours
      };

      // Upsert demo user to database
      await upsertUser(demoClaims);

      // Seed demo account with sample data
      await seedDemoAccount(storage, demoUserId);

      // Create demo session
      const demoUser = {
        claims: demoClaims,
        access_token: "demo-token",
        refresh_token: null,
        expires_at: demoClaims.exp,
      };

      // Log in the demo user
      req.login(demoUser, (err) => {
        if (err) {
          console.error("Demo login error:", err);
          return res.redirect("/api/login");
        }
        // Explicitly save session before redirecting to ensure it's persisted
        req.session.save((saveErr) => {
          if (saveErr) {
            console.error("Session save error:", saveErr);
            return res.redirect("/api/login");
          }
          // Redirect with demo token for fallback authentication
          // This helps work around third-party cookie blocking in iframes
          // Default destination is the Caregiver Dashboard
          res.redirect(`/demo-welcome?demo_token=${demoUserId}&next=/care`);
        });
      });
    } catch (error) {
      console.error("Demo login error:", error);
      res.redirect("/api/login");
    }
  });

  // Demo token verification - fallback for when cookies don't work
  app.post("/api/auth/demo-verify", async (req, res) => {
    try {
      const { demoToken } = req.body;
      
      if (!demoToken || !demoToken.startsWith("demo-")) {
        return res.status(400).json({ message: "Invalid demo token" });
      }

      // Verify the demo user exists
      const user = await storage.getUser(demoToken);
      if (!user) {
        return res.status(404).json({ message: "Demo user not found" });
      }

      // Create demo session
      const demoClaims = {
        sub: demoToken,
        email: user.email || `${demoToken}@example.com`,
        first_name: user.firstName || "Demo",
        last_name: user.lastName || "User",
        profile_image_url: user.profileImageUrl,
        exp: Math.floor(Date.now() / 1000) + 86400,
      };

      const demoUser = {
        claims: demoClaims,
        access_token: "demo-token",
        refresh_token: null,
        expires_at: demoClaims.exp,
      };

      // Log in the demo user
      req.login(demoUser, (err) => {
        if (err) {
          console.error("Demo verify login error:", err);
          return res.status(500).json({ message: "Failed to establish session" });
        }
        req.session.save((saveErr) => {
          if (saveErr) {
            console.error("Demo verify session save error:", saveErr);
            return res.status(500).json({ message: "Failed to save session" });
          }
          res.json({ success: true, user: { id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName } });
        });
      });
    } catch (error) {
      console.error("Demo verify error:", error);
      res.status(500).json({ message: "Demo verification failed" });
    }
  });
}

export const isAuthenticated: RequestHandler = async (req, res, next) => {
  // API key bypass for server-to-server calls (e.g., Langly)
  const apiKey = req.headers['x-api-key'] as string;
  if (apiKey && process.env.LANGLY_API_KEY && apiKey === process.env.LANGLY_API_KEY) {
    (req as any).user = {
      claims: { sub: '21601610' },
      expires_at: Math.floor(Date.now() / 1000) + 86400,
    };
    return next();
  }

  const user = req.user as any;

  if (!req.isAuthenticated() || !user.expires_at) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const now = Math.floor(Date.now() / 1000);
  if (now <= user.expires_at) {
    return next();
  }

  const refreshToken = user.refresh_token;
  if (!refreshToken) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  try {
    const config = await getOidcConfig();
    const tokenResponse = await client.refreshTokenGrant(config, refreshToken);
    updateUserSession(user, tokenResponse);
    return next();
  } catch (error) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }
};
