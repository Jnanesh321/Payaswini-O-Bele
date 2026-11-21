import { NextRequest, NextResponse } from "next/server"
import { verifyFirebaseIdToken, FirebaseTokenVerificationError } from "@/lib/firebase/admin"
import { resolveOrCreateFirebaseUser, FirebaseUserLinkingError } from "@/server/services/auth-firebase"
import { signSessionToken, SESSION_COOKIE_NAME, SESSION_MAX_AGE_SECONDS } from "@/lib/auth-session"
import { checkRateLimit, getClientIp } from "@/server/lib/rate-limit"

export async function POST(request: NextRequest) {
  try {
    // 0. Enforce IP-based rate limiting (10 req/min per IP) to prevent hammering
    const clientIp = getClientIp(request)
    const rateLimit = await checkRateLimit(`session:ip:${clientIp}`, {
      windowSeconds: 60,
      maxRequests: 10,
    })

    if (!rateLimit.allowed) {
      const retryAfterSeconds = Math.max(
        1,
        Math.ceil((rateLimit.resetAt.getTime() - Date.now()) / 1000)
      )
      return NextResponse.json(
        {
          success: false,
          error: "Too many authentication requests from this IP. Please try again later.",
        },
        {
          status: 429,
          headers: {
            "Retry-After": retryAfterSeconds.toString(),
            "X-RateLimit-Limit": "10",
            "X-RateLimit-Remaining": "0",
            "X-RateLimit-Reset": Math.ceil(rateLimit.resetAt.getTime() / 1000).toString(),
          },
        }
      )
    }

    let body: any
    try {
      body = await request.json()
    } catch {
      return NextResponse.json(
        { success: false, error: "Invalid JSON request body" },
        { status: 400, headers: { "Content-Type": "application/json" } }
      )
    }

    const idToken = body?.idToken

    if (!idToken || typeof idToken !== "string") {
      return NextResponse.json(
        { success: false, error: "Missing or invalid idToken" },
        { status: 400, headers: { "Content-Type": "application/json" } }
      )
    }

    // 1. Server-authoritative verification of Firebase ID token
    const verifiedToken = await verifyFirebaseIdToken(idToken)

    // 2. Link or create Prisma User in PostgreSQL
    const sessionUser = await resolveOrCreateFirebaseUser(verifiedToken)

    // 3. Issue signed session token
    const token = await signSessionToken(sessionUser)

    // 4. Attach HTTP-only session cookie
    const response = NextResponse.json(
      {
        success: true,
        user: sessionUser,
        isNewUser: Boolean(sessionUser.isNewUser),
      },
      {
        headers: { "Content-Type": "application/json" },
      }
    )

    const isSecure =
      process.env.NODE_ENV === "production" ||
      request.nextUrl.protocol === "https:"

    response.cookies.set(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      secure: isSecure,
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_MAX_AGE_SECONDS,
    })

    return response
  } catch (err: unknown) {
    console.error("[/api/auth/session] Fatal error:", err)

    let statusCode = 500
    let message = "Authentication failed. Please check server logs."

    if (err instanceof FirebaseTokenVerificationError) {
      statusCode = err.statusCode || 401
      message = err.message
    } else if (err instanceof FirebaseUserLinkingError) {
      statusCode = err.statusCode || 400
      message = err.message
    } else if (err instanceof Error) {
      message = err.message
    }

    return NextResponse.json(
      { success: false, error: message },
      {
        status: statusCode,
        headers: { "Content-Type": "application/json" },
      }
    )
  }
}

export async function DELETE() {
  const response = NextResponse.json({ success: true, message: "Logged out" })
  response.cookies.set(SESSION_COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  })
  return response
}
