# O~Bele (Payaswini) — Security & Authentication Audit Report

**Auditor:** Specialist Agent 5 (Security and Authentication Auditor)  
**Target:** O~Bele Farmer Tool Rental Platform (`krishirent`)  
**Deliverable:** `docs/audit/security-review.md`  
**Date:** October 2026  
**Status:** Audit Complete — Action Required  

---

## Executive Summary

An exhaustive security and authentication audit of the **O~Bele (Payaswini)** codebase was performed, examining client/server Firebase integrations, session token cryptography, identity resolution pipelines, role-based authorization guards, multi-tenant trust boundaries, legacy authentication pathways, SMS gateways, rate limiting defenses, and secret hygiene.

The audit revealed **critical vulnerabilities** including:
- A hardcoded static fallback session secret enabling arbitrary authentication token forgery.
- An environment-wide Master OTP backdoor (`123456` / `000000`) enabling full account takeover across non-production environments.
- Live secrets leaked inside a root-level workspace distribution zip archive.
- Unapproved owner equipment listings becoming immediately available for rental without admin approval.
- An IDOR vulnerability in asset QR code lookups leaking farmer and tool owner personally identifiable information (PII).
- Rate-limiting spoofing via client-controlled IP headers.

Application code was **not modified** during this audit. All findings, evidence, attack vectors, regressions, remediation steps, and test suites are detailed below.

---

## 1. Current Implementation & Evidence

### 1.1 Firebase Client & Admin SDK Integration
- **Client SDK (`src/lib/firebase/client.ts`)**:
  - Initializes client-side Firebase Auth using public environment variables (`NEXT_PUBLIC_FIREBASE_*`).
  - Auth Emulator connection is guarded behind `process.env.NODE_ENV !== "production"` and explicit environment flags (`NEXT_PUBLIC_USE_FIREBASE_EMULATOR === "true"` or `NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST`).
  - Configuration verification is handled via `isFirebaseConfigured()`.
- **Admin SDK (`src/lib/firebase/admin.ts`)**:
  - Initializes server-side Firebase Admin via a tiered resolution strategy:
    1. Base64 or JSON string in `FIREBASE_SERVICE_ACCOUNT_KEY`.
    2. Twelve-Factor individual variables: `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`.
    3. Filesystem service account: `serviceAccountKey.json` at `process.cwd()`.
    4. Google Cloud Application Default Credentials (ADC).
  - Contains a development/testing mock token bypass:
    ```typescript
    const isDevAuthEnabled =
      process.env.NODE_ENV !== "production" &&
      (process.env.ENABLE_DEV_FIREBASE_AUTH === "true" || process.env.NODE_ENV === "test")
    if (isDevAuthEnabled && trimmed.startsWith("mock_firebase_")) { ... }
    ```
  - Contains an unverified JWT payload decode fallback when the Admin SDK cannot be initialized and `isDevAuthEnabled` is true (`admin.ts`, lines 186–207).
  - Production token verification uses `auth.verifyIdToken(trimmed)` but omits the second argument `checkRevoked: true` (defaults to `false`).

### 1.2 Session Cookie Creation, JWT Signing & Verification
- **Session Cryptographic Engine (`src/lib/auth-session.ts`)**:
  - Implements custom HMAC-SHA256 tokens using the Web Crypto API (`crypto.subtle`).
  - Session lifetime is configured for 30 days (`SESSION_MAX_AGE_SECONDS = 30 * 24 * 60 * 60`).
  - Token signing uses `signSessionToken(user)` and verification uses `verifySessionToken(token)` with constant-time signature verification (`crypto.subtle.verify`).
  - Secret resolution logic (`getSecretKey()`, lines 28–34):
    ```typescript
    function getSecretKey(): string {
      return (
        process.env.SESSION_SECRET ||
        process.env.NEXTAUTH_SECRET ||
        "obele-default-dev-secret-key-at-least-32-chars-long"
      )
    }
    ```
  - Sessions are purely stateless: the cookie payload embeds `id`, `phone`, `name`, `email`, `image`, `isAdmin`, and `capabilities`.
- **Session API (`src/app/api/auth/session/route.ts`)**:
  - `POST` accepts an `idToken`, validates rate limits (10 req/min/IP), verifies the token with Firebase Admin, resolves/links the PostgreSQL user, generates a session token, and sets the HTTP-only cookie `obele_session`.
  - Cookie security attributes: `httpOnly: true`, `sameSite: "lax"`, `path: "/"`, `maxAge: 30 days`. `secure` attribute is set if `process.env.NODE_ENV === "production" || request.nextUrl.protocol === "https:"`.
  - `DELETE` clears the session cookie with `maxAge: 0`.

