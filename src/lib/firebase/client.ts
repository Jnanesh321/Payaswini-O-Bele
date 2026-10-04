import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app"
import { getAuth, type Auth } from "firebase/auth"

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
  return auth
}
