import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import path from "path";
import helmet from "helmet";
import cors from "cors";
import rateLimit from "express-rate-limit";
import compression from "compression";
import { runMigrations } from 'stripe-replit-sync';
import { getStripeSync } from './stripeClient';
import { WebhookHandlers } from './webhookHandlers';
import { db } from "./db";
import { startCronScheduler } from "./cronScheduler";

const app = express();

app.use(compression());

const isProduction = process.env.NODE_ENV === "production";

// All domains that may originate API requests
const allowedOrigins = [
  "https://kindora.ai",
  "https://www.kindora.ai",
  "https://calendora.replit.app", // legacy — keep during transition
];

app.use(helmet({
  contentSecurityPolicy: isProduction ? {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "blob:", "https:"],
      connectSrc: ["'self'", "https://replit.com", "https://api.stripe.com", "wss:"],
      frameSrc: ["'self'", "https://checkout.stripe.com", "https://js.stripe.com"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: [],
    },
  } : false,
  crossOriginEmbedderPolicy: false,
  crossOriginOpenerPolicy: false,
}));

app.use(cors({
  origin: isProduction
    ? (origin, cb) => {
        // Allow requests with no origin (server-to-server, curl) and listed domains
        if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
        // Allow the Kindora Chrome / Firefox browser extension (any extension ID)
        if (origin.startsWith("chrome-extension://") || origin.startsWith("moz-extension://")) {
          return cb(null, true);
        }
        return cb(new Error(`CORS: origin ${origin} not allowed`));
      }
    : true,
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-API-Key"],
}));

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many requests, please try again later." },
  skip: (req) => !req.path.startsWith("/api"),
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many login attempts, please try again later." },
});

app.use(apiLimiter);
app.use("/api/auth/login", authLimiter);
app.use("/api/auth/register", authLimiter);

// Stripe webhook route MUST be registered BEFORE express.json()
// so it receives the raw Buffer for signature verification
app.post(
  '/api/stripe/webhook',
  express.raw({ type: 'application/json' }),
  async (req, res) => {
    const signature = req.headers['stripe-signature'];
    if (!signature) {
      return res.status(400).json({ error: 'Missing stripe-signature' });
    }
    try {
      const sig = Array.isArray(signature) ? signature[0] : signature;
      if (!Buffer.isBuffer(req.body)) {
        console.error('STRIPE WEBHOOK ERROR: req.body is not a Buffer');
        return res.status(500).json({ error: 'Webhook processing error' });
      }
      await WebhookHandlers.processWebhook(req.body as Buffer, sig);
      res.status(200).json({ received: true });
    } catch (error: any) {
      console.error('Webhook error:', error.message);
      res.status(400).json({ error: 'Webhook processing error' });
    }
  }
);

declare module 'http' {
  interface IncomingMessage {
    rawBody: unknown
  }
}
app.use(express.json({
  limit: "20mb",
  verify: (req, _res, buf) => {
    req.rawBody = buf;
  }
}));
app.use(express.urlencoded({ extended: false, limit: "20mb" }));

app.use("/attached_assets", express.static(path.resolve(import.meta.dirname, "../attached_assets")));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  // Initialize Stripe schema and sync data
  try {
    const databaseUrl = process.env.DATABASE_URL;
    if (databaseUrl) {
      console.log('Initializing Stripe schema...');
      await runMigrations({ databaseUrl } as any);
      console.log('Stripe schema ready');

      const stripeSync = await getStripeSync();

      const webhookBaseUrl = `https://${process.env.REPLIT_DOMAINS?.split(',')[0]}`;
      const webhookResult = await stripeSync.findOrCreateManagedWebhook(
        `${webhookBaseUrl}/api/stripe/webhook`
      );
      console.log('Stripe webhook configured:', webhookResult?.webhook?.url || 'managed');

      stripeSync.syncBackfill()
        .then(() => console.log('Stripe data synced'))
        .catch((err: any) => console.error('Error syncing Stripe data:', err));
    }
  } catch (error) {
    console.error('Failed to initialize Stripe (non-fatal):', error);
  }

  // Startup migration: fix family memberships orphaned when a bug in upsertUser changed user IDs.
  // Finds memberships whose user_id no longer exists in users, then reassigns them to
  // a google- user who has no memberships (the "new" ID that replaced the old one).
  try {
    const { sql: drizzleSql } = await import("drizzle-orm");
    const orphanRows = await db.execute(drizzleSql`
      SELECT DISTINCT fm.user_id AS old_id
      FROM family_memberships fm
      LEFT JOIN users u ON u.id = fm.user_id
      WHERE u.id IS NULL
    `);
    const orphanedIds: string[] = (orphanRows as any).rows?.map((r: any) => r.old_id) ?? [];
    if (orphanedIds.length > 0) {
      console.log(`[Migration] Orphaned family membership user_ids: ${orphanedIds.join(', ')}`);
      // Find google- users with no memberships — these are the "new" IDs for orphaned subs
      const googleNoFamilyRows = await db.execute(drizzleSql`
        SELECT u.id FROM users u
        WHERE u.id LIKE 'google-%'
        AND NOT EXISTS (SELECT 1 FROM family_memberships WHERE user_id = u.id)
        LIMIT 1
      `);
      const newUserId: string | undefined = (googleNoFamilyRows as any).rows?.[0]?.id;
      if (newUserId) {
        for (const oldId of orphanedIds) {
          await db.execute(drizzleSql`
            UPDATE family_memberships SET user_id = ${newUserId} WHERE user_id = ${oldId}
          `);
          console.log(`[Migration] Reassigned memberships: ${oldId} → ${newUserId}`);
        }
      }
    }
  } catch (migrationErr) {
    console.error('[Migration] Orphaned membership fix failed (non-fatal):', migrationErr);
  }

  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const port = parseInt(process.env.PORT || '5000', 10);
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
    startCronScheduler(port);
  });
})();
