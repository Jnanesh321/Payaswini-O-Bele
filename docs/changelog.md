# Changelog

## 2026-08-11 — Change 2 rolled back: refundable deposit + upfront payment restored

**What:** The user decided Change 2 (collect-on-completion payment, deposits
swept from the booking grip) was a regression and asked to restore the
pre-Change-2 refundable-deposit + upfront-payment flow while keeping all the
owner-accept work built on top of it.

- **Deposit system restored (from `cac8eb5`):** `Tool.deposit`,
  `Booking.deposit`, `Payment.depositFrozen/depositDeducted/depositRefunded` +
  `disputeLocked`. Seed deposits ₹2,000 / ₹1,000 / ₹5,000. Checkout shows the
  refundable-deposit line and the full upfront amount is charged via Razorpay;
  `create-order` creates a real Razorpay order with the deposit included and
  `depositFrozen: true`; `verify` captures payment and moves the booking to
  `OWNER_PENDING`.
- **Change 2 only additions removed:** `Payment.manualCaptured`; the
  `RETURNING_TOOL` payment gate in the transition route; the
  `collect/[bookingId]` and `payments/[bookingId]/cash` endpoints; the operator
  Work-Completed pay screen (`operator/work/[bookingId]`).
- **Kept (owner work on top):** the owner Requests/Earnings/Profile/My-Equipment
  screens + API routes, `owner-sla.ts`, and the transition route's explicit
  owner-accept `operatorMode` (assign_operator | self_service) with the
  self-service financial conversion. The now-stale SMS wording
  ("payment collected on work completion") was corrected since payment is
  collected upfront.
