import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "@/lib/auth"
import { reviewCapabilityVerification, AdminServiceError } from "@/server/services/admin"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession()
  if (!session?.user?.isAdmin) {
    return NextResponse.json({ success: false, error: "Unauthorized — Admin access required" }, { status: 403 })
  }

  const { id } = await params

  try {
    const body = await request.json()
    const { decision, notes } = body

    if (decision !== "APPROVE" && decision !== "REJECT") {
      return NextResponse.json({ success: false, error: "Decision must be APPROVE or REJECT" }, { status: 400 })
    }

    const updated = await reviewCapabilityVerification(id, session.user.id, decision, notes)
    return NextResponse.json({ success: true, data: updated })
  } catch (error) {
    if (error instanceof AdminServiceError) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.statusCode })
    }
    console.error("Failed to review verification:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}
