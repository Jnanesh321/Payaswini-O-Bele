# Changelog

## 2026-10-03 — Authentication Migration: Firebase Phone Auth + Firebase Admin ID Token Verification

**What:**
- **Architecture Migration from MSG91 + NextAuth:** Migrated O~Bele from legacy MSG91 SMS gateway and Auth.js/NextAuth credentials flow to Firebase Phone Authentication with server-authoritative Firebase ID token verification.
- **Client Authentication:** Integrated Firebase Web Auth SDK in `src/app/(auth)/login/page.tsx` using invisible reCAPTCHA (`RecaptchaVerifier`) and `signInWithPhoneNumber`. Preserved mobile-first 6-digit `OtpBoxedInput` UI and WebOTP SMS auto-retrieval.
- **Server-Authoritative ID Token Verification:** Implemented `verifyFirebaseIdToken` in `src/lib/firebase/admin.ts` using `firebase-admin/app` and `firebase-admin/auth`. Supports service account JSON, individual environment credentials, and prototype mock tokens for local testing.
- **PostgreSQL & Prisma Source of Truth:**
  - Added `firebaseUid String? @unique` to `model User` in `prisma/schema.prisma` without modifying any unrelated schema models or fields.
  - Implemented `resolveOrCreateFirebaseUser` in `src/server/services/auth-firebase.ts`:
    1. Looks up existing user by `firebaseUid`.
    2. If not found, looks up user by canonical Indian mobile number (e.g. `919845100002` / `9845100002`), links `firebaseUid`, and preserves all existing booking history, profile information, and capabilities (e.g. Suresh Shetty).
    3. If no user exists, auto-provisions a new user with default verified `FARMER` capability.
- **Edge-Compatible Session Token:** Implemented `src/lib/auth-session.ts` using Web Crypto API (`crypto.subtle`) for HMAC-SHA256 session token generation and verification. Sets HTTP-only `obele_session` cookie via `POST /api/auth/session` route.
- **Edge Middleware Auth Guards:** Updated `src/proxy.ts` (Next.js middleware) to verify the signed session cookie in Edge runtime without database latency, guarding `/admin`, `/owner`, `/operator`, `/onboarding`, `/dashboard`, `/checkout`, and `/orders`.
- **Server Auth Helpers:** Updated `getServerSession()` in `src/server/lib/auth.ts` to inspect `obele_session` cookie first, `Authorization: Bearer <idToken>` second, and fall back to legacy sessions. Protected APIs and `src/server/lib/auth-guard.ts` seamlessly recognize authenticated users.
- **Client Session Provider:** Replaced NextAuth's `SessionProvider` in `src/components/providers/session-provider.tsx` with a lightweight, reactive context provider delivering `{ data: session, status }` and `signOut()`.
- **Zero Business Logic Regressions:** Verified that booking state machines, transitions, deposits, payment flows, Razorpay checkout, and geo-dispatch rules remain 100% untouched and functional.
- **Testing:** Added `tests/auth-firebase.test.ts` covering 8 dedicated scenarios (new user resolution, legacy user linking, UID mapping, unauthenticated 401 rejection, invalid token rejection, tamper-proofing, capability guards, and session serialization). All 50 tests pass.

**Files changed:**
- `prisma/schema.prisma`
- `src/lib/auth-session.ts` (created)
- `src/lib/firebase/client.ts` (created)
- `src/lib/firebase/admin.ts` (created)
- `src/server/services/auth-firebase.ts` (created)
- `src/app/api/auth/session/route.ts` (created)
- `src/app/api/auth/me/route.ts` (created)
- `src/server/lib/auth.ts`
- `src/proxy.ts`
- `src/components/providers/session-provider.tsx`
- `src/app/(auth)/login/page.tsx`
- `src/app/(auth)/verify-otp/page.tsx`
- `src/app/(auth)/register/page.tsx`
- `src/components/layout/header.tsx`
- `src/components/layout/capability-switcher.tsx`
- `src/components/tools/booking-bottom-sheet.tsx`
- `src/app/operator/profile/page.tsx`
- `src/app/owner/profile/page.tsx`
- `src/app/onboarding/page.tsx`
- `src/app/(dashboard)/dashboard/page.tsx`
- `tests/auth-firebase.test.ts` (created)
- `tests/dispatch-eligibility.test.ts`
- `docs/todo.md`
- `docs/changelog.md`

