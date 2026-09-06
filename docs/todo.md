# To-Do

## In Progress

### Change 2 rolled back — refundable deposit + upfront payment restored (2026-08-11)
- [x] Restored `Tool.deposit`, `Booking.deposit`,
      `Payment.depositFrozen/depositDeducted/depositRefunded/disputeLocked`
      (removed `Payment.manualCaptured`); `prisma db push` + `generate` applied
- [x] Restored upfront Razorpay flow: checkout deposit line, `create-order`
      (real Razorpay order incl. deposit, `depositFrozen: true`), `verify`
      (captures payment + booking → `OWNER_PENDING`)
- [x] Removed Change 2 only additions: `RETURNING_TOOL` payment gate in the
      transition route, `collect/[bookingId]`, `payments/[bookingId]/cash`,
      operator Work-Completed pay screen
- [x] Kept owner work: owner screens/APIs, `owner-sla.ts`, explicit owner-accept
      `operatorMode` (assign_operator | self_service) with self-service
      financial conversion; corrected stale SMS wording
- [x] Owner Earnings: `settled` = `COMPLETED` only; owner ledger + profile
      `lifetimeEarnings` sum `totalToolFee` (owner share)
- [x] Deposit refund execution at inspection/return (Razorpay refund API +
      marking `depositRefunded`/`depositDeducted`/`disputeLocked`) — done
      2026-08-12: `POST /api/rentals/[id]/deposit-resolution`
      (FULL_REFUND / PARTIAL_DEDUCTION / HOLD), idempotent atomic claim,
      `COMPLETED` gated on deposit resolution, `DISPUTED` sets
      `disputeLocked`, `Payment.depositRefundId` recorded

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
- [x] Wire checkout/cart so `create-order` resolves the real `toolOwnerId` and
      `serviceType` (done in Change 1 — 2026-08-11: server-side owner resolution
      from `ToolInstance`, `serviceType` carried from the tool-page scenario
      selector).
- [x] Make tool availability a DERIVED count of `ToolInstance` rows by status
      in `listTools` and `getToolBySlug` (zero duplicate counter state)
- [x] Link bookings to specific `ToolInstance`(s) for QR/asset-scanning
      and custody-chain stages with `HandoverLog` tracking during physical pickup
      (`TOOL_COLLECTED`), work (`WORK_STARTED`), return (`TOOL_RETURNED`), and
      completion/cancellation release
- [x] Derived-availability queries integrated across store APIs and listing views

### Change 1 — certified-tool scenario selection (self-operate vs operator)
- [x] `Tool.requiresCertifiedOperator` + `Tool.operatorFeePerDay` (paise)
- [x] `SelfOperatePermission` model (farmerId ↔ toolOwnerId, VERIFIED unlocks
      self-operate) + `prisma db push` + seed (Raju → Suresh, VERIFIED)
- [x] `GET /api/tools/[slug]` resolves listing owner + `canSelfOperate`
      (session-aware)
- [x] Tool detail page: scenario selector shown only when the tool requires a
      certified operator; self-operate hidden without a VERIFIED permission;
      operator fee added to the estimate; selected `serviceType`
      (`SELF_SERVICE_RENTAL` vs `OPERATOR_ONLY`) carried through the cart
- [x] `create-order` uses item `serviceType` + real `toolOwnerId` (resolved
      from instances, never client-supplied) and fills the operator fee fields
- [x] Verified end-to-end (Suresh session): tiller/pole → `OPERATOR_ONLY`
      booking with Raju as owner + ₹200/day operator fee; sprayer →
      `SELF_SERVICE_RENTAL` with Parameshwara as owner, no operator fee. Test
      rows cleaned up after each drive.
- [x] Follow-up: operator self-operate permission grant UI (tool owner side) —
      done 2026-08-30: `/owner/permissions` UI + API routes (`/api/owner/permissions`,
      `/api/owner/farmers/lookup`) + `listOwnerPermissions`/`grantOwnerPermission`/`revokeOwnerPermission` services.


### Locale & region ground rules fixup
- [x] Change `defaultLocale` from `"kn"` to `"en"` in:
  `src/i18n/routing.ts`, `src/proxy.ts`, `src/i18n/request.ts` — verified
- [x] Change `preferredLang String @default("kn")` to `@default("en")` in
  `prisma/schema.prisma` — verified
- [x] Make `formatPrice()` pull currency + number format from a locale/region
  config instead of hardcoded `"en-IN"` / `"INR"` (`src/lib/region.ts` & `src/lib/utils.ts`) — done


### Role system: capability-profile UX (schema done in Stage 1)
- [x] Add role/capability-switch UI (a user can hold FARMER + TOOL_OWNER +
      OPERATOR simultaneously via `UserCapability`) — completed (CapabilitySwitcher
      across desktop header, mobile drawer, OwnerShell & OperatorShell, SessionProvider
      & JWT capability synchronization)
