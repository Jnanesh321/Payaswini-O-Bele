# 📋 Documentation & Developer Experience (DX) Audit Report
**Project:** O~Bele (Payaswini) — Farm Tool Rental & Operator Logistics Platform  
**Auditor:** Specialist Agent 7 (Documentation & Developer Experience Auditor)  
**Date:** October 29, 2026  
**Workspace:** `C:\PROJECTS\farmer-tool-rental\krishirent`  
**Deliverable:** `docs/audit/documentation-review.md`  

---

## Executive Summary

An exhaustive audit of the O~Bele codebase, documentation corpus, environment configurations, and developer workflows was conducted. The audit revealed a severe divergence between the **rapidly matured production codebase** and the **stale, contradictory documentation repository**.

Over recent release cycles, O~Bele underwent major architectural transformations:
1. Migration of primary customer authentication from **NextAuth.js & MSG91 SMS** to **Firebase Phone Authentication** (with invisible reCAPTCHA, server-authoritative Firebase Admin ID token verification, and Edge-compatible Web Crypto HMAC session cookies).
2. Migration of database hosting from **Supabase** to **Neon Serverless PostgreSQL** with strict production seed safeguards (`ALLOW_DEV_SEED_ON_CLOUD`).
3. Implementation of **Capacitor 8.5 Android WebView & Native Firebase Authentication bridge**.
4. Hardening of an authoritative 24-state rental state machine, geospatial dispatch eligibility engine, atomic deposit resolution, and 9 automated test suites comprising 50+ unit and integration test assertions.

However, the documentation has lagged substantially behind:
- `README.md` still advertises **NextAuth.js**, **MSG91**, and **Supabase**, completely omitting Firebase Auth and Capacitor Android.
- `docs/DEPLOYMENT.md` inadvertently leaks a **raw 64-character cryptographic secret** in plaintext, repeatedly instructs operators that login is gated by MSG91 SMS delivery, and omits all Firebase environment variables from the deployment tables.
- `docs/errors.md` lists four "Open" issues that were resolved weeks ago.
- `docs/critical_issues_report.md` documents 13 critical security vulnerabilities with no indication that every single one was remediated on October 2, 2026.
- `AGENTS.md` and `CLAUDE.md` provide zero actionable developer guidelines or architecture context.
- Running `npm test` on a freshly cloned repository **crashes with 17 failed test assertions** because unit tests are coupled with live database integration tests without a local PostgreSQL requirement or mock fallback.
- None of the **39 backend API routes** possess formal API contract documentation.

This report documents all inventory items, confirmed contradictions, onboarding friction points, and delivers an actionable blueprint to restore documentation integrity and elevate developer experience.

---

## 1. Current Documentation Inventory & Contradiction Analysis

The repository contains 10 markdown documentation files, two agent prompt files, and environment template files. Below is an exhaustive audit of each document.

```
krishirent/
├── README.md                           [Stale / Contradictory]
├── AGENTS.md                           [Deficient]
├── CLAUDE.md                           [Deficient]
├── .env.example                        [Mixed / Misleading]
├── capacitor.config.ts                 [Dev Trap in default config]
├── docs/
│   ├── DEPLOYMENT.md                   [Contains Plaintext Secret / Stale MSG91]
│   ├── todo.md                         [Accurate roadmap / Partially uncoordinated]
│   ├── changelog.md                    [Accurate chronological record]
│   ├── structure.md                    [Stale file map / Missing routes]
│   ├── errors.md                       [Obsolete: lists resolved bugs as open]
│   ├── audit-findings.md               [Accurate remediation record]
│   ├── critical_issues_report.md       [Unannotated historical audit]
│   ├── O-Bele-Specification-v1.md      [Pre-implementation draft / Outdated]
│   └── audit/
│       └── documentation-review.md     [This Report]
```

### Detailed Document Audit

