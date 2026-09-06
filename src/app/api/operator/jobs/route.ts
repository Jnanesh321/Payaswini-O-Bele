import { NextResponse } from "next/server"
import { requireCapability, AuthGuardError } from "@/server/lib/auth-guard"
import { listOperatorJobs } from "@/server/services/operators"
import { CapabilityType } from "@prisma/client"

export async function GET() {
  try {
    const user = await requireCapability(CapabilityType.OPERATOR)
    const data = await listOperatorJobs(user.id)
    return NextResponse.json({ success: true, data })
  } catch (error) {
    if (error instanceof AuthGuardError) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.statusCode })
    }
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}
