---
name: Dependency vulnerability overrides
description: How transitive security advisories are pinned and which moderates are intentionally left unfixed.
---

# Fixing audited dependency vulnerabilities

Transitive advisories are patched via an `overrides` block in `package.json` (forcing patched versions of esbuild, fast-xml-parser, protobufjs, jws, lodash, minimatch, path-to-regexp, picomatch, rollup, qs, yaml, ip-address, brace-expansion, uuid, @protobufjs/utf8, @tootallnate/once).

**Why overrides, not range bumps:** these packages are not listed in `dependencies`; they are pulled in by Google client libs, express, vite, etc. `overrides` is the only way to pin them without forking the parent.

**How to apply / gotchas:**
- A package that IS a direct dependency normally can't go in `overrides` (npm errors `EOVERRIDE`). EXCEPTION: use the self-reference value `"esbuild": "$esbuild"` to force every transitive copy to match the direct dep's own range — this is how all nested esbuild (the deprecated @esbuild-kit chain + vite) is pinned to the direct devDep `esbuild ^0.25.0` without EOVERRIDE. For deps NOT also direct (ws, postcss), bump the range directly instead.
- `drizzle-orm` had to jump caret range `^0.39 → ^0.45` (a patched minor outside the old caret). drizzle-zod peer is just `>=0.36`, so it stays compatible.
- Run installs through the packager tool (`installLanguagePackages`), not `npm install` in bash (bash install is blocked). Editing only `overrides` still needs a reinstall to regenerate the lockfile — installing any one package triggers full re-resolution that honors the new overrides.
- The project does NOT typecheck clean (`tsc` has many pre-existing errors in storage.ts/FamilySettings.tsx) — this is unrelated to deps. Build (`npm run build`) and dev (`tsx`) do not typecheck, so they pass regardless. Verify dep changes via `npm run build` + runtime, not `tsc`.

**All criticals/highs AND moderates now cleared. How the last 4 moderates were closed:**
- `esbuild` (was 0.18.20 via @esbuild-kit, 0.21.5 via vite 5) — forced to single 0.25.x via `"esbuild": "$esbuild"` override. The deprecated @esbuild-kit/core-utils + esm-loader packages (pulled by drizzle-kit) are still installed but no longer carry their own old esbuild.
- `vite` 5 → 6 (path-traversal advisory). vite 6 only uses standard APIs already in vite.config.ts/server/vite.ts (defineConfig, createServer, createLogger, transformIndexHtml, middlewareMode, hmr, allowedHosts, server.fs.deny) — no forbidden-file edits needed. Build + dev server verified.
- `fast-xml-parser` `^4` → `^5.7.0` override (XMLBuilder injection). @google-cloud/storage's transfer-manager uses `XMLParser`/`XMLBuilder` — both still work under v5 (verified parse output). NOTE: v5 `exports` blocks `require('fast-xml-parser/package.json')`, but nothing in the app does that.
