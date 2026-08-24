import { NextRequest, NextResponse } from "next/server"
import { createPaymentRecord } from "@/server/services/payments"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { bookingId, amount, razorpayOrderId } = body
    const payment = await createPaymentRecord({ bookingId, amount, razorpayOrderId })
    return NextResponse.json({ success: true, data: payment }, { status: 201 })
  } catch (error) {
    return NextResponse.json({ success: false, error: "Payment failed" }, { status: 500 })
  }
}
