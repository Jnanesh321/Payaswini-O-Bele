import type { CapacitorConfig } from '@capacitor/cli'

// ├─ DEV (default) ───────────────────────────────────────────────────────────
// The Android WebView loads the Next.js server running on the HOST machine.
// `10.0.2.2` is the emulator's alias for the host's loopback; it maps to
// whatever listens on the host's :3000. Always test Capacitor against a prod
// BUILD (`npm run build` + `npm run start`), never `next dev` (Turbopack HMR
// breaks the WebView's useEffect execution — see AGENTS.md/docs/changelog.md).
// For a USB-connected physical device override with your LAN IP:
//
//     $env:CAPACITOR_DEV_SERVER_URL="http://192.168.1.50:3000"
//
// ── PRODUCTION ───────────────────────────────────────────────────────────────
// To build the release APK against the live backend, sync with the prod config:
//
//     $env:APP_ENV="production"
//     $env:CAPACITOR_SERVER_URL="https://your-app.vercel.app"   # optional; has a default below
//     npm run cap:sync       # then: npm run cap:build:release
//
// In prod the WebView loads ONLY the HTTPS URL above (no cleartext, no mixed
// content). The APK is hardwired to that origin — change it only when the
// deploy target changes.
const isProduction = process.env.APP_ENV === 'production'

const prodServerUrl = process.env.CAPACITOR_SERVER_URL ?? 'https://obele-vercel.vercel.app'
const devServerUrl = process.env.CAPACITOR_DEV_SERVER_URL ?? 'http://10.0.2.2:3000'

const config: CapacitorConfig = {
  appId: 'in.obele.app',
  appName: 'O Bele~',
  webDir: 'public',
  server: {
    ...(isProduction
      ? { url: prodServerUrl, cleartext: false, androidScheme: 'https' }
      : { url: devServerUrl, cleartext: true, androidScheme: 'https' }),
  },
  android: {
    allowMixedContent: !isProduction,
  },
}

export default config