### 1.3 User Resolution & Linking Pipeline
- **Service (`src/server/services/auth-firebase.ts`)**:
  - Normalizes Indian phone numbers into 12-digit canonical (`91XXXXXXXXXX`) and 10-digit formats (`XXXXXXXXXX`).
  - Identity matching algorithm:
    1. Check `prisma.user.findUnique({ where: { firebaseUid: uid } })`. If found, return.
    2. Check `prisma.user.findFirst({ where: { OR: [{ phone: normalized }, { phone: raw10 }] } })`. If found, update user with `firebaseUid = uid` and `phoneVerified = true`.
    3. If not found by UID or phone, create new user with default `CapabilityType.FARMER` (`VERIFIED`).
  - When `phoneNumber` is absent (e.g., social login), generates a synthetic phone number:
    ```typescript
    const canonicalPhone = parsedPhone ? parsedPhone.normalized : `91${uid.slice(0, 10).replace(/\D/g, "").padEnd(10, "0")}`
    ```

### 1.4 Authorization Guards & Capability Verification
- **Guard Architecture (`src/server/lib/auth-guard.ts`)**:
  - `requireAuth()`: Extracts user from `getServerSession()`. Throws `AuthGuardError(401)` if missing.
  - `requireAdmin()`: Calls `requireAuth()` and enforces `user.isAdmin === true`. Throws `AuthGuardError(403)`.
  - `requireCapability(type)`: Allows admins automatically. For non-admins, queries `prisma.userCapability` in PostgreSQL in real time to verify that the capability is not `REVOKED` or `SUSPENDED`, and is `VERIFIED` (except `FARMER`).
  - `requireBookingAccess(bookingId, userId, isAdmin)`: Fetches booking entity with relations and enforces tenant isolation: allows access only to the farmer (`farmerId === userId`), tool owner (`toolOwnerId === userId`), assigned operator (`servicePerformerId === userId`), or platform admin.

### 1.5 Trust Boundaries & Ownership Enforcement
- **Rentals & Bookings (`src/app/api/rentals/...`)**:
  - `GET /api/rentals`: Scoped strictly to `session.user.id`.
  - `POST /api/rentals`: Scoped to `session.user.id` with authoritative price calculation (`computeBookingPricing`).
  - `GET /api/rentals/[id]`: Protected by `requireBookingAccess`.
  - `PUT /api/rentals/[id]`: Protected by `requireBookingAccess`. Non-admins are strictly prevented from modifying financials, statuses, or delivery details once past `REQUESTED` / `OWNER_PENDING`.
  - `POST /api/rentals/[id]/transition`: Validates actor legitimacy via `resolveActorForUser(booking, userId)` and enforces state transitions through finite state machine `assertTransition`.
  - `POST /api/rentals/[id]/deposit-resolution`: Guarded by `requireBookingAccess` and deposit state machine checks.
- **Equipment & Owner Actions (`src/app/api/owner/...`)**:
  - `GET /api/owner/equipment`: Scoped strictly to `instances: { some: { ownerId: user.id } }`.
  - `PATCH /api/owner/equipment/[toolId]`: Restricted to instances where `ownerId === userId`.
  - `GET /api/owner/permissions`: Scoped strictly to `toolOwnerId === user.id`.
  - `POST /api/owner/permissions`: Scoped strictly to `toolOwnerId === user.id`.
  - `DELETE /api/owner/permissions/[id]`: Scoped to `toolOwnerId === session.user.id`.
  - `PATCH /api/owner/permissions/[id]`: Scoped to `toolOwnerId === session.user.id`.
  - `GET /api/owner/farmers/lookup`: Requires `TOOL_OWNER` capability. Returns farmer name and verified phone status.
- **Payments & Razorpay Integration (`src/app/api/razorpay/...` & `src/app/api/payments`)**:
  - `POST /api/razorpay/create-order`: Calculates pricing server-side; user inputs cannot override rates or deposits.
  - `POST /api/razorpay/verify`: Validates caller is party to the booking and verifies cryptographic signature via `crypto.timingSafeEqual`.
  - `POST /api/razorpay/webhook`: Validates webhook HMAC signature against `process.env.RAZORPAY_WEBHOOK_SECRET` in constant time.
- **Rate Limiting & IP Extraction (`src/server/lib/rate-limit.ts`)**:
  - Uses PostgreSQL table `RateLimit` with atomic `upsert` and increment.
  - IP resolution via `getClientIp(request)` checks `x-real-ip`, then `x-vercel-forwarded-for`, then `x-forwarded-for` (splits by comma and takes `parts[0]`).

### 1.6 Legacy Authentication & SMS Services
- **Dual Authentication Co-existence**:
  - NextAuth is mounted at `src/app/api/auth/[...nextauth]/route.ts`.
  - Session resolution in `getServerSession()` (`src/server/lib/auth.ts`) cascades across 3 layers:
    1. Firebase session cookie (`obele_session`).
    2. `Authorization: Bearer <token>` (Firebase ID token for API/mobile clients).
    3. Legacy NextAuth session fallback (`next-auth`).
