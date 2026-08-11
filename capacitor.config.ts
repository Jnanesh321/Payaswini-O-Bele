import type { CapacitorConfig } from '@capacitor/cli'

// Capacitor (Android WebView) loads the Next.js PRODUCTION server running on the
// host. `10.0.2.2` is the emulator's alias for the host machine's loopback; it
// maps to whatever is listening on the host's :3000.
//
// ⚠️ REQUIRED WORKFLOW — the WebView CANNOT reliably complete the Turbopack HMR
// WebSocket handshake used by `next dev`. That failure silently blocks ALL
// client-side `useEffect` execution in the WebView (any screen that fetches on
// the client renders its initial loading state forever — it is NOT a per-screen
// bug). Always test Capacitor against a production build:
//
//     npm run build        # production compile (no dev HMR)
//     npm run start        # serves the production build on http://localhost:3000
//
// Then run/install the app on the emulator or device. Do NOT run `npm run dev`
// while testing Capacitor. `next start` binds :3000 just like `next dev`, so
// this config's `server.url` is unchanged.
//
// For a USB-connected physical device, point `url` at the host LAN IP instead of
// `10.0.2.2`.
const config: CapacitorConfig = {
  appId: 'in.obele.app',
  appName: 'O Bele~',
  webDir: 'public',
  server: {
    url: 'http://10.0.2.2:3000',
    cleartext: true,
    androidScheme: 'https',
  },
  android: {
    allowMixedContent: true,
  },
}

export default config