- **Owner Earnings semantic fix:** `settled` now means `status === COMPLETED`
  only (payment is captured upfront, so `CAPTURED` no longer implies the money
  is the owner's). Owner ledger and profile `lifetimeEarnings` sum
  `totalToolFee` (owner share), never the full payment amount.

**Verification:** `npx tsc --noEmit` clean; `prisma db push` + `prisma generate`
applied; build checked after restore.

## 2026-08-11 — Change 1: certified-tool scenario selection (self-operate vs operator)

**What:** The tool detail page now lets the farmer choose how to operate a tool
that requires a certified operator, and the booking's `serviceType` is set from
that choice instead of being silently defaulted to self-service.

- **Schema:** `Tool` gained `requiresCertifiedOperator Boolean @default(false)`
  and `operatorFeePerDay Int @default(0)` (paise). New `SelfOperatePermission`
  model (`farmerId` ↔ `toolOwnerId`, `VerificationStatus`) records a Tool
  Owner's verified grant that lets a specific farmer self-operate their
  certified tools. `prisma db push` + `prisma generate` applied.
- **Seed:** carbon-fibre pole + power tiller are certified (₹200/day and
  ₹350/day operator fees); sprayer is not. One verified grant seeded:
  Raju Gowda (Tool Owner) → Suresh Shetty (Farmer).
- **`GET /api/tools/[slug]`** now resolves the listing owner from the tool's
  `ToolInstance`s and, for authenticated requests, returns `canSelfOperate`
  (true only when a VERIFIED `SelfOperatePermission` exists with that owner).
- **Tool detail page** (`src/app/(store)/tools/[slug]/page.tsx`): for certified
  tools a scenario selector is shown — "Self-Operate" (only when
  `canSelfOperate`, else hidden) vs "Request Operator" (adds the operator fee
  to the estimate). Non-certified tools skip the step (self-operate only). The
  chosen scenario drives `serviceType` (`SELF_SERVICE_RENTAL` /
  `OPERATOR_ONLY`) which is carried through the cart.
- **`CartItem` + cart store:** items now carry `serviceType`, `toolOwnerId`,
  `operatorFeePerDay`, `totalOperatorFee`; `getTotalOperatorFee()` added and
  `getGrandTotal()` includes it. Cart + checkout show an Operator Fee line.
- **`POST /api/razorpay/create-order`:** resolves the REAL `toolOwnerId`
  server-side from the tool's instances (never trusts a client-supplied owner),
  writes the item's `serviceType` and operator-fee breakdown onto the booking,
  and the `require()` import was converted to an ESM import (pre-existing
  eslint todo item cleared).

**Verification:**
- `npx tsc --noEmit` clean; `eslint` clean on touched files (only pre-existing
  unused-vars warnings); `next build` 26/26.
- Drive-test with a real Suresh Shetty session (OTP flow → NextAuth callback):
  - Power Tiller + Pole (certified, owner Raju): API returns
    `requiresCertifiedOperator=true`, `canSelfOperate=true`.
  - Sprayer (non-certified, owner Parameshwara): `canSelfOperate=false`,
    `requiresCertifiedOperator=false`.
  - `OPERATOR_ONLY` booking: `toolOwnerId` = Raju Gowda (real), 
    `operatorFeePerDay` = ₹200, `totalOperatorFee` = ₹200, subtotal = ₹499,
    total = ₹2,499 (incl. ₹2,000 deposit). Test rows cleaned up.
  - `SELF_SERVICE_RENTAL` booking (sprayer): owner Parameshwara, no operator
    fee. Test rows cleaned up.
- Mode derivation unchanged: `OPERATOR_ONLY → WITH_OPERATOR`,
  `SELF_SERVICE_RENTAL → SELF_OPERATE` (no persisted mode field).

**Follow-ups:** operator self-operate permission grant UI (tool-owner side);
real `servicePerformerId` at order time (operator not yet assigned — currently
placeholder farmer, unchanged Stage-2 item).

## 2026-08-11 — §11 cancellation policy, self-operate mode, operator auto-fail hard-coded

**What:** Resolved the four flagged §19 step-3 business decisions and hard-coded
them. All four were confirmed by the user in-session (2026-08-11).

- **Cancellation/refund policy (§11) — `computeCancellationPolicy()`** in
  `src/lib/booking-state-machine.ts`. Same rule for every cancelling actor:
  free (100% refund) until `OPERATOR_ASSIGNED`; flat ₹50 operator fee after
  assignment but before `TOOL_COLLECTED` (travel/time compensation, NOT the
  platform); no refund after `TOOL_COLLECTED`. `FAILED_NO_OPERATOR` always
  refunds in full. Added `isTerminalCancellation()` helper.
- **Mode derived from `serviceType` — `deriveModeFromServiceType()`.** No
  persisted `Booking.mode` field (no second source of truth):
  `SELF_SERVICE_RENTAL` / `SELF_SERVICE_OWN_TOOL` / `OWNER_OPERATED` →
  `SELF_OPERATE`; `OPERATOR_ONLY` / `FULL_LOGISTICS` → `WITH_OPERATOR`. The
  transition endpoint now derives mode from the booking's `serviceType`; the
  per-request `body.mode` override was removed.
- **Operator reject auto-fail — N=3, full refund, farmer SMS.** Operators can
  now decline an assignment (`OPERATOR_ASSIGNED → OPERATOR_PENDING` edge gained
  the OPERATOR actor). Rejection count is DERIVED from state logs
  (`countOperatorRejections()` counts `OPERATOR_ASSIGNED→OPERATOR_PENDING`
  bounces). On the Nth rejection the transition endpoint auto-routes to
  `FAILED_NO_OPERATOR` (performed as SYSTEM, logged with a policy note), refunds
  the booking in full, and calls the new `sendSmsNotification()` in `sms.ts`
  (MSG91 transactional template `MSG91_TRANSACTIONAL_TEMPLATE_ID` not configured
  → message logged + returned, never silently dropped).
- **`Payment` schema:** added `refundAmount Int @default(0)` and
  `cancellationFee Int @default(0)` (paise). The transition route applies the
  computed policy to the booking's `Payment` row (marks `REFUNDED` when
  refund > 0) inside the same transaction as the status update and state log.
