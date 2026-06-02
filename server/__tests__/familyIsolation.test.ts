/**
 * Integration test: cross-family data isolation (IDOR guard).
 *
 * Proves that a user belonging to family A receives HTTP 403 (NOT 200/500)
 * when they target family B's data on every family-scoped endpoint that
 * relies on getUserFamilyRole(). It also asserts a positive control: the
 * same user CAN reach their own family's data (not 403), so the test cannot
 * trivially pass by everything returning 403.
 *
 * Runs against the live dev server (default http://localhost:5000, override
 * with TEST_BASE_URL). Uses local email/password auth to create two isolated
 * users + families, then hammers cross-family requests.
 *
 * Run: tsx server/__tests__/familyIsolation.test.ts
 * Exits non-zero if any assertion fails.
 */

const BASE_URL = process.env.TEST_BASE_URL || "http://localhost:5000";

interface Session {
  userId: string;
  cookie: string;
  familyId: string;
  email: string;
  memberId?: string;
}

let passed = 0;
let failed = 0;
const failures: string[] = [];

function ok(name: string) {
  passed++;
  console.log(`  PASS  ${name}`);
}

function fail(name: string, detail: string) {
  failed++;
  failures.push(`${name} — ${detail}`);
  console.log(`  FAIL  ${name} — ${detail}`);
}

function uniqueEmail(prefix: string): string {
  const rand = Math.random().toString(36).slice(2, 10);
  return `isolation-test-${prefix}-${Date.now()}-${rand}@example.com`;
}

function extractCookie(res: Response): string {
  // Node 20 undici exposes getSetCookie(); fall back to the combined header.
  const anyHeaders = res.headers as any;
  const list: string[] =
    typeof anyHeaders.getSetCookie === "function"
      ? anyHeaders.getSetCookie()
      : (res.headers.get("set-cookie") ? [res.headers.get("set-cookie") as string] : []);
  // Keep only the "name=value" portion of each cookie, drop attributes.
  return list.map((c) => c.split(";")[0]).join("; ");
}

async function api(
  method: string,
  path: string,
  opts: { cookie?: string; body?: unknown } = {}
): Promise<{ status: number; json: any; text: string }> {
  const headers: Record<string, string> = {};
  if (opts.cookie) headers["cookie"] = opts.cookie;
  if (opts.body !== undefined) headers["content-type"] = "application/json";
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  });
  const text = await res.text();
  let json: any = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }
  return { status: res.status, json, text };
}

async function registerUser(prefix: string): Promise<Session> {
  const email = uniqueEmail(prefix);
  const res = await fetch(`${BASE_URL}/api/auth/register`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      email,
      password: "test-password-123",
      firstName: `Test${prefix}`,
      lastName: "Isolation",
    }),
  });
  const text = await res.text();
  if (res.status !== 200) {
    throw new Error(`register ${prefix} failed: ${res.status} ${text}`);
  }
  const cookie = extractCookie(res);
  if (!cookie) throw new Error(`register ${prefix} returned no session cookie`);
  const body = JSON.parse(text);
  return { userId: body.id, cookie, familyId: "", email };
}

async function createFamily(session: Session, name: string): Promise<string> {
  const { status, json, text } = await api("POST", "/api/families", {
    cookie: session.cookie,
    body: { name },
  });
  if (status !== 201) {
    throw new Error(`createFamily for ${session.email} failed: ${status} ${text}`);
  }
  return json.id as string;
}

async function createMember(session: Session): Promise<string> {
  const { status, json } = await api("POST", "/api/family-members", {
    cookie: session.cookie,
    body: { familyId: session.familyId, name: "Member One", color: "#3366ff" },
  });
  if (status !== 201) {
    // Non-fatal: member id is only used to populate hydration bodies.
    return "";
  }
  return json?.id ?? "";
}

/**
 * Assert that user A targeting family B is denied with 403.
 */
