# Project Structure

```
krishirent/
├── .gitignore
├── AGENTS.md                    — Prompt instructions for AI coding agents
├── CLAUDE.md                    — Legacy instructions (kept for reference)
├── capacitor.config.ts          — Capacitor Android build configuration
├── components.json              — shadcn/ui component registry
├── eslint.config.mjs            — ESLint flat config
├── next.config.ts               — Next.js config (i18n, images, etc.)
├── package.json
├── postcss.config.mjs
├── README.md
├── tsconfig.json
│
├── docs/                        — Project documentation (keep current)
│   ├── changelog.md             — Completed work, dated entries
│   ├── errors.md                — Known issues & gotchas
│   ├── O-Bele-Specification-v1.md — Full product & engineering specification
│   ├── structure.md             — This file
│   └── todo.md                  — Living task list & roadmap
│
├── prisma/
│   ├── schema.prisma            — DB schema: User, UserCapability, SelfOperatePermission,
│   │                             Tool, ToolInstance, Order, Booking, HandoverLog,
│   │                             BookingStateLog, Payment, Review, InventoryLog,
│   │                             OtpRequest, RateLimit, NextAuth models (Account, Session, etc.)
│   │                             Enums: CapabilityType, VerificationStatus, BookingServiceType,
│   │                             ToolCategory, BookingStatus, BookingEventActor,
│   │                             PaymentStatus, DeliveryStatus, ToolInstanceStatus, HandoverType
│   ├── seed.js                  — Seed data (CommonJS script for local dev)
│   └── seed.ts                  — Seed data (TS version)
│
├── public/
│   ├── images/                  — App visual assets
│   │   ├── brand-badge.webp     — O~Bele brand badge
│   │   ├── brand-icon.webp      — O~Bele icon
│   │   ├── scenic-illustration.webp — Scenic farm header illustration
│   │   ├── role-farmer.webp     — Farmer onboarding role illustration
│   │   ├── role-operator.webp   — Operator onboarding role illustration
│   │   └── role-owner.webp      — Tool Owner onboarding role illustration
│   └── logos/
│       ├── obele-logo.svg       — O~Bele brand logo
│       └── payaswini-logo.svg   — Payaswini brand logo
│
└── src/
    ├── proxy.ts                 — Next.js proxy/middleware for locale negotiation,
    │                             auth guards, and capability profile routing.
    │
    ├── i18n/                    — Internationalization (next-intl)
    │   ├── routing.ts           — Routing config (locales: en, kn; defaultLocale: en)
    │   ├── request.ts           — Request config (loads messages/*.json)
    │   └── messages/
    │       ├── en.json          — English translations
    │       └── kn.json          — Kannada translations
    │
    ├── lib/                     — Shared utilities (safe for server & client)
    │   ├── booking-status.ts    — Booking status labels & badge variants
    │   ├── platform.ts          — Capacitor native platform detection
    │   ├── region.ts            — Regional currency & number formatting tokens
    │   ├── utils.ts             — cn(), formatPrice(), formatDate(), getLocaleName()
    │   │
    │   │  ── Re-exports (pointing to src/server/) ──
    │   ├── auth.ts              — Re-exports from @/server/lib/auth
    │   ├── booking-actor.ts     — Re-exports from @/server/lib/booking-actor
    │   ├── booking-pricing.ts   — Re-exports from @/server/lib/booking-pricing
    │   ├── booking-state-machine.ts — Re-exports from @/server/lib/booking-state-machine
    │   ├── deposit-resolution.ts — Re-exports from @/server/lib/deposit-resolution
    │   ├── owner-sla.ts         — Re-exports from @/server/lib/owner-sla
    │   ├── prisma.ts            — Re-exports from @/server/db/prisma
    │   ├── rate-limit.ts        — Re-exports from @/server/lib/rate-limit
    │   └── sms.ts               — Re-exports from @/server/lib/sms
    │
    ├── server/                  — Backend-only code (NEVER imported by "use client")
    │   ├── db/
    │   │   └── prisma.ts        — Singleton Prisma client instance
    │   │
    │   ├── lib/                 — Backend utilities & domain engines
    │   │   ├── auth.ts          — NextAuth config (credentials provider, JWT capability sync)
    │   │   ├── booking-actor.ts — Maps session user to booking actor (FARMER/TOOL_OWNER/OPERATOR/ADMIN/SYSTEM)
    │   │   ├── booking-pricing.ts — Server-authoritative pricing engine
    │   │   ├── booking-state-machine.ts — 24-state lifecycle, transitions, cancellation & refund policies
    │   │   ├── deposit-resolution.ts — Live deposit resolution (FULL_REFUND / PARTIAL_DEDUCTION / HOLD)
    │   │   ├── owner-sla.ts     — 4-hour owner response SLA + auto-cancel
    │   │   ├── rate-limit.ts    — Sliding-window rate limiter (Prisma-backed)
    │   │   └── sms.ts           — MSG91 OTP & transactional SMS
    │   │
    │   └── services/            — Business logic (one file per domain)
    │       ├── admin.ts         — Admin assignment dashboard
    │       ├── auth.ts          — Register, send OTP, verify OTP
    │       ├── bookings.ts     — Booking lifecycle transitions, custody tracking, deposit resolution
    │       ├── operators.ts     — Operator jobs listing & earnings
    │       ├── owners.ts        — Owner requests, equipment, profile, earnings
    │       ├── payments.ts      — Razorpay order creation, client verification, webhook reconciliation
    │       ├── tools.ts         — Tool CRUD, instances, derived availability, search & filter
    │       └── users.ts         — User profile get/update
    │
    ├── store/
    │   └── cart.ts              — Zustand cart store
    ├── types/
    │   └── index.ts             — Shared TypeScript interfaces & NextAuth augmentations
    │
    ├── components/
    │   ├── ui/                  — shadcn/ui primitives (badge, button, card, input, etc.)
    │   ├── providers/
    │   │   └── session-provider.tsx — NextAuth SessionProvider wrapper
    │   ├── layout/
    │   │   ├── header.tsx       — Site header with cart badge & mobile drawer
    │   │   ├── footer.tsx       — Site footer
    │   │   ├── capability-switcher.tsx — Role/capability profile switcher dropdown
    │   │   └── site-chrome.tsx  — Shell wrapper managing conditional headers/footers
    │   ├── landing/
    │   │   ├── animated-number.tsx — Client island: counter with IntersectionObserver
    │   │   ├── cta.tsx           — Call-to-action section
    │   │   ├── featured-tools.tsx — Server Component: DB-driven featured tools catalog
    │   │   ├── featured-tools-slider.tsx — Client island: carousel navigation & gestures
    │   │   ├── featured-tool-image.tsx — Client island: fallback image component
    │   │   ├── hero.tsx          — Hero section (Server Component, CSS animations)
    │   │   ├── how-it-works.tsx  — How-it-works section (Server Component, next-intl)
    │   │   ├── stats.tsx         — Stats section (Server Component)
    │   │   ├── testimonials.tsx  — Testimonials (Server Component)
    │   │   ├── testimonial-scroll.tsx — Client island: testimonial scroll
    │   │   ├── tool-operators.tsx — Operator directory section
    │   │   └── trust-badges.tsx  — Trust badges (Server Component)
    │   └── tools/
    │       ├── tool-card.tsx    — Tool card with localized pricing, deposit & status
    │       └── tools-content.tsx — Filterable tool listing view
    │
    └── app/
        ├── layout.tsx           — Root layout with providers & SiteChrome
        ├── page.tsx             — Landing page (assembles server & client sections)
        ├── globals.css          — Tailwind v4 + O~Bele tokens (#2D5016, #8B4513, #D4A017, #FAF7F0)
        │
        ├── (auth)/              — Route group: authentication
        │   ├── login/page.tsx       — Login page (phone entry with country code)
        │   ├── register/page.tsx    — Registration page
        │   └── verify-otp/page.tsx  — 6-digit OTP verification with auto-focus & resend
        │
        ├── onboarding/
        │   └── page.tsx             — Role onboarding (Farmer, Tool Owner, Operator selection)
        │
        ├── (store)/             — Route group: customer store UI
        │   ├── tools/
        │   │   ├── page.tsx         — Tools listing (paginated, filtered)
        │   │   └── [slug]/page.tsx  — Tool detail page (certified operator toggle, date picker)
        │   ├── cart/page.tsx        — Cart page
        │   ├── checkout/page.tsx    — Checkout (pricing breakdown, Razorpay modal)
        │   └── orders/
        │       ├── page.tsx         — Orders list
        │       ├── [id]/page.tsx    — Order detail & booking tracking
        │       └── confirm/page.tsx — Order confirmation receipt
        │
        ├── operator/            — Operator workflow screens
        │   ├── page.tsx             — Operator dashboard (active jobs & assignments)
        │   ├── pickup/page.tsx      — Step 1: Tool pickup & asset tag verification
        │   ├── en-route/page.tsx    — Step 2: Travelling to farm
        │   ├── arrived/page.tsx     — Step 3: Arrived at farm
        │   ├── work/page.tsx        — Step 4: Job execution & work timer
        │   ├── return/page.tsx      — Step 5: Returning tool to owner
        │   ├── returned/page.tsx    — Step 6: Return completed & inspection pending
        │   ├── earnings/page.tsx    — Operator earnings & job ledger
        │   ├── history/page.tsx     — Completed job history
        │   └── _components/         — OperatorShell, OperatorBottomNav, useOperatorBooking
        │
        ├── owner/               — Tool Owner dashboard & management
        │   ├── page.tsx             — Owner overview dashboard
        │   ├── requests/page.tsx    — Booking requests (Accept / Reject with SLA timer)
        │   ├── equipment/page.tsx   — Equipment list & availability toggles
        │   ├── add-tool/page.tsx    — Add tool listing
        │   ├── earnings/page.tsx    — Owner revenue & settlement ledger
        │   ├── profile/page.tsx     — Owner profile & KYC status
        │   └── _components/         — OwnerShell
        │
        ├── (admin)/             — Admin management area
        │   └── admin/
        │       ├── page.tsx         — Admin overview
        │       ├── assignments/     — Manual & automatic operator assignment
        │       └── _components/     — Admin shells & tables
        │
        └── api/                 — Thin API route wrappers (≤20 lines, service-backed)
            ├── auth/
            │   ├── [...nextauth]/route.ts — NextAuth handler
            │   ├── send-otp/route.ts      — Send OTP via MSG91
            │   ├── verify-otp/route.ts    — Verify OTP
            │   └── register/route.ts      — User registration
            ├── user/
            │   └── capabilities/route.ts  — Get / update user role capabilities
            ├── tools/
            │   ├── route.ts               — List & create tools
            │   └── [slug]/route.ts        — Tool detail & self-operate permission check
            ├── rentals/
            │   ├── route.ts               — List & create rentals
            │   └── [id]/
            │       ├── route.ts           — Single booking details
            │       ├── transition/route.ts — 24-state machine transition endpoint
            │       ├── deposit-resolution/route.ts — Refundable deposit resolution
            │       └── assign-operator/route.ts — Assign operator to booking
            ├── razorpay/
            │   ├── create-order/route.ts  — Create Razorpay order
            │   ├── verify/route.ts        — Client payment HMAC verification
            │   └── webhook/route.ts       — Server webhook capture & reconciliation
            ├── owner/
            │   ├── requests/route.ts      — Owner requests API
            │   ├── equipment/route.ts     — Owner equipment list
            │   ├── profile/route.ts       — Owner profile API
            │   └── earnings/route.ts      — Owner earnings API
            └── operator/
                ├── jobs/route.ts          — Operator jobs API
                └── earnings/route.ts      — Operator earnings API
```

## Architecture Rules

1. **`src/server/`** = backend-only. Never imported by any `"use client"` component.
2. **`src/lib/`** = shared code (safe for both server & client). Contains `booking-status.ts`, `utils.ts`, `region.ts`, `platform.ts`, plus backward-compat re-exports pointing to `src/server/`.
3. **`src/app/api/`** = thin route wrappers. Each route.ts is a clean, focused handler: parse request → check auth → call ONE service function → return response.
4. **`src/server/services/`** = one file per domain. Contains all business logic (state machines, pricing, validation, database queries).
5. **`src/server/lib/`** = backend-only utilities (sms, rate-limit, booking-state-machine, deposit-resolution, etc.).
