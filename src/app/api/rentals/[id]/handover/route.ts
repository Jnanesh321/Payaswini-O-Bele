import { NextRequest, NextResponse } from "next/server"
import { requireAuth, requireBookingAccess, AuthGuardError } from "@/server/lib/auth-guard"
import { recordHandoverLog, getBookingById, TransitionError } from "@/server/services/bookings"
import { HandoverType } from "@prisma/client"

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireAuth()
    const { id } = await params
    await requireBookingAccess(id, user.id, user.isAdmin)

    const booking = await getBookingById(id)
    if (!booking) {
      return NextResponse.json({ success: false, error: "Booking not found" }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      data: {
        bookingId: booking.id,
        bookingRef: booking.bookingRef,
        tool: booking.tool,
        toolInstance: booking.toolInstance,
        handoverLogs: booking.handoverLogs,
      },
    })
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
    await requireBookingAccess(id, user.id, user.isAdmin)

    const body = await request.json()
    const { handoverType, conditionGrade, notes, photos } = body

    if (!handoverType || !Object.values(HandoverType).includes(handoverType)) {
      return NextResponse.json({ success: false, error: "Invalid handover type" }, { status: 400 })
    }

    const log = await recordHandoverLog({
      bookingId: id,
      userId: user.id,
      handoverType: handoverType as HandoverType,
      conditionGrade,
      notes,
      photos,
    })

    return NextResponse.json({ success: true, data: log })
  } catch (error) {
    if (error instanceof AuthGuardError) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.statusCode })
    }
    if (error instanceof TransitionError) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.statusCode })
    }
    console.error("Handover recording error:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}
