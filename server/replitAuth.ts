import session from "express-session";
import type { Express, RequestHandler } from "express";
import connectPg from "connect-pg-simple";
import pg from "pg";
import bcrypt from "bcryptjs";
import { storage } from "./storage";
import { seedDemoAccount } from "./demoSeed";
import { randomUUID } from "crypto";

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
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      maxAge: sessionTtl,
    },
  });
}

function createUserSession(userId: string, email: string, firstName: string, lastName: string, profileImageUrl?: string | null) {
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

export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());

  app.post("/api/auth/register", async (req, res) => {
    try {
      const { email, password, firstName, lastName } = req.body;

      if (!email || !password || !firstName) {
        return res.status(400).json({ message: "Email, password, and first name are required" });
      }

      if (password.length < 6) {
        return res.status(400).json({ message: "Password must be at least 6 characters" });
      }

      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(409).json({ message: "An account with this email already exists" });
      }

      const passwordHash = await bcrypt.hash(password, 12);
      const userId = randomUUID();

      const user = await storage.upsertUser({
        id: userId,
        email,
        firstName,
        lastName: lastName || null,
        passwordHash,
        authProvider: "local",
      });

      const sessionUser = createUserSession(user.id, user.email!, user.firstName!, user.lastName || "");

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

      const sessionUser = createUserSession(user.id, user.email!, user.firstName!, user.lastName || "");

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

  app.get("/api/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        console.error("Logout error:", err);
      }
      res.redirect("/");
    });
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

      await storage.upsertUser({
        id: demoUserId,
        email: `demo-${Date.now()}@example.com`,
        firstName: "Demo",
        lastName: "User",
        authProvider: "demo",
      });

      await seedDemoAccount(storage, demoUserId);

      const sessionUser = createUserSession(demoUserId, `${demoUserId}@example.com`, "Demo", "User");

      (req as any).session.passport = { user: sessionUser };
      (req as any).session.save((saveErr: any) => {
        if (saveErr) {
          console.error("Session save error:", saveErr);
          return res.redirect("/");
        }
        res.redirect(`/demo-welcome?demo_token=${demoUserId}&next=/care`);
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

      const sessionUser = createUserSession(user.id, user.email || `${demoToken}@example.com`, user.firstName || "Demo", user.lastName || "User");

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
  const apiKey = req.headers['x-api-key'] as string;
  if (apiKey && process.env.LANGLY_API_KEY && apiKey === process.env.LANGLY_API_KEY) {
    (req as any).user = {
      claims: { sub: '21601610' },
      expires_at: Math.floor(Date.now() / 1000) + 86400,
    };
    return next();
  }

  const sessionData = (req as any).session?.passport?.user;
  if (!sessionData || !sessionData.claims?.sub) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const now = Math.floor(Date.now() / 1000);
  if (sessionData.expires_at && now > sessionData.expires_at) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  (req as any).user = sessionData;
  return next();
};