- **Legacy Phone OTP & Backdoors (`src/server/services/auth.ts`)**:
  - Implements SMS OTP via MSG91 (`sendOtpSms`), Fast2SMS fallback, and HMAC-SHA256 OTP hashing.
  - Contains Master OTP backdoor (`123456` and `000000`) and OTP echoing (`devOtp`).
- **SMS Gateway (`src/server/lib/sms.ts`)**:
  - Provides `sendOtpSms` for OTP delivery and `sendSmsNotification` for transactional booking lifecycle events (e.g., dispatch notifications, cancellations, refunds).

### 1.7 Secrets Hygiene & Repository Exposure
- `.gitignore` specifies `*serviceAccount*.json`, `*firebase-adminsdk*.json`, and `.env*`.
- Root directory contains physical file `serviceAccountKey.json` (`project_id: "o-bele"`).
- Root directory contains active `.env` and `.env.local`.
- Workspace directory `C:\PROJECTS\farmer-tool-rental` contains archive `farmer-tool-rental.zip`, which contains `krishirent/.env.local`.

---

## 2. Confirmed Vulnerabilities & Security Risks

### Vulnerability Matrix

| ID | Title | File(s) | Severity | Impact |
|---|---|---|---|---|
| **SEC-01** | Hardcoded Fallback Secret in Session Signing Engine | `src/lib/auth-session.ts` | **P0 - Critical** | Full authentication bypass & privilege escalation to Admin |
| **SEC-02** | Master OTP Backdoor Enabled Across Non-Production Environments | `src/server/services/auth.ts` | **P0 - Critical** | Account takeover of any user/farmer/admin without OTP |
| **SEC-03** | Leaked Live Secrets in Root Distribution Zip Archive | `farmer-tool-rental.zip` | **P1 - High** | Total compromise of database, payment, and cloud secrets |
| **SEC-04** | Unapproved Tool Instances Instantly Bookable in Production | `src/app/api/owner/equipment/route.ts`, `src/server/services/payments.ts` | **P1 - High** | Catalog pollution and unvetted tool rentals bypassing admin approval |
| **SEC-05** | IDOR & PII Exposure in Asset QR Code Endpoint | `src/app/api/assets/[assetCode]/route.ts` | **P1 - High** | Mass enumeration of farmer/owner names, phone numbers, and locations |
| **SEC-06** | Rate Limiting Bypass via Spoofed `X-Forwarded-For` Headers | `src/server/lib/rate-limit.ts` | **P1 - High** | Brute force of OTP and credential exhaustion |
| **SEC-07** | Razorpay Verification Allows Signatures on Empty Secret | `src/server/services/payments.ts` | **P2 - Medium** | Payment verification forgery if secret env var is unset |
| **SEC-08** | Insecure Firebase Verification Fallbacks & Missing Revocation | `src/lib/firebase/admin.ts` | **P2 - Medium** | Token forgery in test/dev; revoked users retain access |
| **SEC-09** | Identity Overwrite & Synthetic Phone Collision in User Linking | `src/server/services/auth-firebase.ts` | **P2 - Medium** | User account hijacking & unique constraint crashes |
| **SEC-10** | Public Information Disclosure in Firebase Status API | `src/app/api/auth/firebase-status/route.ts` | **P2 - Medium** | Infrastructure fingerprinting by unauthenticated attackers |
| **SEC-11** | Stateless Session Drift & Lack of Revocation Mechanics | `src/lib/auth-session.ts`, `src/server/lib/auth.ts` | **P3 - Low** | Demoted admins retain elevated privileges for 30 days |

---

### Detailed Findings & Technical Evidence

#### SEC-01: Hardcoded Fallback Secret in Session Signing Engine [P0 - Critical]
- **Location:** `src/lib/auth-session.ts`, lines 28–34
- **Evidence:**
  ```typescript
  function getSecretKey(): string {
    return (
      process.env.SESSION_SECRET ||
      process.env.NEXTAUTH_SECRET ||
      "obele-default-dev-secret-key-at-least-32-chars-long"
    )
  }
  ```
- **Vulnerability Analysis:**
  If an environment is deployed where `SESSION_SECRET` and `NEXTAUTH_SECRET` are unset, empty, or misnamed, the authentication engine does not throw or abort startup. Instead, it silently falls back to a publicly visible static string.
- **Exploit Vector:**
  An attacker can clone the public/source code, construct an arbitrary JSON payload:
  ```json
  { "id": "admin_user_id", "phone": "919999999999", "isAdmin": true, "capabilities": ["FARMER", "TOOL_OWNER", "OPERATOR"] }
  ```
  and compute the HMAC-SHA256 signature using `"obele-default-dev-secret-key-at-least-32-chars-long"`. Supplying this token as cookie `obele_session` grants instant, unrestricted administrator access.

