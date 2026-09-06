import { NextRequest, NextResponse } from "next/server"
import { requireAuth, AuthGuardError } from "@/server/lib/auth-guard"
import { prisma } from "@/server/db/prisma"
import { CapabilityType, VerificationStatus } from "@prisma/client"

export async function GET() {
  try {
    const user = await requireAuth()
    const capabilities = await prisma.userCapability.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "asc" },
    })
    
    return NextResponse.json({ 
      success: true, 
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
    const { capabilities } = await request.json() as { capabilities: string[] }
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

    // Delete unselected non-verified capabilities and upsert selected ones
    await prisma.$transaction([
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

    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof AuthGuardError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }
    console.error("Failed to update capabilities:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
