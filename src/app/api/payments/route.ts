import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { bookingId, amount, razorpayOrderId } = body

    const payment = await prisma.payment.create({
      data: {
        bookingId,
        amount,
        razorpayOrderId,
        status: "PENDING",
      },
    })

    return NextResponse.json({ success: true, data: payment }, { status: 201 })
  } catch (error) {
    return NextResponse.json({ success: false, error: "Payment failed" }, { status: 500 })
  }
}
