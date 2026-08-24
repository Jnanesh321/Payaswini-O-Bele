import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "@/lib/auth"
import { resolveBookingDepositService, TransitionError } from "@/server/services/bookings"

/**
 * Deposit resolution — runs after the tool is returned and inspection recorded
 * (booking in INSPECTION, or DISPUTED for admin resolution).
 *
 *   POST /api/rentals/[id]/deposit-resolution
 *   { action: "FULL_REFUND" | "PARTIAL_DEDUCTION" | "HOLD",
 *     deductedAmount?: number, note?: string, actor?: string }
 *
 * The operation is idempotent: retrying a resolved request is a safe no-op
 * (`alreadyResolved: true`) and never issues a second Razorpay refund.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession()
  if (!session?.user) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params

  let body: { action?: unknown; deductedAmount?: unknown; note?: unknown; actor?: unknown } = {}
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON body" }, { status: 400 })
  }

  try {
    const result = await resolveBookingDepositService({
      bookingId: id,
      userId: session.user.id,
      isAdmin: session.user.isAdmin,
      body,
    })
    return NextResponse.json({ success: true, data: result })
  } catch (error) {
    if (error instanceof TransitionError) {
      return NextResponse.json(
        { success: false, error: error.message, ...(error.data ? { data: error.data } : {}) },
        { status: error.statusCode },
      )
    }
    console.error("Deposit resolution failed:", error)
    return NextResponse.json({ success: false, error: "Deposit resolution failed" }, { status: 500 })
  }
}
