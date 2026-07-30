# Changelog

## 2026-07-30 — OTP flow hardening: rate limiting + no auto-register on verify

**What:** Added `RateLimit` model to Prisma schema for sliding-window rate
limiting; added `ip` field + TTL index to `OtpRequest`; created
`src/lib/rate-limit.ts` utility; updated `send-otp` route (3/min per phone,
10/min per IP, dev-only console.log of OTP); updated `verify-otp` route
(10/min per IP, no longer auto-creates user — returns 404 if phone not in DB).

**Files touched:**
- `prisma/schema.prisma` — new `RateLimit` model, `ip` field on `OtpRequest`,
  TTL indexes on both
- `src/lib/rate-limit.ts` — created
- `src/app/api/auth/send-otp/route.ts` — rate limits + dev guard
- `src/app/api/auth/verify-otp/route.ts` — rate limits + no auto-register

**Why:** Prevent OTP brute-force/spam. The no-auto-register change aligns
verify-otp with a 2-step registration flow (register first, then verify).

## 2026-07-30 — Landing components: client → server conversion

**What:** Converted `hero.tsx`, `stats.tsx`, `testimonials.tsx` from `"use client"`
to server components, replacing all Framer Motion entrance animations with
CSS `@keyframes` classes. Moved interactive bits (stats counter, testimonial
scroll controls) into minimal client islands. Added 9 CSS animation utility
classes to `globals.css`.

**Files touched:**
- `src/components/landing/hero.tsx` — full rewrite: `getTranslations`, CSS animations
- `src/components/landing/stats.tsx` — full rewrite: `getTranslations`, CSS animations
- `src/components/landing/testimonials.tsx` — full rewrite: `getTranslations`, CSS animations
- `src/components/landing/animated-number.tsx` — created (client island for counter)
- `src/components/landing/testimonial-scroll.tsx` — created (client island for scroll)
- `src/app/globals.css` — added `@keyframes ent-fade-in-up`, `ent-fade-in`, `ent-bounce-y`
  with delay-staggered utility classes

**Why:** Reduce client JS bundle, improve page load speed, remove Framer Motion
dependency from server-rendered content sections.

## 2026-07-30 — Prisma client regenerate + `@types/negotiator`

**What:** Ran `npx prisma generate` to apply schema changes to the Prisma
Client types. Installed `@types/negotiator` to fix a pre-existing type error
in `src/proxy.ts`.

**Files touched:**
- `package.json`, `package-lock.json` — added `@types/negotiator` dev dep

**Why:** Build was failing after Prisma schema changes (missing `ip` field
in generated types) and a pre-existing missing-types error in proxy.ts.