---

#### SEC-02: Master OTP Backdoor Enabled Across Non-Production Environments [P0 - Critical]
- **Location:** `src/server/services/auth.ts`, lines 102–113, 137–152
- **Evidence:**
  ```typescript
  const enableDevMasterOtp =
    process.env.ENABLE_DEV_MASTER_OTP === "true" || process.env.NODE_ENV !== "production"

  if (!sent && enableDevMasterOtp) {
    console.log(`[DEV ONLY] OTP for ${normalized}: ${otp}`)
  }

  return {
    message: sent ? "OTP sent successfully" : sms.message,
    devOtp: !sent && enableDevMasterOtp ? otp : undefined,
  }
  ```
  ```typescript
  const isDevMasterOtp =
    (process.env.ENABLE_DEV_MASTER_OTP === "true" || process.env.NODE_ENV !== "production") &&
    (cleanedOtp === "123456" || cleanedOtp === "000000")

  if (!record && !isDevMasterOtp) {
    throw new AuthServiceError("Invalid or expired OTP", 400)
  }
  ```
- **Vulnerability Analysis:**
  The condition `process.env.NODE_ENV !== "production"` activates the backdoor automatically in any staging, QA, dev, preview, or testing deployment.
  1. Any attacker who knows or guesses a user's phone number can input OTP `123456` or `000000` and immediately authenticate.
  2. Notice line 150: `if (!record && !isDevMasterOtp)`. When `isDevMasterOtp` is true, **no record in the database is required**. An attacker does not even need to call `/api/auth/send-otp`. They can POST directly to `/api/auth/verify-otp` with any victim phone number and `otp: "123456"` to receive a valid authentication token.
  3. When SMS sending fails in non-production, the generated OTP is reflected directly in the HTTP JSON response (`devOtp`), leaking the real code.

---

#### SEC-03: Leaked Live Secrets in Root Distribution Zip Archive [P1 - High]
- **Location:** `c:\PROJECTS\farmer-tool-rental\farmer-tool-rental.zip`
- **Evidence:**
  Inspection of archive headers via `tar -tf "farmer-tool-rental.zip"` revealed:
  ```text
  krishirent/.env
  krishirent/.env.example
  krishirent/.env.local
  ```
- **Vulnerability Analysis:**
  While `.gitignore` excludes `.env*`, archive tools, manual folder compression, or developer sharing scripts bypass `.gitignore`. The zip archive distributed in the project workspace contains `.env.local` containing production database connection strings, Razorpay API secrets, Cloudinary credentials, and Firebase configuration.
- **Risk:** Anyone possessing this zip file obtains complete database and third-party API compromise.

---

#### SEC-04: Unapproved Tool Instances Instantly Bookable in Production [P1 - High]
- **Location:**
  - Creation: `src/app/api/owner/equipment/route.ts`, lines 129–145
  - Rental lookup: `src/server/services/payments.ts`, lines 116–120
  - Booking creation: `src/server/services/bookings.ts`, lines 125–129
- **Evidence:**
  ```typescript
  // src/app/api/owner/equipment/route.ts
  const instancesData = Array.from({ length: qty }).map((_, i) => ({
    assetCode: generateAssetCode(name, i + 1),
    toolId: tool.id,
    ownerId: userId,
    status: ToolInstanceStatus.AVAILABLE, // <--- IMMEDIATELY AVAILABLE
    currentCustodianId: userId,
    pricePerDay: ratePaise,
    deposit: depPaise,
    images: [toolImage],
    conditionGrade: typeof conditionGrade === "string" ? conditionGrade : "GOOD",
    verificationStatus: VerificationStatus.PENDING, // <--- PENDING APPROVAL
    notes: description,
  }))
  ```
  ```typescript
  // src/server/services/payments.ts
  const instances = await prisma.toolInstance.findMany({
    where: {
      toolId: tool.id,
      status: { in: ["AVAILABLE", "RETURNED", "INSPECTION"] }, // <--- DOES NOT CHECK verificationStatus == VERIFIED
    }, ...
  ```
- **Vulnerability Analysis:**
  The owner equipment creation handler states: `"Tool listing submitted successfully. Pending admin approval before going live."` However, it inserts the instance with `status: AVAILABLE`.
  Crucially, neither `createRazorpayOrder` nor `createBooking` checks `verificationStatus: "VERIFIED"`. They only check `status: "AVAILABLE"`.
- **Impact:** An owner can submit fraudulent, uninspected, or dangerously uncertified equipment with arbitrary pricing, and renters can immediately book and pay for it without any platform admin vetting.

---