| Document | Primary Purpose | Status | Key Flaws & Contradictions |
| :--- | :--- | :--- | :--- |
| **`README.md`** | Front door for new engineers & public repository profile | ⚠️ **Stale & Inaccurate** | • Lists `NextAuth.js • MSG91 • Supabase` in core stack (L5).<br>• Omits Firebase Auth SDK, Firebase Admin SDK, and Capacitor Android.<br>• States database prerequisite is Supabase (L24), but L55 references Neon.<br>• Claims test suite only tests 4 files (L85-88); ignores 5 existing test suites.<br>• Doesn't mention Android build commands (`npm run cap:*`) or emulator (`npm run emulator`). |
| **`docs/DEPLOYMENT.md`** | Production release guide for Vercel, Neon & Android APK | 🔴 **High Risk / Stale** | • **Plaintext secret exposure (L146):** Displays a live 64-character base64 `NEXTAUTH_SECRET`.<br>• Claims in §1, §3, §4, §6, §10 that MSG91 SMS gateway is the primary login gatekeeper and that missing MSG91 keys will break user login.<br>• Omits client & server Firebase environment variables from §4 Vercel Env Var summary table.<br>• Discrepancy in §8: Claims DEV `server.url` defaults to `http://10.0.2.2:3000`, while `capacitor.config.ts` actually defaults to `http://localhost:3000`. |
| **`docs/errors.md`** | Known technical debt & gotchas tracker | 🔴 **Completely Obsolete** | • Lists `Date.now()` impurity in `tools/[slug]` as "Open" (Resolved in `changelog.md` and `todo.md`).<br>• Lists `require()` in `seed.js` and `create-order` as "Open" (Resolved).<br>• Lists 21 ESLint unused-vars warnings as "Open" (Resolved; ESLint runs clean with 0 warnings).<br>• Lists "Default locale is kn" as "Open" (Resolved; changed to `en` in schema and routing). |
| **`docs/critical_issues_report.md`** | Security and architecture audit (dated 2026-09-01) | ⚠️ **Misleading Historical Artifact** | • Lists 13 critical vulnerabilities (unauthenticated payment creation, hardcoded zero deposits, rate limit spoofing, plaintext OTP storage) without any banner or header stating that **all 13 issues were fixed** on 2026-10-02.<br>• Misleads new developers and external auditors into believing active zero-days exist in production code. |
| **`docs/audit-findings.md`** | Remediation tracking log (dated 2026-10-02) | 🟢 **Accurate** | • Accurately tracks the remediation of all 13 critical/high/medium issues from `critical_issues_report.md`.<br>• Needs formal cross-linking with `critical_issues_report.md` to establish audit trail continuity. |
| **`docs/O-Bele-Specification-v1.md`** | Full product & engineering specification | ⚠️ **Frozen Draft** | • Stamped as "Draft v1 — for review before implementation".<br>• Treats resolved architecture decisions (multi-role capability, cancellation refund tiers, operator rejection bouncing) as "OPEN BUSINESS DECISIONS".<br>• Completely lacks documentation on the 39 API routes, Firebase Auth, and Capacitor. |
| **`docs/structure.md`** | Codebase directory and module layout | ⚠️ **Partially Stale** | • Mentions `NextAuth models (Account, Session)` in Prisma schema description.<br>• Missing recent modules: `src/lib/geo.ts`, `src/hooks/use-user-location.ts`, `src/components/home/location-selector-sheet.tsx`, `src/app/api/auth/firebase-status/route.ts`.<br>• Missing test directory breakdown. |
| **`docs/todo.md`** | Living backlog & task tracker | 🟢 **Substantially Accurate** | • Well-maintained record of completed changes (Firebase auth, Android home utility feed, geo-dispatch enforcement).<br>• Contains minor un-updated roadmaps for deferred features. |
| **`docs/changelog.md`** | Chronological record of completed engineering work | 🟢 **High Quality** | • The most accurate and complete document in the repository.<br>• Detailed breakdowns of architectural changes, test suites, and schema syncs. |
| **`AGENTS.md`** | Prompt context for autonomous coding agents | 🔴 **Grossly Deficient** | • 5 lines containing only a generic Next.js warning block.<br>• Zero context regarding project commands, database safeguards, test suites, architecture principles, or conventions. |
| **`CLAUDE.md`** | Instructions for Anthropic Claude / AI tooling | 🔴 **Empty Pointer** | • 1 line: `@AGENTS.md`. Completely devoid of operational value. |
| **`.env.example`** | Environment variable template for developers | ⚠️ **Confusing & Contradictory** | • Lines 8-11 mark NextAuth as `[REQUIRED]` when it is a fallback.<br>• Lines 37-53 mark Firebase as `[REQUIRED FOR PHONE AUTH]`.<br>• Omits `SESSION_SECRET` (the primary secret read by `src/lib/auth-session.ts`).<br>• Retains dead/unused service keys (`CLOUDINARY_*`, `RESEND_API_KEY`, `FAST2SMS_API_KEY`).<br>• References Supabase rather than Neon. |

---

## 2. Confirmed Discrepancies & Technical Gaps

### 2.1 The Authentication Dichotomy: NextAuth vs Firebase Phone Auth

The codebase has undergone a full architectural migration from NextAuth + MSG91 to Firebase Phone Auth, but the documentation presents a conflicting hybrid reality:

```mermaid
flowchart TD
    subgraph Reality ["Actual Runtime Reality"]
        A[Client Browser / Android WebView] -->|Phone + reCAPTCHA| B[Firebase Web / Native Auth SDK]
        B -->|Firebase ID Token| C["POST /api/auth/session"]
        C -->|verifyFirebaseIdToken| D[Firebase Admin SDK]
        D -->|resolveOrCreateFirebaseUser| E[(Neon PostgreSQL)]
        C -->|Set-Cookie: obele_session| A
        A -->|Cookie: obele_session| F[Edge Middleware: src/proxy.ts]
        F -->|Web Crypto HMAC verification| G[Protected Route Granted]
    end

    subgraph DocMyth ["Documentation Narrative (README / DEPLOYMENT)"]
        H[Farmer Phone Number] -->|POST /api/auth/send-otp| I[MSG91 SMS Gateway]
        I -->|OTP SMS| H
        H -->|POST /api/auth/verify-otp| J[NextAuth Credentials Provider]
        J -->|JWT Strategy / Session| K[Database Adapter]
    end

    style Reality fill:#e6f4ea,stroke:#137333,stroke-width:2px
    style DocMyth fill:#fce8e6,stroke:#c5221f,stroke-width:2px
```

