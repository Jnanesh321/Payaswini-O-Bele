import { NextResponse } from "next/server"
import { requireCapability, AuthGuardError } from "@/server/lib/auth-guard"
import { getOwnerEarnings, OwnerServiceError } from "@/server/services/owners"
import { CapabilityType } from "@prisma/client"

export async function GET(request: Request) {
  try {
    const user = await requireCapability(CapabilityType.TOOL_OWNER)
    const url = new URL(request.url)
    const periodParam = url.searchParams.get("period")
    const data = await getOwnerEarnings(user.id, periodParam)
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
