# To-Do

## In Progress

### Booking/asset model revision — Stage 1 (schema) done
- [x] Replace Booking's rigid `ownerId`/`operatorId` with `farmerId`,
      `toolId`, `toolOwnerId`, `servicePerformerId`, `serviceType`
      (`BookingServiceType` enum: `SELF_SERVICE_RENTAL`,
      `SELF_SERVICE_OWN_TOOL`, `OPERATOR_ONLY`, `OWNER_OPERATED`,
      `FULL_LOGISTICS`)
- [x] Add `ToolInstance` model (assetCode, tool type, ownerId, status,
      currentCustodianId) + `ToolInstanceStatus` enum
- [x] Replace exclusive `User.role` with per-capability profiles
      (`UserCapability`, `CapabilityType`, `VerificationStatus`) +
      `User.isAdmin` for staff
- [x] Applied to DB — `prisma db push --force-reset` + `prisma generate` +
      `prisma db seed` ran clean against `localhost:5432/obele`. DB
      currently holds 6 users, 7 capabilities, 3 tools, 8 instances,
      1 order, 1 booking (OB-2025-00001, TOOL_COLLECTED),
      1 handover log, 1 state log.

### Roadmap §19 step 3 — lifecycle wiring done, open decisions resolved
- [x] DB unblocked — `DATABASE_URL` matches the running Postgres 18 on
      `localhost:5432`; dev server boots; `GET /` → 200 with featured
      tools rendered from the DB.
- [x] Added `POST /api/rentals/[id]/transition` — actor-gated
      (`resolveActorForUser` pins non-admins to their booking role;
      admins may act on behalf of any party incl. `SYSTEM`), enforces
      `booking-state-machine.ts` via `assertTransition()`, writes a
      `BookingStateLog` row in the same transaction, returns permitted
      next targets. `GET` on the same route now returns stateLogs +
      `permittedTargets`.
- [x] Drove a `FULL_LOGISTICS` booking (Suresh/Raju/Santhosh) through the
      full §9 happy path via the API with real NextAuth session cookies —
      17 contiguous transitions (REQUESTED → COMPLETED), rejected attempts
      (farmer actor-guard → 400, stranger → 403, post-terminal → 400) write
      no log rows. Verified: 17 state-log rows, contiguous chain, final
      state COMPLETED. Drive-test data cleaned up afterwards (DB back to
      seed state), 24/24 checks passed.
- [x] **Confirmed business decisions (2026-08-11) — now hard-coded:**
      - **Cancellation/refund policy (§11):** same rule for every cancelling
        actor. Free (100% refund) until `OPERATOR_ASSIGNED`; after assignment
        but before `TOOL_COLLECTED` a flat ₹50 fee is withheld for the operator
        (travel/time compensation, NOT the platform); after `TOOL_COLLECTED` no
        refund. `FAILED_NO_OPERATOR` is always a full refund. Implemented as
        `computeCancellationPolicy()` in `booking-state-machine.ts`; the
        transition route applies it to the `Payment` row (`refundAmount` /
        `cancellationFee`, marks `REFUNDED` when > 0) and writes it into the
        state-log note. `Payment` gained `refundAmount` + `cancellationFee`
        columns (`prisma db push` applied).
      - **Self-operate mode:** no persisted `Booking.mode`. Derived from
        `serviceType` via `deriveModeFromServiceType()` — `SELF_SERVICE_RENTAL`,
        `SELF_SERVICE_OWN_TOOL`, `OWNER_OPERATED` → `SELF_OPERATE`; the rest →
        `WITH_OPERATOR`. The transition endpoint dropped the request `mode`
        param; `body.mode` is ignored.
      - **Operator reject routing:** operators may decline
        (`OPERATOR_ASSIGNED → OPERATOR_PENDING` by OPERATOR added). Rejection
        count is DERIVED from state logs (`countOperatorRejections`); on the
        3rd rejection the transition endpoint auto-routes to
        `FAILED_NO_OPERATOR` (as SYSTEM, logged) instead of writing another
        bounce. Payment refunded in full + farmer notified via
        `sendSmsNotification()` (MSG91 transactional template not configured —
        message logged + returned, never silently dropped).
      - **DISPUTED** stays terminal — no resolution logic (deferred; will be
        built after pilot data shows real disputes).
- [x] Verified end-to-end against live API (real NextAuth session cookies):
      18/18 rejection/auto-fail/refund checks + 6/6 ₹50-fee cancellation
      checks. Pure-policy unit checks 27/27. `tsc` clean, `eslint` clean
      (pre-existing warning only), `next build` 26/26. Drive-test rows cleaned
      up — DB back to canonical seed state (6 users / 1 booking / 1 order /
      1 payment / 1 state log).

## Not Started

### Booking/asset model revision — Stage 2 (follow-ups from Stage 1)
- [ ] Remove `Tool.availableCount` + `Tool.totalCount`; make tool
      availability a DERIVED count of `ToolInstance` rows by status
- [ ] Wire checkout/cart so `create-order` resolves the real `toolOwnerId`,
      `servicePerformerId`, `serviceType` (currently placeholder farmer
      values) instead of guessing at payment time
- [ ] Link bookings to specific `ToolInstance`(s) for the QR/asset-scanning
      and custody-chain stages (seed already creates instances; checkout
      currently leaves `toolInstanceId` unset)
- [ ] Derived-availability query/aggregation endpoint used by store API

### Locale & region ground rules fixup
- [ ] Change `defaultLocale` from `"kn"` to `"en"` in:
  `src/i18n/routing.ts`, `src/proxy.ts`, `src/i18n/request.ts`
- [ ] Change `preferredLang String @default("kn")` to `@default("en")` in
  `prisma/schema.prisma`
- [ ] Make `formatPrice()` pull currency + number format from a locale/region
  config instead of hardcoded `"en-IN"` / `"INR"` (`src/lib/utils.ts`)

### Role system: capability-profile UX (schema done in Stage 1)
- [ ] Add role/capability-switch UI (a user can hold FARMER + TOOL_OWNER +
      OPERATOR simultaneously via `UserCapability`)
- [ ] Handle capability-based auth in proxy.ts (e.g. TOOL_OWNER dashboard
      routes gate on `UserCapability` instead of `isAdmin`)
- [ ] Per-capability verification flows (KYC per profile, not per user)

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

- **None currently.** Prisma schema is applied; the §9 state-machine (incl. the
  confirmed cancellation/fee/self-operate/auto-fail rules from 2026-08-11),
  booking/asset model, and OTP hardening are all live on
  `localhost:5432/obele`. Next action: wire the Store checkout (Stage 2) so
  `create-order` resolves real `toolOwnerId` / `servicePerformerId` /
  `serviceType` and links a `ToolInstance` instead of placeholder farmer
  values — then the confirmed refund/fee rules run against real data.
