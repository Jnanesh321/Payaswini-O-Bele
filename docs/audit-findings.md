# O~Bele (KrishiRent) — Audit Findings & Remediation Tracker

**Date:** 2026-10-02  
**Baseline Git Status:** Clean branch on `main` (with active UI unstaged changes).  
**Rules:** Fix one issue at a time in strict priority order, verify with tests & typecheck, update changelog, run `git diff --stat`, and report before proceeding.

---

## 🔴 Critical Severity

- [x] **S1. Unauthenticated `/api/payments` POST**
  - **Location:** `src/app/api/payments/route.ts`
  - **Risk:** Unauthenticated callers can forge arbitrary `Payment` records for any booking.
  - **Remediation:** Enforced `requireAuth()`, `requireBookingAccess()`, farmer authorization check, amount matching, and duplicate prevention. Added regression test `tests/payments-security.test.ts`.
- [x] **S2. Real NEXTAUTH_SECRET in `.env.example`**
  - **Location:** `.env.example:11`
  - **Risk:** Anyone deploying from `.env.example` without replacing secret is vulnerable to JWT forgery.
  - **Remediation:** Replaced base64 secret with placeholder `"CHANGE_ME_generate_with_openssl_rand_base64_32"`.
- [x] **S3. OTP stored in plaintext in the database**
  - **Location:** `src/server/services/auth.ts:81`
  - **Risk:** Database leak compromises all active OTPs for account takeover.
  - **Remediation:** Implemented HMAC-SHA-256 OTP hashing (`hashOtp`) before DB insertion and timing-safe comparison (`verifyOtpHash`) on verification with backward compatibility for legacy plaintext. Added tests in `tests/auth-lifecycle.test.ts`.
- [x] **C1. Self-service conversion drops deposit from totalAmount**
  - **Location:** `src/server/services/bookings.ts:475-485`
  - **Risk:** Recalculated amount omits `booking.deposit`, causing financial ledger mismatch with captured Razorpay charge.
  - **Remediation:** Added `+ (booking.deposit ?? 0)` to recalculated `totalAmount` in booking update and payment update. Added test in `tests/booking-state-machine.test.ts`.

---

## 🟠 High Severity

- [x] **S4. Unauthenticated `/api/razorpay/verify` POST (IDOR)**
  - **Location:** `src/app/api/razorpay/verify/route.ts`
  - **Risk:** No session validation; caller can link their verified payment signature to another farmer's bookings.
  - **Remediation:** Enforced `requireAuth()`, verified caller is the farmer (or admin) for every listed booking, and checked that `razorpayOrderId` matches the booking's order. Added regression test in `tests/payments-security.test.ts`.
- [x] **S5. IP rate limiter trusts client-supplied `X-Forwarded-For`**
  - **Location:** `src/server/lib/rate-limit.ts:41-49`
  - **Risk:** Header spoofing bypasses OTP rate limiting.
  - **Remediation:** Prioritized `x-real-ip` (set by reverse proxy) and platform headers before `x-forwarded-for`. Added regression test in `tests/auth-lifecycle.test.ts`.
- [x] **S6 / X1. `verify-otp` auto-registers users contradicting changelog**
  - **Location:** `src/server/services/auth.ts:159-175`
  - **Risk:** Inconsistent with documented registration policy; allows blind user creation and phone enumeration.
  - **Remediation:** Confirmed business architecture to retain seamless, frictionless mobile OTP signup (standard for Indian rural/farmer mobile UX). Standardized user provisioning in `registerUser` and `verifyOtp` to automatically assign default verified `FARMER` capability, aligning implementation and documentation.
- [x] **C2. Owner-SLA auto-cancel doesn't process refund**
  - **Location:** `src/server/lib/owner-sla.ts:23-37`
  - **Risk:** Farmer payment is already captured at `OWNER_PENDING`; auto-cancel cancels booking but leaves payment captured without refund record.
  - **Remediation:** Integrated `computeCancellationPolicy()`, updated `Payment` with `refundAmount`, `cancellationFee`, and status `REFUNDED`, and corrected the SMS copy.
- [x] **A2. JWT callback queries DB on every token refresh**
  - **Location:** `src/server/lib/auth.ts:88-107`
  - **Risk:** Heavy database bottleneck on every request/page load.
  - **Remediation:** Only query DB when `user` is provided (initial login), on explicit session `trigger === "update"`, or if capabilities are missing from the token.
- [x] **C4 / C5. Duplicate booking creation paths & missing Payment record in `createBooking`**
  - **Location:** `src/server/services/bookings.ts:71-195` & `src/server/services/payments.ts:56-303`
  - **Risk:** Divergent business logic between `POST /api/rentals` and `POST /api/razorpay/create-order`; rentals lacked `Payment` row, breaking downstream deposit resolution, SLA, and cancellation refunds.
  - **Remediation:** Confirmed business requirement to retain `POST /api/rentals` for admin/offline bookings. Upgraded `createBooking` to atomically persist `Order`, `Booking`, and a pending `Payment` record inside a single Prisma `$transaction`, guaranteeing complete financial records across both checkout pipelines.

