import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "@/server/lib/auth"
import { prisma } from "@/server/db/prisma"
import { normalizePhone, isValidIndianPhone } from "@/server/lib/phone"
import { signSessionToken, SESSION_COOKIE_NAME, SESSION_MAX_AGE_SECONDS, type SessionUser } from "@/lib/auth-session"

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const rawPhone = body?.phone

    if (!rawPhone || !isValidIndianPhone(rawPhone)) {
      return NextResponse.json(
        { success: false, error: "Please enter a valid 10-digit Indian phone number" },
        { status: 400 }
      )
    }

    const canonicalPhone = normalizePhone(rawPhone)
    if (!canonicalPhone) {
      return NextResponse.json(
        { success: false, error: "Invalid phone number format" },
        { status: 400 }
      )
    }

    // Check for collision with another user's phone
    const existing = await prisma.user.findFirst({
      where: {
        phone: canonicalPhone,
        id: { not: session.user.id },
      },
    })

    if (existing) {
      return NextResponse.json(
        {
          success: false,
          error: "This phone number is already registered to another account. Please use a different number.",
        },
        { status: 409 }
      )
    }

    // Update user record in Prisma
    const updatedUser = await prisma.user.update({
      where: { id: session.user.id },
      data: {
        phone: canonicalPhone,
        phoneVerified: true,
      },
      include: {
        capabilities: {
          select: { type: true },
        },
      },
    })

    // Construct updated session user
    const sessionUser: SessionUser = {
      id: updatedUser.id,
      firebaseUid: updatedUser.firebaseUid || undefined,
      phone: updatedUser.phone || canonicalPhone,
      name: updatedUser.name,
      email: updatedUser.email,
      image: updatedUser.image,
      isAdmin: updatedUser.isAdmin,
      capabilities: updatedUser.capabilities.map((c) => c.type),
      needsPhone: false,
    }

    // Issue refreshed session cookie
    const token = await signSessionToken(sessionUser)
    const response = NextResponse.json({
      success: true,
      user: sessionUser,
      message: "Phone number saved successfully",
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
    console.error("[UserPhoneAPI] Failed to update phone:", error)
    return NextResponse.json(
      { success: false, error: "Failed to update phone number. Please try again." },
      { status: 500 }
    )
  }
}