**Verification:**
- `npm test` (all 50 unit and integration tests pass across 8 test suites)
- `npx tsc --noEmit` (0 type errors)
- `npm run build` (Next.js production build succeeded with 61/61 routes compiled)

## 2026-10-03 — Server-Side Dispatch Eligibility Enforcement (Location-Layer Architecture)

**What:**
- **Server-Authoritative Location Enforcement:** Resolved the audit gap where dispatch radius restrictions were only evaluated client-side. Implemented strict server-side validation for booking creation across both `createRazorpayOrder` (`src/server/services/payments.ts`) and `createBooking` (`src/server/services/bookings.ts`).
- **Registered Dispatch Origin Resolution:** Defined `src/lib/geo.ts` as the single shared geospatial utility module. In the current pilot model, the Tool Owner's registered taluk (`ToolInstance.owner.taluk`) is resolved to its official regional service hub (`REGIONAL_TALUKS` coordinates across 9 pilot taluks in Kasaragod & Dakshina Kannada).
- **Haversine Distance & Radius Check:** For `deliveryType === "delivery"`, parses farm-gate coordinates from `deliveryAddress`, verifies numerical and coordinate bounds (lat: [-90, +90], lng: [-180, +180]), computes the Haversine distance from origin hub to farm gate, and rejects requests with HTTP 400 (`DispatchEligibilityError` / `PaymentServiceError`) if distance exceeds authoritative `Tool.deliveryRadiusKm`.
- **Pickup Exemption:** Requests with `deliveryType === "pickup"` safely bypass the delivery radius check as equipment is collected at the owner's hub.
- **Client Decoupling:** Re-exported geospatial functions and types from `src/lib/geo.ts` in `src/hooks/use-user-location.ts` and `src/components/home/location-selector-sheet.tsx`, breaking circular dependencies and preventing code duplication.
- **Zero Schema Migrations:** Reused existing `Booking.deliveryAddress` and `Tool.deliveryRadiusKm` database fields without altering the Prisma schema or database tables.
- **Comprehensive Test Coverage:** Created `tests/dispatch-eligibility.test.ts` covering 13 test scenarios: destinations within/outside radius, user GPS vs. farm GPS separation, coordinate tampering, invalid/missing coordinates, per-tool radius variation, pickup bypass, unmapped taluk rejection, and real PostgreSQL database integration.

**Files changed:**
- `src/lib/geo.ts` (created)
- `src/server/services/payments.ts`
- `src/server/services/bookings.ts`
- `src/hooks/use-user-location.ts`
- `src/components/home/location-selector-sheet.tsx`
- `tests/dispatch-eligibility.test.ts` (created)
- `docs/changelog.md`

**Verification:**
- `npm test` (all 42 unit and DB-backed integration tests pass)
- `npx tsc --noEmit` (0 type errors)
- `npx eslint --quiet` (0 lint errors)
- `npx next build` (production build compiled successfully with 59 static routes)

## 2026-10-02 — Audit Fix C4 & C5: Atomic Payment creation for offline and direct rental bookings

**What:**
- **Audit C4 & C5 (Medium):** Direct booking creation via `POST /api/rentals` (`createBooking` in `src/server/services/bookings.ts`) persisted `Order` and `Booking` records but omitted the `Payment` record, causing financial ledger mismatches, breaking deposit resolution, and leading to missing payment references.
- Confirmed business decision to retain `POST /api/rentals` alongside Razorpay checkout (`POST /api/razorpay/create-order`).
- Wrapped order, booking, and payment creation inside an atomic `prisma.$transaction`, persisting a pending `Payment` row with `depositFrozen: pricing.deposit > 0`, guaranteeing every booking has an associated payment record.

- **Files changed:**
  - `src/server/services/bookings.ts`
  - `docs/audit-findings.md`
  - `docs/changelog.md`