---

## 🟡 Medium Severity

- [x] **S7. Google OAuth fallback with dummy credentials**
  - **Location:** `src/server/lib/auth.ts:72-74`
  - **Risk:** UI exposes broken Google sign-in button when credentials are not configured.
  - **Remediation:** Conditionally registered Google provider only when both `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are set.
- [x] **S8. Razorpay webhook secret falls back to key secret**
  - **Location:** `src/server/services/payments.ts:422`
  - **Risk:** Webhook signature verification silently fails when using key secret instead of webhook secret.
  - **Remediation:** Removed fallback to `RAZORPAY_KEY_SECRET`; explicitly require `RAZORPAY_WEBHOOK_SECRET` and throw descriptive 500 if unset.
- [x] **C3. Order & booking reference collision risk**
  - **Location:** `payments.ts:205,238`, `bookings.ts:155,186`
  - **Risk:** `Date.now() + Math.random().slice(2, 6)` can collide under concurrency.
  - **Remediation:** Replaced pseudo-random `Math.random()` slice with 4-byte cryptographically secure random hex (`crypto.randomBytes(4).toString("hex").toUpperCase()`), providing 4.3 billion possible entropy values per millisecond.
- [x] **A3. `updateBooking` accepts unchecked Prisma input**
  - **Location:** `src/server/services/bookings.ts:218-220`, `src/app/api/rentals/[id]/route.ts:36`
  - **Risk:** Service allows arbitrary column updates; admin route passes full body.
  - **Remediation:** Defined explicit `BookingUpdateInput` whitelist restricting updates to delivery address/notes/status, protecting lifecycle state, pricing, and references from direct mutation.
- [x] **X2. README mentions `ml` (Malayalam) locale, but message files missing**
  - **Location:** `README.md:15`, `src/i18n/routing.ts`
  - **Risk:** Documentation mismatch.
  - **Remediation:** Updated README to accurately reflect current active languages (`en`, `kn`).

---

## 🟢 Low Severity

- [x] **S9. `debug.log` present in repository root**
  - **Location:** `debug.log`
  - **Remediation:** Removed local untracked debug artifact.
- [x] **S10. Deploy and dev walkthrough scripts in repository root**
  - **Location:** `deploy-setup.ps1`, `post-deploy.ps1`, `scripts/record-walkthrough.mjs`
  - **Remediation:** Organized maintenance scripts into dedicated `scripts/` directory (`scripts/deploy-setup.ps1`, `scripts/post-deploy.ps1`, `scripts/record-walkthrough.mjs`), updated internal invocation paths, and kept repository root clean.
- [x] **C6. `SelfOperatePermission` relation names swapped**
  - **Location:** `prisma/schema.prisma:264-265`
  - **Remediation:** Refactored inverted relation names (`SelfOperateGrantor`/`SelfOperateGrantee`) on `SelfOperatePermission` and `User` models to unambiguous `SelfOperateFarmer` / `SelfOperateOwner` labels and regenerated Prisma client.
- [x] **A1. `normalizePhone` exported from auth service instead of lib**
  - **Location:** `src/server/services/auth.ts:10-17`, imported by `owners.ts` and `users.ts`
  - **Remediation:** Extracted pure phone utilities to `src/server/lib/phone.ts` and updated `owners.ts` and `users.ts` imports, eliminating cross-service imports.
- [x] **A4. Duplicate Prisma include block in `bookings.ts`**
  - **Location:** `src/server/services/bookings.ts`
  - **Remediation:** Extracted typed `BOOKING_FULL_INCLUDE` constant (`satisfies Prisma.BookingInclude`) consolidating 4 identical Prisma relation queries across booking retrieval and state transitions.
- [x] **X3. README claims "17-state lifecycle" but schema defines 24**
  - **Location:** `README.md:12`, `prisma/schema.prisma`
  - **Remediation:** Updated README to accurately clarify 24-state lifecycle (17 operational states + 7 terminal/cancellation states).

---

## ❓ Open Questions & Confirmed Business Decisions
 
 1. **`verify-otp` auto-registration:** [RESOLVED: 2026-10-02] Confirmed seamless auto-registration on OTP verification (frictionless mobile signup for rural users). Default verified `FARMER` capability assigned automatically upon first verification.
 2. **Dual booking creation paths:** [RESOLVED: 2026-10-02] Retain `POST /api/rentals` for admin/offline bookings, with atomic pending `Payment` record created inside `$transaction` on booking generation.
 3. **`/api/payments` endpoint usage:** Retained with hardened authentication and access guards (Audit S1 fix).
