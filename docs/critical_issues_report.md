# Critical Issues Report — KrishiRent (O~Bele)

Comprehensive audit of the codebase ranked by severity. Each issue includes the affected file(s), what can go wrong, and a recommended fix.

---

## 🔴 Severity 1 — Critical (Exploitable / Data Loss / Money Loss)

### 1. Unauthenticated Payment Record Creation
**Impact: Anyone on the internet can create fake payment records for any booking**

[`/api/payments/route.ts`](file:///c:/PROJECTS/farmer-tool-rental/krishirent/src/app/api/payments/route.ts) has **zero authentication**. The `POST` handler blindly accepts `bookingId`, `amount`, and `razorpayOrderId` from the request body with no session check, no `requireAuth()`, and no validation that the caller owns the booking.

An attacker can:
- Create payment records with arbitrary amounts (different from the real order total)
- Associate fabricated Razorpay order IDs with real bookings
- Potentially confuse the webhook reconciliation flow

```diff
// route.ts — missing auth
 export async function POST(request: NextRequest) {
+  const session = await getServerSession()
+  if (!session?.user) {
+    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
+  }
   // ... rest
```

> [!CAUTION]
> This is the single most exploitable issue in the codebase. Fix immediately.

---

### 2. `.env.example` Ships a Real NEXTAUTH_SECRET
**Impact: If anyone copies the example as-is, every production session is signed with a publicly known key**

[`.env.example:11`](file:///c:/PROJECTS/farmer-tool-rental/krishirent/.env.example#L11) contains:
```
NEXTAUTH_SECRET="76kK664X0oXLbKSKNOB8APFWkJVufiJB3bSBkHgd+fY="
```
This is a base64-encoded 32-byte value — it looks deliberately generated. If deployed to production with this value, any attacker can forge valid JWTs.

**Fix:** Replace with a placeholder like `"CHANGE_ME_generate_with_openssl_rand_base64_32"`.

---

### 3. OTP Stored in Plaintext in the Database
**Impact: A database breach leaks every active OTP, allowing account takeover**

[`auth.ts:80-81`](file:///c:/PROJECTS/farmer-tool-rental/krishirent/src/server/services/auth.ts#L80-L81) stores the raw OTP string directly:
```ts
await prisma.otpRequest.create({
  data: { phone: normalized, otp, expiresAt, ip },
})
```

And [`auth.ts:144`](file:///c:/PROJECTS/farmer-tool-rental/krishirent/src/server/services/auth.ts#L144) compares it as `record.otp !== cleanedOtp`.

Any DB dump (SQL injection, backup theft, insider access) gives attackers every live OTP. **Hash the OTP before storage** (bcrypt or SHA-256 with a per-OTP salt) and compare hashes on verification.

---

### 4. `SelfOperatePermission` Relation Names Are Swapped
**Impact: Queries for "permissions granted TO this farmer" silently return "permissions granted BY this farmer", and vice-versa**

In [`schema.prisma:264-265`](file:///c:/PROJECTS/farmer-tool-rental/krishirent/prisma/schema.prisma#L264-L265):
```prisma
farmer   User @relation("SelfOperateGrantor", fields: [farmerId], ...)
toolOwner User @relation("SelfOperateGrantee", fields: [toolOwnerId], ...)
```

The **farmer** is labeled `"SelfOperateGrantor"` (the one granting) and the **toolOwner** is labeled `"SelfOperateGrantee"` (the one receiving). But semantically, the **toolOwner grants** the self-operate permission **to the farmer**. The names are backwards.

On [`User` model lines 146-147`](file:///c:/PROJECTS/farmer-tool-rental/krishirent/prisma/schema.prisma#L146-L147):
```prisma
grantedSelfOperate     SelfOperatePermission[] @relation("SelfOperateGrantee")  // ← toolOwner's
receivedSelfOperate    SelfOperatePermission[] @relation("SelfOperateGrantor")  // ← farmer's
```
So `user.grantedSelfOperate` returns permissions where the user is the **toolOwner** (correctly named) but the relation label "Grantee" is wrong. This hasn't caused runtime bugs because the foreign keys are correct, but it will mislead any developer querying these relations.

**Fix:** Swap the relation names or rename to `SelfOperateFarmer` / `SelfOperateOwner` for clarity.

---

### 5. Booking Pricing Ignores the `deposit` Field
**Impact: Deposits are always ₹0 even when `Tool.deposit > 0`, rendering the entire deposit-resolution subsystem inert**

[`booking-pricing.ts:134`](file:///c:/PROJECTS/farmer-tool-rental/krishirent/src/server/lib/booking-pricing.ts#L134):
```ts
const deposit = 0  // ← hardcoded, ignores tool.deposit
```

The `Tool` model has a `deposit` field, and there's an entire [`deposit-resolution.ts`](file:///c:/PROJECTS/farmer-tool-rental/krishirent/src/server/lib/deposit-resolution.ts) subsystem (240+ lines) plus deposit-related Payment fields (`depositFrozen`, `depositDeducted`, etc.). None of this ever activates because deposit is always 0.

If this is intentional (MVP), it should be documented. If not, it's a **money-losing bug** — tool owners get no deposit protection.

**Fix:** Change to `const deposit = tool.deposit` or add an explicit comment + TODO.

---

## 🟠 Severity 2 — High (Security / Reliability)

### 6. IP-Based Rate Limiting Trusts `X-Forwarded-For` Without Validation
**Impact: Attackers can bypass all rate limits by sending a fake header**

[`rate-limit.ts:41-49`](file:///c:/PROJECTS/farmer-tool-rental/krishirent/src/server/lib/rate-limit.ts#L41-L49):
```ts
export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for")
  if (forwarded) {
    const ip = forwarded.split(",")[0].trim()
    if (ip) return ip
  }
  // ...
}
```

Any client can set `X-Forwarded-For: random-ip` to evade IP rate limits on OTP send/verify. This must be restricted to only trust headers set by your reverse proxy (e.g., Vercel, Nginx).

---

### 7. JWT Callback Hits the Database on Every Request
**Impact: Every authenticated API call or page load triggers a `findUnique` + `include` query**

[`auth.ts:88-107`](file:///c:/PROJECTS/farmer-tool-rental/krishirent/src/server/lib/auth.ts#L88-L107) — the `jwt` callback queries `prisma.user.findUnique({ include: { capabilities: true } })` on **every** token refresh. For a production app with concurrent users, this is a major database bottleneck.

**Fix:** Only query the DB when `user` is present (initial sign-in) or add a TTL/staleness check. Cache capabilities in the token and refresh periodically.

---

### 8. Google OAuth Falls Back to Dummy Credentials Silently
**Impact: If Google env vars are unset, NextAuth configures a non-functional Google provider with no warning**

[`auth.ts:72-74`](file:///c:/PROJECTS/farmer-tool-rental/krishirent/src/server/lib/auth.ts#L72-L74):
```ts
GoogleProvider({
  clientId: process.env.GOOGLE_CLIENT_ID || "dummy-google-client-id",
  clientSecret: process.env.GOOGLE_CLIENT_SECRET || "dummy-google-client-secret",
})
```

This means Google login always appears in the UI even when not configured, and clicking it will fail with a cryptic error. Either **conditionally register** the provider or **throw at startup** if credentials are missing.

---

### 9. Order Reference Collision Risk
**Impact: Under high concurrency, `Date.now()` + 4-char random can collide, causing a unique-constraint failure**

[`payments.ts:203`](file:///c:/PROJECTS/farmer-tool-rental/krishirent/src/server/services/payments.ts#L203) and [`bookings.ts:155`](file:///c:/PROJECTS/farmer-tool-rental/krishirent/src/server/services/bookings.ts#L155-L156):
```ts
orderRef: `ORD${Date.now()}${Math.random().toString(36).slice(2, 6).toUpperCase()}`
bookingRef: `BK${Date.now()}${Math.random().toString(36).slice(2, 6).toUpperCase()}`
```

`Math.random()` has ~4 chars of entropy (≈ 1.7M possibilities), and multiple concurrent requests in the same millisecond can collide. Use `crypto.randomUUID()` or a proper ID generator.

---

## 🟡 Severity 3 — Medium (Logic / Data Integrity)

### 10. Owner-SLA Auto-Cancel Doesn't Process Cancellation Refund
**Impact: Farmer's payment is taken but not refunded when an owner times out**

[`owner-sla.ts:23-37`](file:///c:/PROJECTS/farmer-tool-rental/krishirent/src/server/lib/owner-sla.ts#L23-L37) transitions the booking to `CANCELLED_BY_PLATFORM` and logs it, but does **not** call `computeCancellationPolicy()` or update the `Payment` record with refund amounts. The SMS says "No payment was taken" but by this point the payment is already `CAPTURED` (it was captured when the booking moved from `REQUESTED` to `OWNER_PENDING`).

**Fix:** Apply the same cancellation-refund logic as `transitionBooking()` does for cancellations.

---

### 11. Razorpay Mock Order Silently Created in Non-Production
**Impact: Development/staging payments appear to succeed but no real money moves**

[`payments.ts:247-271`](file:///c:/PROJECTS/farmer-tool-rental/krishirent/src/server/services/payments.ts#L246-L272) falls back to mock order IDs when Razorpay keys are placeholder or when the API call fails in non-production. This is fine for local dev, but dangerous if a staging environment is used with real users — they'll think they paid but no Razorpay order exists.

**Fix:** At minimum, log a `[WARN]` and include a `mock: true` flag in the API response so the frontend can display a warning.

---

### 12. `bcryptjs` Listed as a devDependency
**Impact: If bcrypt is used in production auth flows, it won't be installed in a production `npm ci`**

[`package.json:81`](file:///c:/PROJECTS/farmer-tool-rental/krishirent/package.json#L81) has `"bcryptjs": "^2.4.3"` under `devDependencies`. While no `import` of bcrypt exists in the current source (the `passwordHash` field on `User` is unused), this signals either dead code or a future regression waiting to happen.

**Fix:** Either move to `dependencies` if needed, or remove it and the `passwordHash` column from the schema.

---

### 13. `updateBooking` Service Accepts Unchecked Prisma Input
**Impact: Any caller of `updateBooking()` can set arbitrary fields including `status`, `totalAmount`, `farmerId`**

[`bookings.ts:218-220`](file:///c:/PROJECTS/farmer-tool-rental/krishirent/src/server/services/bookings.ts#L218-L220):
```ts
export async function updateBooking(id: string, data: Prisma.BookingUncheckedUpdateInput) {
  return prisma.booking.update({ where: { id }, data })
}
```

This is a pass-through with no field whitelist. While it may not currently be exposed directly in API routes, it's a footgun for future developers.

---

## Summary Ranking

| Rank | Issue | Severity | Category |
|------|-------|----------|----------|
| **1** | Unauthenticated `/api/payments` POST | 🔴 Critical | Security |
| **2** | Real NEXTAUTH_SECRET in `.env.example` | 🔴 Critical | Security |
| **3** | OTP stored in plaintext | 🔴 Critical | Security |
| **4** | SelfOperatePermission relation names swapped | 🔴 Critical | Data Integrity |
| **5** | Deposit always hardcoded to ₹0 | 🔴 Critical | Business Logic |
| **6** | Rate limiter trusts spoofable `X-Forwarded-For` | 🟠 High | Security |
| **7** | JWT callback queries DB on every request | 🟠 High | Performance |
| **8** | Google OAuth dummy credentials fallback | 🟠 High | Reliability |
| **9** | Order/booking ref collision risk | 🟠 High | Data Integrity |
| **10** | Owner-SLA cancel doesn't refund | 🟡 Medium | Business Logic |
| **11** | Silent mock Razorpay orders in staging | 🟡 Medium | Reliability |
| **12** | `bcryptjs` in devDependencies | 🟡 Medium | Build |
| **13** | `updateBooking` no field whitelist | 🟡 Medium | Security |
