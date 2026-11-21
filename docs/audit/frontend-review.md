# O~Bele Frontend & Design System Audit Report

**Auditor:** Specialist Agent 2 (Frontend & Design System Auditor)  
**Date:** October 29, 2026  
**Scope:** Payaswini O~Bele (`farmer-tool-rental/krishirent`)  
**Target File:** `docs/audit/frontend-review.md`  

---

## Executive Summary

An exhaustive frontend and design system audit was conducted across the O~Bele web and Android WebView application codebase. The audit inspected:
- **Homepage** (`src/app/page.tsx`, `src/components/home/utility-feed-client.tsx`, `task-carousel.tsx`, `location-selector-sheet.tsx`, `voice-search-modal.tsx`, `active-rental-banner.tsx`)
- **Machinery Catalog & Search** (`src/app/(store)/tools/page.tsx`, `src/components/tools/tools-content.tsx`, `tool-card.tsx`, `filter-sidebar.tsx`, `sort-bar.tsx`)
- **Tool Detail & Booking Flow** (`src/app/(store)/tools/[slug]/page.tsx`, `src/components/tools/booking-bottom-sheet.tsx`, `src/components/tools/shift-selector.tsx`)
- **Authentication & Onboarding** (`src/app/(auth)/login/page.tsx`, `src/app/(auth)/verify-otp/page.tsx`, `src/app/onboarding/page.tsx`)
- **Orders & Tracking** (`src/app/(store)/orders/[id]/page.tsx`, `src/components/orders/live-tracking-console.tsx`, `src/app/(dashboard)/dashboard/page.tsx`)
- **Owner & Operator Portals** (`src/app/owner/...`, `src/app/operator/...`)
- **Mobile & Android WebView Architecture** (safe-area insets, Capacitor shell, touch targets, keyboard interactions)
- **Design System & Tokens** (Tailwind CSS v4 `@theme`, colors, typography, AppLogo day/night swapping, Framer Motion animations)
- **Bilingual Localization** (`messages/en.json`, `messages/kn.json`, next-intl integration, Kannada rendering, language switcher)
- **Unstaged Working Tree Changes** (inspection of pending diffs in `src/app` and `src/components`)

While the quick-commerce utility redesign significantly elevates usability for rural Karnataka farmers, the audit identified critical UX defects, dark mode regressions, deep localization gaps where vernacular farmers are exposed to raw English, and navigation inconsistencies between app shells.

---

## 1. Current Implementation & Evidence

### 1.1 Architecture & Page Structures

1. **Homepage (`src/app/page.tsx` & `src/components/home/utility-feed-client.tsx`)**:
   - Built as an ultra-fast, mobile-first utility feed container (`max-w-md mx-auto`) optimized for single-hand mobile operations.
   - `page.tsx` runs as `force-dynamic`, fetching active machinery from Prisma (`getToolsForFeed`) and resolving localized imagery via `resolveToolImage`. Also fetches ongoing active rentals via `getActiveBookingForUser`.
   - `utility-feed-client.tsx` manages location-based clustering (`useUserLocation`), quick-commerce filters (`ALL`, `FAST`, `ASSURED`, `OPERATOR`), seasonal task carousel (`TaskCarousel`), and curates 3 sponsored machinery picks before linking to the full catalog.
   - Includes lazy-loaded modal sheets: `LocationSelectorSheet`, `BookingBottomSheet`, and `VoiceSearchModal` (`next/dynamic` with `ssr: false`).

2. **Machinery Catalog & Filtering (`src/app/(store)/tools/page.tsx` & `src/components/tools/tools-content.tsx`)**:
   - `ToolsPage` wraps `ToolsContent` inside `FarmerShell`.
   - `ToolsContent` manages client-side fetch against `/api/tools`, supporting search debounce, category pills, price ranges, and pagination (`PaginationBar`).
   - Cards are rendered using `ToolCard`, supporting instant ETA dispatch badges, verified owner badges, and expandable owner rate accordions.

3. **Tool Detail & Booking Modal (`src/app/(store)/tools/[slug]/page.tsx` & `src/components/tools/booking-bottom-sheet.tsx`)**:
   - `ToolDetailPage` provides machinery specs, operator fee calculations, multi-owner offer selection (Zomato-hotel style), and a bottom action bar triggering `BookingBottomSheet`.
   - `BookingBottomSheet` is a comprehensive 4-step sheet with:
     - Operator selection (with operator vs self-operate)
     - Rental date picker (Today, Tomorrow, Day After)
     - Farm shift selector (`ShiftSelector`: Morning, Afternoon, Full Day, Multi-Day)
     - Farm gate GPS pin capture (`@capacitor/geolocation` + browser fallback)
     - FinTech Zero Cash Lock UPI Pre-Authorization breakdown
     - Seamless Razorpay checkout bridge (`loadRazorpay` + dev mock auto-verifier)