- **Verification:** `npm run test` (29 passing), `npx tsc --noEmit` (0 errors).

## 2026-10-02 — Audit Fix S6 & X1: Standardize seamless OTP verification registration with default capability

**What:**
- **Audit S6 & X1 (High):** Reconciled registration policy between historical changelog documentation and production OTP flow. Confirmed business requirement for frictionless, mobile-first OTP registration.
- Standardized new user creation in `src/server/services/auth.ts` (`registerUser` and `verifyOtp` auto-provisioning) to assign default verified `FARMER` capability, ensuring consistent capabilities in JWT tokens on first login.

- **Files changed:**
  - `src/server/services/auth.ts`
  - `docs/audit-findings.md`
  - `docs/changelog.md`
- **Verification:** `npm run test` (29 passing), `npx tsc --noEmit` (0 errors).

## 2026-10-02 — Audit Fix C6: Correct inverted SelfOperatePermission relation names

**What:**
- **Audit C6 (Low):** In `prisma/schema.prisma`, `SelfOperatePermission.farmer` was labeled with `@relation("SelfOperateGrantor")` and `SelfOperatePermission.toolOwner` was labeled with `@relation("SelfOperateGrantee")`. Semantically, the tool owner is the grantor of permissions and the farmer is the grantee/recipient.
- Renamed relation labels across `SelfOperatePermission` and `User` models to unambiguous `SelfOperateFarmer` and `SelfOperateOwner` names.
- Regenerated Prisma client via `npx prisma generate`.

- **Files changed:**
  - `prisma/schema.prisma`
  - `docs/audit-findings.md`
  - `docs/changelog.md`
- **Verification:** `npm run test` (29 passing), `npx tsc --noEmit` (0 errors), `npx prisma generate` (clean).

## 2026-10-02 — Audit Fix S10: Consolidate deployment and walkthrough scripts into scripts/ directory

**What:**
- **Audit S10 (Low):** `deploy-setup.ps1` and `post-deploy.ps1` were located in the repository root alongside the dev walkthrough script in `scripts/record-walkthrough.mjs`.
- Moved deployment automation scripts into `scripts/` (`scripts/deploy-setup.ps1`, `scripts/post-deploy.ps1`) and updated invocation instructions, establishing clear script boundaries and keeping the root workspace clean.

- **Files changed:**
  - `scripts/deploy-setup.ps1`
  - `scripts/post-deploy.ps1`
  - `docs/audit-findings.md`
  - `docs/changelog.md`
- **Verification:** `npm run test` (29 passing), `npx tsc --noEmit` (0 errors).

## 2026-10-02 — Audit Fix A4: Consolidate duplicate Prisma include blocks in bookings service

**What:**
- **Audit A4 (Low):** `src/server/services/bookings.ts` contained 4 separate, identical Prisma relation `include` blocks across `getBookingById`, `getBookingWithTransitions`, `getBookingWithActorTransitions`, and `handleBookingTransition`.
- Extracted a unified, type-safe `BOOKING_FULL_INCLUDE` constant (`satisfies Prisma.BookingInclude`), eliminating over 40 lines of boilerplate duplication and guaranteeing consistent relation loading across all booking query and transition workflows.

- **Files changed:**
  - `src/server/services/bookings.ts`
  - `docs/audit-findings.md`
  - `docs/changelog.md`
- **Verification:** `npm run test` (29 passing), `npx tsc --noEmit` (0 errors).

## 2026-10-02 — Audit Fix A1: Extract pure phone utilities to dedicated library

**What:**
- **Audit A1 (Low):** `normalizePhone` and `isValidIndianPhone` were implemented and exported from `src/server/services/auth.ts`, creating cross-service dependencies when imported by `owners.ts` and `users.ts`.
- Extracted phone normalization and validation logic into dedicated library module `src/server/lib/phone.ts`.
- Re-exported from `auth.ts` for backward compatibility, and updated direct imports in `owners.ts` and `users.ts`.

- **Files changed:**
  - `src/server/lib/phone.ts`
  - `src/server/services/auth.ts`
  - `src/server/services/owners.ts`
  - `src/server/services/users.ts`
  - `docs/audit-findings.md`
  - `docs/changelog.md`
