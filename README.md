# 🌾 O~Bele (Payaswini) — Farm Tool Rental & Operator Logistics Platform

A **production-grade, mobile-first marketplace** for renting agricultural equipment and dispatching certified operators to small-scale farmers across India (launching from the Kasaragod region).

**Stack:** Next.js 16 (App Router + Turbopack) • TypeScript • Tailwind CSS v4 • shadcn/ui • Prisma • PostgreSQL (Supabase) • NextAuth.js • Razorpay • MSG91 • Zustand • Framer Motion

---

## ✨ Core Architecture

- **Multi-Role Capability Engine**: Role-based access control for Farmers, Tool Owners, Certified Operators, and Admins.
- **Server-Authoritative State Machine**: Strict 17-state lifecycle enforcing handovers, inspections, cancellations, and actor permissions.
- **Financial & Deposit Integrity**: Authoritative pricing engine, refundable deposit resolution with atomic idempotency claims, and timing-safe Razorpay verification.
- **Hardened Authentication**: 6-digit cryptographic OTP generation, attempt-based rate limiting & lockout, single-use signed verification proofs.
- **Multilingual Ready**: Localization support (`en`, `kn`, `ml`).

---

## 🚀 Getting Started

### Prerequisites

- Node.js 20.9+
- PostgreSQL database (e.g. Supabase)
- npm

### 1. Installation

```bash
git clone <repo-url> obele
cd obele
npm install
```

### 2. Environment Configuration

Copy `.env.example` to `.env.local` and configure your environment variables:

```bash
cp .env.example .env.local
```

Refer to `.env.example` for comprehensive documentation on all required keys.

### 3. Database Migration & Seed

```bash
# Push schema to database
npm run db:push

# Seed with initial catalog tools and categories
npm run db:seed
```

### 4. Running the App

```bash
# Start development server
npm run dev

# Run automated business logic test suite
npm run test

# Typecheck and linting
npx tsc --noEmit
npm run lint

# Production build
npm run build
```

---

## 🧪 Automated Testing

The automated test suite verifies core business rules and state machines:

```bash
npm run test
```

- `tests/booking-state-machine.test.ts` — Valid/invalid state transitions, actor permissions, cancellation policies.
- `tests/booking-pricing.test.ts` — Duration calculation, tool/operator fees, deposits, delivery charges.
- `tests/deposit-resolution.test.ts` — Full refund, partial deductions, dispute locks, atomic idempotency claims.
- `tests/auth-lifecycle.test.ts` — Phone normalization, mobile validation, client IP extraction.

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
