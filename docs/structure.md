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

    ├── lib/
    │   ├── auth.ts              — NextAuth v5 config (credentials provider, JWT)
    │   ├── prisma.ts            — Singleton Prisma client instance
    │   ├── rate-limit.ts        — Sliding-window rate limiter (Prisma-backed)
    │   └── utils.ts             — cn() helper, formatPrice(), formatDate()

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
    │       ├── auth/
    │       │   ├── [...nextauth]/route.ts  — NextAuth handler
    │       │   ├── send-otp/route.ts       — Send OTP (rate-limited)
    │       │   ├── verify-otp/route.ts     — Verify OTP (rate-limited, no auto-register)
    │       │   └── register/route.ts       — Create user account
    │       ├── categories/route.ts         — Tool categories
    │       ├── tools/
    │       │   ├── route.ts                — List tools (filtered, paginated)
    │       │   └── [slug]/route.ts         — Single tool detail
    │       ├── rentals/
    │       │   ├── route.ts                — CRUD rentals
    │       │   └── [id]/route.ts           — Single rental
    │       ├── payments/route.ts           — Payment records
    │       ├── razorpay/
    │       │   ├── create-order/route.ts   — Razorpay order creation
    │       │   └── verify/route.ts         — Razorpay webhook verification
    │       ├── users/route.ts              — User profile CRUD
    │       └── upload/                     — File upload (empty)
```
