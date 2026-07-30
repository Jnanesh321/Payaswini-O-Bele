import { NextRequest, NextResponse } from "next/server"
import crypto from "crypto"
import { prisma } from "@/lib/prisma"

export async function POST(request: NextRequest) {
  try {
    const { razorpayOrderId, razorpayPaymentId, razorpaySignature, bookingIds } = await request.json()

    const body = razorpayOrderId + "|" + razorpayPaymentId
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET!)
      .update(body)
      .digest("hex")

    if (expectedSignature !== razorpaySignature) {
      for (const id of bookingIds) {
        await prisma.payment.update({
          where: { bookingId: id },
          data: { status: "FAILED" },
        })
      }
      return NextResponse.json({ success: false, error: "Invalid signature" }, { status: 400 })
    }

    for (const id of bookingIds) {
      await prisma.payment.update({
        where: { bookingId: id },
        data: { razorpayPaymentId, status: "CAPTURED", method: "razorpay" },
      })
      await prisma.booking.update({
        where: { id },
        data: { status: "CONFIRMED" },
      })
    }

    return NextResponse.json({ success: true, message: "Payment verified" })
  } catch (error) {
    return NextResponse.json({ success: false, error: "Verification failed" }, { status: 500 })
  }
}
