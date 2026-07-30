# To-Do

## In Progress

_(none)_

## Not Started

### Locale & region ground rules fixup
- [ ] Change `defaultLocale` from `"kn"` to `"en"` in:
  `src/i18n/routing.ts`, `src/proxy.ts`, `src/i18n/request.ts`
- [ ] Change `preferredLang String @default("kn")` to `@default("en")` in
  `prisma/schema.prisma`
- [ ] Make `formatPrice()` pull currency + number format from a locale/region
  config instead of hardcoded `"en-IN"` / `"INR"` (`src/lib/utils.ts`)

### Role system: add TOOL_OWNER + OPERATOR
- [ ] Add `TOOL_OWNER` and `OPERATOR` to `UserRole` enum in
  `prisma/schema.prisma`
- [ ] Handle role-based auth in proxy.ts (e.g. TOOL_OWNER dashboard routes)
- [ ] Add role-switch UI (a user can be both a FARMER and a TOOL_OWNER)

### featured-tools.tsx: hardcoded data → DB-driven
- [ ] Replace hardcoded `tools` array with a fetch from the DB
- [ ] Replace hardcoded Kannada title `"ಜನಪ್ರಿಯ ಸಾಧನಗಳು"` with i18n
  message key
- [ ] Category badges should use translated labels from i18n, not raw
  English enum strings

### Region/state tagging on DB models
- [ ] Add `region` / `state` field to Tool model (and possibly Booking)
  so pricing and availability can vary by region
- [ ] Add region-based filtering to tool listing API

### ESLint & purity issues
- [ ] Fix `Date.now()` impure function call in
  `src/app/(store)/tools/[slug]/page.tsx:240`
- [ ] Fix `require()` imports in `prisma/seed.js:5-6` and
  `src/app/api/razorpay/create-order/route.ts:6`
- [ ] Clean up 21 pre-existing unused-vars warnings

### Remaining landing polish
- [ ] Convert `featured-tools.tsx` from client → server (replace FM
  entrance with CSS, keep scroll/carousel as client island)
- [ ] Add scroll-triggered entrance animation to stats + testimonials
  (currently CSS animations fire on load, not on scroll-into-view)
- [ ] Convert `cta.tsx`, `how-it-works.tsx`, `trust-badges.tsx` from
  client → server if they are still `"use client"`

## Blocked

- **Prisma schema changes not applied to DB** — `RateLimit` model, `ip`
  field on `OtpRequest`, and TTL indexes are in `schema.prisma` and
  `prisma generate` has run, but `prisma db push` (or a migration) has
  not been executed against the database. Blocked on: available
  PostgreSQL database with `DATABASE_URL` set in `.env`.