- **Verification:** `npm run test` (29 passing), `npx tsc --noEmit` (0 errors).

## 2026-10-02 — Audit Fix X2 & X3: Align README with supported languages and lifecycle states

**What:**
- **Audit X2 & X3 (Medium / Low):** README claimed localization support for Malayalam (`ml`) which lacked message files, and cited a "17-state lifecycle" despite the Prisma schema specifying 24 statuses (17 operational states + 7 terminal/cancellation states).
- Updated `README.md` to reflect currently active locales (English `en`, Kannada `kn`) and clarify the comprehensive 24-state lifecycle model.

- **Files changed:**
  - `README.md`
  - `docs/audit-findings.md`
  - `docs/changelog.md`
- **Verification:** verified documentation alignment.

## 2026-10-02 — Audit Fix A3: Enforce strict field whitelisting on booking updates

**What:**
- **Audit A3 (Medium):** `updateBooking()` in `src/server/services/bookings.ts` accepted unvalidated `Prisma.BookingUncheckedUpdateInput`, and the admin PUT route in `src/app/api/rentals/[id]/route.ts` passed arbitrary request body fields directly into the update call. This opened a vulnerability where callers could directly mutate `status`, financial columns (`totalAmount`, `deposit`), or references (`bookingRef`, `farmerId`), bypassing the state machine and audit logs.
- Introduced `BookingUpdateInput` restricting allowable direct updates strictly to operational delivery details and notes (`deliveryAddress`, `deliveryDistrict`, `deliveryTaluk`, `deliveryPincode`, `deliveryStatus`, `notes`).
- Enforced the whitelist in both `updateBooking()` and `PUT /api/rentals/[id]`.

- **Files changed:**
  - `src/server/services/bookings.ts`
  - `src/app/api/rentals/[id]/route.ts`
  - `docs/audit-findings.md`
  - `docs/changelog.md`
- **Verification:** `npm run test` (29 passing), `npx tsc --noEmit` (0 errors).

## 2026-10-02 — Audit Fix C3: Cryptographically secure orderRef and bookingRef generation

**What:**
- **Audit C3 (Medium):** Order references (`ORD...`) and booking references (`BK...`) were generated using `Date.now() + Math.random().toString(36).slice(2, 6)`. The 4-character pseudo-random suffix provided only ~1.67 million variations, exposing concurrent requests within the same millisecond to unique constraint collision crashes.
- Upgraded reference generation in `src/server/services/payments.ts` and `src/server/services/bookings.ts` to use `crypto.randomBytes(4).toString("hex").toUpperCase()`, expanding entropy to 4.29 billion possibilities per millisecond.

- **Files changed:**
  - `src/server/services/payments.ts`
  - `src/server/services/bookings.ts`
  - `docs/audit-findings.md`
  - `docs/changelog.md`
- **Verification:** `npm run test` (29 passing), `npx tsc --noEmit` (0 errors).

## 2026-10-02 — Audit Fix S8: Require dedicated RAZORPAY_WEBHOOK_SECRET for webhook verification

**What:**
- **Audit S8 (Medium):** In `handleRazorpayWebhook()` (`src/server/services/payments.ts`), if `RAZORPAY_WEBHOOK_SECRET` was unset, the code fell back to `RAZORPAY_KEY_SECRET`. Razorpay signs webhook payloads exclusively with the endpoint's configured webhook secret (never the API key secret), causing all incoming webhooks in staging/production without the webhook secret to silently fail HMAC validation with 400.
- Removed fallback to `RAZORPAY_KEY_SECRET`; explicitly required `RAZORPAY_WEBHOOK_SECRET` and threw a descriptive 500 configuration error if unset.

- **Files changed:**
  - `src/server/services/payments.ts`
  - `docs/audit-findings.md`
  - `docs/changelog.md`
- **Verification:** `npm run test` (29 passing), `npx tsc --noEmit` (0 errors).

## 2026-10-02 — Audit Fix S7: Remove dummy Google OAuth fallback

