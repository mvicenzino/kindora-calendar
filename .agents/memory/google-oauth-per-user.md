---
name: Per-user Google OAuth pattern
description: How Kindora connects each user's own Google account (Calendar, Drive) with per-user refresh tokens, and why shared connectors are banned.
---

# Per-user Google OAuth (Calendar + Drive)

Both Google Calendar sync and Google Drive import use the SAME per-user OAuth pattern. When adding another Google (or similar) integration, copy this shape — do NOT use a Replit Connector for anything that touches user data.

**Why:** The original Drive integration used a single shared Replit Connector tied to the repl owner's Google account, which exposed the OWNER's personal Drive to every signed-in user. That is a cross-user privacy leak. The fix is per-user OAuth where each user authorizes their own account and we store their own refresh token.

**How to apply (the recipe):**
- One table per integration, keyed by `userId` (unique): `refreshToken` (notNull), `accessToken`, `accessTokenExpiresAt`, plus integration-specific columns. See `googleCalendarConnections` and `googleDriveConnections` in `shared/schema.ts`.
- Storage: add the 4 CRUD methods (get/upsert/update/delete) to `IStorage`, implement in DrizzleStorage, stub in MemStorage (these connections are persistent-only — demo/mem throws or returns null), and pass through in DemoAwareStorage (always delegate to persistent storage since they are per-user not per-family).
- Service file exports `getValidAccessToken(userId)` — return cached token if `expiresAt` is >60s away, else refresh via `https://oauth2.googleapis.com/token` with grant_type=refresh_token and write the new token back to that user's row.
- Routes: connect (set CSRF state in session, redirect to Google consent with `access_type=offline` + `prompt=consent` so a refresh_token is always returned), callback (validate state, exchange code, upsert tokens), status, disconnect (revoke token then delete row).
- Use a cryptographically secure OAuth `state` (`crypto.randomBytes(...).toString("hex")`), not `Math.random()`.
- Callback redirect URL must be registered in the GCP Console authorized redirect URIs. Prod URLs are `https://kindora.ai/api/google-calendar/callback` and `https://kindora.ai/api/google-drive/callback`. Resolver falls back to the Replit dev domain when not production.
- Shared env: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`. Calendar scope `calendar.readonly`; Drive scope `drive.readonly` (+ `userinfo.email` to show which account is linked).

**Schema migrations:** this project uses `npm run db:push` (drizzle-kit), NOT hand-written SQL migration files. The `migrations/*.sql` folder is legacy/initial only — neither connection table lives there, and that's expected. After a schema change, run `npm run db:push`.
