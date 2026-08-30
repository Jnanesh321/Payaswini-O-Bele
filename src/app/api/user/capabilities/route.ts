import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "@/server/lib/auth"
import { prisma } from "@/server/db/prisma"
import { CapabilityType } from "@prisma/client"

export async function GET() {
  const session = await getServerSession()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  
  try {
    const capabilities = await prisma.userCapability.findMany({
      where: { userId: session.user.id }
    })
    
    return NextResponse.json({ 
      success: true, 
      capabilities: capabilities.map(c => c.type),
      hasCapabilities: capabilities.length > 0 
    })
  } catch (error) {
    console.error("Failed to fetch capabilities:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const session = await getServerSession()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  
  try {
    const { capabilities } = await request.json() as { capabilities: string[] }
    if (!Array.isArray(capabilities)) {
      return NextResponse.json({ error: "Invalid request payload" }, { status: 400 })
    }

    const userId = session.user.id
    
    // Validate capabilities
    const validRoles = Object.values(CapabilityType) as string[]
    const selectedRoles = capabilities.filter(role => validRoles.includes(role)) as CapabilityType[]
    
    if (selectedRoles.length === 0) {
      return NextResponse.json({ error: "At least one valid role must be selected" }, { status: 400 })
    }

    // Delete existing capabilities not in selection and upsert selected ones
    await prisma.$transaction([
      prisma.userCapability.deleteMany({
        where: {
          userId,
          type: { notIn: selectedRoles }
        }
      }),
      ...selectedRoles.map(role => 
        prisma.userCapability.upsert({
          where: {
            userId_type: { userId, type: role }
          },
          update: {},
          create: { userId, type: role }
        })
      )
    ])

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Failed to update capabilities:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