- **DISPUTED** stays terminal (deferred resolution — to be built after pilot
  data shows what real disputes look like).

**Verification:**
- Pure-policy unit checks: 27/27 (`deriveModeFromServiceType`,
  `computeCancellationPolicy`, `countOperatorRejections`, edge reachability).
- End-to-end drive test via the live API with real NextAuth JWE session
  cookies: 18/18 — 3rd operator rejection auto-fails to `FAILED_NO_OPERATOR`
  (actor SYSTEM), full refund lands on the `Payment` row, farmer notification
  returned, audit logs correct (2 bounces + 1 auto-fail), stranger → 403,
  non-operator farmer → 400, `SELF_SERVICE` booking derives `SELF_OPERATE`
  (allows `OWNER_ACCEPTED → TOOL_COLLECTED`).
- ₹50-fee cancellation path: 6/6 — farmer cancels at `OPERATOR_ACCEPTED` →
  policy `OPERATOR_COMPENSATION`, refund = total − ₹50, operator fee ₹50,
  persisted on the `Payment` row.
- `npx tsc --noEmit` clean; `npx eslint` clean (one pre-existing warning in
  `api/rentals/route.ts`); `next build` 26/26 routes. Drive-test rows cleaned
  up; DB back to canonical seed state (6 users / 1 booking / 1 order /
  1 payment / 1 state log).

**Resolved follow-up (2026-08-11):** seed phones normalized to digits-only
(`prisma/seed.js` no longer stores `+91`), matching the NextAuth phone provider
and register/OTP flows which already strip to digits-only. Re-seeded and verified
end-to-end on a live dev server: send-otp → verify-otp → NextAuth `phone`
credentials callback issued a session cookie, `/api/auth/session` returned the
seeded user (Suresh Shetty), and an authenticated `/api/rentals` probe returned
200 with his data. Both raw `919845100002` and `+91 98451 00002` inputs converge
to the same user. Remaining `+91` occurrences are UI placeholders / static
landing cards only (never persisted).

## 2026-08-10 — DB unblocked; §19 step 3 lifecycle wired end-to-end

**What:** Resolved the long-standing `DATABASE_URL` blocker and completed
roadmap §19 step 3 (one booking through the whole lifecycle).

- **DB:** `.env` now targets the running Postgres 18 cluster on
  `localhost:5432/obele`. Ran `prisma db push --force-reset` (old
  mid-migration schema was ahead of the DB — 4 users, 6 tools, 64 instances,
  no `orders`/`handover_logs`), `prisma generate`, and `prisma db seed`.
  Seeded: 6 users (multi-capability), 7 capabilities, 3 tools, 8 physical
  `ToolInstance`s, 1 order, 1 booking (OB-2025-00001, SELF_SERVICE_RENTAL,
  TOOL_COLLECTED), 1 handover log, 1 state log — all matching Stage-1 schema.
- **New endpoint:** `POST /api/rentals/[id]/transition` (`src/app/api/
  rentals/[id]/transition/route.ts`) — the manual wiring tool for §19 step 3.
  Resolves the caller's actor role (`resolveActorForUser`: FARMER/TOOL_OWNER/
  OPERATOR from the booking's farmerId/toolOwnerId/servicePerformerId; admins
  may act on behalf of any party including SYSTEM), enforces the state machine
  via `assertTransition()` from `src/lib/booking-state-machine.ts`, and writes
  a `BookingStateLog` row transactionally with the booking status update.
  Returns the updated booking, the log row, and permitted next targets.
  Invalid transitions → 400 with permitted targets; non-parties → 403.
  `GET /api/rentals/[id]` now also returns `stateLogs` + `permittedTargets`.
