---
name: Family data isolation (IDOR guard)
description: Why every family-scoped API route must verify membership, not just resolve a familyId.
---

# Family data isolation in server/routes.ts

Family-scoped endpoints must verify the caller belongs to the resolved family before any
read/write. Resolving `familyId` is NOT authorization.

**Rule:** after obtaining `familyId` (from `getFamilyId(req, userId)`, `req.query.familyId`,
or `req.body.familyId`), call:
`const role = await getUserFamilyRole(storage, userId, familyId); if (!role) return 403`.

**Why:** `getFamilyId()` and client-supplied `familyId` are trusted-but-unverified. Without the
role check, any authenticated user could pass another family's id and read/modify their
calendar, symptoms, hydration, tasks, messages, family members, or weekly-summary prefs —
a cross-tenant IDOR. This surfaced after a real user privacy concern about sensitive
medical/legal data.

**How to apply:** any new endpoint touching family data needs the role guard before storage
calls. Don't gate it conditionally (e.g. `if (body.familyId)`) — require the id and always
check. Endpoints that look up a record first (e.g. `/api/symptoms/:id`) check the role
against the record's own `familyId` instead.

**Regression test:** `server/__tests__/familyIsolation.test.ts` (registered as the `test`
validation command, run with `tsx`) registers two local users/families and asserts user A
gets 403 (not 200/500) targeting family B across every family-scoped endpoint, plus a
positive control that A can reach its own family. Add any NEW family-scoped endpoint to this
test. It hits the live dev server (default `http://localhost:5000`, override `TEST_BASE_URL`)
so the workflow must be running; it self-cleans the rows it creates.
