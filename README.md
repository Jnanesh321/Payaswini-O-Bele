# 🌾 O~Bele (Payaswini) — Farm Tool Rental & Operator Logistics Platform

A **production-grade, mobile-first marketplace** for renting agricultural equipment and dispatching certified operators to small-scale farmers across India (launching from the Kasaragod region).

**Stack:** Next.js 16 (App Router + Turbopack) • React 19 • TypeScript • Tailwind CSS v4 • Prisma ORM • PostgreSQL (Neon Serverless in prod) • Firebase Phone Auth & Admin SDK • Razorpay • Capacitor 8.5 (Android) • next-intl (`en`, `kn`) • Zustand • Framer Motion

---

## ✨ Core Architecture

- **Multi-Role Capability Engine**: Capability-based access control for Farmers, Tool Owners, Certified Operators, and Admins (`src/server/lib/auth-guard.ts`).
- **Server-Authoritative State Machine**: Strict 24-state lifecycle (17 operational states + 7 terminal/cancellation states) governing tool pickups, inspections, handovers, cancellations, and actor permissions (`src/server/lib/booking-state-machine.ts`).
- **Financial & Deposit Integrity**: Authoritative pricing engine, refundable deposit escrow and resolution with idempotency claims, and timing-safe Razorpay verification (`src/server/services/payments.ts`).
- **Hardened Authentication**: Firebase Phone OTP authentication, server-side Admin SDK verification, spoofing-resistant rate-limited session minting (`src/lib/auth-session.ts`), and optional local Firebase emulator workflow.
- **Mobile First & Native Packaging**: Capacitor 8.5 bridge compiling to native Android APKs with native geolocation and camera hardware access.
- **Bilingual Experience**: Full localization support for English (`en`) and Kannada (`kn`) via `next-intl`.

---

## 🚀 Getting Started

### Prerequisites

- Node.js 20.9+
- PostgreSQL database (Local PostgreSQL or remote Neon connection)
- npm

### 1. Installation

```bash
git clone https://github.com/Jnanesh321/Payaswini-O-Bele.git obele
cd obele
npm install
```

### 2. Environment Configuration

Copy `.env.example` to `.env.local` and configure your keys:

```bash
cp .env.example .env.local
```

Refer to `.env.example` and [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for detailed variable definitions.

### 3. Database Migration & Local Seeding

```bash
# Push schema to local database
npm run db:push

# Seed with local mock catalog tools and demo users (LOCAL DEV ONLY)
npm run db:seed
```
> **Production Safety Rule:** `npm run db:seed` is strictly for local development environments (`localhost`).
> Production databases (Neon PostgreSQL) must only receive migrations (`npx prisma migrate deploy`)
> and must never be seeded with mock data.

### 4. Running the App

```bash
# Start Next.js development server
npm run dev

# Start Firebase Auth Local Emulator (optional, for offline phone auth)
npm run emulator

# Run hermetic business logic unit test suite (no DB required)
npm run test:unit

# Run full integration test suite
npm run test

# Typecheck and linting
npx tsc --noEmit
npm run lint

# Production build
npm run build
```

---

## 🧪 Automated Testing

The repository provides both hermetic unit tests and full database integration suites:

```bash
# 1. Zero-dependency hermetic unit tests (State machine, pricing math, deposit resolution, auth IP parsing)
npm run test:unit

# 2. Complete integration test suite
npm run test
```

Key test suites:
- `tests/booking-state-machine.test.ts` — 24-state transitions, farmer self-service mode, actor authorizations, cancellation policies.
- `tests/booking-pricing.test.ts` — Shift/duration math, tool & operator rates, deposit calculations, and delivery fees.
- `tests/deposit-resolution.test.ts` — Full refunds, dispute holds, atomic claims, and provider failure rollbacks.
- `tests/create-booking-allowlist.test.ts` — Mass-assignment prevention and server-authoritative pricing derivation.
- `tests/auth-lifecycle.test.ts` — Indian mobile normalization, phone validation, client IP extraction.
- `tests/payments-security.test.ts` — Unauthenticated payment creation rejection and IDOR ownership guards.

---

## 📚 Architecture & Audit Documentation

For deep technical specifications, design tokens, and specialist review reports:
- [Architecture & Master Review](docs/audit/architecture-and-engineering-review.md)
- [Frontend & Design System Audit](docs/audit/frontend-review.md)
- [Backend & Domain Logic Audit](docs/audit/backend-review.md)
- [Database & Prisma Audit](docs/audit/database-and-data-environments-review.md)
- [Security & Authentication Audit](docs/audit/security-review.md)
- [QA & Release Readiness Audit](docs/audit/qa-and-release-review.md)
- [Documentation & DX Audit](docs/audit/documentation-review.md)
- [Deployment & Operations Guide](docs/DEPLOYMENT.md)

---

## 📁 Route & Role Architecture

| Route Group | Path | Permitted Roles | Description |
|-------------|------|-----------------|-------------|
| **Public Storefront** | `/`, `/tools`, `/tools/[slug]`, `/how-it-works` | Public | Equipment catalog and info |
| **Authentication** | `/login`, `/register`, `/verify-otp` | Public | OTP-based phone authentication |
| **Farmer Experience** | `/cart`, `/checkout`, `/orders`, `/orders/[id]` | Farmers (Auth) | Booking, checkout, orders |
| **Tool Owner Portal** | `/owner`, `/owner/equipment`, `/owner/requests`, `/owner/permissions`, `/owner/earnings` | `TOOL_OWNER` Capability | Equipment management, rental requests, operator permissions, earnings |
| **Operator Portal** | `/operator`, `/operator/pickup`, `/operator/arrived`, `/operator/work`, `/operator/return`, `/operator/earnings` | `OPERATOR` Capability | Job dispatch, handover logging, work logging, earnings |
| **Admin Operations** | `/admin`, `/admin/assignments`, `/admin/verifications` | Platform Admins | Operator dispatch, capability verifications, dispute resolutions |

---

## 📄 License

Private & Proprietary — Payaswini O~Bele.