- **Verification:** Drove a fresh `FULL_LOGISTICS` booking (farmer Suresh,
  owner Raju, operator Santhosh) through the entire §9 happy path via the API
  using real NextAuth JWE session cookies for each actor — 17 contiguous
  transitions `REQUESTED → COMPLETED`. Negative checks passed: farmer acting
  as TOOL_OWNER → 400, stranger → 403, post-terminal transition → 400; rejected
  attempts write no log rows. Audit trail verified: 17 `BookingStateLog` rows,
  fully contiguous chain, final state `COMPLETED` by SYSTEM. 24/24 checks
  passed; drive-test rows cleaned up afterwards (DB back to canonical seed
  state). `npx tsc --noEmit` clean; `next build` 26/26; `GET /` → 200 with
  featured tools rendered from the live DB (no offline fallback).

## 2026-08-10 — LeafDivider component (coconut-frond section divider)

**What:** Added `src/components/ui/leaf-divider.tsx` and exported it from the
`components/ui` barrel. Recreates the Figma reference's `LeafDivider` — an
inline `<svg>` (viewBox `0 0 390 20`, `preserveAspectRatio="xMidYMid slice"`)
with a repeating `<pattern>` (28×20 unit, `userSpaceOnUse`) drawing a thin
stem + three pairs of quadratic "coconut-frond" leaf curves. Colors use the
`bele-*` tokens: leaves `stroke-bele-green/[0.3–0.35]`, centre hairline
`stroke-bele-border-brown` (0.6px). The SVG pattern `id` is namespaced with
`useId()` so the divider can be rendered multiple times per page without
collisions. Server-safe (no `"use client"`).

**Used on:** landing page (`src/app/page.tsx`) — three dividers
(`max-w-2xl mx-auto`) between Stats/FeaturedTools, FeaturedTools/HowItWorks,
and ToolOperators/Testimonials.

**Verification:** `tsc` clean; `next build` 26/26; dev `GET /` serves the
divider (6 SVG instances in HTML, DB-offline fallback still isolating the
featured-tools warning).

## 2026-08-10 — Unblocked `next build` (cart/page.tsx JSX fix + build gating)

**What:** Fixed the pre-existing JSX syntax errors in
`src/app/(store)/cart/page.tsx` — a spurious `</div>` at line 107 was
prematurely closing the `space-y-3` order-summary container (the Grand Total
`border-t` block is nested inside it). Removed the extra close tag and aligned
the Total Deposit span indentation. `npx tsc --noEmit` is now fully clean and
`next build` succeeds (all 26 routes `ƒ` dynamic).

**Also fixed while unblocking the build:**
- `tsconfig.json` — added `"Figma"` to `exclude`. The root tsconfig's
  `**/*.ts(x)` include was pulling in the Figma Make reference export (a
  self-contained Vite project with its own `tsconfig.json`), which failed
  Next's build-time type check.
- `src/app/page.tsx` — the Prisma `select` returns `translations: JsonValue`
  which isn't assignable to `FeaturedTool.translations: ToolTranslations`.
  Mapped rows with an explicit cast via a new `getFeaturedTools()` helper.
- `src/app/page.tsx` — wrapped the featured-tools DB query in try/catch with a
  graceful fallback (renders the homepage without the carousel when the DB is
  unreachable). Requires the still-blocked `DATABASE_URL`; the homepage now
  returns HTTP 200 in dev instead of a 500 `PrismaClientInitializationError`.

**Verification:** `next build` ✔ (Turbopack, compiled in 53s, TS clean in
21.5s, 26/26 pages). Dev server boots "Ready in ~4.4s"; `GET /` → 200 with
~138KB payload; DB-offline warning logged once per render via the try/catch.

## 2026-08-10 — Theme tokens aligned to Figma Make reference

