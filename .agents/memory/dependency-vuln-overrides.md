---
name: Dependency vulnerability overrides
description: How transitive security advisories are pinned and which moderates are intentionally left unfixed.
---

# Fixing audited dependency vulnerabilities

Transitive advisories are patched via an `overrides` block in `package.json` (forcing patched versions of fast-xml-parser, protobufjs, jws, lodash, minimatch, path-to-regexp, picomatch, rollup, qs, yaml, ip-address, brace-expansion, uuid, @protobufjs/utf8, @tootallnate/once).

**Why overrides, not range bumps:** these packages are not listed in `dependencies`; they are pulled in by Google client libs, express, vite, etc. `overrides` is the only way to pin them without forking the parent.

**How to apply / gotchas:**
- A package that IS a direct dependency must NOT go in `overrides` — npm errors `EOVERRIDE` ("conflicts with direct dependency"). Bump its range in `dependencies`/`devDependencies` instead (this is why ws and postcss are bumped directly, not overridden).
- `drizzle-orm` had to jump caret range `^0.39 → ^0.45` (a patched minor outside the old caret). drizzle-zod peer is just `>=0.36`, so it stays compatible.
- Run installs through the packager tool (`installLanguagePackages`), not `npm install` in bash (bash install is blocked).
- The project does NOT typecheck clean (`tsc` has many pre-existing errors in storage.ts/FamilySettings.tsx) — this is unrelated to deps. Build (`npm run build`) and dev (`tsx`) do not typecheck, so they pass regardless. Verify dep changes via `npm run build` + runtime, not `tsc`.

**Moderates intentionally left after this pass (no remaining critical/high):**
- `esbuild` 0.18.20 / 0.21.5 — dev-server-only advisory, pulled by deprecated @esbuild-kit/core-utils and vite 5; not in the production bundle. vite 5.4 pins esbuild `^0.21.3`, so forcing 0.25 risks breaking the dev server.
- `fast-xml-parser` — the remaining advisory needs major 5.x (XMLBuilder injection); we only consume it transitively for parsing, not building XML.
- `vite` — remaining path-traversal advisory needs major 6.x; vite config is repo-forbidden to modify, so a major bump is deferred.
