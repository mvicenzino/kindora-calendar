import type { Express, Request, Response } from "express";
import { db } from "./db";
import { apiKeys, events, families, familyMembers } from "@shared/schema";
import { eq, and, gte, lte, or, isNull } from "drizzle-orm";
import { isAuthenticated } from "./replitAuth";
import crypto from "crypto";

const ADMIN_USER_ID = "google-110610540501901085708";

function isAdmin(req: Request): boolean {
  const sub = (req as any).user?.claims?.sub;
  const email = (req as any).user?.claims?.email;
  return sub === ADMIN_USER_ID || email === "mvicenzino@gmail.com";
}

function generateKey(): string {
  return crypto.randomBytes(32).toString("hex");
}

async function resolveApiKey(key: string) {
  const [row] = await db.select().from(apiKeys).where(eq(apiKeys.key, key));
  if (!row) return null;
  await db.update(apiKeys).set({ lastUsedAt: new Date() }).where(eq(apiKeys.id, row.id));
  return row;
}

export function registerApiKeyRoutes(app: Express) {
  // ─── Admin: list all API keys ─────────────────────────────────────────
  app.get("/api/admin/api-keys", isAuthenticated, async (req: Request, res: Response) => {
    if (!isAdmin(req)) return res.status(403).json({ error: "Forbidden" });
    try {
      const rows = await db.select().from(apiKeys).orderBy(apiKeys.createdAt);
      res.json(rows);
    } catch (err) {
      res.status(500).json({ error: "Failed to list API keys" });
    }
  });

  // ─── Admin: create a new API key ──────────────────────────────────────
  app.post("/api/admin/api-keys", isAuthenticated, async (req: Request, res: Response) => {
    if (!isAdmin(req)) return res.status(403).json({ error: "Forbidden" });
    const { name, familyId } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: "Name is required" });
    try {
      const key = generateKey();
      const userId = (req as any).user?.claims?.sub ?? ADMIN_USER_ID;
      const [row] = await db.insert(apiKeys).values({
        key,
        name: name.trim(),
        userId,
        familyId: familyId || null,
      }).returning();
      res.status(201).json({ ...row, key });
    } catch (err) {
      res.status(500).json({ error: "Failed to create API key" });
    }
  });

  // ─── Admin: delete an API key ─────────────────────────────────────────
  app.delete("/api/admin/api-keys/:id", isAuthenticated, async (req: Request, res: Response) => {
    if (!isAdmin(req)) return res.status(403).json({ error: "Forbidden" });
    try {
      await db.delete(apiKeys).where(eq(apiKeys.id, req.params.id));
      res.status(204).send();
    } catch (err) {
      res.status(500).json({ error: "Failed to delete API key" });
    }
  });

  // ─── Public calendar API ──────────────────────────────────────────────
  // GET /api/v1/events
  //   Headers: Authorization: Bearer <key>
  //   Query:   ?key=<key>  (alternative)
  //           &start=2026-04-01          (ISO date, inclusive)
  //           &end=2026-04-30            (ISO date, inclusive)
  //           &familyId=<id>             (optional, overrides key's family)
  app.get("/api/v1/events", async (req: Request, res: Response) => {
    try {
      const authHeader = req.headers.authorization ?? "";
      const rawKey =
        (authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null) ??
        (req.query.key as string | undefined);

      if (!rawKey) {
        return res.status(401).json({ error: "Missing API key. Send via Authorization: Bearer <key> or ?key=" });
      }

      const keyRow = await resolveApiKey(rawKey);
      if (!keyRow) return res.status(401).json({ error: "Invalid or revoked API key" });

      const familyId = (req.query.familyId as string | undefined) ?? keyRow.familyId;
      if (!familyId) {
        return res.status(400).json({ error: "familyId is required (or attach one to the API key)" });
      }

      const startParam = req.query.start as string | undefined;
      const endParam = req.query.end as string | undefined;

      const startDate = startParam ? new Date(startParam) : (() => {
        const d = new Date(); d.setHours(0, 0, 0, 0); return d;
      })();
      const endDate = endParam ? new Date(endParam + "T23:59:59Z") : (() => {
        const d = new Date(); d.setDate(d.getDate() + 90); return d;
      })();

      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        return res.status(400).json({ error: "Invalid date format. Use YYYY-MM-DD." });
      }

      // Fetch family info and members for name resolution
      const [family] = await db.select().from(families).where(eq(families.id, familyId));
      const members = await db.select().from(familyMembers).where(eq(familyMembers.familyId, familyId));
      const memberMap = new Map(members.map((m) => [m.id, m.name]));

      // Fetch events in range (includes non-recurring + recurring parents)
      const rows = await db.select().from(events).where(
        and(
          eq(events.familyId, familyId),
          or(
            and(gte(events.startTime, startDate), lte(events.startTime, endDate)),
            // Also include recurring parents that started before range (rrule may produce occurrences in range)
            and(eq(events.isRecurringParent, true), lte(events.startTime, endDate))
          )
        )
      );

      const formatted = rows.map((e) => ({
        id: e.id,
        title: e.title,
        description: e.description ?? null,
        start: e.startTime.toISOString(),
        end: e.endTime.toISOString(),
        allDay: false,
        category: e.category,
        color: e.color,
        important: e.isImportant,
        completed: e.completed,
        completedAt: e.completedAt?.toISOString() ?? null,
        members: (e.memberIds ?? []).map((id) => ({ id, name: memberMap.get(id) ?? id })),
        recurring: {
          isParent: e.isRecurringParent ?? false,
          rrule: e.rrule ?? null,
          legacyRule: e.recurrenceRule ?? null,
        },
        createdAt: e.createdAt?.toISOString() ?? null,
      }));

      res.json({
        family: { id: familyId, name: family?.name ?? familyId },
        query: {
          start: startDate.toISOString(),
          end: endDate.toISOString(),
        },
        total: formatted.length,
        events: formatted,
        generated: new Date().toISOString(),
      });
    } catch (err) {
      console.error("Calendar API error:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  });
}
