import { NextRequest, NextResponse } from "next/server"
import { verifyRazorpayPayment, PaymentServiceError } from "@/server/services/payments"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const result = await verifyRazorpayPayment({
      razorpayOrderId: body.razorpayOrderId,
      razorpayPaymentId: body.razorpayPaymentId,
      razorpaySignature: body.razorpaySignature,
      bookingIds: body.bookingIds,
    })
    return NextResponse.json({ success: true, ...result })
  } catch (error) {
    if (error instanceof PaymentServiceError) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.statusCode })
    }
    return NextResponse.json({ success: false, error: "Verification failed" }, { status: 500 })
  }
}
