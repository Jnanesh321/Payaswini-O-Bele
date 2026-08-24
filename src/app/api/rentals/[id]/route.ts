import { NextRequest, NextResponse } from "next/server"
import { getBookingById, updateBooking } from "@/server/services/bookings"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const booking = await getBookingById(id)
  if (!booking) {
    return NextResponse.json({ success: false, error: "Booking not found" }, { status: 404 })
  }
  return NextResponse.json({ success: true, data: booking })
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const body = await request.json()
  const booking = await updateBooking(id, body)
  return NextResponse.json({ success: true, data: booking })
}
