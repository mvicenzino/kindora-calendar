# Calendora: Migrate from Replit PostgreSQL to Supabase + Local Dev Setup

## Context

Calendora (kindora-calendar) currently runs entirely on Replit with Replit's built-in PostgreSQL. Before the March 15 go-live, we need to:
1. Move the database to Supabase so it's accessible from both Replit (production) and local (Claude Code development)
2. Set up a local dev environment so you can use Claude Code as an alternative to Replit's editor
3. Thoroughly test everything before go-live

## Decisions Made
- **Local auth**: Demo login only (no Google OAuth locally)
- **Gmail connector**: Defer — stays Replit-only for now
- **Supabase**: New dedicated project (separate from Stride)

---

## Phase 1: Code Changes (on Replit, `supabase-migration` branch)

### 1.1 Switch Drizzle driver from Neon to node-postgres

The app currently uses `drizzle-orm/neon-http` with `@neondatabase/serverless` — Neon's HTTP protocol doesn't work with Supabase. Switch to standard `pg` driver.

**`package.json`** — Add dependencies:
```
pg ^8.13.0 (dependencies)
@types/pg ^8.11.0 (devDependencies)
```

**`server/storage.ts`** line 3 — Change import:
```typescript
// FROM:
import { drizzle } from "drizzle-orm/neon-http";
// TO:
import { drizzle } from "drizzle-orm/node-postgres";
```

No other changes in storage.ts — all ORM queries stay identical.

### 1.2 Make session store SSL-aware

**`server/replitAuth.ts`** lines 31 — Add conditional SSL to pool config:
```typescript
pool: { max: 3, idleTimeoutMillis: 30000, ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false },
```

### 1.3 Make cookies work on localhost

**`server/replitAuth.ts`** lines 38-42 — Environment-aware cookie settings:
```typescript
// FROM:
secure: true,
sameSite: "none",
// TO:
secure: process.env.NODE_ENV === 'production',
sameSite: process.env.NODE_ENV === 'production' ? 'none' as const : 'lax' as const,
```

### 1.4 Guard Replit OIDC for non-Replit environments

**`server/replitAuth.ts`** line 75 — `getOidcConfig()` will throw without `REPL_ID`. Wrap OIDC setup:
```typescript
// Lines 75-120 and routes at 177-191: wrap in if (process.env.REPL_ID) { ... }
// Lines 122-175 (Google OAuth, serialize/deserialize): keep outside the guard
// Lines 217-240 (logout): add fallback for non-OIDC logout
// Lines 242-346 (demo login): keep outside the guard — always available
```

Also guard the OIDC refresh in `isAuthenticated` (lines 377-384) — if no REPL_ID, skip the refresh attempt.

### 1.5 No changes needed
- `drizzle.config.ts` — uses `dialect: "postgresql"` which is driver-agnostic
- `shared/schema.ts` — `gen_random_uuid()` works on Supabase (pgcrypto enabled by default)
- `server/index.ts` — already reads `process.env.PORT`
- `vite.config.ts` — Replit plugins auto-skip when `REPL_ID` is undefined
- `.gitignore` — already excludes `.env`
- All frontend code — no changes

---

## Phase 2: Supabase Setup + Data Migration

### 2.1 Create Supabase project
- Name: `calendora`
- Region: `us-west-2` (same as Stride)
- Save: project ref, database password, pooler URL (port 6543), direct URL (port 5432)

### 2.2 Push schema to Supabase
```bash
DATABASE_URL="postgresql://postgres.[ref]:[password]@db.[ref].supabase.co:5432/postgres" npm run db:push
```

### 2.3 Export data from Replit PostgreSQL
```bash
# On Replit shell:
pg_dump $DATABASE_URL --data-only --no-owner --no-privileges > calendora_data.sql
```

### 2.4 Import data to Supabase
```bash
psql "postgresql://postgres.[ref]:[password]@db.[ref].supabase.co:5432/postgres" < calendora_data.sql
```

### 2.5 Update Replit environment
- Set `DATABASE_URL` to Supabase **pooler** URL (port 6543)
- Add `SESSION_SECRET` (random 64-char hex string) if not already set

### 2.6 Verify on Replit
- Redeploy, confirm app starts, demo login works, data is intact

**Rollback**: Keep Replit's original `DATABASE_URL` noted. Revert the env var if issues arise.

---

## Phase 3: Local Claude Code Environment

### 3.1 Clone and install
```bash
cd ~/kindora-calendar  # already cloned
git pull origin supabase-migration
npm install
```

### 3.2 Local database setup (two options)

**Option A — Local PostgreSQL (independent dev data)**:
```bash
createdb calendora
DATABASE_URL="postgresql:///calendora?host=/tmp" npm run db:push
```

**Option B — Supabase directly (shared data with production)**:
Use the same Supabase pooler URL in local `.env`. Simpler but careful with prod data.

### 3.3 Create local `.env`
```env
DATABASE_URL=postgresql:///calendora?host=/tmp   # or Supabase URL
SESSION_SECRET=local-dev-secret-change-me
LANGLY_API_KEY=46032e9f5ed673c792551b3363c44a7e2eb690120fd7a8761e5a1e9217e4eef5
PORT=5003
NODE_ENV=development
```

No Google OAuth vars needed (demo login only).

### 3.4 Run locally
```bash
npm run dev  # http://localhost:5003
```
Login via: `http://localhost:5003/api/login/demo`

---

## Phase 4: Testing Checklist (Before March 15)

### Replit + Supabase (Production)
- [ ] App starts with Supabase DATABASE_URL
- [ ] Replit OIDC login works
- [ ] Google OAuth login works
- [ ] Demo login creates user + seeds data
- [ ] Sessions persist across page refreshes
- [ ] CRUD: events, family members, medications, time entries, documents
- [ ] Family creation + invite code joining
- [ ] Langly API key auth (curl with X-API-Key header)
- [ ] Weekly summary email generation
- [ ] Page load times acceptable (Supabase adds ~20-50ms network latency)

### Local Development
- [ ] `npm install` succeeds
- [ ] `npm run dev` starts on port 5003
- [ ] Vite HMR works (edit React component, see hot reload)
- [ ] Demo login works at localhost:5003
- [ ] Demo data renders (calendar, members, medications)
- [ ] `npm run db:push` pushes schema changes
- [ ] `npm run check` (TypeScript) passes

### Data Integrity
- [ ] Row counts match between Replit dump and Supabase
- [ ] UUIDs generate correctly
- [ ] Timestamps stored correctly
- [ ] Array columns work (e.g., memberIds in events)

---

## Files Changed Summary

| File | Change |
|------|--------|
| `package.json` | Add `pg`, `@types/pg` |
| `server/storage.ts:3` | `drizzle-orm/neon-http` → `drizzle-orm/node-postgres` |
| `server/replitAuth.ts:31` | Add conditional SSL to session pool |
| `server/replitAuth.ts:38-42` | Environment-aware cookie secure/sameSite |
| `server/replitAuth.ts:69-120` | Guard OIDC setup with `process.env.REPL_ID` |
| `server/replitAuth.ts:177-191` | Guard OIDC routes with `process.env.REPL_ID` |
| `server/replitAuth.ts:377-384` | Guard OIDC refresh with `process.env.REPL_ID` |
| `.env` (Replit) | Update DATABASE_URL to Supabase pooler |
| `.env` (local) | Create with local PostgreSQL + PORT=5003 |

**Files NOT changed**: `shared/schema.ts`, `drizzle.config.ts`, `server/routes.ts`, `server/index.ts`, `vite.config.ts`, all `client/` code.
