import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "@/lib/auth"
import { listFarmerBookings, createBooking, CreateBookingError } from "@/server/services/bookings"

export async function GET() {
  const session = await getServerSession()
  if (!session?.user) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }

  const bookings = await listFarmerBookings(session.user.id)
  return NextResponse.json({ success: true, data: bookings })
}

export async function POST(request: NextRequest) {
  const session = await getServerSession()
  if (!session?.user) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await request.json()
    const booking = await createBooking(session.user.id, body)
    return NextResponse.json({ success: true, data: booking }, { status: 201 })
  } catch (error) {
    if (error instanceof CreateBookingError) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.statusCode })
    }
    return NextResponse.json({ success: false, error: "Failed to create booking" }, { status: 500 })
  }
}