#### SEC-05: IDOR & PII Exposure in Asset QR Code Endpoint [P1 - High]
- **Location:** `src/app/api/assets/[assetCode]/route.ts`, lines 5–27
- **Evidence:**
  ```typescript
  export async function GET(_request: NextRequest, { params }: { params: Promise<{ assetCode: string }> }) {
    const session = await getServerSession()
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
    }
    const { assetCode } = await params
    const asset = await getAssetByCode(assetCode)
    ...
    return NextResponse.json({ success: true, data: asset })
  }
  ```
  In `src/server/services/bookings.ts`, lines 1010–1065:
  ```typescript
  export async function getAssetByCode(assetCode: string) {
    const instance = await prisma.toolInstance.findUnique({
      where: { assetCode },
      include: {
        tool: true,
        owner: { select: { id: true, name: true, phone: true, village: true, taluk: true, district: true } },
        custodian: { select: { id: true, name: true, phone: true } },
        bookings: {
          where: { status: { in: [ ...ACTIVE_STATUSES... ] } },
          include: {
            farmer: { select: { id: true, name: true, phone: true } },
            servicePerformer: { select: { id: true, name: true, phone: true } },
          }, ...
  ```
- **Vulnerability Analysis:**
  Any authenticated user (any farmer or owner) can query `GET /api/assets/[assetCode]`. Because asset codes follow predictable patterns (`TL_1234_001`, `HAR_5678_002`), an attacker can iterate through asset codes or scan equipment tags in fields.
- **Impact:** Complete exposure of personal phone numbers, full names, home villages, and active rental locations of neighboring farmers and owners.

---

#### SEC-06: Rate Limiting Bypass via Spoofed `X-Forwarded-For` Headers [P1 - High]
- **Location:** `src/server/lib/rate-limit.ts`, lines 41–61
- **Evidence:**
  ```typescript
  export function getClientIp(request: Request): string {
    const realIp = request.headers.get("x-real-ip")
    if (realIp?.trim()) return realIp.trim()

    const vercelForwarded = request.headers.get("x-vercel-forwarded-for")
    if (vercelForwarded) {
      const ip = vercelForwarded.split(",")[0].trim()
      if (ip) return ip
    }

    const forwarded = request.headers.get("x-forwarded-for")
    if (forwarded) {
      const parts = forwarded.split(",").map((p) => p.trim()).filter(Boolean)
      if (parts.length > 0) return parts[0]
    }

    return "127.0.0.1"
  }
  ```
- **Vulnerability Analysis:**
  When deployed behind standard reverse proxies or in environments where `x-real-ip` is not stripped from client ingress, an attacker can specify arbitrary `X-Forwarded-For: <random-ip>`.
  Because line 57 takes `parts[0]` (the leftmost IP, which is client-supplied), rotating the header value on every request creates a new rate limit bucket in PostgreSQL (`session:ip:<random>`).
- **Impact:** Attackers can completely bypass the 10 req/min rate limit on `/api/auth/session` and the 10 req/min rate limit on `/api/auth/send-otp`, enabling high-volume SMS flooding, denial-of-service, or brute force.

---

#### SEC-07: Razorpay Verification Allows Signatures on Empty Secret [P2 - Medium]
- **Location:** `src/server/services/payments.ts`, lines 370–384
- **Evidence:**
  ```typescript
  const keySecret = process.env.RAZORPAY_KEY_SECRET || ""
  const expectedSignature = crypto
    .createHmac("sha256", keySecret)
    .update(body)
    .digest("hex")
  ```
- **Vulnerability Analysis:**
  If `RAZORPAY_KEY_SECRET` is unset, `keySecret` defaults to `""`. Node.js `crypto.createHmac("sha256", "")` calculates a valid HMAC against an empty key rather than throwing an initialization error.
- **Impact:** An attacker who discovers the secret is missing can precalculate HMAC-SHA256(`razorpayOrderId|razorpayPaymentId`, `""`) and forge verified payments.

---

#### SEC-08: Insecure Firebase Verification Fallbacks & Missing Revocation [P2 - Medium]
- **Location:** `src/lib/firebase/admin.ts`, lines 158–208, 218
- **Evidence:**
  ```typescript
  if (isDevAuthEnabled) {
    const parts = trimmed.split(".")
    if (parts.length === 3) {
      const payloadJson = Buffer.from(parts[1], "base64").toString("utf-8")
      const decoded = JSON.parse(payloadJson)
      if (decoded.sub || decoded.user_id) {
        return { uid: decoded.user_id || decoded.sub, ... }
      }
    }
  }
  ```
  ```typescript
  const decoded = await auth.verifyIdToken(trimmed)
  ```
- **Vulnerability Analysis:**
  1. The unverified JWT parsing branch accepts unsigned tokens in test/dev modes if the Admin SDK is not initialized.
  2. In production, `verifyIdToken(trimmed)` defaults to `checkRevoked = false`. When an administrator disables a malicious user account or revokes their refresh token in the Firebase Console, existing ID tokens remain valid for up to 60 minutes.

---

