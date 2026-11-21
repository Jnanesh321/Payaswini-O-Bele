# Deployment — O Bele~ (Payaswini)

How to ship the Next.js backend to **Vercel + Neon Postgres** and build a
production Android APK against it with Capacitor.

---

## 1. Architecture recap

- The Android APK **does not bundle the app**. Capacitor's `server.url` points
  the WebView at a live host — it must be an HTTPS origin reachable from real
  phones.
- Behind that origin is **this same Next.js app** (SSR + API routes). All
  Prisma/DB access, Razorpay secret-key calls, MSG91, NextAuth and OAuth
  handling happen **server-side only** (see audit: no client component touches
  `process.env` or Prisma).
- Postgres runs on **Neon** (serverless, free tier), provisioned by Vercel-free
  builds (zero-ops, no Docker).

---

## 2. Neon setup (Postgres) — you do this once

1. Create an account at https://console.neon.tech (free tier is enough).
2. **New Project** → pick a region close to your users (e.g. `Singapore` for
   Dakshina Kannada) → click **Create project**.
3. On the project dashboard open **Connection Details** → copy the **PSQL
   connection string**, which looks like:
   ```
   postgresql://USER:PASSWORD@ep-XXXX.us-east-2.aws.neon.tech/neondb?sslmode=require
   ```
4. Optionally rename the default database from `neondb` to `obele` (Settings →
   Databases → Create). Use whatever name you keep in the connection string.

> Neon connection strings work directly with Prisma. `sslmode=require` is
> already handled by the driver; leave `?schema=public` in place if you append it.

Give me that connection string and I will run the schema migration against it
(see §5). **Never seed the production database with mock/demo records.**

**You must also then set it as the `DATABASE_URL` in Vercel (§4).**

---

## 3. Vercel setup (Next.js) — steps

1. Push this repo to GitHub, then import it at https://vercel.com/new (branch
   `main`/`master`).
2. Framework preset: **Next.js** (auto-detected). Build command `next build`,
   install command default.
3. Add the **server-only** environment variables (see the full table in §6)
   for Production, Preview and Development as needed:
   - `DATABASE_URL` — your Neon PSQL string (§2)
   - `NEXTAUTH_SECRET` — see §7 (same value as `.env.local`)
   - `NEXTAUTH_URL` — your Vercel deployment origin, e.g. `https://obele-vercel.vercel.app`
   - `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET` — **live** keys from Razorpay
     dashboard (never expose the secret; it stays server-side)
   - `NEXT_PUBLIC_RAZORPAY_KEY_ID` — live public key id (client-safe; the app
     currently fetches `keyId` from the API, but set it for parity)
   - `MSG91_AUTH_KEY`, `MSG91_OTP_TEMPLATE_ID` — real MSG91 values (§8)
   - `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` — real Google OAuth creds
   - `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`,
     `RESEND_API_KEY`, `FAST2SMS_API_KEY` — live service keys (optional,
     used only where configured)
4. **Deploy** → Vercel gives you an `https://…vercel.app` URL. Keep it; that
   origin is what the APK will hard-code.

> First deploy may boot before migration has run. Run §5 database migration first,
> then deploy/redeploy, or hit 500s on DB-backed pages until then.

---

## 4. Vercel env var summary (server-only vs client-safe)

| Variable | Tier | Notes |
|---|---|---|
| `DATABASE_URL` | server | Neon string. **Never `NEXT_PUBLIC_`.** |
| `NEXTAUTH_SECRET` | server | Random 32+ chars (§7). Never public. |
| `NEXTAUTH_URL` | server | Public origin of the deploy. |
| `RAZORPAY_KEY_ID` | server | Key id used for order creation + refunds. |
| `RAZORPAY_KEY_SECRET` | server | **Secret. Confirmed never exposed** — lives only in API routes/`src/lib/deposit-resolution.ts`. |
| `NEXT_PUBLIC_RAZORPAY_KEY_ID` | client-safe | Public key id only. |
| `MSG91_AUTH_KEY` | server | OTP + transactional SMS auth. |
| `MSG91_OTP_TEMPLATE_ID` | server | OTP template id (5-min expiry, len matched). |
| `GOOGLE_CLIENT_ID` | server | OAuth. |
| `GOOGLE_CLIENT_SECRET` | server | OAuth secret. Never public. |
| `CLOUDINARY_*` | server | Image upload. |
| `RESEND_API_KEY` | server | Email. Never public. |
| `FAST2SMS_API_KEY` | server | Fallback SMS. Never public. |
| `NEXT_PUBLIC_APP_URL` | client-safe | Currently unused in code; set for parity. |

