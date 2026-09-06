import { NextRequest, NextResponse } from "next/server"
import { requireAdmin, AuthGuardError } from "@/server/lib/auth-guard"
import { assignOperator, TransitionError } from "@/server/services/bookings"

/**
 * POST /api/rentals/[id]/assign-operator — Admin manual operator assignment
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireAdmin()

  const { id } = await params
  let operatorId: unknown
  try {
    const body = await request.json()
    operatorId = body?.operatorId
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON body" }, { status: 400 })
  }
  if (typeof operatorId !== "string" || !operatorId) {
    return NextResponse.json(
      { success: false, error: "Missing or invalid `operatorId`" },
      { status: 400 },
    )
  }

    const result = await assignOperator({
      bookingId: id,
      userId: user.id,
      operatorId,
    })
    return NextResponse.json({ success: true, data: result })
  } catch (error) {
    if (error instanceof AuthGuardError) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.statusCode })
    }
    if (error instanceof TransitionError) {
      return NextResponse.json(
        { success: false, error: error.message, ...(error.data ? { data: error.data } : {}) },
        { status: error.statusCode },
      )
    }
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}