**What:** Applied the proposed diff from the Figma reference extraction.
`globals.css` semantic tokens updated to the Figma palette (foreground
`#1C1208`, card → white `#FFFFFF`, muted `#F3EDE0` /
`muted-foreground` `#7A6048`, border blend `#D5D9C9`, destructive `#C0392B`,
success/warning mapped), extended `bele-*` brand family with the full set
(green-dark/light/muted, soil-muted, gold-light/muted/text, cream-muted,
text-mid/muted, border-brown, red/red-muted, teal/teal-muted), added
`--font-heading` + `--radius-2xl` (1.125rem) / `--radius-3xl` (1.25rem).
`layout.tsx` now loads **Nunito** as `--font-sans` (body) and **Lora** as
`--font-heading` via `next/font/google` (was Geist/Inter). `font-heading` and
`rounded-2xl/3xl` utilities are available for rollout (step 3). Dark-mode and
sidebar tokens intentionally untouched.

## 2026-08-10 — Booking/asset model revision, Stage 1 (schema)

**What:** Reworked the booking grip and added physical-asset tracking based
on the five real service scenarios (owner operates own tool; operator with
farmer's own tool; full 3-party; farmer rents and self-operates; farmer owns
and operates).

- **Booking:** replaced rigid `ownerId`/`operatorId` with `farmerId` (always
  set), `toolId`, `toolOwnerId` (owner of the physical tool — may equal
  `farmerId`), `servicePerformerId` (who does the work — may equal `farmerId`
  or `toolOwnerId`), and `serviceType` from a new `BookingServiceType` enum:
  `SELF_SERVICE_RENTAL`, `SELF_SERVICE_OWN_TOOL`, `OPERATOR_ONLY`,
  `OWNER_OPERATED`, `FULL_LOGISTICS`. Relations renamed to
  `farmer`/`toolOwner`/`servicePerformer`; user-side fields renamed to
  `bookings`/`toolOwnerBookings`/`performedBookings`.
- **ToolInstance:** new model for individual physical assets — `assetCode`
  (unique), belongs to a `Tool` type, `ownerId`, `status` from
  `ToolInstanceStatus` (`AVAILABLE`, `MAINTENANCE`, `RESERVED`, `HANDED_OVER`,
  `IN_USE`, `RETURNED`, `INSPECTION`, `LOST`, `DAMAGED`, `RETIRED`), nullable
  `currentCustodianId`. Tool availability is henceforth a DERIVED count of
  instances by status — `Tool.availableCount`/`Tool.totalCount` are marked
  deprecated (inline schema comments) and flagged for removal in Stage 2.
- **Roles:** removed the single-exclusive `User.role` field; added
  `UserCapability` (one row per `CapabilityType` — `FARMER`/`TOOL_OWNER`/
  `OPERATOR` — each with its own `VerificationStatus`). Platform staff are now
  flagged via `User.isAdmin`. NextAuth session/JWT carry `isAdmin` instead of
  `role`; proxy.ts admin guard updated.
- **Code:** `auth.ts`, `proxy.ts`, `types/index.ts`, `verify-otp` updated to
  the isAdmin/capability model; `rentals` routes use `farmerId`/`farmer`;
  `create-order` booking creation fixed to a valid `BookingStatus` and the new
  required fields (owner/performer/serviceType currently placeholder farmer
  values — checkout wiring is a Stage-2 follow-up); `razorpay/verify` now moves
  bookings to `OWNER_PENDING` instead of the removed `CONFIRMED`.
- **Seed:** users no longer set `role`; capabilities seeded (Raju = FARMER +
  TOOL_OWNER); physical `ToolInstance` rows created per tool (owner Raju);
  sample booking updated to `SELF_SERVICE_RENTAL` with Suresh as farmer.

**Ops note (DB):** `toolOwnerId`, `servicePerformerId`, `serviceType`,
`farmerId` all become required — an existing DB with bookings needs a backfill
on `prisma db push`/migrate. Still blocked on `DATABASE_URL` (see todo.md).

## 2026-08-09 — Booking owner/operator grip + actorId relation (§19 step 3 prep)

**What:** Added `ownerId String` and `operatorId String?` (nullable until
assignment) to `Booking`, with named relations to `User`
(`@relation("BookingFarmer"|"BookingOwner"|"BookingOperator")` on the existing
farmer link and the two new ones). Added a real `User` relation on
`BookingStateLog.actorId` (`@relation("BookingStateLogActor")`) so audit-log
actor ids are referentially consistent. `prisma generate` re-ran; typecheck
clean for all touched code (only the pre-existing `cart/page.tsx` errors
remain).

