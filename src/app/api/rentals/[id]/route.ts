import { NextRequest, NextResponse } from "next/server"
import { requireAuth, requireBookingAccess, AuthGuardError } from "@/server/lib/auth-guard"
import { updateBooking, type BookingUpdateInput } from "@/server/services/bookings"

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireAuth()
    const { id } = await params
    const { booking } = await requireBookingAccess(id, user.id, user.isAdmin)
    return NextResponse.json({ success: true, data: booking })
  } catch (error) {
    if (error instanceof AuthGuardError) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.statusCode })
    }
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireAuth()
    const { id } = await params
    const { booking } = await requireBookingAccess(id, user.id, user.isAdmin)

    const body = await request.json()

    // Non-admins can only update non-authoritative notes or delivery details before acceptance
    const allowedData: BookingUpdateInput = {}
    if (user.isAdmin) {
      if (body.deliveryAddress !== undefined) allowedData.deliveryAddress = body.deliveryAddress
      if (body.deliveryDistrict !== undefined) allowedData.deliveryDistrict = body.deliveryDistrict
      if (body.deliveryTaluk !== undefined) allowedData.deliveryTaluk = body.deliveryTaluk
      if (body.deliveryPincode !== undefined) allowedData.deliveryPincode = body.deliveryPincode
      if (body.deliveryStatus !== undefined) allowedData.deliveryStatus = body.deliveryStatus
      if (body.notes !== undefined) allowedData.notes = body.notes
    } else {
      // Only permit modifying notes or address if still in early requested states
      if (["REQUESTED", "OWNER_PENDING"].includes(booking.status)) {
        if (body.deliveryAddress !== undefined) allowedData.deliveryAddress = body.deliveryAddress
        if (body.deliveryDistrict !== undefined) allowedData.deliveryDistrict = body.deliveryDistrict
        if (body.deliveryTaluk !== undefined) allowedData.deliveryTaluk = body.deliveryTaluk
        if (body.deliveryPincode !== undefined) allowedData.deliveryPincode = body.deliveryPincode
        if (body.notes !== undefined) allowedData.notes = body.notes
      } else {
        return NextResponse.json(
          { success: false, error: "Booking details cannot be directly modified in the current state" },
          { status: 400 },
        )
      }
    }

    const updated = await updateBooking(id, allowedData)
    return NextResponse.json({ success: true, data: updated })
  } catch (error) {
    if (error instanceof AuthGuardError) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.statusCode })
    }
    return NextResponse.json({ success: false, error: "Update failed" }, { status: 500 })
  }
}