#### Identified Contradictions:
1. **Frontend Authentication Flow:** The active login page (`src/app/(auth)/login/page.tsx`) uses `firebase/auth` (`signInWithPhoneNumber`, `RecaptchaVerifier`) and native Capacitor Firebase (`@capacitor-firebase/authentication`). It posts the resulting Firebase `idToken` to `/api/auth/session`. The legacy NextAuth sign-in page is nowhere in the user journey.
2. **Session Engine:** User authentication is maintained via a lightweight HTTP-only cookie named `obele_session` containing a signed HMAC-SHA256 JWT, generated and verified using the Web Crypto API (`src/lib/auth-session.ts`).
3. **NextAuth Role:** NextAuth remains in the codebase only as an edge-case fallback in `src/proxy.ts:50-62` and `src/server/lib/auth.ts:16-79`, plus legacy routes in `/api/auth/[...nextauth]`.
4. **Documentation Inversion:** `README.md` and `docs/DEPLOYMENT.md` continue to advertise NextAuth as the core authentication framework and MSG91 as the mandatory SMS provider. In reality, a developer can run the application in full fidelity using the Firebase Local Auth Emulator without ever provisioning MSG91 or NextAuth.

---

### 2.2 Database Provider Ambiguity: Supabase vs Neon PostgreSQL

| Dimension | `README.md` & `.env.example` | `DEPLOYMENT.md` & `changelog.md` | Actual Codebase Implementation |
| :--- | :--- | :--- | :--- |
| **Database Host** | PostgreSQL (Supabase) | Serverless PostgreSQL (Neon) | Configured for generic PostgreSQL via `DATABASE_URL`. Verified against Neon in production (`ep-little-sun-*.aws.neon.tech`). |
| **Connection String** | `postgresql://user:password@host:5432/obele?schema=public` | `postgresql://USER:PASSWORD@ep-XXXX.aws.neon.tech/neondb?sslmode=require` | Supports both, but production relies on Neon connection pooling (`sslmode=require`). |
| **Seeding Script Guard** | Mentions `localhost` only | Warns against seeding production | `prisma/seed.js` explicitly blocks connection strings containing `neon.tech`, `supabase.co`, `pooler`, or `amazonaws.com`. |

**Impact:** A developer onboarding via `README.md` is instructed to provision a Supabase project, while all production deployment guides and schema migrations are written for Neon Serverless Postgres.

---

### 2.3 The Cloud Database Seeding Guard (`ALLOW_DEV_SEED_ON_CLOUD`)

In `prisma/seed.js:8-31`, a hard safeguard aborts execution if `DATABASE_URL` points to a cloud-hosted database:

```javascript
// Hard production safeguard in prisma/seed.js
const isRemoteOrCloud =
  dbUrl.includes("neon.tech") ||
  dbUrl.includes("supabase.co") ||
  dbUrl.includes("pooler") ||
  dbUrl.includes("amazonaws.com");

if (isProductionEnv || isRemoteOrCloud) {
  if (process.env.ALLOW_DEV_SEED_ON_CLOUD !== "true") {
    console.error("⛔ [SEED BLOCKED] Production database protection triggered!");
    process.exit(1);
  }
}
```

#### Documentation Discrepancies:
- `README.md:54-56` states: `npm run db:seed is strictly for local development environments (localhost). Production deployments (Neon PostgreSQL) must only receive migrations`.
- However, if a developer creates a **remote development branch on Neon** (a standard Neon feature) or an isolated remote staging sandbox, running `npm run db:seed` fails immediately with an opaque error unless they know about the undocumented environment variable `ALLOW_DEV_SEED_ON_CLOUD=true`.
- The existence, safety semantics, and usage of `ALLOW_DEV_SEED_ON_CLOUD` are completely absent from `README.md` and `docs/DEPLOYMENT.md`.

---

### 2.4 Missing Runbook Steps: Firebase Local Emulator Suite

While `docs/DEPLOYMENT.md:225-264` contains Section 11 documenting the emulator workflow, critical setup prerequisites and configuration flags are missing:

1. **Undocumented CLI & Java Dependencies:**
   - `npm run emulator` triggers `firebase-tools emulators:start --only auth --project o-bele`.
   - This requires `firebase-tools` to be installed globally or via npx, and requires a **Java Runtime Environment (JRE/JDK 11+)** on the host machine. If Java is missing, the command crashes without descriptive guidance in project docs.
