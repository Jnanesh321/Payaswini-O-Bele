import { NextRequest, NextResponse } from "next/server"
import { requireAuth, requireBookingAccess, AuthGuardError } from "@/server/lib/auth-guard"
import { getBookingWithTransitions, transitionBooking, TransitionError } from "@/server/services/bookings"

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireAuth()
    const { id } = await params
    await requireBookingAccess(id, user.id, user.isAdmin)

    const booking = await getBookingWithTransitions(id)
    if (!booking) {
      return NextResponse.json({ success: false, error: "Booking not found" }, { status: 404 })
    }
    return NextResponse.json({ success: true, data: booking })
  } catch (error) {
    if (error instanceof AuthGuardError) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.statusCode })
    }
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireAuth()
    const { id } = await params
    let body: { to?: string; note?: string; actor?: string; operatorMode?: "assign_operator" | "self_service" } = {}
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ success: false, error: "Invalid JSON body" }, { status: 400 })
    }

    const result = await transitionBooking({
      bookingId: id,
      userId: user.id,
      isAdmin: user.isAdmin ?? false,
      body,
    })
    return NextResponse.json({ success: true, data: result })
  } catch (error) {
    if (error instanceof AuthGuardError) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.statusCode })
    }
    if (error instanceof TransitionError) {
      return NextResponse.json(
        { success: false, error: error.message, data: error.data },
        { status: error.statusCode },
      )
    }
    console.error("Booking transition failed:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}