**What:**
- **Audit S7 (Medium):** When Google OAuth credentials were not configured in the environment, `GoogleProvider` was still registered with placeholder dummy credentials (`dummy-google-client-id`), exposing a broken Google login option.
- Configured NextAuth providers array in `src/server/lib/auth.ts` to conditionally register `GoogleProvider` only when both `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` environment variables are actively defined.

- **Files changed:**
  - `src/server/lib/auth.ts`
  - `docs/audit-findings.md`
  - `docs/changelog.md`
- **Verification:** `npm run test` (29 passing), `npx tsc --noEmit` (0 errors).

## 2026-10-02 — Audit Fix A2: Prevent database queries on every JWT token evaluation

**What:**
- **Audit A2 (High):** NextAuth's `jwt` callback queried `prisma.user.findUnique({ include: { capabilities: true } })` unconditionally on every single token verification (i.e. every API route call and server-rendered page load), creating a severe database bottleneck.
- Optimized `jwt()` callback in `src/server/lib/auth.ts` to cache user identity and capabilities in the token payload.
- Database query is now strictly executed only upon initial user sign-in (`user` object present), explicit session update triggers (`trigger === "update"`), or when the token lacks cached capabilities.

- **Files changed:**
  - `src/server/lib/auth.ts`
  - `docs/audit-findings.md`
  - `docs/changelog.md`
- **Verification:** `npm run test` (29 passing), `npx tsc --noEmit` (0 errors).

## 2026-10-02 — Audit Fix C2: Process payment refunds on Owner-SLA auto-cancellations

**What:**
- **Audit C2 (High):** When an `OWNER_PENDING` booking exceeded the 4-hour owner response SLA in `src/server/lib/owner-sla.ts`, the booking was transitioned to `CANCELLED_BY_PLATFORM` without updating the `Payment` row with refund accounting. The SMS also stated "No payment was taken", even though payment was captured upon order checkout.
- Integrated `computeCancellationPolicy(OWNER_PENDING, CANCELLED_BY_PLATFORM, totalAmount)` to record full refund amount (`refundAmount`) and status `REFUNDED` on the `Payment` record inside the cancellation transaction.
- Corrected the customer notification SMS to accurately state that a full refund has been recorded for return.

- **Files changed:**
  - `src/server/lib/owner-sla.ts`
  - `docs/audit-findings.md`
  - `docs/changelog.md`
- **Verification:** `npm run test` (29 passing), `npx tsc --noEmit` (0 errors).

## 2026-10-02 — Audit Fix S5: Prevent IP rate limiting bypass via spoofed X-Forwarded-For

**What:**
- **Audit S5 (High):** `getClientIp()` in `src/server/lib/rate-limit.ts` blindly trusted the first entry of the client-supplied `X-Forwarded-For` header ahead of `X-Real-IP`. Any client could bypass IP rate limits on OTP generation/verification by cycling arbitrary `X-Forwarded-For` values.
- Re-ordered header resolution to prioritize `X-Real-IP` (overwritten securely by trusted reverse proxies / edge servers) and platform headers before falling back to `X-Forwarded-For`.
- Added test coverage in `tests/auth-lifecycle.test.ts` verifying that spoofed `X-Forwarded-For` cannot override `X-Real-IP`.

- **Files changed:**
  - `src/server/lib/rate-limit.ts`
  - `tests/auth-lifecycle.test.ts`
  - `docs/audit-findings.md`
  - `docs/changelog.md`
- **Verification:** `npm run test` (29 passing), `npx tsc --noEmit` (0 errors).

## 2026-10-02 — Audit Fix S4: Enforce authentication and ownership validation on `/api/razorpay/verify`

**What:**
- **Audit S4 (High):** `POST /api/razorpay/verify` did not require user authentication and accepted arbitrary `bookingIds` from the caller. A user could associate their verified payment with another farmer's bookings (IDOR) or trigger payment failure updates against foreign bookings.
- Added `requireAuth()` session validation to the route.
- Verified that the caller owns all referenced bookings as `farmerId` (or is an admin).
- Verified that `razorpayOrderId` matches the booking's order or payment record.
- Added regression test in `tests/payments-security.test.ts`.

