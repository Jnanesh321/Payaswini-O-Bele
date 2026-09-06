import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "@/server/lib/auth"
import { submitCapabilityVerification } from "@/server/services/users"
import { CapabilityType } from "@prisma/client"

export async function POST(request: NextRequest) {
  const session = await getServerSession()
  if (!session?.user?.id) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { type, notes, name, village, taluk, district, pincode } = body

    if (!type || !Object.values(CapabilityType).includes(type)) {
      return NextResponse.json({ success: false, error: "Invalid capability type" }, { status: 400 })
    }

    const capability = await submitCapabilityVerification(session.user.id, {
      type: type as CapabilityType,
      notes,
      name,
      village,
      taluk,
      district,
      pincode,
    })

    return NextResponse.json({ success: true, data: capability })
  } catch (error) {
    console.error("Capability verification submission failed:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}
