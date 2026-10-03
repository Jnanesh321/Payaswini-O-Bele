import { NextRequest, NextResponse } from "next/server"
import { requireAdmin, AuthGuardError } from "@/server/lib/auth-guard"
import { reviewAdminEquipment } from "@/server/services/equipment"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdmin()
    const { id } = await params
    const body = await request.json()
    const { action, notes } = body

    if (action !== "APPROVE" && action !== "REJECT") {
      return NextResponse.json(
        { success: false, error: "Action must be APPROVE or REJECT" },
        { status: 400 },
      )
    }

    const updated = await reviewAdminEquipment(id, action, notes)
    return NextResponse.json({ success: true, data: updated })
  } catch (error) {
    if (error instanceof AuthGuardError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.statusCode },
      )
    }
    console.error("Failed to review equipment:", error)
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    )
  }
}