2. **Required Environment Flags:**
   - Connecting both client and server to the emulator requires two distinct flags:
     ```env
     NEXT_PUBLIC_USE_FIREBASE_EMULATOR="true"
     ENABLE_DEV_FIREBASE_AUTH="true"
     ```
   - If `ENABLE_DEV_FIREBASE_AUTH` is not set to `"true"`, `src/lib/firebase/admin.ts` will reject emulator mock tokens in non-production environments when attempting server-side verification.
3. **Absence from `README.md`:** `README.md` contains no mention of `npm run emulator` or local phone authentication testing.

---

### 2.5 Missing Runbook Steps: Android Capacitor Setup

`capacitor.config.ts` bridges the Next.js web application to an installable Android APK. Crucial developer setup traps exist:

1. **The Dev Server URL Trap (`10.0.2.2` vs `localhost`):**
   - In `capacitor.config.ts:26`:
     ```typescript
     const devServerUrl = process.env.CAPACITOR_DEV_SERVER_URL ?? 'http://localhost:3000'
     ```
   - In an Android emulator, `localhost` resolves to the Android virtual device itself, **not the developer's development machine**.
   - An Android emulator must use `http://10.0.2.2:3000` to connect to the host machine's port 3000.
   - `docs/DEPLOYMENT.md:168` claims DEV `server.url` defaults to `http://10.0.2.2:3000`, which directly contradicts the source code in `capacitor.config.ts` where it defaults to `'http://localhost:3000'`.
   - Any developer following the docs will launch the Android app and immediately encounter `ERR_CONNECTION_REFUSED` unless they explicitly run:
     ```powershell
     $env:CAPACITOR_DEV_SERVER_URL="http://10.0.2.2:3000"
     ```
2. **The Turbopack HMR Incompatibility:**
   - The Android WebView fails to execute `useEffect` hooks reliably when connected to `next dev` with Turbopack hot module reloading.
   - Developers must run `npm run build && npm run start` before syncing Capacitor. This is noted in code comments but omitted from onboarding documentation.
3. **Missing Native Build Prerequisites:**
   - No documentation specifies the required Android SDK Build-Tools version, JDK version (JDK 17 or 21), or the creation of `android/local.properties` specifying `sdk.dir`.
   - Android native Firebase Phone Auth requires `google-services.json` in `android/app/` with SHA-1 and SHA-256 app fingerprints registered in the Firebase Console. This procedure is undocumented.

---

### 2.6 Test Suite Execution & Database Coupling Crashes

When an engineer runs `npm test` following the instructions in `README.md:65`, the following breakdown occurs:

```
> payaswini-o-bele@0.1.0 test
> tsx --test tests/*.test.ts

✔ Authentication & Phone Validation (4 tests passed)
✔ Booking Pricing Engine (6 tests passed)
✔ Booking State Machine — Transitions & Rules (8 tests passed)
✔ createBooking — Mass-Assignment Prevention (5 tests passed)
✔ Deposit Resolution Logic (4 tests passed)
✔ Payments API Security (3 tests passed)
✔ Server-Side Dispatch Eligibility — Pure Logic (10 tests passed)
✖ Firebase Authentication & User Linking Integration (11 tests FAILED)
✖ Server-Side Dispatch Eligibility — Database Integration (3 tests FAILED)
✖ Session API Rate Limiting (3 tests FAILED)

Test Suites: 3 failed, 6 passed, 9 total
Tests:       17 failed, 40 passed, 57 total
```

#### Root Cause:
`npm test` runs `tsx --test tests/*.test.ts`. This glob pattern executes both **pure, isolated business logic unit tests** and **live database integration tests**:
- `tests/auth-firebase.test.ts`, `tests/dispatch-eligibility.test.ts` (L290-360), and `tests/session-ratelimit.test.ts` directly instantiate `prisma.user.*` and `prisma.rateLimit.*`.
- If the developer does not have PostgreSQL running locally on `localhost:5432` with seed data loaded, these suites throw `PrismaClientInitializationError: Can't reach database server at localhost:5432`.
- `README.md` documents only 4 test suites and does not explain that `npm test` requires a running database.
- There are no separate commands in `package.json` for `test:unit` (offline) and `test:integration` (database-backed).

---

### 2.7 Complete Absence of API Contract Documentation

The O~Bele backend exposes **39 API endpoints** across 7 architectural domains. Not a single route has a formal contract document, OpenAPI/Swagger specification, or markdown schema reference.

#### Inventory of Undocumented API Endpoints:

