import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getServerSession } from "@/lib/auth"
import { BookingServiceType } from "@prisma/client"
import Razorpay from "razorpay"

function getRazorpay() {
  return new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID!,
    key_secret: process.env.RAZORPAY_KEY_SECRET!,
  })
}

interface OrderItemInput {
  toolId: string
  totalAmount: number
  deposit: number
  startDate: string
  endDate: string
  days: number
  pricePerDay: number
  serviceType?: string
  operatorFeePerDay?: number
  totalOperatorFee?: number
  toolOwnerId?: string
}

export async function POST(request: NextRequest) {
  const session = await getServerSession()
  if (!session?.user) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { items, deliveryCharge } = body

    // Resolve the REAL tool owner per item from the Tool's instances (never
    // trust a client-supplied toolOwnerId — ownership lives on ToolInstance).
    const toolIds = items.map((i: OrderItemInput) => i.toolId)
    const tools = await prisma.tool.findMany({
      where: { id: { in: toolIds } },
      include: { instances: { select: { ownerId: true } } },
    })
    const ownerByTool = new Map(
      tools.map((t) => [t.id, t.instances[0]?.ownerId ?? null]),
    )

    const subtotal = items.reduce((sum: number, i: OrderItemInput) => sum + i.totalAmount, 0)
    const totalDeposit = items.reduce((sum: number, i: OrderItemInput) => sum + i.deposit, 0)
    const totalOperatorFee = items.reduce(
      (sum: number, i: OrderItemInput) => sum + (i.totalOperatorFee ?? 0),
      0,
    )
    const totalAmount = subtotal + totalDeposit + totalOperatorFee + deliveryCharge
    const amount = totalAmount

    const orderRecord = await prisma.order.create({
      data: {
        orderRef: `ORD${Date.now()}${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
        userId: session.user.id,
        totalAmount,
        paymentStatus: "PENDING",
      },
    })

    const bookings = []
    for (const item of items) {
      const toolOwnerId = ownerByTool.get(item.toolId)
      const bookingServiceType =
        item.serviceType === BookingServiceType.OPERATOR_ONLY
          ? BookingServiceType.OPERATOR_ONLY
          : BookingServiceType.SELF_SERVICE_RENTAL
      const operatorFeePerDay = bookingServiceType === BookingServiceType.OPERATOR_ONLY
        ? (item.operatorFeePerDay ?? 0)
        : 0
      const totalOperatorFeeForBooking = operatorFeePerDay * item.days

      const booking = await prisma.booking.create({
        data: {
          orderId: orderRecord.id,
          farmerId: session.user.id,
          toolId: item.toolId,
          toolOwnerId: toolOwnerId ?? session.user.id,
          servicePerformerId: session.user.id,
          serviceType: bookingServiceType,
          startDate: new Date(item.startDate),
          endDate: new Date(item.endDate),
          totalDays: item.days,
          toolFeePerDay: item.pricePerDay,
          operatorFeePerDay,
          totalToolFee: item.totalAmount,
          totalOperatorFee: totalOperatorFeeForBooking,
          subtotal: item.totalAmount + totalOperatorFeeForBooking,
          deposit: item.deposit,
          deliveryFee: deliveryCharge,
          platformFee: 0,
          pricePerDay: item.pricePerDay,
          totalAmount: item.totalAmount + item.deposit + totalOperatorFeeForBooking + deliveryCharge,
          status: "REQUESTED",
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
      notes: { orderId: orderRecord.id, bookingIds: bookings.map((b) => b.id).join(",") },
    })

    await prisma.order.update({
      where: { id: orderRecord.id },
      data: { razorpayOrderId: order.id },
    })

    for (const booking of bookings) {
      await prisma.payment.create({
        data: {
          orderId: orderRecord.id,
          bookingId: booking.id,
          razorpayOrderId: order.id,
          amount: booking.totalAmount,
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
