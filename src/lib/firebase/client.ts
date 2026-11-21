import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app"
import { getAuth, connectAuthEmulator, type Auth } from "firebase/auth"

export const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "",
}

export function isFirebaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY &&
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
  )
}

let app: FirebaseApp | null = null
let auth: Auth | null = null
let isEmulatorConnected = false

export function getClientApp(): FirebaseApp | null {
  if (typeof window === "undefined") return null
  if (!isFirebaseConfigured()) return null

  if (!getApps().length) {
    app = initializeApp(firebaseConfig)
  } else {
    app = getApp()
  }
  return app
}

export function getClientAuth(): Auth | null {
  if (typeof window === "undefined") return null
  if (auth) return auth

  const clientApp = getClientApp()
  if (!clientApp) return null

  auth = getAuth(clientApp)

  // Strictly gate emulator connection to non-production environments with explicit flag
  const useEmulator =
    process.env.NODE_ENV !== "production" &&
    (process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATOR === "true" ||
      Boolean(process.env.NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST))

  if (useEmulator && !isEmulatorConnected) {
    const emulatorUrl =
      process.env.NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST || "http://127.0.0.1:9099"
    try {
      connectAuthEmulator(auth, emulatorUrl, { disableWarnings: true })
      isEmulatorConnected = true
      console.log(`[O~Bele Auth] Client connected to Firebase Auth Emulator at ${emulatorUrl}`)
    } catch (err) {
      console.warn("[O~Bele Auth] Failed to connect to Firebase Auth Emulator:", err)
    }
  }

  return auth
}