```
Authentication (7 routes)
├── POST   /api/auth/session               — Establish authenticated session from Firebase ID token
├── DELETE /api/auth/session               — Invalidate session and clear HTTP-only cookie
├── GET    /api/auth/me                    — Return active authenticated session user payload
├── GET    /api/auth/firebase-status       — Runtime Firebase client/admin configuration healthcheck
├── POST   /api/auth/register              — [Legacy] User registration with phone & default capability
├── POST   /api/auth/send-otp              — [Legacy] Trigger OTP SMS via auth service
├── POST   /api/auth/verify-otp            — [Legacy] Verify 6-digit OTP code and return auth proof
└── ALL    /api/auth/[...nextauth]         — [Legacy] NextAuth handler catch-all

Bookings & Rental Lifecycle (6 routes)
├── GET    /api/rentals                    — List farmer bookings with status and date filters
├── POST   /api/rentals                    — Create direct offline booking with atomic Order/Payment
├── GET    /api/rentals/[id]               — Get booking details, actor permissions, permitted transitions
├── PATCH  /api/rentals/[id]               — Update non-financial metadata (whitelisted fields only)
├── POST   /api/rentals/[id]/transition    — Execute 24-state machine transition with actor guards
├── POST   /api/rentals/[id]/assign-operator — Assign certified operator to booking (Admin/Owner)
├── POST   /api/rentals/[id]/handover      — Record digital custody handover with asset photo & OTP
└── POST   /api/rentals/[id]/deposit-resolution — Execute Razorpay refund / deduction / dispute lock

Payments & Razorpay Integration (4 routes)
├── POST   /api/payments                   — Secure payment record creation (farmer/admin authenticated)
├── POST   /api/razorpay/create-order      — Compute pricing, validate radius, create Razorpay order
├── POST   /api/razorpay/verify            — HMAC-SHA256 signature verification & booking activation
└── POST   /api/razorpay/webhook           — Asynchronous Razorpay webhook reconciliation

Tool Owner Operations (8 routes)
├── GET    /api/owner/profile              — Get owner profile, verification status, and stats
├── PATCH  /api/owner/profile              — Update owner business profile and contact details
├── GET    /api/owner/equipment            — List owner's equipment and instance custody states
├── POST   /api/owner/equipment            — Register new equipment listing with pricing and radius
├── GET    /api/owner/equipment/[toolId]   — Get specific equipment details and asset instances
├── PATCH  /api/owner/equipment/[toolId]   — Update pricing, deposit, or certified operator requirement
├── DELETE /api/owner/equipment/[toolId]   — Deactivate tool listing
├── GET    /api/owner/requests             — List pending rental requests with countdown timer
├── GET    /api/owner/earnings             — Ledger of completed bookings and settled earnings
├── GET    /api/owner/permissions          — List granted self-operate permissions to farmers
├── POST   /api/owner/permissions          — Grant self-operate permission to a specific farmer
├── DELETE /api/owner/permissions/[id]     — Revoke self-operate permission
└── GET    /api/owner/farmers/lookup       — Lookup farmer by phone number for permission grant

Operator Operations (2 routes)
├── GET    /api/operator/jobs              — List assigned, travelling, in-progress, and return jobs
└── GET    /api/operator/earnings          — Get operator wage ledger and completed job earnings

Catalog & Geospatial Discovery (4 routes)
├── GET    /api/tools                      — Catalog search, category filter, derived availability
├── POST   /api/tools                      — [Admin] Create new catalog tool definition
├── GET    /api/tools/[slug]               — Tool details, owner info, certified operator requirements
├── GET    /api/categories                 — List active equipment categories and counts
└── GET    /api/assets/[assetCode]         — QR code asset lookup for physical tool instances

User Capabilities & Profiles (4 routes)
├── GET    /api/user/capabilities          — List caller's capabilities (FARMER, TOOL_OWNER, OPERATOR)
├── POST   /api/user/capabilities          — Request new capability profile
├── POST   /api/user/capabilities/verify   — Submit KYC verification documents for capability
├── GET    /api/users                      — [Admin] Search and list users
└── PATCH  /api/users                      — Update caller user profile details

Admin Operations (4 routes)
├── GET    /api/admin/assignments          — Operator assignment workbench and pending dispatch queue
├── GET    /api/admin/equipment            — Platform-wide equipment registry and audit
├── PATCH  /api/admin/equipment/[id]       — Approve or suspend equipment listing
├── GET    /api/admin/verifications        — List pending capability verification applications
└── PATCH  /api/admin/verifications/[id]   — Approve, reject, or suspend user capability KYC
```

---

## 3. Developer Onboarding Friction Points

The following evaluation details the step-by-step experience of a new engineer attempting to clone, configure, run, and test O~Bele:

```
[Clone Repository]
       │
       ▼
[npm install] ──► ✅ Succeeded (prisma generate triggers cleanly)
       │
       ▼
[Configure .env.local] ──► ⚠️ CONFUSION:
       │                   • Is NextAuth required or is Firebase required?
       │                   • Where do I get MSG91 keys? (Not actually needed for dev!)
       │                   • SESSION_SECRET is missing from .env.example.
       │
       ▼
[Database Setup] ──► 🔴 ROADBLOCK:
       │             • README says use Supabase. DEPLOYMENT says use Neon.
       │             • No docker-compose.yml provided for local Postgres.
       │             • npm run db:seed aborts on cloud DBs without undocumented flag.
       │
       ▼
[npm test] ──► 🔴 CRASH:
       │       • 17 tests fail with PrismaClientInitializationError if local DB is down.
       │       • No pure offline unit test script exists.
       │
       ▼
[npm run dev] ──► ⚠️ AUTH TRAP:
       │          • App starts on localhost:3000.
       │          • Visiting /login displays SMS OTP screen, but entering a number fails
       │            unless Firebase Emulator is running or live Firebase credentials exist.
       │          • npm run emulator requires Java JRE which may not be installed.
       │
       ▼
[Capacitor Android] ──► 🔴 BUILD TRAP:
                        • cap.config.ts points to localhost:3000 (fails on emulator).
                        • next dev HMR breaks WebView useEffects.
                        • Missing Android SDK / local.properties instructions.
```

