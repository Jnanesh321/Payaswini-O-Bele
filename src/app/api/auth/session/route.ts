import { NextRequest, NextResponse } from "next/server"
import { verifyFirebaseIdToken, FirebaseTokenVerificationError } from "@/lib/firebase/admin"
import { resolveOrCreateFirebaseUser, FirebaseUserLinkingError } from "@/server/services/auth-firebase"
import { signSessionToken, SESSION_COOKIE_NAME, SESSION_MAX_AGE_SECONDS } from "@/lib/auth-session"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const idToken = body?.idToken

    if (!idToken || typeof idToken !== "string") {
      return NextResponse.json(
        { success: false, error: "Missing or invalid idToken" },
        { status: 400 }
      )
    }

    // 1. Server-authoritative verification of Firebase ID token
    const verifiedToken = await verifyFirebaseIdToken(idToken)

    // 2. Link or create Prisma User in PostgreSQL
    const sessionUser = await resolveOrCreateFirebaseUser(verifiedToken)

    // 3. Issue signed session token
    const token = await signSessionToken(sessionUser)

    // 4. Attach HTTP-only session cookie
    const response = NextResponse.json({
      success: true,
      user: sessionUser,
    })

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
  } catch (error) {
    if (error instanceof FirebaseTokenVerificationError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.statusCode }
      )
    }
    if (error instanceof FirebaseUserLinkingError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.statusCode }
      )
    }
    console.error("[SessionAPI] Login failed:", error)
    return NextResponse.json(
      { success: false, error: "Authentication failed. Please try again." },
      { status: 500 }
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