4. **Authentication & Onboarding (`src/app/(auth)/login/page.tsx` & `src/app/onboarding/page.tsx`)**:
   - Unified phone authentication supporting native Capacitor Firebase on Android (`@capacitor-firebase/authentication`) and web Firebase reCAPTCHA with a prototype dev fallback.
   - Deprecated `/verify-otp/page.tsx` forwards seamlessly to `/login`.
   - `/onboarding/page.tsx` collects farmer name, taluk, and multi-role selection (`FARMER`, `TOOL_OWNER`, `OPERATOR`) before routing to role portals.

5. **Orders & Tracking (`src/app/(store)/orders/[id]/page.tsx` & `src/components/orders/live-tracking-console.tsx`)**:
   - Full status history timeline, operator contact trigger, and `LiveTrackingConsole` with 5 milestone steps (Confirmed, Tool Collected, On The Way, Work in Progress, Closed) and 12-second polling.

6. **Owner & Operator Portals (`src/app/owner` & `src/app/operator`)**:
   - Owner portal uses `OwnerShell` with 4 bottom tabs (My Tools, Requests, Earnings, Profile) and real-time badge count from `/api/owner/requests`.
   - Operator portal uses `OperatorShell` and `OperatorBottomNav` featuring dedicated step-by-step dispatch execution (`/operator/pickup`, `/operator/en-route`, `/operator/arrived`, `/operator/work`, `/operator/return`).

---

## 2. Confirmed Defects & UI Glitches

