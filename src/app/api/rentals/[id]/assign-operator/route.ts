import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "@/lib/auth"
import { assignOperator, TransitionError } from "@/server/services/bookings"

/**
 * POST /api/rentals/[id]/assign-operator — Admin manual operator assignment
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession()
  if (!session?.user) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }
  if (!session.user.isAdmin) {
    return NextResponse.json({ success: false, error: "Forbidden — admin only" }, { status: 403 })
  }

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

  try {
    const result = await assignOperator({
      bookingId: id,
      userId: session.user.id,
      operatorId,
    })
    return NextResponse.json({ success: true, data: result })
  } catch (error) {
    if (error instanceof TransitionError) {
      return NextResponse.json(
        { success: false, error: error.message, ...(error.data ? { data: error.data } : {}) },
        { status: error.statusCode },
      )
    }
    throw error
  }
}
