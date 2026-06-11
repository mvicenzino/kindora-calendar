---
name: Password reset & email verification token flow
description: How Kindora's password-reset and soft email-verification tokens are generated, stored, and consumed.
---

# Auth token flow (password reset + email verification)

Raw token = 32 random bytes hex, emailed to the user inside a link. Only the
**sha256 hash** of the token is ever persisted (on `users`:
`passwordResetToken`/`passwordResetExpires`, `emailVerifyToken`/`emailVerifyExpires`).
Lookups (`getUserByPasswordResetToken`, `getUserByEmailVerifyToken`) match the
hash AND enforce a non-expired window in SQL. Tokens are cleared (set null) on
successful use. Reset expiry = 1h, verify expiry = 24h.

**Why:** a DB leak must not be usable to reset passwords or verify emails — the
raw token only ever lives in the user's inbox.

**How to apply:**
- `forgot-password` always returns 200 (no email enumeration) and only sends to
  accounts that have a `passwordHash` (local accounts; OAuth-only users have no
  password to reset).
- OAuth sign-in paths (Replit OIDC verify, Google upsert) set
  `emailVerified: true`; local register sets it false + sends a verification
  email non-blocking while keeping auto-login (soft, non-blocking gate).
- Any new field added to the `users` table that is secret/token-like must be
  stripped from every `/api/auth/user*` response (search for the
  `...safeUser` destructures in `server/routes.ts` — there are several) the same
  way `passwordHash` is.
- Email verification is "soft": it never blocks app usage; a dismissible banner
  in AppShell prompts verification when `user.emailVerified === false`.
