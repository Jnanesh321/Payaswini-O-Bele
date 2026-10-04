import { getApps, initializeApp, cert, type App } from "firebase-admin/app"
import { getAuth } from "firebase-admin/auth"
import fs from "node:fs"
import path from "node:path"

export class FirebaseTokenVerificationError extends Error {
  readonly statusCode: number
  constructor(message: string, statusCode: number = 401) {
    super(message)
    this.name = "FirebaseTokenVerificationError"
    this.statusCode = statusCode
  }
}

export interface VerifiedFirebaseToken {
  uid: string
  phoneNumber?: string
  phone_number?: string
  email?: string
  name?: string
  picture?: string
}

let adminApp: App | null = null

export function isFirebaseAdminConfigured(): boolean {
  if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) return true
  if (
    process.env.FIREBASE_PROJECT_ID &&
    process.env.FIREBASE_CLIENT_EMAIL &&
    process.env.FIREBASE_PRIVATE_KEY
  ) {
    return true
  }
  try {
    const defaultPath = path.join(/*turbopackIgnore: true*/ process.cwd(), "serviceAccountKey.json")
    if (fs.existsSync(defaultPath)) return true
    if (process.env.FIREBASE_SERVICE_ACCOUNT_PATH && fs.existsSync(process.env.FIREBASE_SERVICE_ACCOUNT_PATH)) return true
  } catch {}
  return false
}

function getAdminApp(): App | null {
  const existingApps = getApps()
  if (existingApps.length > 0) {
    return existingApps[0]!
  }

  // 1. JSON Service Account string or base64 from environment
  const saKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY
  if (saKey) {
    try {
      let parsed = saKey.trim()
      if (!parsed.startsWith("{")) {
        // Assume base64
        parsed = Buffer.from(parsed, "base64").toString("utf-8")
      }
      const creds = JSON.parse(parsed)
      adminApp = initializeApp({
        credential: cert(creds),
      })
      return adminApp
    } catch (err) {
      console.error("[FirebaseAdmin] Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY:", err)
    }
  }

  // 2. Individual environment variables (Standard Twelve-Factor App)
  const projectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL
  let privateKey = process.env.FIREBASE_PRIVATE_KEY

  if (projectId && clientEmail && privateKey) {
    try {
      privateKey = privateKey.replace(/\\n/g, "\n")
      adminApp = initializeApp({
        credential: cert({
          projectId,
          clientEmail,
          privateKey,
        }),
      })
      return adminApp
    } catch (err) {
      console.error("[FirebaseAdmin] Failed to initialize with individual credentials:", err)
    }
  }

  // 3. Local JSON Service Account File (e.g. serviceAccountKey.json in project root)
  try {
    const saFilePath =
      process.env.FIREBASE_SERVICE_ACCOUNT_PATH ||
      path.join(/*turbopackIgnore: true*/ process.cwd(), "serviceAccountKey.json")

    if (fs.existsSync(saFilePath)) {
      const raw = fs.readFileSync(saFilePath, "utf-8")
      const creds = JSON.parse(raw)
      adminApp = initializeApp({
        credential: cert(creds),
      })
      return adminApp
    }
  } catch (err) {
    console.error("[FirebaseAdmin] Failed to load serviceAccountKey.json:", err)
  }

  // 3. Application default credentials
  if (projectId) {
    try {
      adminApp = initializeApp({
        projectId,
      })
      return adminApp
    } catch {
      // Ignore if credentials not present
    }
  }

  return null
}

/**
 * Server-authoritative verification of a client Firebase ID token.
 */
export async function verifyFirebaseIdToken(
  idToken: string
): Promise<VerifiedFirebaseToken> {
  if (!idToken || typeof idToken !== "string") {
    throw new FirebaseTokenVerificationError("Missing Firebase ID token", 401)
  }

  const trimmed = idToken.trim()

  // Development / Test Mock Token Handler
  const isDevAuthEnabled =
    process.env.ENABLE_DEV_FIREBASE_AUTH === "true" ||
    process.env.NODE_ENV === "test" ||
    process.env.NODE_ENV !== "production"

  if (isDevAuthEnabled && trimmed.startsWith("mock_firebase_")) {
    // Format: mock_firebase_{uid}_{phone}
    const match = trimmed.match(/^mock_firebase_([^_]+)_([^_]+)$/)
    if (match) {
      const [, uid, phone] = match
      return {
        uid,
        phoneNumber: phone.startsWith("+") ? phone : `+${phone}`,
        phone_number: phone.startsWith("+") ? phone : `+${phone}`,
      }
    }
    // Format: mock_firebase_{uid}
    const simpleMatch = trimmed.match(/^mock_firebase_([a-zA-Z0-9_-]+)$/)
    if (simpleMatch) {
      return {
        uid: simpleMatch[1],
        phoneNumber: "+919845100002",
        phone_number: "+919845100002",
      }
    }
  }

  // Production Verification using Firebase Admin SDK
  const app = getAdminApp()
  if (!app) {
    if (isDevAuthEnabled) {
      // In dev mode without configured Firebase service account, attempt JWT payload parse if well-formed
      const parts = trimmed.split(".")
      if (parts.length === 3) {
        try {
          const payloadJson = Buffer.from(parts[1], "base64").toString("utf-8")
          const decoded = JSON.parse(payloadJson)
          if (decoded.sub || decoded.user_id) {
            return {
              uid: decoded.user_id || decoded.sub,
              phoneNumber: decoded.phone_number,
              phone_number: decoded.phone_number,
              email: decoded.email,
              name: decoded.name,
              picture: decoded.picture,
            }
          }
        } catch {
          // Fall through to error
        }
      }
    }

    throw new FirebaseTokenVerificationError(
      "Firebase Admin SDK is not configured on the server. Please supply FIREBASE_SERVICE_ACCOUNT_KEY or FIREBASE_CLIENT_EMAIL / FIREBASE_PRIVATE_KEY.",
      500
    )
  }

  try {
    const auth = getAuth(app)
    const decoded = await auth.verifyIdToken(trimmed)
    return {
      uid: decoded.uid,
      phoneNumber: decoded.phone_number,
      phone_number: decoded.phone_number,
      email: decoded.email,
      name: decoded.name,
      picture: decoded.picture,
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Invalid or expired Firebase ID token"
    throw new FirebaseTokenVerificationError(`Firebase verification failed: ${message}`, 401)
  }
}