#### SEC-09: Identity Overwrite & Synthetic Phone Collision in User Linking [P2 - Medium]
- **Location:** `src/server/services/auth-firebase.ts`, lines 90–114
- **Evidence:**
  ```typescript
  if (existingPhoneUser) {
    user = await prisma.user.update({
      where: { id: existingPhoneUser.id },
      data: {
        firebaseUid: uid,
        phoneVerified: true, ...
  ```
  ```typescript
  const canonicalPhone = parsedPhone ? parsedPhone.normalized : `91${uid.slice(0, 10).replace(/\D/g, "").padEnd(10, "0")}`
  ```
- **Vulnerability Analysis:**
  1. If `existingPhoneUser` already has a `firebaseUid` that differs from the incoming `uid`, it blindly overwrites `firebaseUid`. If a user changes their phone or a phone number is reassigned by a telecom, the previous account owner's profile is hijacked by the new Firebase UID.
  2. If a user signs in via an identity provider without a phone number (e.g. Google OAuth or email), `canonicalPhone` generates a synthetic phone number based on digits in `uid`. If the UID has few or no digits, multiple users end up with `910000000000`, causing Prisma unique constraint crashes (HTTP 500) and denial of service.

---

#### SEC-10: Public Information Disclosure in Firebase Status API [P2 - Medium]
- **Location:** `src/app/api/auth/firebase-status/route.ts`, lines 7–31
- **Evidence:**
  ```typescript
  export async function GET() {
    const status = {
      client: { configured: ..., projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || null },
      serverAdmin: {
        configured: isFirebaseAdminConfigured(),
        hasProjectId: Boolean(...),
        hasClientEmail: Boolean(...),
        hasPrivateKey: Boolean(...),
        hasServiceAccountKey: Boolean(...),
      },
      nodeEnv: process.env.NODE_ENV,
      vercelEnv: process.env.VERCEL_ENV || null,
    }
    return NextResponse.json(status)
  }
  ```
- **Vulnerability Analysis:**
  This endpoint is completely unauthenticated. It exposes runtime environment names, Firebase project identifiers, and backend configuration status flags to anyone on the internet, aiding attacker reconnaissance.

---

#### SEC-11: Stateless Session Drift & Lack of Revocation Mechanics [P3 - Low]
- **Location:** `src/lib/auth-session.ts`, lines 25–26; `src/server/lib/auth.ts`, lines 124–141
- **Evidence:**
  Sessions are valid for 30 days (`SESSION_MAX_AGE_SECONDS = 2592000`). Once issued, the HMAC payload contains `isAdmin: true` and `capabilities: [...]`.
  When `getServerSession()` verifies the cookie, it trusts `payload.isAdmin` directly without querying the database.
- **Impact:** If an employee or tool owner is stripped of administrator status or suspended in PostgreSQL, their browser session retains administrative capabilities until token expiration (up to 30 days), unless the server secret is rotated (which logs out all users).

---

## 3. Risks & Potential Regressions

When implementing remediations, the engineering team must safeguard against the following regressions:

1. **Mobile App Token Lifecycles (Capacitor Android)**:
   - Android Capacitor clients may send `Authorization: Bearer <idToken>` headers or rely on session cookies. Hardening session validation must not break mobile API calls or webview cookie jar handling.
2. **Transactional SMS Notification Dropping**:
   - Per project guidelines, **do not remove MSG91** from `src/server/lib/sms.ts`. Booking lifecycle flows (e.g., `transitionBooking`, operator auto-rejections, and deposit resolution) depend on `sendSmsNotification` to notify farmers and owners.
3. **Database Connection Saturation from Rate Limiting & Auth**:
   - `checkRateLimit` executes a PostgreSQL `upsert` on every request. If session validation adds another database lookup per request, database connection pools (Supabase/Prisma) could be saturated under peak load. In-memory caching or Redis must be considered.
4. **Automated Integration & E2E Test Suite Breakage**:
   - Disabling `mock_firebase_*` tokens and master OTPs without updating test configurations (`NODE_ENV === "test"`) will cause integration tests (`tests/auth-firebase.test.ts`, `tests/auth-lifecycle.test.ts`) to fail.
5. **Legitimate Farmer Social Logins**:
   - Requiring phone numbers must provide a graceful UI prompt if a user registers via Google OAuth rather than failing with an unhandled exception.

---

## 4. Recommended Security Hardening

### 4.1 Remediation Actions by Severity

#### Immediate P0 Actions:
1. **Enforce Strict Session Secret Validation:**
   In `src/lib/auth-session.ts`, eliminate the hardcoded string fallback. If neither `SESSION_SECRET` nor `NEXTAUTH_SECRET` is set in production, throw an unrecoverable error during startup:
   ```typescript
   function getSecretKey(): string {
     const secret = process.env.SESSION_SECRET || process.env.NEXTAUTH_SECRET
     if (!secret) {
       if (process.env.NODE_ENV === "production") {
         throw new Error("[SECURITY CRITICAL] SESSION_SECRET must be configured in production.")
       }
       return "obele-dev-secret-key-local-development-only-32char"
     }
     return secret
   }
   ```