- **Files changed:**
  - `src/app/api/razorpay/verify/route.ts`
  - `tests/payments-security.test.ts`
  - `docs/audit-findings.md`
  - `docs/changelog.md`
- **Verification:** `npm run test` (29 passing), `npx tsc --noEmit` (0 errors).

## 2026-10-02 — Audit Fix C1: Preserve deposit in totalAmount during self-service conversion

**What:**
- **Audit C1 (Critical):** In `transitionBooking()`, when an owner accepted a booking with `operatorMode === "self_service"`, the recalculated `totalAmount` in the booking and payment records dropped `booking.deposit`:
  `totalAmount: booking.totalToolFee + booking.deliveryFee + booking.platformFee`
  This caused a financial ledger mismatch against the captured Razorpay transaction which already included the deposit.
- Added `+ (booking.deposit ?? 0)` to both the `Booking` update and `Payment` amount update in `src/server/services/bookings.ts`.
- Added regression test in `tests/booking-state-machine.test.ts`.

- **Files changed:**
  - `src/server/services/bookings.ts`
  - `tests/booking-state-machine.test.ts`
  - `docs/audit-findings.md`
  - `docs/changelog.md`
- **Verification:** `npm run test` (28 passing), `npx tsc --noEmit` (0 errors).

## 2026-10-02 — Audit Fix S3: Cryptographic hashing for stored OTPs

**What:**
- **Audit S3 (Critical):** OTPs were stored as raw plaintext in the `otp_requests` database table, creating an account takeover risk in case of a database breach.
- Implemented `hashOtp()` using HMAC-SHA-256 keyed with `NEXTAUTH_SECRET` (falling back to a secure default salt) scoped to the user's normalized phone number.
- Implemented timing-safe comparison in `verifyOtpHash()` via `crypto.timingSafeEqual` with backward compatibility for legacy plaintext records.
- Added comprehensive unit test coverage in `tests/auth-lifecycle.test.ts`.

- **Files changed:**
  - `src/server/services/auth.ts`
  - `tests/auth-lifecycle.test.ts`
  - `docs/audit-findings.md`
  - `docs/changelog.md`
- **Verification:** `npm run test` (27 passing), `npx tsc --noEmit` (0 errors).

## 2026-10-02 — Audit Fix S2: Sanitize NEXTAUTH_SECRET in `.env.example`

**What:**
- **Audit S2 (Critical):** `.env.example` contained an active-looking base64 secret (`76kK664X0oXLbKSKNOB8APFWkJVufiJB3bSBkHgd+fY=`), posing a severe JWT forgery risk if copied directly to production.
- Replaced the secret with a safe, descriptive placeholder `CHANGE_ME_generate_with_openssl_rand_base64_32`.

- **Files changed:**
  - `.env.example`
  - `docs/audit-findings.md`
  - `docs/changelog.md`
- **Verification:** verified placeholder text and executed `npm run test` & `npx tsc --noEmit`.

## 2026-10-02 — Audit Fix S1: Enforce authentication and authorization on `/api/payments`

**What:**
- **Audit S1 (Critical):** `POST /api/payments` was completely unauthenticated and allowed callers to inject arbitrary payment records with arbitrary amounts and booking references.
- Secured endpoint with `requireAuth()` and `requireBookingAccess()`.
- Added validation requiring caller to be the booking's farmer (or admin), verifying payment amount strictly matches `booking.totalAmount`, linking `booking.orderId`, and rejecting duplicate payments for existing bookings with 409 Conflict.
- Enhanced `requireAuth()` in `src/server/lib/auth-guard.ts` to gracefully handle unresolvable session contexts by returning 401 Unauthorized.
- Added regression test suite `tests/payments-security.test.ts`.

- **Files changed:**
  - `src/app/api/payments/route.ts`
  - `src/server/services/payments.ts`
  - `src/server/lib/auth-guard.ts`
  - `tests/payments-security.test.ts`
  - `docs/audit-findings.md`
  - `docs/changelog.md`
