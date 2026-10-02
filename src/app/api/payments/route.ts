import { NextRequest, NextResponse } from "next/server"
import { requireAuth, requireBookingAccess, AuthGuardError } from "@/server/lib/auth-guard"
import { createPaymentRecord } from "@/server/services/payments"
import { prisma } from "@/server/db/prisma"

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()
    const body = await request.json()
    const { bookingId, amount, razorpayOrderId } = body

    if (!bookingId || typeof amount !== "number" || !razorpayOrderId) {
      return NextResponse.json(
        { success: false, error: "Missing required payment fields: bookingId, amount, razorpayOrderId" },
        { status: 400 }
      )
    }

    const { booking } = await requireBookingAccess(bookingId, user.id, user.isAdmin)
    if (!user.isAdmin && booking.farmerId !== user.id) {
      return NextResponse.json({ success: false, error: "Unauthorized access to booking" }, { status: 403 })
    }

    if (amount !== booking.totalAmount) {
      return NextResponse.json(
        { success: false, error: `Invalid payment amount. Expected ${booking.totalAmount}, got ${amount}` },
        { status: 400 }
      )
    }

    const existingPayment = await prisma.payment.findUnique({
      where: { bookingId },
    })

    if (existingPayment) {
      return NextResponse.json(
        { success: false, error: "Payment record already exists for this booking" },
        { status: 409 }
      )
    }

    const payment = await createPaymentRecord({
      bookingId,
      amount,
      razorpayOrderId,
      orderId: booking.orderId,
    })
    return NextResponse.json({ success: true, data: payment }, { status: 201 })
  } catch (error) {
    if (error instanceof AuthGuardError) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.statusCode })
    }
    return NextResponse.json({ success: false, error: "Payment creation failed" }, { status: 500 })
  }
}
