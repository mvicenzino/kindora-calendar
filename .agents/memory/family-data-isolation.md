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

**File delivery is a separate gate from metadata.** The vault's care-document metadata routes
were protected while the route that streams the actual file BYTES (`GET /objects/...`) had no
auth at all — so any anonymous URL holder could pull a medical/legal file. Lesson: the static
object-serving route must enforce the SAME family-membership check (parse `familyId` from the
object key prefix and call `getUserFamilyRole`), require auth, and serve private files with
`Cache-Control: private` (`no-store` for sensitive vault docs) so proxies/CDNs never retain
them. Authorize on the same canonical path that is fetched, and reject `.`/`..` segments.
**Why:** protecting the JSON metadata endpoint is worthless if the bytes are world-readable.

**Don't authorize a file by a client-controlled reference unless that reference is ownership-bound.**
For files whose path has no family in it (e.g. event photos at `uploads/<uuid>`), read-time
authz resolves the owning row (event by `photoUrl`) and checks membership. That alone is
exploitable: a user can point their OWN event at another family's path, so the read gate then
treats the file as theirs (reference confusion; also `.limit(1)` is non-deterministic with
duplicates). Fix the BINDING side too: at attach time reject pointing a record at a path that
already belongs to another family, so the reference becomes effectively unique-per-family.
**Why:** authorization derived from a mutable, user-supplied pointer is only as safe as the
write path that sets the pointer. Prefer encoding the family in the storage path (like the
vault) for new resources; the lookup approach is the fallback that protects legacy objects.

**Closing a pointer-based authz model completely takes FOUR coordinated guards — miss one and
it stays exploitable:** (1) scope NEW resources by storage path (`event-photos/<familyId>/...`)
so reads are a pure path check; (2) the read gate must DENY orphans/unbound objects (404), not
serve them to any authed user; (3) lock down EVERY write path that can set the pointer — not
just the dedicated endpoint: `photoUrl` was also settable via generic `POST/PUT /api/events`
and bulk-import, so it had to be omitted from `insertEventSchema` (Zod drops unknown keys) AND
defensively `delete`d before storage writes; (4) the legacy lookup must FAIL CLOSED on
ambiguity — `getEventByPhotoUrl` returns null unless exactly one family owns the path (a bare
`.limit(1)` is a cross-family leak if duplicate bindings exist). **Why:** an architect review
found each of these as a separate bypass in turn; fixing only the obvious endpoint left three
other live read paths. Test note: HTTP can't tell "ownership denied" from "bytes missing"
(both 404) — verify the ambiguity rule with a direct storage-level unit assertion.

**Regression test:** `server/__tests__/familyIsolation.test.ts` (registered as the `test`
validation command, run with `tsx`) registers two local users/families and asserts user A
gets 403 (not 200/500) targeting family B across every family-scoped endpoint, plus a
positive control that A can reach its own family. Add any NEW family-scoped endpoint to this
test. It hits the live dev server (default `http://localhost:5000`, override `TEST_BASE_URL`)
so the workflow must be running; it self-cleans the rows it creates.