**Files touched:**
- `prisma/schema.prisma` — Booking `ownerId`/`operatorId` + named relations;
  User `ownedBookings`/`operatorBookings`/`stateLogsTriggered`;
  BookingStateLog `actorUser` relation
- `docs/todo.md` — step-3 prep updated

**Ops note:** adding required `ownerId` will need a backfill/default when the
schema is first pushed against a DB that already contains bookings.

## 2026-08-09 — Roadmap §19 step 2: booking state-machine skeleton (§9)

**What:** Replaced the legacy `BookingStatus` enum (`PENDING`/`CONFIRMED`/
`ACTIVE`/`RETURNED`/`CANCELLED`/`OVERDUE`) with the §9 lifecycle states:
`REQUESTED` … `COMPLETED` plus cancellations (`CANCELLED_BY_FARMER`,
`CANCELLED_BY_OWNER`, `CANCELLED_BY_OPERATOR`, `CANCELLED_BY_PLATFORM`),
`FAILED_NO_OPERATOR`, `DISPUTED`. Added `BookingEventActor` enum and a
`BookingStateLog` audit-trail model (actor, actorId, fromState, toState,
timestamp) per §9/§14. Created `src/lib/booking-state-machine.ts` with an
actor-gated transition table and `assertTransition()`/`canTransition()`/
`getPermittedTargets()`; no payment capture, notifications, or UI in this step.

**Files touched:**
- `prisma/schema.prisma` — `BookingStatus` enum replaced, `BookingEventActor`
  added, `Booking.status` default now `REQUESTED`, new `BookingStateLog`
  model + `Booking.stateLogs` relation
- `src/lib/booking-state-machine.ts` — created

**Why:** Roadmap step 2 — get the states and audit log right before any UI.
`prisma generate` re-ran; schema not yet pushed to the DB (blocked on
`DATABASE_URL` — see todo.md).

**Open business decisions flagged (not guessed — schema/function kept flexible):**
- Cancellation windows per actor (who may cancel from which states, §11 rules
  table not finalized) — transition table uses conservative choices; adjust.
- Self-operate (§20): only edge added is `OWNER_ACCEPTED → TOOL_COLLECTED`
  under `mode: SELF_OPERATE` in the transition function; booking record does not
  yet carry an owner/operator grip for the self-operate grant check.
- Operator reject currently routes to `OPERATOR_PENDING` (admin reassigns per
  §7); no live `FAILED_NO_OPERATOR` until admin declares exhaustion.
- `DISPUTED` is terminal for now — §11 refund/penalty rules not implemented.
- Booking carries no `ownerId`/`operatorId` yet; required at §19 step 3.

## 2026-07-30 — Default locale changed from "kn" to "en"

**What:** Changed `defaultLocale` from `"kn"` to `"en"` in three places to
align with locale-neutral architecture ground rules. Reported hardcoded
Kannada title in `featured-tools.tsx` (uses raw string instead of the
existing `featuredTools.title` i18n key).

**Files touched:**
- `src/i18n/routing.ts:5` — `defaultLocale: "en"`
- `src/proxy.ts:8` — `const defaultLocale = "en"`
- `prisma/schema.prisma:68` — `preferredLang @default("en")`

**Why:** Default locale should be English; Kannada (or any region) should
be an explicit user preference or Accept-Language negotiation, not the
framework default.

## 2026-07-30 — Fixed README.md regional framing to national-scale

**What:** Changed tagline from "Dakshina Karnataka, India" to "across India.
Launches from the Kasaragod region — built national from day one." Checked
AGENTS.md and CLAUDE.md — neither has regional framing.

**Files touched:**
- `README.md` — line 3 tagline rewrite

**Why:** Align repo identity with the national-scale product strategy.

