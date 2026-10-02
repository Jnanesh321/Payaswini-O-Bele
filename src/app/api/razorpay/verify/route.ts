import { NextRequest, NextResponse } from "next/server"
import { requireAuth, AuthGuardError } from "@/server/lib/auth-guard"
import { verifyRazorpayPayment, PaymentServiceError } from "@/server/services/payments"
import { prisma } from "@/server/db/prisma"

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()
    const body = await request.json()
    const { razorpayOrderId, razorpayPaymentId, razorpaySignature, bookingIds } = body

    if (
      !razorpayOrderId ||
      !razorpayPaymentId ||
      !razorpaySignature ||
      !Array.isArray(bookingIds) ||
      bookingIds.length === 0
    ) {
      return NextResponse.json(
        { success: false, error: "Missing or invalid required verification fields" },
        { status: 400 },
      )
    }

    // Validate that caller is the farmer (or admin) and order matches for all bookings
    const bookings = await prisma.booking.findMany({
      where: { id: { in: bookingIds } },
      include: { payment: true, order: true },
    })

    if (bookings.length !== bookingIds.length) {
      return NextResponse.json(
        { success: false, error: "One or more bookings not found" },
        { status: 404 },
      )
    }

    for (const b of bookings) {
      if (!user.isAdmin && b.farmerId !== user.id) {
        return NextResponse.json(
          { success: false, error: "Unauthorized access to booking" },
          { status: 403 },
        )
      }

      const expectedOrderId = b.payment?.razorpayOrderId || b.order?.razorpayOrderId
      if (expectedOrderId && expectedOrderId !== razorpayOrderId) {
        return NextResponse.json(
          { success: false, error: "Razorpay order ID does not match booking" },
          { status: 400 },
        )
      }
    }

    const result = await verifyRazorpayPayment({
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
      bookingIds,
    })
    return NextResponse.json({ success: true, ...result })
  } catch (error) {
    if (error instanceof AuthGuardError) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.statusCode })
    }
    if (error instanceof PaymentServiceError) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.statusCode })
    }
    return NextResponse.json({ success: false, error: "Verification failed" }, { status: 500 })
  }
}