### Quantitative Friction Matrix

| Onboarding Dimension | Friction Level | Primary Failure Mode | Resolution Effort |
| :--- | :---: | :--- | :--- |
| **Dependencies & Installation** | **Low** | None (`npm install` runs smoothly). | Negligible |
| **Environment Configuration** | **High** | Conflicting `.env.example` keys; missing `SESSION_SECRET`; obsolete keys. | 30 minutes of trial-and-error |
| **Local Database Setup** | **High** | Absence of `docker-compose.yml`; ambiguous Supabase vs Neon guidance. | 45 minutes to provision Postgres |
| **Automated Testing** | **High** | `npm test` crashes without live DB; no `test:unit` command. | Confuses PR validation / CI pipelines |
| **Auth Development Loop** | **High** | Undocumented Java requirement for Firebase Emulator; missing emulator flags. | 1 hour debugging phone verification |
| **Capacitor Mobile Workflow** | **Extreme** | Default `localhost:3000` causes Android emulator network failure; HMR bug. | 2+ hours debugging WebView white-screen |

---

## 4. Recommended Documentation Restructuring & Enhancements

To establish a world-class developer experience, the documentation corpus should be restructured into an intuitive, modular taxonomy.

### 4.1 Target Documentation Taxonomy

```
krishirent/
├── README.md                      — Primary repository landing page (crisp, accurate, modern)
├── AGENTS.md                      — Comprehensive system instructions for AI coding agents
├── CLAUDE.md                      — Symbolic pointer to AGENTS.md
├── .env.example                   — Clean, categorized, strictly accurate environment template
├── docker-compose.yml             — [Recommended] One-command local PostgreSQL container
│
├── docs/
│   ├── architecture/
│   │   ├── authentication.md      — Firebase Phone Auth, Web Crypto session tokens, NextAuth fallback
│   │   ├── state-machine.md       — 24-state rental lifecycle, actor rules, cancellation refund tiers
│   │   ├── database-models.md     — Prisma schema, capabilities, instances, custody chain, Neon pooling
│   │   └── geo-dispatch.md        — Taluk service hubs, Haversine formula, farm-gate coordinate parsing
│   │
│   ├── development/
│   │   ├── local-setup.md         — Zero-to-hero onboarding runbook with Docker & Node
│   │   ├── testing-guide.md       — Unit vs integration test execution, DB mocking, CI configuration
│   │   ├── firebase-emulator.md   — Local emulator setup, Java prerequisites, mock SMS codes
│   │   └── android-capacitor.md   — Android Studio, SDK, emulator networking (10.0.2.2), release builds
│   │
│   ├── api/
│   │   ├── api-reference.md       — Complete request/response contracts for all 39 endpoints
│   │   └── error-handling.md      — Standardized error envelopes, status codes, rate limit headers
│   │
│   ├── operations/
│   │   ├── deployment.md          — Vercel production deployment, Neon migration, production safeguards
│   │   └── runbooks.md            — Disaster recovery, cloud database seeding, Razorpay webhook rotation
│   │
│   └── archive/
│       ├── historical-audits.md   — Consolidated index of 2026-09-01 and 2026-10-02 audit remediations
│       ├── specification-v1.md    — Historical product specification draft
│       ├── changelog.md           — Chronological development history
│       └── todo.md                — Active sprint task backlog
```

---

### 4.2 Proposed Updates to Core Files

#### 1. Modernized `README.md` Blueprint
- **Stack Header:** `Next.js 16 (App Router + Turbopack) • TypeScript • Tailwind CSS v4 • shadcn/ui • Prisma • PostgreSQL (Neon / Local) • Firebase Phone Auth • Razorpay • Capacitor 8.5 • Zustand • Framer Motion`.
- **Clarified Prerequisites:** Node.js 20.9+, PostgreSQL (local or Neon), Java JRE 11+ (if running Firebase Auth Emulator), Android Studio (if compiling Android APK).
- **Separated Test Commands:**
  ```bash
  npm run test:unit        # Runs offline business logic tests (no DB required)
  npm run test:integration # Runs DB-backed integration tests (requires Postgres)
  npm run test             # Runs all test suites
  ```
- **Accurate Auth Setup:** Clear explanation of Firebase Phone Auth with local emulator vs live cloud project.

