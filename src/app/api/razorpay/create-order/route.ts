import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getServerSession } from "@/lib/auth"

function getRazorpay() {
  const Razorpay = require("razorpay")
  return new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID!,
    key_secret: process.env.RAZORPAY_KEY_SECRET!,
  })
}

export async function POST(request: NextRequest) {
  const session = await getServerSession()
  if (!session?.user) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { items, deliveryCharge } = await request.json()

    const subtotal = items.reduce((sum: number, i: { totalAmount: number }) => sum + i.totalAmount, 0)
    const totalDeposit = items.reduce((sum: number, i: { deposit: number }) => sum + i.deposit, 0)
    const totalAmount = subtotal + totalDeposit + deliveryCharge
    const amount = totalAmount

    const bookings = []
    for (const item of items) {
      const booking = await prisma.booking.create({
        data: {
          userId: session.user.id,
          toolId: item.toolId,
          startDate: new Date(item.startDate),
          endDate: new Date(item.endDate),
          subtotal: item.totalAmount,
          deposit: item.deposit,
          deliveryCharge,
          pricePerDay: item.pricePerDay,
          totalDays: item.days,
          totalAmount: item.totalAmount + item.deposit + deliveryCharge,
          status: "PENDING",
          bookingRef: `BK${Date.now()}${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
        },
      })
      bookings.push(booking)
    }

    const receipt = `bk_${Date.now()}`
    const order = await getRazorpay().orders.create({
      amount,
      currency: "INR",
      receipt,
      notes: { bookingIds: bookings.map((b) => b.id).join(",") },
    })

    for (const booking of bookings) {
      await prisma.payment.create({
        data: {
          bookingId: booking.id,
          razorpayOrderId: order.id,
          amount,
          status: "PENDING",
        },
      })
    }

    return NextResponse.json({
      success: true,
      data: {
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
        keyId: process.env.RAZORPAY_KEY_ID,
        bookingIds: bookings.map((b) => b.id),
      },
    })
  } catch (error) {
    console.error("Razorpay order creation failed:", error)
    return NextResponse.json({ success: false, error: "Failed to create order" }, { status: 500 })
  }
}
