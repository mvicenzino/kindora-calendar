---
name: Calendar member de-duplication
description: Why family/calendar members duplicated, and the rules that keep them unique without mis-linking people.
---

# Calendar member de-duplication

A family's people are stored in `family_members` (the rows you assign events to). A row may be
linked to a login account (`user_id` set) or manual/unlinked (`user_id` null).

## What caused duplicates
- A read-time backfill that recreated calendar members on every `getFamilyMembers` read kept
  re-spawning duplicates after any cleanup. **Never backfill/derive rows inside a read path** —
  it undoes merges and deletes silently.
- `ensureCalendarMemberForUser` used to always INSERT a new row per account, so a person added
  by hand (short first name) plus their later login (full account display name) became two rows
  because the names didn't match exactly.

## Rules now in force
- Account→member linking only happens at join/create time (`ensureCalendarMemberForUser`), never
  on read.
- Adoption of an existing unlinked row must be **unambiguous**:
  1. exact full-name match among unlinked rows (exactly one) → adopt; else
  2. first-name fallback only if exactly one member in the WHOLE family carries that name and it
     is unlinked.
- **Why:** a bare first-name match can bind the wrong person (e.g. a parent and child sharing a first name),
  silently attaching one person's history to another's account — hard to undo and privacy-affecting.
  When ambiguous, create a fresh row: a harmless duplicate beats a wrong binding.

## Merging
- `mergeFamilyMembers(familyId, targetId, sourceIds[], preferUserId?)` reassigns every member
  reference (events.member_ids[] deduped, messages, medications, care_documents, symptom_entries,
  tasks/chores assigned_member_id, reward_redemptions, hydration_logs, chore_completions) then
  deletes sources and lets target inherit a userId.
- **Order matters:** delete source rows BEFORE setting target.user_id, or you collide with the
  partial unique index `(family_id, user_id) WHERE user_id IS NOT NULL`.
- For rows with their own uniqueness (hydration_logs per (member,date); chore_completions per
  (chore,member,occurrence_date)) delete the colliding source rows first, then reassign the rest.
- Keep MemStorage (demo) parity with DrizzleStorage — it stores tasks/chores/chore_completions/
  reward_redemptions too, so the demo merge must migrate them all or demo behaviour diverges.
