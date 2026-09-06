import { NextRequest, NextResponse } from "next/server"
import { requireCapability, AuthGuardError } from "@/server/lib/auth-guard"
import { listOwnerPermissions, grantOwnerPermission, OwnerServiceError } from "@/server/services/owners"
import { CapabilityType, VerificationStatus } from "@prisma/client"

export async function GET() {
  try {
    const user = await requireCapability(CapabilityType.TOOL_OWNER)
    const data = await listOwnerPermissions(user.id)
    return NextResponse.json({ success: true, data })
  } catch (error) {
    if (error instanceof AuthGuardError) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.statusCode })
    }
    console.error("Failed to list owner permissions:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireCapability(CapabilityType.TOOL_OWNER)
    const body = await request.json()
    const { phone, status } = body

    if (!phone) {
      return NextResponse.json({ success: false, error: "Phone number is required" }, { status: 400 })
    }

    const verificationStatus =
      status === "REVOKED"
        ? VerificationStatus.REVOKED
        : status === "SUSPENDED"
        ? VerificationStatus.SUSPENDED
        : VerificationStatus.VERIFIED

    const permission = await grantOwnerPermission(user.id, phone, verificationStatus)
    return NextResponse.json({ success: true, data: permission })
  } catch (error) {
    if (error instanceof AuthGuardError) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.statusCode })
    }
    if (error instanceof OwnerServiceError) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.statusCode })
    }
    console.error("Failed to grant permission:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}