2. **Eliminate the Master OTP Backdoor:**
   In `src/server/services/auth.ts`, remove `process.env.NODE_ENV !== "production"` from the master OTP evaluation. Strictly restrict master OTPs to test environments:
   ```typescript
   const isTestEnv = process.env.NODE_ENV === "test"
   const isDevMasterOtp = isTestEnv && (cleanedOtp === "123456" || cleanedOtp === "000000")
   ```
   Never echo `devOtp` in API responses outside of unit test execution.

#### P1 Actions:
3. **Purge Leaked Credentials & Rotate Secrets:**
   - Immediately delete `c:\PROJECTS\farmer-tool-rental\farmer-tool-rental.zip` and any distributed archives containing `.env.local`.
   - Rotate all credentials in `.env.local`: Database password, Razorpay Key Secret, Webhook Secret, Resend API Key, Cloudinary Secrets, and Firebase Service Account private keys.
   - Update `.gitignore` to prevent `.env.example` from being ignored by changing:
     ```gitignore
     .env*
     !.env.example
     ```
4. **Enforce Equipment Approval in Rental Queries:**
   In `src/app/api/owner/equipment/route.ts`, initialize tool instances with `status: ToolInstanceStatus.MAINTENANCE` or ensure checkout and booking queries filter by verification:
   ```typescript
   // In src/server/services/payments.ts & bookings.ts
   where: {
     toolId: tool.id,
     status: ToolInstanceStatus.AVAILABLE,
     verificationStatus: VerificationStatus.VERIFIED, // Strictly require admin approval
   }
   ```
5. **Authorize Asset QR Lookup & Mask PII:**
   In `src/app/api/assets/[assetCode]/route.ts`:
   - Only return sensitive renter/owner phone numbers and coordinates if the calling user is the assigned farmer, tool owner, operator, or admin.
   - For public scanning, return only equipment model, safety instructions, and catalog specifications.
6. **Harden Client IP Resolution:**
   In `src/server/lib/rate-limit.ts`, reject client-controlled headers unless configured behind a known, trusted reverse proxy:
   - On Vercel: use `x-vercel-forwarded-for` or `x-real-ip`.
   - If behind a standard proxy, configure the proxy to strip untrusted `X-Forwarded-For` from external clients.
   - Do not trust `parts[0]` if clients can prepend arbitrary IPs.

#### P2 Actions:
7. **Strict Signature Checks in Razorpay Verification:**
   In `src/server/services/payments.ts`, throw `PaymentServiceError(500)` if `RAZORPAY_KEY_SECRET` is missing or empty.
8. **Add Revocation Checking in Firebase Admin SDK:**
   In `src/lib/firebase/admin.ts`, pass `checkRevoked: true` to `auth.verifyIdToken(trimmed, true)`.
9. **Prevent UID Hijacking in User Linking:**
   In `src/server/services/auth-firebase.ts`, if `existingPhoneUser.firebaseUid` is already populated and does not match `uid`, reject linking with `FirebaseUserLinkingError(409)` to prevent phone-recycle hijacking. Require phone number verification for all farmer accounts.
10. **Restrict Firebase Status Endpoint:**
    Protect `src/app/api/auth/firebase-status/route.ts` with `requireAdmin()` or disable it in production deployments.

#### P3 Actions:
11. **Session Versioning / Revocation Check:**
    Add a `tokenVersion` or `sessionVersion` integer to the Prisma `User` model. Check this version in `getServerSession()` or use Redis-based blacklisting for invalidated sessions.

---

## 5. Affected Files & Ownership

| Component | File Path | Risk / Concern | Remediation Owner |
|---|---|---|---|
| **Session Cryptography** | `src/lib/auth-session.ts` | Static fallback secret key | Auth / Core Security Team |
| **Session API** | `src/app/api/auth/session/route.ts` | Rate limit bypass & cookie flags | Auth Team |
| **Firebase Admin SDK** | `src/lib/firebase/admin.ts` | Unverified JWT parsing & unrevoked tokens | Auth / Infrastructure Team |
| **Firebase Linking** | `src/server/services/auth-firebase.ts` | UID overwrite & synthetic phone collisions | User Management Team |
| **Auth Guards** | `src/server/lib/auth-guard.ts` | Stateless admin privilege persistence | Security & API Team |
| **OTP Service** | `src/server/services/auth.ts` | Master OTP backdoor & OTP reflection | Auth Team |
| **Equipment API** | `src/app/api/owner/equipment/route.ts` | Unapproved instance instant availability | Inventory / Marketplace Team |
| **Payment Service** | `src/server/services/payments.ts` | Empty secret handling; unverified tool rental | Payments & Billing Team |
| **Asset Tracking** | `src/app/api/assets/[assetCode]/route.ts` | BOLA / IDOR exposing farmer PII | Equipment Tracking Team |
| **Rate Limiter** | `src/server/lib/rate-limit.ts` | IP spoofing & DB table contention | Infrastructure Team |
| **Diagnostic API** | `src/app/api/auth/firebase-status/route.ts` | Public environment fingerprinting | DevOps Team |
| **Repository Hygiene** | `.gitignore`, `farmer-tool-rental.zip` | Leaked credentials in zip archive | Release Engineering |