- **Verification:** `npm run test` (26 passing), `npx tsc --noEmit` (0 errors).


## 2026-08-30 — Dynamic Indian phone validation, dev-fallback OTP, CLI tooling, Razorpay webhook & ToolInstance custody chain

**What:**
1. **Dynamic Indian Phone Validation & Normalization (`src/server/services/auth.ts`):**
   - Added and exported `normalizePhone()` and `isValidIndianPhone()`.
   - Validates Indian phone numbers (10 digits starting with `6–9`, optionally prefixed with `+91` / `91`).
   - Normalizes stored phone numbers to canonical 12-digit format (`91XXXXXXXXXX`) across OTP generation, user registration, and verification.
   - Updated NextAuth credentials authorize provider in `src/server/lib/auth.ts` to resolve both 10-digit and 12-digit normalized phone lookups.
2. **Dev-Fallback OTP Generation & Updated `check-otp.js`:**
   - Implemented dev-mode master code bypass (`123456`) and auto-registration in development mode to remove testing friction.
   - Updated `check-otp.js` to automatically load environment configuration from `.env.local` (falling back to `.env`) and support flexible phone lookup by 10-digit or 12-digit arguments.
3. **Razorpay Webhook Reconciliation (`src/app/api/razorpay/webhook/route.ts`):**
   - Implemented timing-safe HMAC SHA-256 webhook signature verification against `RAZORPAY_WEBHOOK_SECRET`.
   - Idempotently reconciles `payment.captured` & `order.paid` events to mark payment captured and auto-advance bookings from `REQUESTED` to `OWNER_PENDING` with audit log.
4. **ToolInstance QR & Custody Chain (Stage 2):**
   - Integrated physical asset custody tracking into `src/server/services/bookings.ts` transitions (`TOOL_COLLECTED`, `WORK_STARTED`, `TOOL_RETURNED`, `INSPECTION`, `COMPLETED`).
   - Automated creation of `HandoverLog` records on pickup and return, and added `ToolInstance` asset tag badges on operator screens.

- **Files changed:**
  - `src/server/services/auth.ts`
  - `src/server/lib/auth.ts`
  - `src/server/services/bookings.ts`
  - `src/server/services/payments.ts`
  - `src/app/api/razorpay/webhook/route.ts`
  - `src/app/operator/_components/use-operator-booking.ts`
  - `src/app/operator/pickup/page.tsx`
  - `src/app/operator/return/page.tsx`
  - `check-otp.js`
  - `docs/structure.md`
  - `docs/todo.md`
  - `docs/changelog.md`
- **Type-check:** clean (`npx tsc --noEmit` — 0 errors).

## 2026-08-24 — Fix Vercel build: commit missing `Payment.depositRefundId` schema field

**What:** Vercel production builds failed with `Property 'depositRefundId' does
not exist on type Payment` at `src/server/lib/deposit-resolution.ts:139`.

**Root cause:** `Payment.depositRefundId String?` was an intentional domain field
(added 2026-08-12 to record the Razorpay refund entity ID for
reconciliation/idempotency). The column existed in the database via
`prisma db push` and the untracked `0_init` migration, and was actively used
in `deposit-resolution.ts` (write after successful refund, read in outcome
reporting), but was never committed to `prisma/schema.prisma`. Vercel's
`prisma generate` therefore produced Prisma Client types without the field.

**Fix:** Added `depositRefundId String?` to the committed `prisma/schema.prisma`
(2 lines). No code changes required. No new migration required (column already
exists in the database).

- **Files changed:** `prisma/schema.prisma` only.
- **Prisma schema changed:** Yes — the field was added to the committed schema.
  This is a schema-alignment fix, not a new field.
- **Type-check:** clean (`npx tsc --noEmit`).
- **Build:** clean (`npm run build` — 47 routes, all pass).
- **Tests:** No deposit-resolution unit/E2E test files exist in the repository.
  The deposit-resolution logic was verified via the build (which exercises the
  full type chain from `Payment` → `deposit-resolution.ts` → outcome types).
- **Remaining concern:** The `prisma/migrations/0_init/` directory is untracked
  in git. Consider committing it for migration traceability.

