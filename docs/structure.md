# Project Structure

```
krishirent/
├── .gitignore
├── AGENTS.md                    — Prompt instructions for AI coding agents
├── CLAUDE.md                    — Legacy instructions (kept for reference)
├── components.json              — shadcn/ui component registry
├── eslint.config.mjs            — ESLint flat config
├── next.config.ts               — Next.js config (i18n, images, etc.)
├── package.json
├── postcss.config.mjs
├── README.md
├── tsconfig.json

├── docs/                        — Project documentation (keep current)
│   ├── changelog.md             — Completed work, dated entries
│   ├── errors.md                — Known issues & gotchas
│   ├── structure.md             — This file
│   └── todo.md                  — Living task list

├── prisma/
│   ├── schema.prisma            — DB schema: User, Tool, Booking, Payment,
│   │                             Review, InventoryLog, OtpRequest, RateLimit,
│   │                             + NextAuth models (Account, Session, etc.)
│   │                             Enums: UserRole, ToolCategory, BookingStatus,
│   │                             PaymentStatus, DeliveryStatus
│   ├── seed.js                  — Seed data (CommonJS, requires() flagged by ESLint)
│   └── seed.ts                  — Seed data (TS version)

├── public/
│   └── logos/
│       ├── obele-logo.svg       — O~Bele brand logo (used in auth pages)
│       └── payaswini-logo.svg   — Payaswini brand logo

└── src/
    ├── proxy.ts                 — Next.js proxy (was middleware.ts in older Next).
    │                             Handles locale negotiation, auth guards,
    │                             sets NEXT_LOCALE cookie + X-NEXT-INTL-LOCALE header.
    │                             Matches: every page except /api, /_next/static, etc.

    ├── i18n/                    — Internationalization
    │   ├── routing.ts           — next-intl routing config (locales, defaultLocale)
    │   ├── request.ts           — next-intl request config (loads messages/*.json)
    │   └── messages/
    │       ├── en.json          — English translations
    │       └── kn.json          — Kannada translations

    ├── lib/                     — Shared code (safe for both server & client)
    │   ├── booking-status.ts    — Booking status labels & badge variants (SHARED)
    │   ├── platform.ts          — Capacitor native platform detection (CLIENT)
    │   ├── utils.ts             — cn(), formatPrice(), formatDate() (SHARED)
    │   │
    │   │  ── Re-exports below (backward compat, point to src/server/) ──
    │   ├── auth.ts              — Re-exports from @/server/lib/auth
    │   ├── booking-actor.ts     — Re-exports from @/server/lib/booking-actor
    │   ├── booking-pricing.ts   — Re-exports from @/server/lib/booking-pricing
    │   ├── booking-state-machine.ts — Re-exports from @/server/lib/booking-state-machine
    │   ├── deposit-resolution.ts — Re-exports from @/server/lib/deposit-resolution
    │   ├── owner-sla.ts         — Re-exports from @/server/lib/owner-sla
    │   ├── prisma.ts            — Re-exports from @/server/db/prisma
    │   ├── rate-limit.ts        — Re-exports from @/server/lib/rate-limit
    │   └── sms.ts               — Re-exports from @/server/lib/sms

    ├── server/                  — Backend-only code (NEVER imported by "use client")
    │   ├── db/
    │   │   └── prisma.ts        — Singleton Prisma client instance
    │   │
    │   ├── lib/                 — Backend-only utilities
    │   │   ├── auth.ts          — NextAuth v5 config (credentials provider, JWT)
    │   │   ├── booking-actor.ts — Maps user to booking actor role (FARMER/OWNER/OPERATOR)
    │   │   ├── booking-pricing.ts — Server-authoritative pricing engine (C2 trust boundary)
    │   │   ├── booking-state-machine.ts — §9 state machine, transitions, cancellation policy
    │   │   ├── deposit-resolution.ts — Refundable deposit lifecycle (idempotent)
    │   │   ├── owner-sla.ts     — 4-hour owner response SLA + auto-cancel
    │   │   ├── rate-limit.ts    — Sliding-window rate limiter (Prisma-backed)
    │   │   └── sms.ts           — MSG91 OTP & transactional SMS
    │   │
    │   └── services/            — Business logic (one file per domain)
    │       ├── admin.ts         — Admin assignment dashboard
    │       ├── auth.ts          — Register, send OTP, verify OTP
    │       ├── bookings.ts     — Booking CRUD, state transitions, deposit resolution, operator assignment
    │       ├── operators.ts     — Operator jobs listing & earnings
    │       ├── owners.ts        — Owner requests, equipment, profile, earnings
    │       ├── payments.ts      — Razorpay order creation, payment verification
    │       ├── tools.ts         — Tool CRUD, categories, search/filter
    │       └── users.ts         — User profile get/update

    ├── hooks/                   — React hooks (empty)
    ├── store/
    │   └── cart.ts              — Zustand cart store
    ├── types/
    │   └── index.ts             — Shared TS types

    ├── components/
    │   ├── ui/                  — shadcn/ui primitives
    │   │   ├── badge.tsx, button.tsx, card.tsx, index.ts,
    │   │   ├── input.tsx, select.tsx, skeleton.tsx
    │   ├── layout/
    │   │   ├── header.tsx       — Site header (client: cart badge, locale toggle)
    │   │   ├── footer.tsx       — Site footer (server)
    │   │   └── index.ts         — Re-exports
    │   ├── landing/
    │   │   ├── animated-number.tsx   — Client island: number counter with
    │   │   │                          IntersectionObserver + rAF easing
    │   │   ├── cta.tsx               — Call-to-action section (landing)
    │   │   ├── featured-tools.tsx    — Carousel of featured tools (STALE:
    │   │   │                          hardcoded data, client component,
    │   │   │                          needs DB-drive + server conversion)
    │   │   ├── hero.tsx              — Hero section (server, CSS animations)
    │   │   ├── how-it-works.tsx      — How-it-works section (landing)
    │   │   ├── stats.tsx             — Stats section (server, CSS animations)
    │   │   ├── testimonials.tsx      — Testimonials (server, CSS animations)
    │   │   ├── testimonial-scroll.tsx— Client island: scroll arrows + ref
    │   │   └── trust-badges.tsx      — Trust badges (landing footer)
    │   ├── auth/                — Auth-related components (empty)
    │   ├── cart/                — Cart components (empty)
    │   ├── checkout/            — Checkout components (empty)
    │   ├── dashboard/           — Dashboard components (empty)
    │   ├── admin/               — Admin components (empty)
    │   └── tools/
    │       └── tools-content.tsx — Tools listing page content

    ├── app/
    │   ├── layout.tsx           — Root layout: providers (NextAuth, next-intl, Toaster)
    │   ├── page.tsx             — Landing page (assembles all landing sections)
    │   ├── globals.css          — Tailwind v4 + custom theme + CSS animations
    │   ├── favicon.ico
    │   │
    │   ├── (auth)/              — Route group: no layout wrapper
    │   │   ├── login/page.tsx       — Login page (client: phone input + OTP trigger)
    │   │   ├── register/page.tsx    — Registration page (profile form after OTP)
    │   │   └── verify-otp/page.tsx  — OTP verification page
    │   │
    │   ├── (store)/             — Route group: main store UI
    │   │   ├── tools/
    │   │   │   ├── page.tsx         — Tools listing (server, paginated)
    │   │   │   └── [slug]/page.tsx  — Tool detail page (client: date picker, cart)
    │   │   ├── cart/
    │   │   │   ├── page.tsx         — Cart page (client: cart items, checkout)
    │   │   │   └── confirm/
    │   │   │       └── page.tsx     — STALE: no-op route, needs decision
    │   │   ├── checkout/
    │   │   │   └── page.tsx         — Checkout page (address, delivery, payment)
    │   │   └── orders/
    │   │       ├── page.tsx         — Order history
    │   │       ├── [id]/page.tsx    — Order detail
    │   │       └── confirm/
    │   │           └── page.tsx     — Order confirmation (post-payment)
    │   │
    │   ├── (dashboard)/
    │   │   └── dashboard/
    │   │       ├── page.tsx         — Dashboard home (upcoming rentals, etc.)
    │   │       ├── addresses/       — Saved addresses
    │   │       ├── kyc/             — KYC verification
    │   │       ├── rentals/         — Rental history
    │   │       └── wallet/          — Wallet/transactions
    │   │
    │   ├── (admin)/             — Route group: admin area (proxy.ts guards on ADMIN role)
    │   │   └── admin/
    │   │       ├── page.tsx         — Admin dashboard
    │   │       ├── analytics/       — Analytics
    │   │       ├── bookings/        — Manage bookings
    │   │       ├── inventory/       — Tool inventory
    │   │       └── users/           — User management
    │   │
    │   ├── how-it-works/
    │   │   └── page.tsx             — How it works page
    │   │
    │   └── api/                 — API routes (REST, no locale prefix)
    │       │                       Each route.ts is a THIN wrapper: parse → auth →
    │       │                       call ONE service function → return response.
    │       │                       All business logic lives in src/server/services/.
    │       ├── auth/
    │       │   ├── [...nextauth]/route.ts  — NextAuth handler
    │       │   ├── send-otp/route.ts       — Send OTP (rate-limited)
    │       │   ├── verify-otp/route.ts     — Verify OTP (rate-limited)
    │       │   └── register/route.ts       — Create user account
    │       ├── categories/route.ts         — Tool categories
    │       ├── tools/
    │       │   ├── route.ts                — List tools (filtered, paginated)
    │       │   └── [slug]/route.ts         — Single tool detail
    │       ├── rentals/
    │       │   ├── route.ts                — List/create farmer bookings
    │       │   └── [id]/
    │       │       ├── route.ts            — Get/update single booking
    │       │       ├── transition/
    │       │       │   └── route.ts        — Booking state machine transitions
    │       │       ├── deposit-resolution/
    │       │       │   └── route.ts        — Resolve refundable deposit
    │       │       └── assign-operator/
    │       │           └── route.ts        — Admin operator assignment
    │       ├── payments/route.ts           — Create payment record
    │       ├── razorpay/
    │       │   ├── create-order/route.ts   — Razorpay order creation
    │       │   └── verify/route.ts         — Razorpay webhook verification
    │       ├── users/route.ts              — User profile CRUD
    │       ├── owner/
    │       │   ├── requests/route.ts       — Owner pending bookings
    │       │   ├── equipment/
    │       │   │   ├── route.ts            — Owner equipment summary
    │       │   │   └── [toolId]/route.ts   — Toggle tool availability
    │       │   ├── profile/route.ts        — Owner profile + stats
    │       │   └── earnings/route.ts       — Owner earnings summary
    │       ├── operator/
    │       │   ├── jobs/route.ts           — Operator assigned bookings
    │       │   └── earnings/route.ts       — Operator earnings summary
    │       └── admin/
    │           └── assignments/route.ts    — Admin assignment dashboard
```

## Architecture Rules

1. **`src/server/`** = backend-only. Never imported by any `"use client"` component.
2. **`src/lib/`** = shared code (safe for both server & client). Contains `booking-status.ts`, `utils.ts`, `platform.ts`, plus backward-compat re-exports pointing to `src/server/`.
3. **`src/app/api/`** = thin route wrappers. Each route.ts should be ≤15-20 lines of logic: parse request → check auth → call ONE service function → return response.
4. **`src/server/services/`** = one file per domain. Contains all business logic (state machines, pricing, validation, database queries).
5. **`src/server/lib/`** = backend-only utilities (sms, rate-limit, booking-state-machine, etc.).