---

## 6. Tests Needed

To prevent regressions and verify remediations, the following test suites must be created:

### 1. Cryptographic Key & Session Verification Tests
- **Test 1.1:** Startup aborts when `NODE_ENV === "production"` and `SESSION_SECRET` is missing.
- **Test 1.2:** Session tokens signed with the static default secret are rejected when a valid `SESSION_SECRET` is configured.
- **Test 1.3:** Session cookie cannot be parsed or altered by tampering with the payload signature.

### 2. Authentication Bypass & OTP Tests
- **Test 2.1:** Master OTP (`123456`, `000000`) is rejected with HTTP 400 when `NODE_ENV !== "test"`.
- **Test 2.2:** Verify `/api/auth/verify-otp` rejects OTP attempts when no corresponding `OtpRequest` exists in the database.
- **Test 2.3:** Verify `/api/auth/send-otp` response JSON does **not** include `devOtp` attribute under any circumstances in production or preview environments.

### 3. Equipment Approval & Catalog Isolation Tests
- **Test 3.1:** Create tool instance via `POST /api/owner/equipment` and verify it has `verificationStatus: PENDING`.
- **Test 3.2:** Attempt `createRazorpayOrder` against a `PENDING` tool instance and verify it throws `400 No units available`.
- **Test 3.3:** Transition instance to `VERIFIED` via admin review and verify `createRazorpayOrder` now succeeds.

### 4. Asset QR Code & Tenant Isolation Tests
- **Test 4.1:** Verify unauthenticated request to `/api/assets/[assetCode]` returns HTTP 401.
- **Test 4.2:** Authenticate as User B (unrelated farmer) and request `/api/assets/[assetCode]` for User A's tool. Verify farmer and owner contact numbers are masked or omitted.
- **Test 4.3:** Authenticate as User A (owner) or assigned operator and verify complete operational details are accessible.

### 5. Rate Limiting Spoofing Tests
- **Test 5.1:** Send 15 consecutive requests to `/api/auth/session` with alternating `X-Forwarded-For: 10.0.0.X` headers from the same client connection; verify the requests are throttled at request 11.
- **Test 5.2:** Verify `Retry-After` and `X-RateLimit-*` headers conform to RFC 6585.

### 6. Payment Signature Integrity Tests
- **Test 6.1:** Verify `verifyRazorpayPayment` throws HTTP 500 if `RAZORPAY_KEY_SECRET` is unset.
- **Test 6.2:** Verify payment verification rejects mismatched signatures with HTTP 400 and marks pending payments as `FAILED`.

---

## 7. Priority Classification

### P0 — Critical (Immediate Deployment Blocker)
- **SEC-01:** Remove static default secret key fallback from `src/lib/auth-session.ts`; enforce fail-fast startup check.
- **SEC-02:** Remove `NODE_ENV !== "production"` master OTP bypass from `src/server/services/auth.ts`. Restrict dev OTPs strictly to unit tests.

### P1 — High (Remediate Before Public Pilot Release)
- **SEC-03:** Delete workspace zip archives containing `.env.local` and rotate all database, payment, and cloud credentials.
- **SEC-04:** Enforce `verificationStatus === "VERIFIED"` in `createRazorpayOrder` and `createBooking` queries.
- **SEC-05:** Authorize `GET /api/assets/[assetCode]` to prevent PII harvesting of farmer contact info.
- **SEC-06:** Harden `getClientIp` against `X-Forwarded-For` spoofing.

### P2 — Medium (Remediate in Next Sprint Cycle)
- **SEC-07:** Throw error on missing `RAZORPAY_KEY_SECRET` in payment verification.
- **SEC-08:** Enable `checkRevoked: true` on `auth.verifyIdToken`.
- **SEC-09:** Prevent UID overwrites on existing accounts during Firebase linking; validate phone requirement.
- **SEC-10:** Secure or decommission `/api/auth/firebase-status`.

### P3 — Low (Architectural Enhancement)
- **SEC-11:** Introduce session versioning / token revocation tracking in PostgreSQL to invalidate compromised 30-day session cookies.
- **SEC-12:** Clean up legacy NextAuth routes once all mobile and web flows standardize on `/api/auth/session`.