## 2026-08-12 — Deposit lifecycle: refund / deduction / hold execution at inspection/return

**What:** Completed the refundable-deposit lifecycle. Until now `create-order`
set `Payment.depositFrozen` and `verify` captured the money, but nothing ever
refunded or deducted it at return/inspection — `depositRefunded`,
`depositDeducted` and `disputeLocked` were never written. This closes that gap
with a minimal, idempotent, provider-abstracted flow. No state-machine
redesign; the deposit model is untouched.

- **New endpoint `POST /api/rentals/[id]/deposit-resolution`** with three
  actions:
  - `FULL_REFUND` → Razorpay refunds the whole deposit; `Payment.depositRefunded`
    set, `depositFrozen` cleared.
  - `PARTIAL_DEDUCTION` → `Payment.depositDeducted` records the withheld amount,
    Razorpay refunds only the remainder (`deposit − deducted`).
  - `HOLD` → keeps `depositFrozen`, sets `disputeLocked` so the deposit can
    never be silently refunded (admin-only to release).
- **Core in `src/lib/deposit-resolution.ts`** — `resolveBookingDeposit()` takes
  an injectable `RefundExecutor` (production wires the real Razorpay SDK
  `payments.refund()`; tests inject a mock, since real keys are unavailable).
  Idempotency is an atomic conditional `updateMany` "claim": only the first
  caller flips the payment from frozen→resolved; every retry/concurrent request
  fails the claim and returns `alreadyResolved` without touching Razorpay. If
  the provider refund fails, the claim is rolled back so a retry can safely
  re-attempt (no double refund, no lost refund on retry).
- **`COMPLETED` now requires deposit resolution.** `INSPECTION → COMPLETED`
  (and `DISPUTED → COMPLETED`) returns 400 while the deposit is still frozen
  (`isDepositResolutionRequired`). This is a precondition guard on the existing
  edge, not a redesign. No-deposit bookings are unaffected.
- **Entering `DISPUTED` sets `disputeLocked`** on the `Payment` (kept frozen),
  so a disputed deposit cannot be silently refunded.
- **Schema:** `Payment.depositRefundId String?` — records the Razorpay refund
  entity id for reconciliation/idempotency. `prisma db push` + `generate`
  applied.
- **Shared helper:** `resolveActorForUser`/`isBookingActor` moved to
  `src/lib/booking-actor.ts` (used by both the transition route and the new
  route). Deposit resolution is owner/admin-only — the farmer can never refund
  their own deposit.
- **Audit:** every resolution writes a `BookingStateLog` row (from→to = current
  state) with the action, amounts and Razorpay refund id.

**Verification:**
- `npx prisma generate` ✔; `npx tsc --noEmit` clean; `eslint` clean on touched
  files; `next build` ✔ (28/28 routes incl. `/api/rentals/[id]/deposit-resolution`).
- Core-logic drive-test vs live DB with a mock refund executor: 32/32 — full
  refund, partial deduction, deduction > deposit rejected, hold/dispute-lock,
  admin release, provider-failure rollback + retry, non-captured rejection,
  zero-deposit no-op, idempotency helper.
- End-to-end HTTP drive-test (real OTP → NextAuth sessions for owner/farmer/
  admin): 22/22 — owner HOLD + idempotent retry, FULL_REFUND → 502 with dummy
  keys + rollback + re-attempt, `INSPECTION → COMPLETED` blocked while frozen
  then succeeds after resolution, no-deposit booking still completes, DISPUTED
  sets `disputeLocked` and blocks owner/farmer refunds (admin passes the gate),
  actor/state/validation gating (401/403/400).
- **Could not be externally verified:** a real Razorpay refund against a
  captured payment — `RAZORPAY_KEY_ID`/`RAZORPAY_KEY_SECRET` are placeholders
  (`rzp_test_dummy`). The happy-path refund was verified only against a mock
  executor; the real-SDK path was verified to the point of a clean
  `REFUND_FAILED` → rollback. Remaining gap: a reconciliation job for the tiny
  crash window between the DB claim and the provider refund.

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