### Defect 1: Catalog Search Query Lost on Navigation (`/tools?search=...` ignored)
- **Severity**: High (Functional UX Defect)
- **File**: [`src/components/tools/tools-content.tsx`](file:///c:/PROJECTS/farmer-tool-rental/krishirent/src/components/tools/tools-content.tsx#L26-L84)
- **Evidence**:
  In `utility-feed-client.tsx`, the search bar links to the catalog with query parameters:
  ```tsx
  <Link href={searchQuery.trim() ? `/tools?search=${encodeURIComponent(searchQuery.trim())}` : "/tools"}>
  ```
  However, in `ToolsContent`:
  ```tsx
  export function ToolsContent() {
    const [debouncedSearch, setDebouncedSearch] = useState("")
    // useSearchParams() is completely absent!
  ```
  `ToolsContent` never inspects `useSearchParams()`. As a result, when a user enters a search term on the homepage and taps "View Catalog" or "Full Machinery Catalog", their query is wiped out and the full unfiltered list is loaded.

### Defect 2: Severe Dark Mode Inversion & Low Contrast in `BookingBottomSheet`
- **Severity**: High (Visual & Accessibility Defect)
- **File**: [`src/components/tools/booking-bottom-sheet.tsx`](file:///c:/PROJECTS/farmer-tool-rental/krishirent/src/components/tools/booking-bottom-sheet.tsx#L315-L645)
- **Evidence**:
  `BookingBottomSheet` bypasses Tailwind semantic tokens and hardcodes bright light-mode hex colors:
  ```tsx
  className="relative z-10 flex max-h-[85vh] w-full max-w-[420px] flex-col rounded-t-3xl border border-[#E5E7EB] bg-[#FFFFFF] shadow-2xl text-[#1C1C16]"
  ...
  <label className="... border-[#E5E7EB] bg-[#FAF7F0]/60 hover:bg-[#FAF7F0] ...">
  ...
  <div className="border-t border-[#E5E7EB] p-4 space-y-2 bg-[#FFFFFF]">
  ```
  When the app is switched to Dark Mode (`.dark`), this bottom sheet remains glaring white (`#FFFFFF`) with dark charcoal text (`#1C1C16`), completely ignoring the user's system and theme preferences. Several sub-elements (like GPS badges and info chips) become unreadable due to mismatched opacity.

### Defect 3: Dual Fragmented Bottom Navigations in Farmer Experience
- **Severity**: Medium (Design System & State Inconsistency)
- **Files**:
  - [`src/components/layout/bottom-nav.tsx`](file:///c:/PROJECTS/farmer-tool-rental/krishirent/src/components/layout/bottom-nav.tsx#L73-L125)
  - [`src/components/layout/farmer-shell.tsx`](file:///c:/PROJECTS/farmer-tool-rental/krishirent/src/components/layout/farmer-shell.tsx#L91-L125)
- **Evidence**:
  There are two completely independent bottom tab navigation bars for farmers:
  1. `BottomNav`: Used on the homepage (`/`). Fixed floating nav (`fixed bottom-0 z-40`), rounded-pill active states (`bg-primary/10`), 5 items (Explore, Catalog, Bookings, Cart, Profile), uses `pb-safe`.
  2. `FarmerShell`: Used on `/tools`, `/tools/[slug]`, `/dashboard`, `/cart`. Has its own embedded bottom tab bar (`tabs = [...]`), hardcoded in English, distinct pill geometry (`bg-accent h-0.5 w-1.5` dot indicator), and different item labels ("Account" vs "Profile").
  Switching between `/` and `/tools` causes the bottom bar to jump in position, height, and active indicator style.

### Defect 4: Missing `pb-safe` on `OwnerShell` Bottom Navigation
- **Severity**: High (Android WebView & Mobile Defect)
- **File**: [`src/app/owner/_components/owner-shell.tsx`](file:///c:/PROJECTS/farmer-tool-rental/krishirent/src/app/owner/_components/owner-shell.tsx#L85-L100)
- **Evidence**:
  ```tsx
  {/* Bottom tab bar */}
  <nav className="flex shrink-0 items-stretch border-t border-border bg-card pb-1">
  ```
  Unlike `BottomNav` (`pb-safe`) and `OperatorBottomNav` (`pb-[calc(12px+env(safe-area-inset-bottom))]`), `OwnerShell` applies only `pb-1`. On modern Android devices with 3-button or gesture navigation pills, the bottom tabs collide directly with the operating system navigation bar, making the "My Tools" and "Earnings" tabs difficult to tap.

### Defect 5: Unlocalized Hardcoded English throughout Core Transactional Flows
- **Severity**: High (Localization & Farmer Inclusion Defect)
- **Files**:
  - `src/components/tools/tool-card.tsx`
  - `src/components/tools/booking-bottom-sheet.tsx`
  - `src/app/(auth)/login/page.tsx`
  - `src/app/onboarding/page.tsx`
  - `src/components/orders/live-tracking-console.tsx`
- **Evidence**:
  While the header and hero have Kannada translations, the transactional components are almost entirely hardcoded in English:
  - `ToolCard`: "Dispatches in ~36m from Badiadka", "Next slot: Tomorrow 6:00 AM", "Krishi Assured", "Operator Incl.", "Certified Operator", "Self-Operate OK", "Select Owner & Quality", "Zero Cash Lock • UPI Pre-Auth", "Book Now ⚡".
  - `BookingBottomSheet`: "OPERATOR OPTION", "With Certified Operator", "Recommended", "Trained field operator handles machinery...", "Self-Operate (Machine Only)", "1. RENTAL DATE", "Today", "Tomorrow", "FARM GATE LOCATION (GPS)", "Pin Farm Gate Coordinates", "Zero Cash Lock • UPI Pre-Authorization", "Proceed to Pay via UPI →".
  - `LoginPage`: "Verify your phone number", "Enter your mobile number...", "Phone Number", "Terms of Service", "Verify & Continue".
  - `OnboardingPage`: "I need to rent tools", "I have tools to rent out", "I can operate equipment", "Your Full Name", "Nearest Hub / Taluk".
  - `LiveTrackingConsole`: "Confirmed", "Tool Collected", "On The Way", "Work in Progress", "Closed".

### Defect 6: Missing Language Switcher in Sub-Shells
- **Severity**: Medium (UX Glitch)
- **Files**: [`src/components/layout/farmer-shell.tsx`](file:///c:/PROJECTS/farmer-tool-rental/krishirent/src/components/layout/farmer-shell.tsx#L61-L66), `owner-shell.tsx`, `operator-shell.tsx`
- **Evidence**:
  The language switch toggle (`KN | EN`) exists only inside the mobile header of `UtilityFeedClient` on `/`. Once a user navigates to `/tools`, `/dashboard`, or `/owner`, the header renders only `<AppLogo />` and `<CapabilitySwitcher />`. A farmer cannot change language without returning to the homepage.

### Defect 7: Synchronous Browser `alert()` in Checkout
- **Severity**: Medium (Mobile Experience Defect)
- **File**: [`src/app/(store)/checkout/page.tsx`](file:///c:/PROJECTS/farmer-tool-rental/krishirent/src/app/(store)/checkout/page.tsx#L69-L144)
- **Evidence**:
  ```tsx
  alert(resData.error || "Failed to create order")
  alert("Payment verification failed: " + (verifyData.error || "Unknown error"))
  alert("Payment failed: " + (err?.description || "Unknown error"))
  ```
  Native `alert()` modals freeze the Android WebView JavaScript thread, trigger platform-dependent alert styles, and violate modern web UI standards.

### Defect 8: Hardcoded Fallback Actor Identity in `LiveTrackingConsole`
- **Severity**: Low / Edge Case (Data Integrity Defect)
- **File**: [`src/components/orders/live-tracking-console.tsx`](file:///c:/PROJECTS/farmer-tool-rental/krishirent/src/components/orders/live-tracking-console.tsx#L113-L123)
- **Evidence**:
  ```tsx
  const operator = order.servicePerformer || {
    id: "op-default",
    name: "Ramesh K.",
    phone: "+91 98450 12345",
  }
  const owner = order.toolOwner || {
    id: "owner-default",
    name: "Mahabaleshwara Bhat",
    phone: "+91 94480 67890",
  }
  ```
  If an order has no operator assigned yet, or owner data is loading, the console displays dummy names and mock phone numbers with active `tel:` links, risking farmer confusion.

---

## 3. Risks & Potential Regressions

1. **Absence of Web Font for Kannada (`Noto Sans Kannada`)**:
   - `globals.css` specifies `--font-kannada: 'Noto Sans Kannada', system-ui, sans-serif;`.
   - However, `layout.tsx` only loads `Nunito` and `Lora` via `next/font/google` with `subsets: ["latin"]`.
   - On low-cost Android phones (e.g., older Android GO or custom Android forks without standard Kannada Noto fonts), Kannada conjunct consonants (*ottu aksharas*, vowel diacritics) will fail to render or render with broken alignment.
2. **Font-Display Mismatch (Latin Serif vs Kannada Sans)**:
   - Headings across cards and banners use `font-display` (mapped to `Lora`).
   - Lora has no Indic glyphs. When rendering Kannada strings, the browser synthesizes fallback typography, causing uneven line-heights, truncated ascenders/descenders, and awkward visual weight jumps next to English text.
3. **Android Soft Keyboard Viewport Resizing**:
   - In `BookingBottomSheet`, `LocationSelectorSheet`, and `LoginPage`, modals use `max-h-[85vh]` combined with Framer Motion spring transforms (`y: "100%" -> y: 0`).
   - On Android Chrome / WebView, opening the on-screen keyboard resizes `window.innerHeight`. This triggers Framer Motion recalculations that can jitter the sheet or cause the submit button to disappear behind the virtual keyboard.
4. **Dark Mode Token Leakage**:
   - Tokens such as `--color-bele-green-muted: rgba(45,80,22,0.08)`, `--color-bele-cream: #FAF7F0`, and `--color-bele-text: #1C1208` are defined only in `@theme inline` and lack `.dark` overrides.
   - Any component referencing `bg-bele-cream` or `bg-bele-green-muted` will display pale beige backgrounds in dark mode.
5. **Dead Code Maintenance Burden**:
   - The entire `src/components/landing/*` directory (11 files including `hero.tsx`, `featured-tools-slider.tsx`, `testimonials.tsx`), along with `src/components/layout/header.tsx` and `src/components/layout/footer.tsx`, is completely unreferenced by active routes. This increases bundle analysis noise and developer confusion.

---

## 4. Recommended High-Impact Improvements

### 4.1 Design System & Typography
1. **Load `Noto_Sans_Kannada` in Root Layout**:
   Import `Noto_Sans_Kannada` from `next/font/google` in `src/app/layout.tsx`:
   ```tsx
   import { Lora, Nunito, Noto_Sans_Kannada } from "next/font/google"
   const notoKannada = Noto_Sans_Kannada({
     subsets: ["kannada"],
     variable: "--font-kannada",
     display: "swap",
   })
   ```
   Add `notoKannada.variable` to the `<html>` root class list.
2. **Harmonize Dark Mode Token Overrides**:
   In `src/app/globals.css`, add explicit `.dark` overrides for all `--color-bele-*` custom tokens to prevent background color leakage.

### 4.2 Component Architecture & Layout
3. **Unify Farmer Shell Navigation**:
   - Refactor `FarmerShell` to consume the standard `<BottomNav />` component instead of maintaining an embedded tab bar.
   - Ensure a single source of truth for navigation state, badge counts, and safe-area padding.
4. **Fix Safe Area Padding on Portals**:
   - Add `pb-safe` to `OwnerShell`'s `<nav>`.
   - Normalize `OperatorBottomNav` to use `pb-safe` and Lucide icons rather than raw emoji characters.
5. **Connect URL Search Params in `ToolsContent`**:
   - Use `useSearchParams()` in `src/components/tools/tools-content.tsx` to initialize `debouncedSearch` and `category` from incoming route parameters.

### 4.3 Localization & Vernacular Inclusion
6. **Complete the i18n Translation Matrix**:
   - Add dedicated JSON namespaces in `messages/en.json` and `messages/kn.json` for:
     - `toolCard`: dispatch ETA, condition grades, shift labels, booking CTAs.
     - `bookingSheet`: operator modes, shift durations, GPS pinning, deposit escrow info.
     - `auth`: phone verification instructions, reCAPTCHA notices, error states.
     - `orders`: live tracking milestones, handover OTP instructions, cancellation dialogs.
7. **Embed Language Switcher in All Portal Headers**:
   - Integrate `<LanguageSwitcher />` into `FarmerShell`, `OwnerShell`, and `OperatorShell` headers alongside `<CapabilitySwitcher />`.

### 4.4 UX & Accessibility
8. **Replace Native `alert()` with Toast Notifications**:
   - Swap `alert()` in `src/app/(store)/checkout/page.tsx` with a standard toast primitive or inline notification banner.
9. **Eliminate Hardcoded Fallback Personas**:
   - In `LiveTrackingConsole`, render loading skeletons or generic labels ("Assigning Operator...", "Contact Hub") when operator or owner data is unassigned.

---

## 5. Affected Files & Ownership

| Component / File Path | Issue / Defect Description | Priority | Recommended Owner |
| :--- | :--- | :--- | :--- |
| [`src/components/tools/tools-content.tsx`](file:///c:/PROJECTS/farmer-tool-rental/krishirent/src/components/tools/tools-content.tsx) | Ignores `useSearchParams()`; homepage query param lost | **P0** | Frontend Lead |
| [`src/components/tools/booking-bottom-sheet.tsx`](file:///c:/PROJECTS/farmer-tool-rental/krishirent/src/components/tools/booking-bottom-sheet.tsx) | Hardcoded `#FFFFFF` / light theme hex; missing dark mode & i18n | **P0** | Design System Engineer |
| [`src/app/owner/_components/owner-shell.tsx`](file:///c:/PROJECTS/farmer-tool-rental/krishirent/src/app/owner/_components/owner-shell.tsx) | Missing `pb-safe`; Android navigation bar collision | **P0** | Mobile / Web Lead |
| [`src/components/layout/farmer-shell.tsx`](file:///c:/PROJECTS/farmer-tool-rental/krishirent/src/components/layout/farmer-shell.tsx) | Duplicate unlocalized tab bar; lacks language switcher | **P1** | Frontend Lead |
| [`src/components/tools/tool-card.tsx`](file:///c:/PROJECTS/farmer-tool-rental/krishirent/src/components/tools/tool-card.tsx) | Hardcoded English dispatch banner, badges, owner accordion | **P1** | Localization / Frontend |
| [`src/app/layout.tsx`](file:///c:/PROJECTS/farmer-tool-rental/krishirent/src/app/layout.tsx) | Missing `Noto_Sans_Kannada` font definition in Google Font loader | **P1** | Design System Engineer |
| [`src/app/globals.css`](file:///c:/PROJECTS/farmer-tool-rental/krishirent/src/app/globals.css) | `.dark` missing `--color-bele-*` overrides | **P1** | Design System Engineer |
| [`src/app/(auth)/login/page.tsx`](file:///c:/PROJECTS/farmer-tool-rental/krishirent/src/app/(auth)/login/page.tsx) | Hardcoded English strings; hardcoded light hex in input | **P1** | Auth / Frontend |
| [`src/app/onboarding/page.tsx`](file:///c:/PROJECTS/farmer-tool-rental/krishirent/src/app/onboarding/page.tsx) | Hardcoded English role titles, descriptions, button text | **P1** | Auth / Frontend |
| [`src/components/orders/live-tracking-console.tsx`](file:///c:/PROJECTS/farmer-tool-rental/krishirent/src/components/orders/live-tracking-console.tsx) | Mock owner/operator fallbacks; hardcoded milestone copy | **P1** | Orders / Frontend |
| [`src/app/(store)/checkout/page.tsx`](file:///c:/PROJECTS/farmer-tool-rental/krishirent/src/app/(store)/checkout/page.tsx) | Browser native `alert()` used for payment failures | **P2** | Checkout / Payments |
| [`src/app/operator/_components/operator-bottom-nav.tsx`](file:///c:/PROJECTS/farmer-tool-rental/krishirent/src/app/operator/_components/operator-bottom-nav.tsx) | Emoji icons instead of Lucide SVGs; custom safe area calculation | **P2** | Design System Engineer |
| `src/components/landing/*` (11 files) | Unreferenced legacy components causing bundle bloat | **P2** | Tech Debt / Clean-up |

---

## 6. Tests Needed

To prevent regressions and enforce design system invariants, the following tests should be implemented:

### 6.1 Component & Unit Tests (Vitest + React Testing Library)
1. **Catalog Search Param Sync Test**:
   - Verify that mounting `<ToolsContent />` with `?search=tiller` initializes the search input and dispatches a fetch with `search=tiller`.
2. **Booking Bottom Sheet Calculations & Dark Mode Class Test**:
   - Verify that `<BookingBottomSheet />` contains `bg-card` and `text-foreground` rather than `#FFFFFF` and `#1C1C16`.
   - Verify pricing computations for Half Day (58% base rate), Full Day, and Multi-Day durations.
3. **i18n Translation Completeness Test**:
   - Automated key-parity check ensuring all keys present in `messages/en.json` exist in `messages/kn.json` and contain non-empty strings.

### 6.2 Visual Regression & Responsive Tests (Playwright)
4. **Android WebView Safe Area Test**:
   - Emulate 412x915px viewport with simulated Android gesture navigation bar (`safe-area-inset-bottom: 24px`). Verify that bottom navigation buttons in `BottomNav`, `FarmerShell`, and `OwnerShell` maintain at least 48px touch clearance.
5. **Theme Switching Parity Test**:
   - Capture snapshots of `UtilityFeedClient`, `ToolCard`, and `BookingBottomSheet` in light and dark modes to detect illegible contrast or missing token overrides.
6. **Kannada Text Overflow & Wrapping Test**:
   - Render `ToolCard`, `TaskCarousel`, and `BookingBottomSheet` in Kannada (`kn`) and ensure no text clipping or awkward multi-line breaks on 360px width screens.

---

## 7. Priority Classification

```
┌────────────────────────────────────────────────────────────────────────┐
│  P0 - ESSENTIAL (Fix Immediately Before User Testing / Release)        │
├────────────────────────────────────────────────────────────────────────┤
│  1. Wire up `useSearchParams()` in `src/components/tools/tools-content.tsx` │
│     to prevent loss of homepage search query.                          │
│  2. Replace hardcoded `#FFFFFF` and light hex in `BookingBottomSheet`  │
│     with semantic tokens (`bg-card`, `border-border`, `text-foreground`).│
│  3. Add `pb-safe` to `OwnerShell` bottom navigation bar.               │
└────────────────────────────────────────────────────────────────────────┘
┌────────────────────────────────────────────────────────────────────────┐
│  P1 - HIGH-VALUE (Core Polish & Farmer Inclusion)                      │
├────────────────────────────────────────────────────────────────────────┤
│  4. Import `Noto_Sans_Kannada` in `layout.tsx` for proper rendering.   │
│  5. Translate `tool-card.tsx` and `booking-bottom-sheet.tsx` into      │
│     Kannada via `next-intl`.                                           │
│  6. Unify `BottomNav` across `UtilityFeedClient` and `FarmerShell`.    │
│  7. Add `<LanguageSwitcher />` to `FarmerShell` and `OwnerShell`.      │
│  8. Remove hardcoded fallback operator/owner in `LiveTrackingConsole`. │
└────────────────────────────────────────────────────────────────────────┘
┌────────────────────────────────────────────────────────────────────────┐
│  P2 - OPTIONAL / TECH DEBT (Maintainability & Clean-up)                │
├────────────────────────────────────────────────────────────────────────┤
│  9. Replace native `alert()` in `checkout/page.tsx` with toast UI.     │
│ 10. Normalize `OperatorBottomNav` to use Lucide icons.                 │
│ 11. Delete or archive dead components in `src/components/landing/*`.   │
│ 12. Fix `.dark` token overrides for `--color-bele-*` in `globals.css`. │
└────────────────────────────────────────────────────────────────────────┘
```