**Audit guarantee:** no `DATABASE_URL`, `RAZORPAY_KEY_SECRET`, `MSG91_AUTH_KEY`
or `NEXTAUTH_SECRET` reference exists in any `"use client"` file. Server-side
libs (`src/lib/{prisma,sms,auth,deposit-resolution}.ts`) are imported only by
API routes and server components.

---

## 5. Database migration (Production)

The repo has a baseline initial migration checked in at `prisma/migrations/0_init/`.
Against your Neon string:

```powershell
# 1. point Prisma at Neon for this command only (never edit .env for the DSN)
$env:DATABASE_URL="postgresql://USER:PASSWORD@ep-XXXX.aws.neon.tech/obele?sslmode=require"

# 2. apply migrations to production Neon database
npx prisma migrate deploy
```

> **IMPORTANT: NEVER run `npx prisma db seed` against production.**
> Mock/seed tools, users, bookings, and demo records are strictly reserved for local development
> (`localhost`). The seed script contains guards that will abort if executed against remote cloud DBs.
> Production catalogs and accounts must be populated through real user onboarding and verified listings.

`migrate deploy` applies committed migrations without a shadow DB (Neon-safe).
Future schema changes: edit `schema.prisma`, then
`npx prisma migrate dev --name <change>` to create a new migration, commit it.

---

## 6. MSG91 production env vars

| Variable | Where it's read | What it must be |
|---|---|---|
| `MSG91_AUTH_KEY` | `src/lib/sms.ts:27,69` | MSG91 **Auth Key** (Settings → API & Mail → Auth Key) |
| `MSG91_OTP_TEMPLATE_ID` | `src/lib/sms.ts:28` | OTP template id (OTP templates, must exceed 2 positive ratings) |
| `MSG91_TRANSACTIONAL_TEMPLATE_ID` | `src/lib/sms.ts:70` | Transactional template (optional — booking notifications fall back to `log` channel without it) |

**WARNING (`src/lib/sms.ts:22`):** `smsLiveDeliveryEnabled()` returns `true`
unconditionally in production (`NODE_ENV === "production"`). If
`MSG91_AUTH_KEY`/`MSG91_OTP_TEMPLATE_ID` are blank or wrong, SMS is not disabled —
OTP sends fail per-request and users can't verify. Set these **before** deploy.

