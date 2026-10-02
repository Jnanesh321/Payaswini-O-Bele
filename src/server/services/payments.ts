import crypto from "crypto"
import { BookingEventActor, BookingServiceType, VerificationStatus } from "@prisma/client"
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
  toolInstanceId: string
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

    const instances = await prisma.toolInstance.findMany({
      where: {
        toolId: tool.id,
        status: { in: ["AVAILABLE", "RETURNED", "INSPECTION"] },
      },
      include: {
        bookings: {
          where: {
            status: {
              notIn: [
                "CANCELLED_BY_FARMER",
                "CANCELLED_BY_OWNER",
                "CANCELLED_BY_OPERATOR",
                "CANCELLED_BY_PLATFORM",
                "FAILED_NO_OPERATOR",
              ],
            },
            OR: [
              {
                startDate: { lte: endDate },
                endDate: { gte: startDate },
              },
            ],
          },
        },
      },
    })

    const availableInstance = instances.find((inst) => inst.bookings.length === 0)
    if (!availableInstance) {
      throw new PaymentServiceError(
        `No units of "${tool.name}" are available for the selected dates.`,
        400,
      )
    }

    const toolOwnerId = availableInstance.ownerId

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
    const isOperatorOnly = serviceType === "OPERATOR_ONLY" || serviceType === "WITH_OPERATOR"

    if (!tool.requiresCertifiedOperator && isOperatorOnly) {
      throw new PaymentServiceError(
        `"${tool.name}" does not require a certified operator — request it as self-service`,
        400,
      )
    }

    prepared.push({
      toolId: tool.id,
      toolName: tool.name,
      toolOwnerId,
      toolInstanceId: availableInstance.id,
      serviceType: isOperatorOnly
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
      orderRef: `ORD${Date.now()}${crypto.randomBytes(4).toString("hex").toUpperCase()}`,
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
        toolInstanceId: p.toolInstanceId,
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
        bookingRef: `BK${Date.now()}${crypto.randomBytes(4).toString("hex").toUpperCase()}`,
      },
    })
    bookings.push(booking)
  }

  // Razorpay order creation
  const receipt = `bk_${Date.now()}`
  let order: { id: string; amount: number | string; currency: string }
  try {
    const razorpayKey = process.env.RAZORPAY_KEY_ID || ""
    if (razorpayKey.startsWith("rzp_test_placeholder") || !process.env.RAZORPAY_KEY_SECRET) {
      order = {
        id: `order_mock_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        amount: orderTotal,
        currency: "INR",
      }
    } else {
      order = await getRazorpay().orders.create({
        amount: orderTotal,
        currency: "INR",
        receipt,
        notes: { orderId: orderRecord.id, bookingIds: bookings.map((b) => b.id).join(",") },
      })
    }
  } catch (err) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("Razorpay API call failed in non-production, using mock order:", err)
      order = {
        id: `order_mock_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        amount: orderTotal,
        currency: "INR",
      }
    } else {
      throw err
    }
  }

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
    key: process.env.RAZORPAY_KEY_ID || "rzp_test_placeholder",
    keyId: process.env.RAZORPAY_KEY_ID || "rzp_test_placeholder",
    bookingId: bookings[0]?.id,
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

  if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature || !Array.isArray(bookingIds) || bookingIds.length === 0) {
    throw new PaymentServiceError("Missing required verification parameters", 400)
  }

  const crypto = await import("crypto")
  const body = razorpayOrderId + "|" + razorpayPaymentId
  const keySecret = process.env.RAZORPAY_KEY_SECRET || ""
  const expectedSignature = crypto
    .createHmac("sha256", keySecret)
    .update(body)
    .digest("hex")

  let isValidSignature = false
  try {
    isValidSignature =
      expectedSignature.length === razorpaySignature.length &&
      crypto.timingSafeEqual(Buffer.from(expectedSignature), Buffer.from(razorpaySignature))
  } catch {
    isValidSignature = false
  }

  if (!isValidSignature) {
    for (const id of bookingIds) {
      await prisma.payment.updateMany({
        where: { bookingId: id, status: "PENDING" },
        data: { status: "FAILED" },
      })
    }
    throw new PaymentServiceError("Invalid signature", 400)
  }

  const now = new Date()

  // Process verified payments and bookings idempotently
  for (const id of bookingIds) {
    const existingPayment = await prisma.payment.findFirst({
      where: { bookingId: id },
    })

    if (existingPayment?.status === "CAPTURED") {
      continue // Already verified (e.g. by concurrent webhook)
    }

    await prisma.payment.updateMany({
      where: { bookingId: id },
      data: {
        razorpayPaymentId,
        status: "CAPTURED",
        method: "razorpay",
        webhookVerified: true,
        webhookReceivedAt: now,
      },
    })

    const booking = await prisma.booking.findUnique({ where: { id } })
    if (booking && booking.status === "REQUESTED") {
      await prisma.booking.update({
        where: { id },
        data: { status: "OWNER_PENDING" },
      })

      await prisma.bookingStateLog.create({
        data: {
          bookingId: id,
          fromState: "REQUESTED",
          toState: "OWNER_PENDING",
          actor: BookingEventActor.SYSTEM,
          note: "Payment verified via client verification checkout",
        },
      })

      if (booking.orderId) {
        await prisma.order.update({
          where: { id: booking.orderId },
          data: { paymentStatus: "CAPTURED" },
        })
      }
    }
  }

  return { message: "Payment verified" }
}

