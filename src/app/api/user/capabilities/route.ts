import { NextRequest, NextResponse } from "next/server"
import { requireAuth, AuthGuardError } from "@/server/lib/auth-guard"
import { prisma } from "@/server/db/prisma"
import { CapabilityType, VerificationStatus } from "@prisma/client"
import { REGIONAL_TALUKS } from "@/lib/geo"
import { signSessionToken, SESSION_COOKIE_NAME, SESSION_MAX_AGE_SECONDS } from "@/lib/auth-session"

export async function GET() {
  try {
    const user = await requireAuth()
    const [capabilities, dbUser] = await Promise.all([
      prisma.userCapability.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: "asc" },
      }),
      prisma.user.findUnique({
        where: { id: user.id },
        select: { name: true, phone: true, taluk: true, district: true, village: true },
      }),
    ])
    
    return NextResponse.json({ 
      success: true, 
      user: dbUser,
      capabilities: capabilities.map(c => c.type),
      detailedCapabilities: capabilities.map(c => ({
        id: c.id,
        type: c.type,
        status: c.status,
        verifiedAt: c.verifiedAt,
        deniedAt: c.deniedAt,
        notes: c.notes,
        createdAt: c.createdAt,
      })),
      hasCapabilities: capabilities.length > 0 
    })
  } catch (error) {
    if (error instanceof AuthGuardError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }
    console.error("Failed to fetch capabilities:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()
    const body = await request.json()
    const { capabilities, name, taluk, village } = body as {
      capabilities: string[]
      name?: string
      taluk?: string
      village?: string
    }

    if (!Array.isArray(capabilities)) {
      return NextResponse.json({ error: "Invalid request payload" }, { status: 400 })
    }

    const userId = user.id
    
    // Validate capabilities
    const validRoles = Object.values(CapabilityType) as string[]
    const selectedRoles = capabilities.filter(role => validRoles.includes(role)) as CapabilityType[]
    
    if (selectedRoles.length === 0) {
      return NextResponse.json({ error: "At least one valid role must be selected" }, { status: 400 })
    }

    const trimmedName = name?.trim()

    // Resolve district from taluk if matching
    let district: string | undefined = undefined
    if (taluk) {
      const matchTaluk = REGIONAL_TALUKS.find(
        (t) => t.name.toLowerCase() === taluk.toLowerCase() || t.id.toLowerCase() === taluk.toLowerCase()
      )
      if (matchTaluk) {
        district = matchTaluk.district
      }
    }

    const userUpdateData: { name?: string; taluk?: string; district?: string; village?: string } = {}
    if (trimmedName) userUpdateData.name = trimmedName
    if (taluk) userUpdateData.taluk = taluk
    if (district) userUpdateData.district = district
    if (village?.trim()) userUpdateData.village = village.trim()

    // Delete unselected non-verified capabilities and upsert selected ones
    await prisma.$transaction([
      ...(Object.keys(userUpdateData).length > 0
        ? [prisma.user.update({ where: { id: userId }, data: userUpdateData })]
        : []),
      prisma.userCapability.deleteMany({
        where: {
          userId,
          type: { notIn: selectedRoles },
          status: { not: VerificationStatus.VERIFIED },
        },
      }),
      ...selectedRoles.map(role => 
        prisma.userCapability.upsert({
          where: {
            userId_type: { userId, type: role },
          },
          update: {},
          create: {
            userId,
            type: role,
            status: role === CapabilityType.FARMER ? VerificationStatus.VERIFIED : VerificationStatus.UNVERIFIED,
            verifiedAt: role === CapabilityType.FARMER ? new Date() : null,
          },
        })
      ),
    ])

    // Query updated user record to issue refreshed session token
    const updatedUser = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        capabilities: {
          where: { status: VerificationStatus.VERIFIED },
          select: { type: true },
        },
      },
    })

    const response = NextResponse.json({
      success: true,
      user: {
        id: updatedUser?.id,
        name: updatedUser?.name,
        phone: updatedUser?.phone,
        taluk: updatedUser?.taluk,
        capabilities: updatedUser?.capabilities.map((c) => c.type) || [],
      },
    })

    if (updatedUser) {
      const sessionToken = await signSessionToken({
        id: updatedUser.id,
        name: updatedUser.name,
        phone: updatedUser.phone,
        isAdmin: updatedUser.isAdmin,
        capabilities: updatedUser.capabilities.map((c) => c.type),
      })

      const isSecure =
        process.env.NODE_ENV === "production" ||
        request.nextUrl.protocol === "https:"

      response.cookies.set(SESSION_COOKIE_NAME, sessionToken, {
        httpOnly: true,
        secure: isSecure,
        sameSite: "lax",
        path: "/",
        maxAge: SESSION_MAX_AGE_SECONDS,
      })
    }

    return response
  } catch (error) {
    if (error instanceof AuthGuardError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }
    console.error("Failed to update capabilities & profile:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