Get real values from the MSG91 dashboard (https://control.msg91.com): Auth Key
plus an approved OTP template. I cannot create these for you.

---

## 7. NEXTAUTH_SECRET & SESSION_SECRET

Generate a cryptographically strong secret for your local `.env.local` and configure it in Vercel:

```bash
# Generate with OpenSSL:
openssl rand -base64 32

# Or generate in PowerShell (48 random bytes → Base64):
$rng=[System.Security.Cryptography.RandomNumberGenerator]::Create()
$b=New-Object byte[] 48; $rng.GetBytes($b); $rng.Dispose()
[Convert]::ToBase64String($b)
```

> **Security Note:** Never commit live session secrets to version control. Set `SESSION_SECRET` (and `NEXTAUTH_SECRET`) directly in your Vercel Project Environment Variables.

---

## 8. Capacitor config — dev vs prod

`capacitor.config.ts` reads build-time env vars (`APP_ENV`). This is why the
same file serves both workflows.

| | DEV (default) | PROD |
|---|---|---|
| Trigger | nothing set | `$env:APP_ENV="production"` |
| `server.url` | `http://10.0.2.2:3000` (or `$env:CAPACITOR_DEV_SERVER_URL`) | `https://<deploy>.vercel.app` (or `$env:CAPACITOR_SERVER_URL`) |
| `cleartext` | `true` | `false` |
| `allowMixedContent` | `true` | `false` |

The prod placeholder `https://obele-vercel.vercel.app` is a **default only** —
set `$env:CAPACITOR_SERVER_URL` to your real origin when syncing, or edit the
default once the URL is final.

Build flows:

```powershell
# DEV (emulator against local production build)
npm run build; npm run start          # serve :3000 on host
npm run cap:sync
npm run cap:build                     # assembleDebug

# PROD (release APK against Vercel backend)
$env:APP_ENV="production"
$env:CAPACITOR_SERVER_URL="https://your-app.vercel.app"
npm run cap:sync
npm run cap:build:release             # cap sync && gradlew assembleRelease
```

> Always test the emulator against `npm run build` + `npm run start`, never
> `next dev` (Turbopack HMR breaks WebView `useEffect`).

---

## 9. Final release APK

```powershell
$env:APP_ENV="production"
$env:CAPACITOR_SERVER_URL="https://your-app.vercel.app"
npm run cap:sync            # writes prod url/cleartext into the android project
npm run cap:build:release   # android\app\build\outputs\apk\release\app-release.apk
```

If you plan to publish on the Play Store you'll also need a signed release
build (jks keystore + signing config in `android/app/build.gradle`). For a
side-load/private distribution `assembleRelease` (debug-signed, installable)
is enough to start.

---

## 10. Post-deploy verification checklist

- [ ] `npx prisma migrate deploy` succeeded against Neon (no mock seed script executed).
- [ ] Vercel Production env vars all set (§4); `NEXTAUTH_SECRET` matches §7.
- [ ] Home page loads SSR featured tools (no 500 → verifies `DATABASE_URL`).
- [ ] OTP send logs a MSG91 `success` (verifies §6 keys) — else login is dead.
- [ ] Razorpay test-mode order + verify succeeds (test keys → switch to live keys
      after a real purchase test).
- [ ] Release APK opens, loads content from `https://…vercel.app` (Status bar →
      address shows HTTPS origin, not `file://` or `10.0.2.2`).

---

## 11. Firebase Local Emulator Suite Workflow (Dev & Offline Testing)

To test the end-to-end phone authentication flow locally without requiring a Google Cloud Blaze plan or sending real SMS carrier messages:

### Architecture
- **Auth Emulator:** Runs locally on `127.0.0.1:9099`.
- **Emulator UI:** Accessible at `http://127.0.0.1:4000/auth`.
- **Configuration:** Managed via `firebase.json` and `.firebaserc` (`default: o-bele`).
- **Gating:** Client connection is guarded in `src/lib/firebase/client.ts` by `process.env.NODE_ENV !== "production"` and `NEXT_PUBLIC_USE_FIREBASE_EMULATOR="true"`. Server verification in `src/lib/firebase/admin.ts` automatically routes to `FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099`.

### Step-by-Step Testing Instructions

1. **Start the Firebase Auth Emulator:**
   ```powershell
   npm run emulator
   ```
   *Logs will confirm:*
   ```text
   ✔ All emulators ready! It is now safe to connect your app.
   i View Emulator UI at http://127.0.0.1:4000/
   ```

2. **Ensure `.env.local` has the emulator flag enabled:**
   ```env
   NEXT_PUBLIC_USE_FIREBASE_EMULATOR="true"
   ```

3. **Start the Next.js development server (in another terminal):**
   ```powershell
   npm run dev
   ```

4. **Perform Login:**
   - Navigate to `http://localhost:3000/login`.
   - Enter any 10-digit mobile number (e.g. `9845012345` or `9876543210`).
   - Click **Verify & Continue**. reCAPTCHA resolves locally without charging SMS quotas.
   - Open the Emulator UI at **`http://127.0.0.1:4000/auth`**.
   - Check the **View SMS** / verification codes panel in the Emulator UI to see the generated 6-digit OTP code (or check the terminal output running `npm run emulator`).
   - Enter the 6-digit code into O~Bele's verification screen.
   - **Result:** You will be authenticated, `obele_session` cookie is issued, and you are redirected to the app.