- [x] Handle capability-based auth in proxy.ts (e.g. TOOL_OWNER dashboard
      routes gate on `UserCapability` / `TOOL_OWNER`, OPERATOR routes gate on
      `OPERATOR`, unauthenticated or unactivated users routed to login/onboarding) — done
- [x] Per-capability verification flows (KYC per profile, not per user) —
      done 2026-08-30: `submitCapabilityVerification`, `listCapabilityVerifications`,
      `reviewCapabilityVerification` services, user submit API (`/api/user/capabilities/verify`),
      admin review APIs (`/api/admin/verifications`), `CapabilityVerificationModal`, and
      Admin Verification Dashboard at `/admin/verifications`.

### featured-tools.tsx: hardcoded data → DB-driven
- [x] Replace hardcoded `tools` array with a fetch from the DB
- [x] Replace hardcoded Kannada title `"ಜನಪ್ರಿಯ ಸಾಧನಗಳು"` with i18n
  message key
- [x] Category badges should use translated labels from i18n, not raw
  English enum strings

### Phase 2 (post-first-deploy) hardening — Razorpay webhook

> Deferred by design for the first deploy (2026-08-13 audit): the release build
> ships client-verification only (`POST /api/razorpay/verify`, HMAC via
> `RAZORPAY_KEY_SECRET`). That flow loses a payment if the user closes the tab
> mid-checkout — the refund/capture state then never lands server-side.

- [x] Add `src/app/api/razorpay/webhook/route.ts` — server-confirmed capture
      reconciliation for `payment.captured` (+ handle `payment.failed`)
- [x] Validate `X-Razorpay-Signature` with an HMAC against a new
      `RAZORPAY_WEBHOOK_SECRET` env var (distinct from `RAZORPAY_KEY_SECRET`)
- [x] Payload idempotency: reconcile `razorpayOrderId` → Order/Booking →
      `Payment.status = CAPTURED`, `webhookVerified = true`,
      `webhookReceivedAt = NOW()` (schema fields already exist on `Payment`)
- [x] Mark bookings `OWNER_PENDING` on captured webhook just like `verify`
      does, so a closed-tab payment still advances the flow
- [x] Add `RAZORPAY_WEBHOOK_SECRET` to `.env.example` (dashboard config ready for staging/prod)

### Region/state tagging on DB models
- [ ] Add `region` / `state` field to Tool model (and possibly Booking)
  so pricing and availability can vary by region
- [ ] Add region-based filtering to tool listing API

### ESLint & purity issues
- [x] Fix `Date.now()` purity in `src/app/owner/requests/page.tsx` useCountdown hook
- [x] Fix ES imports in `src/app/api/razorpay/create-order/route.ts`
- [x] Fix immutable cookie mutation in `src/components/layout/language-switcher.tsx`
- [x] Fix `any` type in `src/server/services/payments.ts` webhook handler
- [x] Clean up cascading `setState` effects across admin and owner dashboard components
- [x] `npx eslint "src/**/*.{ts,tsx}" --quiet` runs clean with 0 errors

### Native Android App Utility Feed Transformation (Home Screen)
- [x] Transformed `src/app/page.tsx` from marketing landing page into a high-density, thumb-friendly Android utility feed
- [x] Sticky Top Mobile App Bar with `pt-safe`, regional location selector (`Kasaragod / Puttur` with Taluk bottom sheet), embedded quick search, compact language toggle (`KN | EN`), and cart/profile status
- [x] Seasonal Task / Crop Quick-Filters Carousel (Harvesting, Tilling, Weeding, Spraying, All Equipment) with instant zero-reload client filtering
- [x] Active Rental Banner displaying ongoing booking status (Awaiting Confirmation, Matching Operator, En Route, Work in Progress, Return)
- [x] High-density utility Tool Cards with distance/taluk badges, operator capability chips ("Certified Operator Included" vs "Self-Operate Permitted"), clear price breakdown with refundable deposit, and primary "Book Now" CTA
- [x] Persistent docked Bottom Navigation Bar (`src/components/layout/bottom-nav.tsx`) with Capacitor safe-area padding (`pb-safe`) for Explore, Bookings, Cart, and Account
- [x] Full `next-intl` localization support in `en.json` and `kn.json` under `homeUtility`
- [x] Zero ESLint warnings and clean production build (56/56 routes pass)

## Blocked

- **None currently.** Prisma schema is applied; the §9 state-machine (incl. the
  confirmed cancellation/fee/self-operate/auto-fail rules from 2026-08-11),
  booking/asset model, and OTP hardening are all live on
  `localhost:5432/obele`. Change 1 (certified-tool scenario selection) is done —
  `create-order` now resolves real `toolOwnerId` + `serviceType`; remaining
  Stage-2 items are real `servicePerformerId` resolution and `ToolInstance`
  linking for the QR/custody chain.
