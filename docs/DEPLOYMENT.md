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

Give me that connection string and I will run the migration + seed against it
(see §5).

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

> First deploy may boot before migration has run. Run §5 migration & seed first,
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

## 5. Database migration & seed

The repo has **no migration history** (development used `prisma db push`). A
baseline initial migration is checked in at `prisma/migrations/0_init/`.
Against your Neon string:

```powershell
# 1. point Prisma at Neon for this command only (never edit .env for the DSN)
$env:DATABASE_URL="postgresql://USER:PASSWORD@ep-XXXX.aws.neon.tech/obele?sslmode=require"

# 2. apply the baseline migration
npx prisma migrate deploy

# 3. seed the catalog (tools, users)
npx prisma db seed
```

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

## 7. NEXTAUTH_SECRET

Current real value (already written into your local `.env.local`, and must be
set identically in Vercel):

```
b9rYYswGpLEpKtGDcY9NPdt+RAXeFAE0tFvgpbhWOohuKCLanlazkXuOyRQIB4TF
```

Regenerate whenever you want (PowerShell, 48 random bytes → 64-char Base64):

```powershell
$rng=[System.Security.Cryptography.RandomNumberGenerator]::Create()
$b=New-Object byte[] 48; $rng.GetBytes($b); $rng.Dispose()
[Convert]::ToBase64String($b)
```

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

- [ ] `npx prisma migrate deploy` succeeded against Neon; `db seed` applied.
- [ ] Vercel Production env vars all set (§4); `NEXTAUTH_SECRET` matches §7.
- [ ] Home page loads SSR featured tools (no 500 → verifies `DATABASE_URL`).
- [ ] OTP send logs a MSG91 `success` (verifies §6 keys) — else login is dead.
- [ ] Razorpay test-mode order + verify succeeds (test keys → switch to live keys
      after a real purchase test).
- [ ] Release APK opens, loads content from `https://…vercel.app` (Status bar →
      address shows HTTPS origin, not `file://` or `10.0.2.2`).