async function expectForbidden(
  name: string,
  method: string,
  path: string,
  attacker: Session,
  body?: unknown
) {
  const { status, text } = await api(method, path, { cookie: attacker.cookie, body });
  if (status === 403) {
    ok(name);
  } else {
    fail(name, `expected 403 but got ${status} :: ${text.slice(0, 120)}`);
  }
}

/**
 * Positive control: user A targeting their OWN family must NOT be 403.
 */
async function expectAllowed(
  name: string,
  method: string,
  path: string,
  session: Session,
  body?: unknown
) {
  const { status, text } = await api(method, path, { cookie: session.cookie, body });
  if (status !== 403) {
    ok(name);
  } else {
    fail(name, `expected non-403 (own family) but got 403 :: ${text.slice(0, 120)}`);
  }
}

async function main() {
  console.log(`\nFamily data isolation integration test → ${BASE_URL}\n`);

  // Preflight: make sure the server is reachable.
  try {
    await fetch(`${BASE_URL}/api/auth/user`);
  } catch (err) {
    console.error(
      `\nERROR: could not reach ${BASE_URL}. Is the 'Start application' workflow running?\n${String(err)}`
    );
    process.exit(1);
  }

  // Two isolated users, each owning their own family.
  const userA = await registerUser("a");
  const userB = await registerUser("b");
  userA.familyId = await createFamily(userA, "Family A");
  userB.familyId = await createFamily(userB, "Family B");
  userA.memberId = await createMember(userA);

  console.log(`User A family: ${userA.familyId}`);
  console.log(`User B family: ${userB.familyId}\n`);

  const B = userB.familyId;
  const today = new Date().toISOString().slice(0, 10);

  console.log("Cross-family access (user A → family B) must be 403:");

  // Events
  await expectForbidden("GET  /api/events (family B)", "GET", `/api/events?familyId=${B}`, userA);
  await expectForbidden("POST /api/events (family B)", "POST", "/api/events", userA, {
    familyId: B,
    title: "Intrusion",
    startTime: new Date().toISOString(),
  });

  // Symptoms
  await expectForbidden("GET  /api/symptoms (family B)", "GET", `/api/symptoms?familyId=${B}`, userA);
  await expectForbidden("POST /api/symptoms (family B)", "POST", "/api/symptoms", userA, {
    familyId: B,
    date: today,
    energyLevel: 5,
    overallSeverity: 5,
  });

  // Hydration
  await expectForbidden("GET  /api/hydration (family B)", "GET", `/api/hydration?familyId=${B}&date=${today}`, userA);
  await expectForbidden("POST /api/hydration (family B)", "POST", "/api/hydration", userA, {
    familyId: B,
    memberId: userA.memberId || "x",
    date: today,
    glassesCount: 3,
  });

  // Tasks
  await expectForbidden("GET  /api/tasks (family B)", "GET", `/api/tasks?familyId=${B}`, userA);
  await expectForbidden("POST /api/tasks (family B)", "POST", "/api/tasks", userA, {
    familyId: B,
    title: "Intrusion task",
  });

  // Family messages
  await expectForbidden("GET  /api/family-messages (family B)", "GET", `/api/family-messages?familyId=${B}`, userA);
  await expectForbidden("POST /api/family-messages (family B)", "POST", "/api/family-messages", userA, {
    familyId: B,
    content: "Intrusion message",
  });

  // Family members
  await expectForbidden("GET  /api/family-members (family B)", "GET", `/api/family-members?familyId=${B}`, userA);
  await expectForbidden("GET  /api/family-members/:familyId (family B)", "GET", `/api/family-members/${B}`, userA);
  await expectForbidden("POST /api/family-members (family B)", "POST", "/api/family-members", userA, {
    familyId: B,
    name: "Intruder",
    color: "#ff0000",
  });

  // Weekly summary preferences + schedule
  await expectForbidden("GET  /api/weekly-summary-preference (family B)", "GET", `/api/weekly-summary-preference?familyId=${B}`, userA);
  await expectForbidden("PUT  /api/weekly-summary-preference (family B)", "PUT", "/api/weekly-summary-preference", userA, {
    familyId: B,
    optedIn: false,
  });
  await expectForbidden("GET  /api/weekly-summary-schedule (family B)", "GET", `/api/weekly-summary-schedule?familyId=${B}`, userA);
  await expectForbidden("PUT  /api/weekly-summary-schedule (family B)", "PUT", "/api/weekly-summary-schedule", userA, {
    familyId: B,
    isEnabled: true,
  });

  // Google Calendar sync
  await expectForbidden("POST /api/google-calendar/sync (family B)", "POST", "/api/google-calendar/sync", userA, {
    familyId: B,
  });

  // Object storage (vault file delivery). The actual file bytes are served by
  // GET /objects/...; these must never be reachable anonymously, and vault
  // files (care-documents/<familyId>/...) must reject members of other families.
  {
    const vaultPath = `/objects/care-documents/${B}/123-secret.pdf`;
    // Anonymous (no cookie) must be rejected with 401 — not served, not 404-file.
    const anon = await api("GET", vaultPath);
    if (anon.status === 401) ok("GET /objects/care-documents (anonymous) → 401");
    else fail("GET /objects/care-documents (anonymous)", `expected 401 but got ${anon.status}`);

    const anonUpload = await api("POST", "/api/objects/upload");
    if (anonUpload.status === 401) ok("POST /api/objects/upload (anonymous) → 401");
    else fail("POST /api/objects/upload (anonymous)", `expected 401 but got ${anonUpload.status}`);

    // User A (authenticated) hitting family B's vault path must be 403.
    await expectForbidden("GET /objects/care-documents (family B)", "GET", vaultPath, userA);
  }

  console.log("\nPositive control (user A → own family A) must NOT be 403:");
  const A = userA.familyId;
  await expectAllowed("GET  /api/events (own family)", "GET", `/api/events?familyId=${A}`, userA);
  await expectAllowed("GET  /api/symptoms (own family)", "GET", `/api/symptoms?familyId=${A}`, userA);
  await expectAllowed("GET  /api/tasks (own family)", "GET", `/api/tasks?familyId=${A}`, userA);
  await expectAllowed("GET  /api/family-members (own family)", "GET", `/api/family-members?familyId=${A}`, userA);
  // Own-family vault path passes the membership gate (404 for a missing file,
  // never 403/401) — proves the gate doesn't lock members out of their vault.
  await expectAllowed("GET /objects/care-documents (own family)", "GET", `/objects/care-documents/${A}/nope.pdf`, userA);

  // Best-effort cleanup of the families/users we created.
  await cleanup([userA, userB]);

  console.log(`\nResults: ${passed} passed, ${failed} failed`);
  if (failed > 0) {
    console.log("\nFailures:");
    for (const f of failures) console.log(`  - ${f}`);
    process.exit(1);
  }
  console.log("\nAll family-isolation checks passed.");
  process.exit(0);
}

async function cleanup(sessions: Session[]) {
  try {
    const { db } = await import("../db");
    const { sql } = await import("drizzle-orm");
    const ids = sessions.map((s) => s.userId).filter(Boolean);
    const emails = sessions.map((s) => s.email).filter(Boolean);
    const familyIds = sessions.map((s) => s.familyId).filter(Boolean);
    if (familyIds.length) {
      await db.execute(
        sql`DELETE FROM families WHERE id IN (${sql.join(familyIds.map((f) => sql`${f}`), sql`, `)})`
      );
    }
    if (ids.length) {
      await db.execute(
        sql`DELETE FROM users WHERE id IN (${sql.join(ids.map((i) => sql`${i}`), sql`, `)})`
      );
    }
    if (emails.length) {
      await db.execute(
        sql`DELETE FROM users WHERE email IN (${sql.join(emails.map((e) => sql`${e}`), sql`, `)})`
      );
    }
  } catch (err) {
    console.log(`  (cleanup skipped: ${String(err).slice(0, 120)})`);
  }
}

main().catch((err) => {
  console.error("\nTest harness error:", err);
  process.exit(1);
});
