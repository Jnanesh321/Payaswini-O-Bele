import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "@/lib/auth"
import { listCapabilityVerifications, AdminServiceError } from "@/server/services/admin"
import { CapabilityType, VerificationStatus } from "@prisma/client"

export async function GET(request: NextRequest) {
  const session = await getServerSession()
  if (!session?.user?.isAdmin) {
    return NextResponse.json({ success: false, error: "Unauthorized — Admin access required" }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const typeParam = searchParams.get("type")
  const statusParam = searchParams.get("status")

  const type =
    typeParam && Object.values(CapabilityType).includes(typeParam as CapabilityType)
      ? (typeParam as CapabilityType)
      : undefined

  const status =
    statusParam && Object.values(VerificationStatus).includes(statusParam as VerificationStatus)
      ? (statusParam as VerificationStatus)
      : undefined

  try {
    const data = await listCapabilityVerifications({ type, status })
    return NextResponse.json({ success: true, data })
  } catch (error) {
    if (error instanceof AdminServiceError) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.statusCode })
    }
    console.error("Failed to list verifications:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}
