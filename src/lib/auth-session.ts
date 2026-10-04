/**
 * O~Bele Authentication Session Engine
 *
 * Implements lightweight, secure HMAC-SHA256 signed session tokens.
 * Compatible with Next.js Edge Middleware and Node.js server runtimes using Web Crypto.
 */

export interface SessionUser {
  id: string
  firebaseUid?: string
  phone: string
  name?: string | null
  email?: string | null
  image?: string | null
  isAdmin: boolean
  capabilities: string[]
}

export interface SessionPayload extends SessionUser {
  iat: number
  exp: number
}

export const SESSION_COOKIE_NAME = "obele_session"
export const SESSION_MAX_AGE_SECONDS = 30 * 24 * 60 * 60 // 30 days

function getSecretKey(): string {
  return (
    process.env.SESSION_SECRET ||
    process.env.NEXTAUTH_SECRET ||
    "obele-default-dev-secret-key-at-least-32-chars-long"
  )
}

function base64UrlEncode(str: string): string {
  const bytes = new TextEncoder().encode(str)
  let binary = ""
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")
}

function base64UrlDecode(str: string): string {
  str = str.replace(/-/g, "+").replace(/_/g, "/")
  while (str.length % 4) {
    str += "="
  }
  const binary = atob(str)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return new TextDecoder().decode(bytes)
}

async function getCryptoKey(secret: string): Promise<CryptoKey> {
  const enc = new TextEncoder()
  return crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  )
}

/**
 * Creates a signed JWT-like session token.
 */
export async function signSessionToken(user: SessionUser): Promise<string> {
  const iat = Math.floor(Date.now() / 1000)
  const exp = iat + SESSION_MAX_AGE_SECONDS

  const header = { alg: "HS256", typ: "JWT" }
  const payload: SessionPayload = {
    ...user,
    iat,
    exp,
  }

  const encodedHeader = base64UrlEncode(JSON.stringify(header))
  const encodedPayload = base64UrlEncode(JSON.stringify(payload))
  const dataToSign = `${encodedHeader}.${encodedPayload}`

  const key = await getCryptoKey(getSecretKey())
  const signatureBytes = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(dataToSign)
  )

  let binary = ""
  const bytes = new Uint8Array(signatureBytes)
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  const encodedSignature = btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "")

  return `${dataToSign}.${encodedSignature}`
}

/**
 * Verifies and decodes a signed session token.
 * Returns null if invalid or expired.
 */
export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  if (!token || typeof token !== "string") return null
  const parts = token.split(".")
  if (parts.length !== 3) return null

  const [encodedHeader, encodedPayload, encodedSignature] = parts
  const dataToSign = `${encodedHeader}.${encodedPayload}`

  try {
    const key = await getCryptoKey(getSecretKey())

    // Convert signature back to ArrayBuffer
    const sigStr = encodedSignature.replace(/-/g, "+").replace(/_/g, "/")
    const padded = sigStr + "=".repeat((4 - (sigStr.length % 4)) % 4)
    const binary = atob(padded)
    const sigBytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) {
      sigBytes[i] = binary.charCodeAt(i)
    }

    const isValid = await crypto.subtle.verify(
      "HMAC",
      key,
      sigBytes,
      new TextEncoder().encode(dataToSign)
    )

    if (!isValid) return null

    const payloadJson = base64UrlDecode(encodedPayload)
    const payload = JSON.parse(payloadJson) as SessionPayload

    // Check expiration
    const now = Math.floor(Date.now() / 1000)
    if (payload.exp && payload.exp < now) {
      return null
    }

    return payload
  } catch {
    return null
  }
}
