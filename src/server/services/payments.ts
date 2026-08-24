import { BookingServiceType, VerificationStatus } from "@prisma/client"
import Razorpay from "razorpay"
import { prisma } from "@/server/db/prisma"
import {
  BookingPricingError,
  computeBookingPricing,
  isRequestedServiceType,
  resolveDeliveryCharge,
  type ComputedBookingPricing,
} from "@/server/lib/booking-pricing"

function getRazorpay() {
  return new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID!,
    key_secret: process.env.RAZORPAY_KEY_SECRET!,
  })
}

interface OrderItemInput {
  toolId?: unknown
  startDate?: unknown
  endDate?: unknown
  serviceType?: unknown
}

interface PreparedBooking {
  toolId: string
  toolName: string
  toolOwnerId: string
  serviceType: BookingServiceType
  startDate: Date
  endDate: Date
  pricing: ComputedBookingPricing
}

function toDate(value: unknown, label: string): Date {
  const d = new Date(String(value ?? ""))
  if (Number.isNaN(d.getTime())) {
    throw new BookingPricingError(`${label} is required and must be a valid date`)
  }
  return d
}

export class PaymentServiceError extends Error {
  readonly statusCode: number
  constructor(message: string, statusCode: number) {
    super(message)
    this.name = "PaymentServiceError"
    this.statusCode = statusCode
  }
}

// ─── Create Razorpay order ──────────────────────────────────────────────────

export async function createRazorpayOrder(params: {
  userId: string
  items: unknown
  deliveryType: unknown
}) {
  const { userId, items: rawItems, deliveryType } = params

  if (!Array.isArray(rawItems) || rawItems.length === 0) {
    throw new PaymentServiceError("`items` must be a non-empty array", 400)
  }
  const items = rawItems as OrderItemInput[]

  const toolIds = items.map((i) => String(i.toolId ?? ""))
  const tools = await prisma.tool.findMany({
    where: { id: { in: toolIds } },
    include: { instances: { select: { ownerId: true } } },
  })
  const toolById = new Map(tools.map((t) => [t.id, t]))

  const deliveryCharge = resolveDeliveryCharge(deliveryType)

  // Pass 1: validate every item and recompute authoritative pricing
  const prepared: PreparedBooking[] = []
  let orderTotal = 0
  for (let index = 0; index < items.length; index++) {
    const item = items[index]
    const toolId = String(item.toolId ?? "")
    const tool = toolById.get(toolId)
    if (!tool) {
      throw new PaymentServiceError(`Tool not found: ${toolId}`, 400)
    }
    if (!tool.isActive) {
      throw new PaymentServiceError(`Tool "${tool.name}" is not available for booking`, 400)
    }

    const serviceType = item.serviceType
    if (!isRequestedServiceType(serviceType)) {
      throw new PaymentServiceError(
        `Invalid serviceType "${String(serviceType)}" — must be SELF_SERVICE_RENTAL or OPERATOR_ONLY`,
        400,
      )
    }

    let startDate: Date
    let endDate: Date
    try {
      startDate = toDate(item.startDate, "startDate")
      endDate = toDate(item.endDate, "endDate")
    } catch (error) {
      if (error instanceof BookingPricingError) {
        throw new PaymentServiceError(error.message, 400)
      }
      throw error
    }

    let pricing: ComputedBookingPricing
    try {
      pricing = computeBookingPricing({
        tool,
        serviceType,
        startDate,
        endDate,
        deliveryFee: index === 0 ? deliveryCharge : 0,
      })
    } catch (error) {
      if (error instanceof BookingPricingError) {
        throw new PaymentServiceError(error.message, 400)
      }
      throw error
    }

    const toolOwnerId = tool.instances[0]?.ownerId ?? null
    if (!toolOwnerId) {
      throw new PaymentServiceError(`Tool "${tool.name}" has no owner instance — cannot book`, 400)
    }

    // Scenario validity
    if (tool.requiresCertifiedOperator && serviceType === "SELF_SERVICE_RENTAL") {
      const permission = await prisma.selfOperatePermission.findUnique({
        where: {
          farmerId_toolOwnerId: { farmerId: userId, toolOwnerId },
        },
      })
      if (permission?.status !== VerificationStatus.VERIFIED) {
        throw new PaymentServiceError(
          `Self-operation of "${tool.name}" requires a VERIFIED grant from the tool owner`,
          400,
        )
      }
    }
    if (!tool.requiresCertifiedOperator && serviceType === "OPERATOR_ONLY") {
      throw new PaymentServiceError(
        `"${tool.name}" does not require a certified operator — request it as self-service`,
        400,
      )
    }

    prepared.push({
      toolId: tool.id,
      toolName: tool.name,
      toolOwnerId,
      serviceType: serviceType === "OPERATOR_ONLY"
        ? BookingServiceType.OPERATOR_ONLY
        : BookingServiceType.SELF_SERVICE_RENTAL,
      startDate,
      endDate,
      pricing,
    })
    orderTotal += pricing.totalAmount
  }

  const orderRecord = await prisma.order.create({
    data: {
      orderRef: `ORD${Date.now()}${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
      userId,
      totalAmount: orderTotal,
      paymentStatus: "PENDING",
    },
  })

  // Pass 2: persist bookings with ONLY server-calculated financials
  const bookings = []
  for (const p of prepared) {
    const booking = await prisma.booking.create({
      data: {
        orderId: orderRecord.id,
        farmerId: userId,
        toolId: p.toolId,
        toolOwnerId: p.toolOwnerId,
        servicePerformerId: userId,
        serviceType: p.serviceType,
        startDate: p.startDate,
        endDate: p.endDate,
        totalDays: p.pricing.days,
        toolFeePerDay: p.pricing.toolFeePerDay,
        operatorFeePerDay: p.pricing.operatorFeePerDay,
        totalToolFee: p.pricing.totalToolFee,
        totalOperatorFee: p.pricing.totalOperatorFee,
        deposit: p.pricing.deposit,
        deliveryFee: p.pricing.deliveryFee,
        platformFee: p.pricing.platformFee,
        subtotal: p.pricing.subtotal,
        pricePerDay: p.pricing.toolFeePerDay,
        totalAmount: p.pricing.totalAmount,
        status: "REQUESTED",
        bookingRef: `BK${Date.now()}${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
      },
    })
    bookings.push(booking)
  }

  // Razorpay order
  const receipt = `bk_${Date.now()}`
  const order = await getRazorpay().orders.create({
    amount: orderTotal,
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
        depositFrozen: booking.deposit > 0,
      },
    })
  }

  return {
    orderId: order.id,
    amount: order.amount,
    currency: order.currency,
    keyId: process.env.RAZORPAY_KEY_ID,
    bookingIds: bookings.map((b) => b.id),
  }
}

