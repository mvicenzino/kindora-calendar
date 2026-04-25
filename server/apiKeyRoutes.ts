import type { Express, Request, Response } from "express";
import { db } from "./db";
import { apiKeys, events, families, familyMembers, familyMemberships } from "@shared/schema";
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

// Pull an API key out of the request from any of the common places agents put it:
//   - Authorization: Bearer <key>
//   - Authorization: <key>          (raw, no scheme)
//   - X-API-Key: <key>
//   - apiKey / api-key / api_key headers
//   - ?key=<key> query string
//   - ?apiKey=<key> / ?api_key=<key> query string
//   - JSON body { key | apiKey | api_key }
function extractApiKey(req: Request): string | null {
  const h = req.headers;
  const auth = (h.authorization ?? "").trim();
  if (auth) {
    if (/^Bearer\s+/i.test(auth)) return auth.replace(/^Bearer\s+/i, "").trim();
    return auth; // raw token in Authorization header
  }
  const headerCandidates = [
    h["x-api-key"],
    h["apikey"],
    h["api-key"],
    h["api_key"],
  ];
  for (const v of headerCandidates) {
    if (typeof v === "string" && v.trim()) return v.trim();
    if (Array.isArray(v) && v[0]?.trim()) return v[0].trim();
  }
  const q = req.query as Record<string, unknown>;
  for (const name of ["key", "apiKey", "api_key", "api-key"]) {
    const v = q[name];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  const body = (req.body ?? {}) as Record<string, unknown>;
  for (const name of ["key", "apiKey", "api_key"]) {
    const v = body[name];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return null;
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

      // Validate the family if one was supplied; otherwise auto-attach the
      // creator's first family so the key works out of the box.
      let resolvedFamilyId: string | null = null;
      if (familyId) {
        const [fam] = await db.select().from(families).where(eq(families.id, familyId));
        if (!fam) return res.status(400).json({ error: "Unknown familyId" });
        resolvedFamilyId = familyId;
      } else {
        const memberships = await db
          .select({ familyId: familyMemberships.familyId })
          .from(familyMemberships)
          .where(eq(familyMemberships.userId, userId));
        if (memberships.length > 0) {
          resolvedFamilyId = memberships[0].familyId;
        }
      }

      const [row] = await db.insert(apiKeys).values({
        key,
        name: name.trim(),
        userId,
        familyId: resolvedFamilyId,
      }).returning();
      res.status(201).json({ ...row, key });
    } catch (err) {
      res.status(500).json({ error: "Failed to create API key" });
    }
  });

  // ─── Admin: update an API key (rename / re-bind family) ───────────────
  app.patch("/api/admin/api-keys/:id", isAuthenticated, async (req: Request, res: Response) => {
    if (!isAdmin(req)) return res.status(403).json({ error: "Forbidden" });
    const { name, familyId } = req.body ?? {};
    const updates: Record<string, unknown> = {};
    if (typeof name === "string" && name.trim()) updates.name = name.trim();
    if (familyId !== undefined) updates.familyId = familyId || null;
    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: "Nothing to update. Provide name and/or familyId." });
    }
    try {
      if (updates.familyId) {
        const [fam] = await db.select().from(families).where(eq(families.id, updates.familyId as string));
        if (!fam) return res.status(400).json({ error: "Unknown familyId" });
      }
      const [row] = await db
        .update(apiKeys)
        .set(updates)
        .where(eq(apiKeys.id, req.params.id))
        .returning();
      if (!row) return res.status(404).json({ error: "Key not found" });
      res.json(row);
    } catch (err) {
      res.status(500).json({ error: "Failed to update API key" });
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

  // ─── Public: whoami (auth check) ──────────────────────────────────────
  // GET or POST /api/v1/whoami — quick way for an agent to verify its key works.
  const whoami = async (req: Request, res: Response) => {
    const rawKey = extractApiKey(req);
    if (!rawKey) {
      return res.status(401).json({
        error: "Missing API key.",
        hint: "Send 'Authorization: Bearer <key>', or 'X-API-Key: <key>', or '?key=<key>'.",
      });
    }
    const keyRow = await resolveApiKey(rawKey);
    if (!keyRow) {
      return res.status(401).json({ error: "Invalid or revoked API key" });
    }
    let familyName: string | null = null;
    if (keyRow.familyId) {
      const [fam] = await db.select().from(families).where(eq(families.id, keyRow.familyId));
      familyName = fam?.name ?? null;
    }
    res.json({
      ok: true,
      keyName: keyRow.name,
      familyId: keyRow.familyId ?? null,
      familyName,
      lastUsedAt: new Date().toISOString(),
    });
  };
  app.get("/api/v1/whoami", whoami);
  app.post("/api/v1/whoami", whoami);

  // ─── Public calendar API: list events ─────────────────────────────────
  // GET /api/v1/events
  //   Auth: Authorization: Bearer <key>  OR  X-API-Key: <key>  OR  ?key=<key>
  //   Query: &start=YYYY-MM-DD  &end=YYYY-MM-DD  &familyId=<id>
  const eventsListHandler = async (req: Request, res: Response) => {
    try {
      const rawKey = extractApiKey(req);

      if (!rawKey) {
        return res.status(401).json({
          error: "Missing API key.",
          hint: "Send 'Authorization: Bearer <key>', or 'X-API-Key: <key>', or '?key=<key>'.",
        });
      }

      const keyRow = await resolveApiKey(rawKey);
      if (!keyRow) return res.status(401).json({ error: "Invalid or revoked API key" });

      const params = { ...(req.query as any), ...(req.body ?? {}) };
      const familyId = (params.familyId as string | undefined) ?? keyRow.familyId;
      if (!familyId) {
        return res.status(400).json({ error: "familyId is required (or attach one to the API key)" });
      }

      const startParam = params.start as string | undefined;
      const endParam = params.end as string | undefined;

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
  };
  app.get("/api/v1/events", eventsListHandler);

  // ─── Public calendar API: create an event ─────────────────────────────
  // POST /api/v1/events
  //   Auth: same options as GET
  //   Body (JSON):
  //     title*       string
  //     startTime*   ISO-8601 string (e.g. "2026-04-25T22:00:00-05:00")
  //     endTime*     ISO-8601 string
  //     description? string
  //     color?       hex (default "#6366F1")
  //     category?    "personal" | "medical" | "school" | "work" | "other" (default "other")
  //     isImportant? boolean
  //     memberIds?   string[]
  //     familyId?    overrides the key's family
  app.post("/api/v1/events", async (req: Request, res: Response) => {
    try {
      const rawKey = extractApiKey(req);
      if (!rawKey) {
        return res.status(401).json({
          error: "Missing API key.",
          hint: "Send 'Authorization: Bearer <key>', or 'X-API-Key: <key>', or '?key=<key>'.",
        });
      }
      const keyRow = await resolveApiKey(rawKey);
      if (!keyRow) return res.status(401).json({ error: "Invalid or revoked API key" });

      const body = (req.body ?? {}) as Record<string, any>;
      const familyId = (body.familyId as string | undefined) ?? keyRow.familyId;
      if (!familyId) {
        return res.status(400).json({ error: "familyId is required (or attach one to the API key)" });
      }

      // Validate family exists
      const [fam] = await db.select().from(families).where(eq(families.id, familyId));
      if (!fam) return res.status(400).json({ error: "Unknown familyId" });

      const title = typeof body.title === "string" ? body.title.trim() : "";
      if (!title) return res.status(400).json({ error: "title is required" });

      const startRaw = body.startTime ?? body.start;
      const endRaw = body.endTime ?? body.end;
      if (!startRaw || !endRaw) {
        return res.status(400).json({ error: "startTime and endTime are required (ISO-8601)" });
      }
      const startTime = new Date(startRaw);
      const endTime = new Date(endRaw);
      if (isNaN(startTime.getTime()) || isNaN(endTime.getTime())) {
        return res.status(400).json({ error: "startTime and endTime must be valid ISO-8601 dates" });
      }
      if (endTime < startTime) {
        return res.status(400).json({ error: "endTime must be the same or after startTime" });
      }

      const allowedCategories = new Set(["personal", "medical", "school", "work", "other"]);
      const category = allowedCategories.has(body.category) ? body.category : "other";
      const color = typeof body.color === "string" && /^#[0-9a-fA-F]{6}$/.test(body.color)
        ? body.color
        : "#6366F1";
      const memberIds = Array.isArray(body.memberIds)
        ? body.memberIds.filter((m: unknown) => typeof m === "string")
        : [];
      const description = typeof body.description === "string" ? body.description : null;
      const isImportant = body.isImportant === true;

      const [created] = await db.insert(events).values({
        familyId,
        title,
        description,
        startTime,
        endTime,
        memberIds,
        color,
        category,
        isImportant,
      }).returning();

      res.status(201).json({
        ok: true,
        event: {
          id: created.id,
          title: created.title,
          description: created.description ?? null,
          start: created.startTime.toISOString(),
          end: created.endTime.toISOString(),
          allDay: false,
          category: created.category,
          color: created.color,
          important: created.isImportant,
          completed: created.completed,
          members: created.memberIds ?? [],
          familyId: created.familyId,
          createdAt: created.createdAt?.toISOString() ?? null,
        },
      });
    } catch (err) {
      console.error("Calendar API create error:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // ─── Helper: authenticate + resolve family + load event by id ─────────
  type EventLoadResult =
    | { error: string; status: number; hint?: string }
    | { event: typeof events.$inferSelect; familyId: string };

  async function authAndLoadEvent(req: Request): Promise<EventLoadResult> {
    const rawKey = extractApiKey(req);
    if (!rawKey) {
      return {
        error: "Missing API key.",
        hint: "Send 'Authorization: Bearer <key>', or 'X-API-Key: <key>', or '?key=<key>'.",
        status: 401,
      };
    }
    const keyRow = await resolveApiKey(rawKey);
    if (!keyRow) return { error: "Invalid or revoked API key", status: 401 };

    const familyIdOverride = (req.query.familyId as string | undefined) ?? (req.body?.familyId as string | undefined);
    const familyId = familyIdOverride ?? keyRow.familyId;
    if (!familyId) {
      return { error: "familyId is required (or attach one to the API key)", status: 400 };
    }

    const eventId = req.params.id;
    if (!eventId) return { error: "Event id is required in the URL path", status: 400 };

    const [event] = await db.select().from(events).where(eq(events.id, eventId));
    if (!event) return { error: "Event not found", status: 404 };
    if (event.familyId !== familyId) {
      // Don't leak existence of events in other families.
      return { error: "Event not found", status: 404 };
    }
    return { event, familyId };
  }

  function formatEvent(e: typeof events.$inferSelect) {
    return {
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
      members: e.memberIds ?? [],
      familyId: e.familyId,
      recurring: {
        isParent: e.isRecurringParent ?? false,
        rrule: e.rrule ?? null,
        legacyRule: e.recurrenceRule ?? null,
      },
      createdAt: e.createdAt?.toISOString() ?? null,
    };
  }

  // ─── Public calendar API: fetch a single event by id ──────────────────
  // GET /api/v1/events/:id
  app.get("/api/v1/events/:id", async (req: Request, res: Response) => {
    try {
      const result = await authAndLoadEvent(req);
      if ("error" in result) return res.status(result.status).json({ error: result.error, ...(result.hint ? { hint: result.hint } : {}) });
      res.json({ ok: true, event: formatEvent(result.event) });
    } catch (err) {
      console.error("Calendar API get-one error:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // ─── Public calendar API: update an event ─────────────────────────────
  // PATCH /api/v1/events/:id
  //   Body: any subset of { title, description, startTime, endTime, color,
  //     category, isImportant, completed, memberIds }
  app.patch("/api/v1/events/:id", async (req: Request, res: Response) => {
    try {
      const result = await authAndLoadEvent(req);
      if ("error" in result) return res.status(result.status).json({ error: result.error, ...(result.hint ? { hint: result.hint } : {}) });

      const body = (req.body ?? {}) as Record<string, any>;
      const updates: Record<string, unknown> = {};

      if (typeof body.title === "string") {
        const t = body.title.trim();
        if (!t) return res.status(400).json({ error: "title cannot be empty" });
        updates.title = t;
      }
      if (body.description === null || typeof body.description === "string") {
        updates.description = body.description;
      }

      const newStart = body.startTime ?? body.start;
      const newEnd = body.endTime ?? body.end;
      let nextStart = result.event.startTime;
      let nextEnd = result.event.endTime;
      if (newStart !== undefined) {
        const d = new Date(newStart);
        if (isNaN(d.getTime())) return res.status(400).json({ error: "startTime must be a valid ISO-8601 date" });
        updates.startTime = d;
        nextStart = d;
      }
      if (newEnd !== undefined) {
        const d = new Date(newEnd);
        if (isNaN(d.getTime())) return res.status(400).json({ error: "endTime must be a valid ISO-8601 date" });
        updates.endTime = d;
        nextEnd = d;
      }
      if (nextEnd < nextStart) {
        return res.status(400).json({ error: "endTime must be the same or after startTime" });
      }

      if (typeof body.color === "string") {
        if (!/^#[0-9a-fA-F]{6}$/.test(body.color)) {
          return res.status(400).json({ error: "color must be a 6-digit hex like #F59E0B" });
        }
        updates.color = body.color;
      }
      if (typeof body.category === "string") {
        const allowed = new Set(["personal", "medical", "school", "work", "other"]);
        if (!allowed.has(body.category)) {
          return res.status(400).json({ error: "category must be one of: personal, medical, school, work, other" });
        }
        updates.category = body.category;
      }
      if (typeof body.isImportant === "boolean") updates.isImportant = body.isImportant;
      if (typeof body.completed === "boolean") {
        updates.completed = body.completed;
        updates.completedAt = body.completed ? new Date() : null;
      }
      if (Array.isArray(body.memberIds)) {
        updates.memberIds = body.memberIds.filter((m: unknown) => typeof m === "string");
      }

      if (Object.keys(updates).length === 0) {
        return res.status(400).json({ error: "Nothing to update. Send at least one field." });
      }

      const [updated] = await db.update(events).set(updates).where(eq(events.id, result.event.id)).returning();
      res.json({ ok: true, event: formatEvent(updated) });
    } catch (err) {
      console.error("Calendar API update error:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // ─── Public calendar API: delete an event ─────────────────────────────
  // DELETE /api/v1/events/:id
  app.delete("/api/v1/events/:id", async (req: Request, res: Response) => {
    try {
      const result = await authAndLoadEvent(req);
      if ("error" in result) return res.status(result.status).json({ error: result.error, ...(result.hint ? { hint: result.hint } : {}) });

      await db.delete(events).where(eq(events.id, result.event.id));
      res.json({ ok: true, deleted: { id: result.event.id, title: result.event.title } });
    } catch (err) {
      console.error("Calendar API delete error:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  });
}
