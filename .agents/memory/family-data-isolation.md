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
