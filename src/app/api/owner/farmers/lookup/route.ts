import { NextRequest, NextResponse } from "next/server"
import { requireCapability, AuthGuardError } from "@/server/lib/auth-guard"
import { findFarmerByPhone } from "@/server/services/users"
import { CapabilityType } from "@prisma/client"

export async function GET(request: NextRequest) {
  try {
    const user = await requireCapability(CapabilityType.TOOL_OWNER)
    const { searchParams } = new URL(request.url)
    const phone = searchParams.get("phone")

    if (!phone) {
      return NextResponse.json({ success: false, error: "Phone number is required" }, { status: 400 })
    }

    const farmer = await findFarmerByPhone(phone)
    if (!farmer) {
      return NextResponse.json({ success: false, error: "No farmer found with this phone number" }, { status: 404 })
    }

    if (farmer.id === user.id) {
      return NextResponse.json({ success: false, error: "You cannot select your own account" }, { status: 400 })
    }

    return NextResponse.json({ success: true, data: farmer })
  } catch (error) {
    if (error instanceof AuthGuardError) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.statusCode })
    }
    console.error("Farmer lookup error:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}