// ─── Create payment record ──────────────────────────────────────────────────

export async function createPaymentRecord(data: {
  bookingId: string
  amount: number
  razorpayOrderId: string
  orderId?: string
}) {
  return prisma.payment.create({
    data: {
      ...data,
      status: "PENDING",
    },
  })
}

// ─── Handle Razorpay Webhook ────────────────────────────────────────────────

export async function handleRazorpayWebhook(params: {
  rawBody: string
  signature: string
}) {
  const { rawBody, signature } = params
  const crypto = await import("crypto")

  const secret = process.env.RAZORPAY_WEBHOOK_SECRET
  if (!secret) {
    throw new PaymentServiceError("RAZORPAY_WEBHOOK_SECRET is not configured on server", 500)
  }

  const expectedSignature = crypto
    .createHmac("sha256", secret)
    .update(rawBody)
    .digest("hex")

  let isSignatureValid = false
  try {
    isSignatureValid =
      expectedSignature.length === signature.length &&
      crypto.timingSafeEqual(Buffer.from(expectedSignature), Buffer.from(signature))
  } catch {
    isSignatureValid = false
  }

  if (!isSignatureValid) {
    throw new PaymentServiceError("Invalid webhook signature", 400)
  }

  let event: Record<string, unknown>
  try {
    event = JSON.parse(rawBody)
  } catch {
    throw new PaymentServiceError("Invalid JSON payload", 400)
  }

  const eventType = event.event as string
  const payload = event.payload as Record<string, { entity?: Record<string, unknown> }> | undefined

  if (eventType === "payment.captured" || eventType === "order.paid") {
    const paymentEntity = payload?.payment?.entity
    const orderEntity = payload?.order?.entity

    const razorpayPaymentId = paymentEntity?.id
    const razorpayOrderId = paymentEntity?.order_id || orderEntity?.id
    const method = paymentEntity?.method || "razorpay"
    const vpa = paymentEntity?.vpa || null

    if (!razorpayOrderId && !razorpayPaymentId) {
      return { received: true, message: "Missing order/payment identifiers" }
    }

    const payments = await prisma.payment.findMany({
      where: {
        OR: [
          ...(razorpayOrderId ? [{ razorpayOrderId }] : []),
          ...(razorpayPaymentId ? [{ razorpayPaymentId }] : []),
        ],
      },
      include: {
        booking: true,
      },
    })

    const now = new Date()

    for (const p of payments) {
      await prisma.payment.update({
        where: { id: p.id },
        data: {
          status: "CAPTURED",
          razorpayPaymentId: razorpayPaymentId || p.razorpayPaymentId,
          method,
          vpa,
          webhookVerified: true,
          webhookReceivedAt: now,
        },
      })

      if (p.bookingId && p.booking) {
        if (p.booking.status === "REQUESTED") {
          await prisma.booking.update({
            where: { id: p.bookingId },
            data: { status: "OWNER_PENDING" },
          })

          await prisma.bookingStateLog.create({
            data: {
              bookingId: p.bookingId,
              fromState: "REQUESTED",
              toState: "OWNER_PENDING",
              actor: BookingEventActor.SYSTEM,
              note: `Payment captured via Razorpay webhook (${eventType})`,
            },
          })
        }
      }

      if (p.orderId) {
        await prisma.order.update({
          where: { id: p.orderId },
          data: { paymentStatus: "CAPTURED" },
        })
      }
    }

    return { received: true, event: eventType, updatedPayments: payments.length }
  }

  if (eventType === "payment.failed") {
    const paymentEntity = payload?.payment?.entity
    const razorpayPaymentId = paymentEntity?.id
    const razorpayOrderId = paymentEntity?.order_id

    if (razorpayOrderId || razorpayPaymentId) {
      const payments = await prisma.payment.findMany({
        where: {
          OR: [
            ...(razorpayOrderId ? [{ razorpayOrderId }] : []),
            ...(razorpayPaymentId ? [{ razorpayPaymentId }] : []),
          ],
          status: "PENDING",
        },
      })

      const now = new Date()
      for (const p of payments) {
        await prisma.payment.update({
          where: { id: p.id },
          data: {
            status: "FAILED",
            razorpayPaymentId: razorpayPaymentId || p.razorpayPaymentId,
            webhookVerified: true,
            webhookReceivedAt: now,
          },
        })

        if (p.orderId) {
          await prisma.order.update({
            where: { id: p.orderId },
            data: { paymentStatus: "FAILED" },
          })
        }
      }
    }

    return { received: true, event: eventType }
  }

  return { received: true, event: eventType, message: "Event ignored" }
}

