# Errors & Issues

## Open

### `Date.now()` impure function in tools/[slug]/page.tsx:240
- **File:** `src/app/(store)/tools/[slug]/page.tsx`
- **Issue:** `new Date(Date.now() + selectedDays * 86400000)` — React 19+
  strict mode flags `Date.now()` as impure during render. The component
  recalculates this on every render, which can produce unstable results.
- **Fix:** Move the date arithmetic into an event handler or use a ref/state.
- **Priority:** Low (warning, not a crash, but may cause hydration issues)

### `require()` style imports in seed.js + Razorpay route
- **Files:** `prisma/seed.js:5-6`, `src/app/api/razorpay/create-order/route.ts:6`
- **Issue:** ESLint `@typescript-eslint/no-require-imports` — these files use
  `require()` instead of ES module `import`. seed.js is CommonJS (runs via
  Node), but the Razorpay route is an ESM file that uses `require` for
  `crypto`.
- **Fix:** For seed.js, either convert to ESM or disable the rule. For
  Razorpay route, use `import { randomBytes } from "crypto"` or `import
  crypto from "crypto"` instead of `require("crypto")`.
- **Priority:** Low

### 21 pre-existing ESLint unused-vars warnings
- **Scope:** 11 files across the project
- **Issue:** Various `'X' is defined but never used` warnings. Most are
  imports or variables left over from scaffolding/shadcn setup.
- **Fix:** Remove unused imports/variables file by file.
- **Priority:** Very low (cosmetic, doesn't affect build or runtime)

### Default locale is "kn" (should be "en" per ground rules)
- **Files:** `src/i18n/routing.ts:5`, `src/proxy.ts:8`,
  `prisma/schema.prisma:68` (`preferredLang` default)
- **Issue:** The product defaults to Kannada locale. Per architecture
  ground rules, default locale should be `"en"` (locale-neutral code,
  locale-specific display only).
- **Status:** Flagged as tech debt, not yet fixed.

## Fixed

### `@types/negotiator` missing — build failure in proxy.ts
- **File:** `src/proxy.ts:4`
- **Issue:** `import Negotiator from "negotiator"` had no type declarations.
  Build failed with `Could not find a declaration file for module 'negotiator'`.
- **Fix:** `npm install -D @types/negotiator` (done 2026-07-30)
- **Ref:** Changelog "2026-07-30 — Prisma client regenerate + `@types/negotiator`"

### Prisma Client type error after schema changes
- **File:** `src/app/api/auth/send-otp/route.ts:58`
- **Issue:** Type error: `'ip' does not exist in type ...` — `ip` field was
  added to `OtpRequest` model in schema.prisma but `prisma generate` had
  not been run.
- **Fix:** Ran `npx prisma generate` (done 2026-07-30)
- **Ref:** Changelog "2026-07-30 — Prisma client regenerate + `@types/negotiator`"