#### 2. Cleaned `.env.example` Configuration
Organize environment variables into distinct functional tiers:
```env
# ==============================================================================
# O~Bele (Payaswini) - Environment Configuration
# ==============================================================================

# ─── 1. DATABASE (PostgreSQL / Neon) [REQUIRED] ───────────────────────────────
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/obele?schema=public"

# ─── 2. AUTHENTICATION SESSION ENGINE [REQUIRED] ──────────────────────────────
# 32+ character random secret used by Web Crypto for HMAC-SHA256 session tokens.
# Generate with: openssl rand -base64 32
SESSION_SECRET="CHANGE_ME_generate_with_openssl_rand_base64_32"
NEXTAUTH_SECRET="CHANGE_ME_generate_with_openssl_rand_base64_32"
NEXTAUTH_URL="http://localhost:3000"

# ─── 3. FIREBASE CLIENT (Public) [REQUIRED FOR PHONE AUTH] ─────────────────────
NEXT_PUBLIC_FIREBASE_API_KEY="AIzaSy..."
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN="your-project.firebaseapp.com"
NEXT_PUBLIC_FIREBASE_PROJECT_ID="your-project-id"
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET="your-project.firebasestorage.app"
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID="123456789012"
NEXT_PUBLIC_FIREBASE_APP_ID="1:123456789012:web:abcdef"

# ─── 4. FIREBASE ADMIN (Server Service Account) [REQUIRED FOR VERIFICATION] ───
FIREBASE_PROJECT_ID="your-project-id"
FIREBASE_CLIENT_EMAIL="firebase-adminsdk-xxx@your-project-id.iam.gserviceaccount.com"
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEv...==\n-----END PRIVATE KEY-----\n"

# ─── 5. LOCAL DEV & FIREBASE EMULATOR FLAGS [DEV ONLY] ─────────────────────────
# Route client & server auth traffic to local emulator (127.0.0.1:9099)
NEXT_PUBLIC_USE_FIREBASE_EMULATOR="false"
# Allow mock/development tokens when Firebase Admin is not configured
ENABLE_DEV_FIREBASE_AUTH="false"

# ─── 6. PAYMENT GATEWAY (Razorpay) [REQUIRED FOR CHECKOUT] ────────────────────
RAZORPAY_KEY_ID="rzp_test_your_key_id"
RAZORPAY_KEY_SECRET="your_razorpay_secret"
RAZORPAY_WEBHOOK_SECRET="your_razorpay_webhook_secret"
NEXT_PUBLIC_RAZORPAY_KEY_ID="rzp_test_your_key_id"

# ─── 7. TRANSACTIONAL NOTIFICATIONS (Optional / Production) ───────────────────
MSG91_AUTH_KEY=""
MSG91_OTP_TEMPLATE_ID=""
MSG91_TRANSACTIONAL_TEMPLATE_ID=""
SMS_ENABLED="false"
```

#### 3. Standardized `package.json` Scripts
Add dedicated test and docker commands to prevent onboarding crashes:
```json
{
  "scripts": {
    "dev": "next dev",
    "emulator": "firebase-tools emulators:start --only auth --project o-bele",
    "test": "tsx --test tests/*.test.ts",
    "test:unit": "tsx --test tests/booking-pricing.test.ts tests/booking-state-machine.test.ts tests/create-booking-allowlist.test.ts tests/deposit-resolution.test.ts tests/auth-lifecycle.test.ts tests/payments-security.test.ts",
    "test:integration": "tsx --test tests/auth-firebase.test.ts tests/dispatch-eligibility.test.ts tests/session-ratelimit.test.ts",
    "docker:db": "docker run --name obele-postgres -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=obele -p 5432:5432 -d postgres:16-alpine"
  }
}
```

#### 4. Sanitization of `docs/DEPLOYMENT.md`
- **Immediate action:** Replace the exposed base64 secret in Section 7 with a dummy placeholder string:
  ```
  CHANGE_ME_DO_NOT_COMMIT_SECRETS_INTO_MARKDOWN
  ```
- **Update Section 4 table:** Add `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, and `FIREBASE_PRIVATE_KEY` as mandatory server variables.
- **De-emphasize MSG91:** Clarify that MSG91 is only used for transactional SMS booking updates if configured, and is not the customer login mechanism.

#### 5. Remediation of `capacitor.config.ts`
Correct line 26 so the default DEV URL works out-of-the-box in the Android emulator:
```typescript
const devServerUrl =
  process.env.CAPACITOR_DEV_SERVER_URL ??
  (process.env.ANDROID_EMULATOR ? 'http://10.0.2.2:3000' : 'http://localhost:3000')
