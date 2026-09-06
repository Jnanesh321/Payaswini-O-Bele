import { NextRequest, NextResponse } from "next/server"
import { requireCapability, AuthGuardError } from "@/server/lib/auth-guard"
import { toggleToolAvailability, OwnerServiceError } from "@/server/services/owners"
import { CapabilityType } from "@prisma/client"

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ toolId: string }> },
) {
  try {
    const user = await requireCapability(CapabilityType.TOOL_OWNER)
    const { toolId } = await params
    const body = await request.json().catch(() => ({}))
    const { available } = body

    if (typeof available !== "boolean") {
      return NextResponse.json({ success: false, error: "Missing `available` boolean" }, { status: 400 })
    }

    const data = await toggleToolAvailability(user.id, toolId, available)
    return NextResponse.json({ success: true, data })
  } catch (error) {
    if (error instanceof AuthGuardError) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.statusCode })
    }
    if (error instanceof OwnerServiceError) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.statusCode })
    }
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}