// ─── Verify Razorpay payment ────────────────────────────────────────────────

export async function verifyRazorpayPayment(params: {
  razorpayOrderId: string
  razorpayPaymentId: string
  razorpaySignature: string
  bookingIds: string[]
}) {
  const { razorpayOrderId, razorpayPaymentId, razorpaySignature, bookingIds } = params

  const crypto = await import("crypto")
  const body = razorpayOrderId + "|" + razorpayPaymentId
  const expectedSignature = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET!)
    .update(body)
    .digest("hex")

  if (expectedSignature !== razorpaySignature) {
    for (const id of bookingIds) {
      await prisma.payment.updateMany({
        where: { bookingId: id },
        data: { status: "FAILED" },
      })
    }
    throw new PaymentServiceError("Invalid signature", 400)
  }

  for (const id of bookingIds) {
    await prisma.payment.updateMany({
      where: { bookingId: id },
      data: { razorpayPaymentId, status: "CAPTURED", method: "razorpay" },
    })
    const booking = await prisma.booking.update({
      where: { id },
      data: { status: "OWNER_PENDING" },
    })
    if (booking.orderId) {
      await prisma.order.update({
        where: { id: booking.orderId },
        data: { paymentStatus: "CAPTURED" },
      })
    }
  }

  return { message: "Payment verified" }
}

// ─── Create payment record ──────────────────────────────────────────────────

export async function createPaymentRecord(data: {
  bookingId: string
  amount: number
  razorpayOrderId: string
}) {
  return prisma.payment.create({
    data: {
      ...data,
      status: "PENDING",
    },
  })
}