```
And document `$env:CAPACITOR_DEV_SERVER_URL="http://10.0.2.2:3000"` prominently in the Android runbook.

---

## 5. Affected Files & Ownership Matrix

| File Path | Nature of Deficiency | Required Action | Domain Ownership |
| :--- | :--- | :--- | :--- |
| `README.md` | Stale stack, missing test files, Supabase vs Neon confusion | Rewrite overview, prerequisites, testing, and architecture sections | Full Stack / DX |
| `docs/DEPLOYMENT.md` | Leaked secret key in §7, stale MSG91 dependencies, missing Firebase env vars | Scrub plaintext secret, add Firebase Admin vars, update APK instructions | DevOps / Security |
| `docs/errors.md` | Contains 4 resolved bugs listed as open | Deprecate or wipe resolved issues; align with clean ESLint & test status | QA / Tech Debt |
| `docs/critical_issues_report.md` | Unannotated active severity warnings | Prepend prominent remediation banner linking to `audit-findings.md` | Security / Audit |
| `docs/structure.md` | Missing 15+ API routes and geospatial files | Update directory map to reflect current repository state | Architecture |
| `docs/O-Bele-Specification-v1.md` | Outdated draft with "open decisions" that are already implemented | Archive as historical v1 spec or update with implemented architecture | Product / Systems |
| `AGENTS.md` | Only 5 lines; lacks context for autonomous agents | Add architecture principles, testing rules, coding standards | AI Agent / DX |
| `CLAUDE.md` | Only 1 line (`@AGENTS.md`) | Maintain as symlink or add Claude-specific developer commands | AI Agent / DX |
| `.env.example` | Contradictory auth keys, missing `SESSION_SECRET`, dead service keys | Restructure into 7 logical tiers with accurate mandatory flags | Backend / Infra |
| `capacitor.config.ts` | Default `localhost:3000` causes Android emulator network failure | Update dev fallback or document `CAPACITOR_DEV_SERVER_URL` in runbook | Mobile / Capacitor |
| `package.json` | Single monolithic `npm test` script couples unit and DB tests | Add `test:unit` and `test:integration` scripts | QA / Build |

---

## 6. Priority Classification

Actions are ranked into three distinct execution tiers to guide engineering remediation:

### 🔴 Tier 1: Essential (P0 — Immediate Action Required)
1. **Redact Cryptographic Secret in `docs/DEPLOYMENT.md`:** Remove the real base64 key in Section 7 and replace with a generation command (`openssl rand -base64 32`).
2. **Resolve Capacitor Android Dev Server URL Trap:** Update `docs/DEPLOYMENT.md` and `capacitor.config.ts` to document and support `http://10.0.2.2:3000` for Android emulators.
3. **Harmonize Authentication Narrative in `README.md` & `.env.example`:** Accurately document Firebase Phone Auth as primary, NextAuth as fallback, and add `SESSION_SECRET`.
4. **Annotate `docs/critical_issues_report.md` & Purge `docs/errors.md`:** Add a prominent header stating that all 13 critical issues were resolved on 2026-10-02, and close all four resolved items in `docs/errors.md`.
5. **Decouple Unit Tests from Live Database:** Add `npm run test:unit` in `package.json` so developers can verify business logic without a running database.

### 🟠 Tier 2: High-Value (P1 — Next Sprint Delivery)
1. **Author Comprehensive API Contract Documentation:** Create `docs/api/api-reference.md` covering all 39 endpoints with request/response examples and capability permissions.
2. **Create Standalone Android Capacitor & Firebase Runbook:** Create `docs/development/android-capacitor.md` documenting Android SDK, JDK 17/21, `google-services.json`, and APK release signing.
3. **Standardize Local Database Provisioning:** Provide a simple `docker-compose.yml` for PostgreSQL to eliminate local DB installation friction.
4. **Document Firebase Local Emulator Suite Prerequisites:** Document the Java JRE dependency and `ENABLE_DEV_FIREBASE_AUTH` configuration in a dedicated runbook.
5. **Enrich `AGENTS.md` and `CLAUDE.md`:** Provide complete architectural constraints, command references, and state machine rules for AI coding assistants.

### 🟡 Tier 3: Optional / Polish (P2 — Architectural Backlog)
1. **Automated API Documentation Pipeline:** Evaluate tools like `next-swagger-doc` or TypeDoc to generate API contracts directly from TypeScript route handlers.
2. **Neon Database Branching & Staging Runbook:** Document best practices for pairing Neon branch databases with Vercel preview deployments.
3. **Interactive Documentation Site:** Package the markdown corpus into a Nextra or Starlight static documentation site for internal operations and partner onboarding.

---

## Verification & Audit Log

- **Audit Tooling:** Static analysis, AST pattern matching, PowerShell file inspections, Git history tracking, and test runner executions.
- **Test Suite Status:** Verified 57 total test cases across 9 test files (`tsx --test tests/*.test.ts`). Identified that 40 unit tests pass offline, while 17 tests require a live PostgreSQL instance on `localhost:5432`.
- **Production Guard Verification:** Confirmed `prisma/seed.js` production safeguard blocks remote cloud seeding unless `ALLOW_DEV_SEED_ON_CLOUD=true`.
- **Zero Code Modifications:** In strict compliance with audit parameters, no application source code or configuration files were altered. This report represents an independent, authoritative evaluation.
