# 🌾 Payaswini O Bele — Farm Tool Rental Platform

A **production-grade, mobile-first e-commerce website** for renting expensive farming tools to small-scale farmers in Dakshina Karnataka, India.

**Built for:** Farmers who need carbon fiber poles (₹50,000–₹70,000 to buy) and other tools at affordable daily rental rates.

**Stack:** Next.js 16 • TypeScript • Tailwind CSS v4 • shadcn/ui • Prisma • PostgreSQL • NextAuth.js • Razorpay • Zustand • Framer Motion

**Brand:** Payaswini O Bele — a Payaswini brand

---

## ✨ Features

- **Phone OTP Login** — No passwords needed, built for farmers
- **Dynamic Rental Pricing** — Discounts for 3-day, 7-day, and 30-day rentals
- **Razorpay Integration** — UPI-first payments (GPay, PhonePe, PayTM)
- **User Dashboard** — Active rentals, history, KYC, wallet tracking
- **Admin Dashboard** — Inventory, bookings, users, revenue analytics
- **PWA Ready** — Offline support with service worker
- **Dark Mode** — Toggle between light and dark themes
- **Responsive** — Mobile-first design optimized for phone users
- **Low Bandwidth** — Lazy loading, next/image compression

---

## 🚀 Getting Started

### Prerequisites

- Node.js 20.9+
- PostgreSQL database (or MongoDB Atlas)
- npm

### 1. Clone & Install

```bash
git clone <repo-url> payaswini-o-bele
cd payaswini-o-bele
npm install
```

### 2. Environment Variables

Copy `.env.example` to `.env.local` and fill in your values:

```bash
cp .env.example .env.local
```

**Required variables:**
| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `NEXTAUTH_SECRET` | Random secret for NextAuth |
| `NEXTAUTH_URL` | Your app URL (http://localhost:3000) |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret |
| `RAZORPAY_KEY_ID` | Razorpay API key |
| `RAZORPAY_KEY_SECRET` | Razorpay API secret |

### 3. Database Setup

```bash
# Push schema to database
npm run db:push

# Seed with sample data (10 tools, 5 categories)
npm run db:seed
```

### 4. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 📁 Project Structure

```
src/
├── app/
│   ├── (auth)/          # Login, Register, Verify OTP
│   ├── (dashboard)/     # User dashboard pages
│   ├── (admin)/         # Admin dashboard pages
│   ├── (store)/         # Tools, Cart, Checkout, Orders
│   ├── api/             # REST API routes
│   ├── layout.tsx       # Root layout
│   ├── page.tsx         # Landing page
│   └── globals.css      # Global styles + Tailwind theme
├── components/
│   ├── ui/              # shadcn-style UI components
│   ├── layout/          # Header, Footer
│   ├── landing/         # Hero, Stats, HowItWorks, Featured, etc.
│   └── tools/           # Tools listing content
├── lib/
│   ├── prisma.ts        # Prisma client singleton
│   ├── auth.ts          # NextAuth configuration
│   └── utils.ts         # cn(), formatPrice(), helpers
├── store/
│   └── cart.ts          # Zustand cart store
├── types/
│   └── index.ts         # TypeScript type definitions
└── proxy.ts             # Auth middleware
prisma/
├── schema.prisma        # Database schema
└── seed.js              # Seed script
```

---

## 🎨 Design System

- **Colors:** Earthy greens `#2D5016`, warm browns `#8B4513`, gold accent `#D4A017`, off-white `#FAF7F0`
- **Fonts:** Inter
- **Components:** shadcn/ui with custom farmer-friendly theme
- **Icons:** Lucide React

---

## 📱 Pages

| Route | Page | Access |
|-------|------|--------|
| `/` | Landing page | Public |
| `/tools` | Product listing | Public |
| `/tools/[slug]` | Product detail | Public |
| `/cart` | Shopping cart | Public |
| `/checkout` | Checkout + Payment | Auth required |
| `/login` | Login | Public |
| `/register` | Register | Public |
| `/dashboard` | User dashboard | Auth required |
| `/admin` | Admin dashboard | Admin only |

---

## 🚢 Deployment

### Vercel (Recommended)

```bash
npm i -g vercel
vercel
```

Set environment variables in Vercel dashboard.

---

## 📄 License

Private — Payaswini O Bele (A Payaswini Brand)