## 2026-07-30 — Confirmed proxy.ts (not middleware.ts) is correct for Next.js 16

**What:** Confirmed `src/proxy.ts` exists as the Next.js 16 middleware file
(middleware.ts was renamed to proxy.ts in v16). Reported route protections:
`/admin/*` requires ADMIN role, `/dashboard|/checkout|/orders` require any
auth. Kept proxy.ts as-is per user decision.

**Files touched:** None (investigation only)

**Why:** Standard housekeeping to align with Next.js 16 conventions.

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

## 2026-07-30 — Language toggle + i18n bug fixes: request.ts, tool translations, locale-aware display

**What:** Fixed the root cause of the inverted language toggle (request.ts was reading
`requestLocale` from next-intl which returns `undefined` without next-intl middleware).
Changed to read `X-NEXT-INTL-LOCALE` header set by proxy.ts via `headers()` from
`next/headers`. LanguageSwitcher now uses `window.location.reload()` instead of
`router.refresh()` for guaranteed middleware re-run.

Replaced `nameKn`/`descriptionKn` with `translations Json?` on Tool model (schema + seed).
Added `getLocaleName(tool, locale)` and `getLocaleDescription(tool, locale)` helpers in
`src/lib/utils.ts`. Updated `ToolCard` and `CartItem` types.

Updated all consumer files to use locale-aware display:
- `tool-card.tsx`, `tools/[slug]/page.tsx`, `cart/page.tsx` — use `getLocaleName`
- `featured-tools.tsx` — reads from DB (via page.tsx), uses locale-aware names
- `how-it-works.tsx` — locale-aware step labels + title/cta from i18n
- `tool-operators.tsx` — locale-aware operator names + section title/subtitle from i18n
- `sort-bar.tsx` — placeholder + sort options + results count from i18n
- `tools/page.tsx` — title/subtitle from server-side `getTranslations`
- `filter-sidebar.tsx` — removed dead `nameKn` from Category interface
- `api/tools/route.ts` — removed `nameKn` from search OR
- Added `toolOperators` namespace to `en.json` and `kn.json`

**Files touched:**
- `src/i18n/request.ts` — reads `X-NEXT-INTL-LOCALE` header via `headers()`
- `src/components/layout/language-switcher.tsx` — `window.location.reload()` on switch
- `prisma/schema.prisma` — `nameKn`/`descriptionKn` → `translations Json?`
- `prisma/seed.js` — all tool entries use `translations: { kn: { ... } }`
- `src/lib/utils.ts` — added `getLocaleName()`, `getLocaleDescription()`, `ToolTranslations`
- `src/types/index.ts` — `ToolCard`/`CartItem` updated
- `src/components/tools/tool-card.tsx` — locale-aware name display
- `src/app/(store)/tools/[slug]/page.tsx` — locale-aware name/description
- `src/app/(store)/cart/page.tsx` — locale-aware item names
- `src/components/landing/featured-tools.tsx` — DB-driven, locale-aware names
- `src/app/page.tsx` — fetches featured tools from DB
- `src/components/landing/how-it-works.tsx` — locale-aware step labels + i18n title/cta
- `src/components/landing/tool-operators.tsx` — locale-aware names + i18n title/subtitle
- `src/components/tools/sort-bar.tsx` — i18n placeholder, sort options, results
- `src/app/(store)/tools/page.tsx` — server-side i18n title/subtitle
- `src/components/tools/filter-sidebar.tsx` — removed `nameKn` from type
- `src/app/api/tools/route.ts` — removed `nameKn` from search OR
- `src/i18n/messages/en.json` — added `toolOperators` namespace
- `src/i18n/messages/kn.json` — added `toolOperators` namespace

**Why:** Language toggle was effectively non-functional (switching locale only
changed the React tree, not the middleware-driven cookie). Tool names/descriptions
always displayed in Kannada regardless of locale setting. Both issues violated the
locale-neutral architecture rule.
