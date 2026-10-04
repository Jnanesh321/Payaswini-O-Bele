import crypto from "crypto"
import {
  BookingEventActor,
  BookingServiceType,
  BookingStatus,
  DeliveryStatus,
  HandoverType,
  Prisma,
  ToolInstanceStatus,
  type BookingStateLog,
} from "@prisma/client"
import { prisma } from "@/server/db/prisma"
import {
  assertTransition,
  InvalidBookingTransitionError,
  getPermittedTargets,
  getActorPermittedTargets,
  deriveModeFromServiceType,
  computeCancellationPolicy,
  isTerminalCancellation,
  countOperatorRejections,
  OPERATOR_REJECTION_LIMIT,
  type TransitionOptions,
} from "@/server/lib/booking-state-machine"
import {
  BookingPricingError,
  computeBookingPricing,
  isRequestedServiceType,
  resolveDeliveryCharge,
} from "@/server/lib/booking-pricing"
import { validateDispatchEligibility, DispatchEligibilityError } from "@/lib/geo"
import { sendSmsNotification } from "@/server/lib/sms"
import { isDepositResolutionRequired } from "@/server/lib/deposit-resolution"
import { isBookingActor, resolveActorForUser } from "@/server/lib/booking-actor"
import {
  DepositResolutionError,
  isDepositResolutionAction,
  razorpayRefundExecutor,
  resolveBookingDeposit,
  type DepositResolutionAction,
} from "@/server/lib/deposit-resolution"

// ─── List farmer bookings ───────────────────────────────────────────────────

export async function listFarmerBookings(userId: string) {
  return prisma.booking.findMany({
    where: { farmerId: userId },
    include: { tool: true, payment: true, toolInstance: true },
    orderBy: { createdAt: "desc" },
  })
}

// ─── Create booking ─────────────────────────────────────────────────────────

export interface CreateBookingInput {
  toolId: string
  toolInstanceId?: string
  serviceType: string
  startDate: string | Date
  endDate: string | Date
  deliveryType?: string
  deliveryAddress?: string
  notes?: string
}

export class CreateBookingError extends Error {
  readonly statusCode: number
  constructor(message: string, statusCode: number = 400) {
    super(message)
    this.name = "CreateBookingError"
    this.statusCode = statusCode
  }
}

export async function createBooking(userId: string, input: CreateBookingInput) {
  const { toolId, toolInstanceId, serviceType, deliveryType, notes, deliveryAddress } = input

  // ── Validate toolId ──────────────────────────────────────────────────────
  if (!toolId || typeof toolId !== "string") {
    throw new CreateBookingError("toolId is required")
  }
  const tool = await prisma.tool.findUnique({ where: { id: toolId } })
  if (!tool || !tool.isActive) {
    throw new CreateBookingError("Tool not found or not available for booking", 400)
  }

  // ── Validate serviceType ─────────────────────────────────────────────────
  if (!isRequestedServiceType(serviceType)) {
    throw new CreateBookingError(
      `Invalid serviceType "${String(serviceType)}" — must be SELF_SERVICE_RENTAL or OPERATOR_ONLY`,
    )
  }

  // ── Validate & parse dates ───────────────────────────────────────────────
  const startDate = new Date(String(input.startDate ?? ""))
  const endDate = new Date(String(input.endDate ?? ""))
  if (Number.isNaN(startDate.getTime())) {
    throw new CreateBookingError("startDate is required and must be a valid date")
  }
  if (Number.isNaN(endDate.getTime())) {
    throw new CreateBookingError("endDate is required and must be a valid date")
  }

  // ── Resolve tool instance & owner ────────────────────────────────────────
  let resolvedInstanceId: string | undefined = undefined
  let toolOwnerId: string
  let toolOwnerTaluk: string | null | undefined = undefined

  if (toolInstanceId) {
    const instance = await prisma.toolInstance.findUnique({
      where: { id: toolInstanceId },
      include: { owner: { select: { id: true, taluk: true, district: true, village: true } } },
    })
    if (!instance || instance.toolId !== toolId) {
      throw new CreateBookingError("Tool instance not found or does not belong to the specified tool")
    }
    if (instance.status !== ToolInstanceStatus.AVAILABLE) {
      throw new CreateBookingError("Tool instance is not available")
    }
    resolvedInstanceId = instance.id
    toolOwnerId = instance.ownerId
    toolOwnerTaluk = instance.owner?.taluk
  } else {
    // Auto-select an available instance
    const availableInstance = await prisma.toolInstance.findFirst({
      where: {
        toolId,
        status: { in: [ToolInstanceStatus.AVAILABLE, ToolInstanceStatus.RETURNED, ToolInstanceStatus.INSPECTION] },
      },
      include: { owner: { select: { id: true, taluk: true, district: true, village: true } } },
    })
    if (!availableInstance) {
      throw new CreateBookingError("No available tool instance for the selected dates")
    }
    resolvedInstanceId = availableInstance.id
    toolOwnerId = availableInstance.ownerId
    toolOwnerTaluk = availableInstance.owner?.taluk
  }

  // ── Authoritative dispatch eligibility verification (Pilot Hub Model & Tool Radius) ──
  const deliveryTypeStr = typeof deliveryType === "string" ? deliveryType : "delivery"
  try {
    validateDispatchEligibility({
      toolId: tool.id,
      toolName: tool.name,
      deliveryRadiusKm: tool.deliveryRadiusKm,
      deliveryType: deliveryTypeStr,
      deliveryAddress,
      ownerTaluk: toolOwnerTaluk,
    })
  } catch (err) {
    if (err instanceof DispatchEligibilityError) {
      throw new CreateBookingError(err.message, err.statusCode)
    }
    throw err
  }

  // ── Server-authoritative pricing ─────────────────────────────────────────
  const deliveryFee = resolveDeliveryCharge(deliveryType)
  const mappedServiceType: BookingServiceType =
    serviceType === "OPERATOR_ONLY"
      ? BookingServiceType.OPERATOR_ONLY
      : BookingServiceType.SELF_SERVICE_RENTAL

  let pricing: ReturnType<typeof computeBookingPricing>
  try {
    pricing = computeBookingPricing({
      tool,
      serviceType,
      startDate,
      endDate,
      deliveryFee,
    })
  } catch (error) {
    if (error instanceof BookingPricingError) {
      throw new CreateBookingError(error.message)
    }
    throw error
  }

  // ── Atomic persistence of order, booking, and pending payment (Audit C4/C5 fix) ──
  const booking = await prisma.$transaction(async (tx) => {
    const orderRecord = await tx.order.create({
      data: {
        orderRef: `ORD${Date.now()}${crypto.randomBytes(4).toString("hex").toUpperCase()}`,
        userId,
        totalAmount: pricing.totalAmount,
        paymentStatus: "PENDING",
      },
    })

    const newBooking = await tx.booking.create({
      data: {
        orderId: orderRecord.id,
        farmerId: userId,
        toolId,
        toolInstanceId: resolvedInstanceId,
        toolOwnerId,
        servicePerformerId: userId,
        serviceType: mappedServiceType,
        startDate,
        endDate,
        totalDays: pricing.days,
        toolFeePerDay: pricing.toolFeePerDay,
        operatorFeePerDay: pricing.operatorFeePerDay,
        totalToolFee: pricing.totalToolFee,
        totalOperatorFee: pricing.totalOperatorFee,
        deposit: pricing.deposit,
        deliveryFee: pricing.deliveryFee,
        platformFee: pricing.platformFee,
        subtotal: pricing.subtotal,
        pricePerDay: pricing.toolFeePerDay,
        totalAmount: pricing.totalAmount,
        status: BookingStatus.REQUESTED,
        deliveryAddress: typeof deliveryAddress === "string" ? deliveryAddress : undefined,
        bookingRef: `BK${Date.now()}${crypto.randomBytes(4).toString("hex").toUpperCase()}`,
        notes: typeof notes === "string" ? notes : undefined,
      },
    })

    await tx.payment.create({
      data: {
        orderId: orderRecord.id,
        bookingId: newBooking.id,
        amount: pricing.totalAmount,
        status: "PENDING",
        depositFrozen: pricing.deposit > 0,
      },
    })

    return tx.booking.findUniqueOrThrow({
      where: { id: newBooking.id },
      include: { tool: true, payment: true, toolInstance: true },
    })
  })

  return booking
}

// ─── Shared booking full include ───────────────────────────────────────────

export const BOOKING_FULL_INCLUDE = {
  tool: true,
  toolInstance: true,
  payment: true,
  farmer: { select: { id: true, name: true, phone: true } },
  toolOwner: { select: { id: true, name: true, phone: true, village: true, taluk: true, district: true, pincode: true } },
  servicePerformer: { select: { id: true, name: true, phone: true } },
  stateLogs: { orderBy: { createdAt: "asc" } },
  handoverLogs: {
    include: { actorUser: { select: { id: true, name: true, phone: true } } },
    orderBy: { createdAt: "asc" },
  },
} as const satisfies Prisma.BookingInclude

// ─── Get booking by ID ──────────────────────────────────────────────────────

export async function getBookingById(id: string) {
  return prisma.booking.findUnique({
    where: { id },
    include: BOOKING_FULL_INCLUDE,
  })
}

// ─── Update booking ─────────────────────────────────────────────────────────

export interface BookingUpdateInput {
  deliveryAddress?: string | null
  deliveryDistrict?: string | null
  deliveryTaluk?: string | null
  deliveryPincode?: string | null
  deliveryStatus?: DeliveryStatus
  notes?: string | null
}

export async function updateBooking(id: string, input: BookingUpdateInput) {
  const allowedData: Prisma.BookingUpdateInput = {}

  if (input.deliveryAddress !== undefined) allowedData.deliveryAddress = input.deliveryAddress
  if (input.deliveryDistrict !== undefined) allowedData.deliveryDistrict = input.deliveryDistrict
  if (input.deliveryTaluk !== undefined) allowedData.deliveryTaluk = input.deliveryTaluk
  if (input.deliveryPincode !== undefined) allowedData.deliveryPincode = input.deliveryPincode
  if (input.deliveryStatus !== undefined) allowedData.deliveryStatus = input.deliveryStatus
  if (input.notes !== undefined) allowedData.notes = input.notes

  return prisma.booking.update({ where: { id }, data: allowedData })
}

// ─── Get booking with permitted transitions ──────────────────────────────────

export async function getBookingWithTransitions(id: string) {
  const booking = await prisma.booking.findUnique({
    where: { id },
    include: BOOKING_FULL_INCLUDE,
  })
  if (!booking) return null
  return {
    ...booking,
    permittedTargets: getPermittedTargets(booking.status),
  }
}

// ─── Get booking with actor-permitted transitions ────────────────────────────

export async function getBookingWithActorTransitions(id: string) {
  const booking = await prisma.booking.findUnique({
    where: { id },
    include: BOOKING_FULL_INCLUDE,
  })
  if (!booking) return null
  return {
    ...booking,
    permittedTargets: getActorPermittedTargets(
      booking.status,
      BookingEventActor.FARMER,
      { mode: deriveModeFromServiceType(booking.serviceType) },
    ),
  }
}

// ─── Transition booking state ────────────────────────────────────────────────

interface TransitionBody {
  to?: string
  note?: string
  actor?: string
  operatorMode?: "assign_operator" | "self_service"
  conditionGrade?: string
  photos?: string[]
  toolInstanceId?: string
}

function isBookingStatus(value: unknown): value is BookingStatus {
  return Object.values(BookingStatus).includes(value as BookingStatus)
}

export interface TransitionResult {
  booking: BookingStateLog extends { bookingId: string } ? Awaited<ReturnType<typeof prisma.booking.update>> : never
  log: BookingStateLog
  advanceLog: BookingStateLog | null
  autoAdvanceToOperatorPending: boolean
  autoFailed: boolean
  selfServiceAccepted: boolean
  cancellationPolicy: ReturnType<typeof computeCancellationPolicy> | null
  notification: Awaited<ReturnType<typeof sendSmsNotification>> | null
  permittedTargets: BookingStatus[]
}

export async function transitionBooking(params: {
  bookingId: string
  userId: string
  isAdmin: boolean
  body: TransitionBody
}): Promise<TransitionResult> {
  const { bookingId, userId, isAdmin, body } = params
  const to = body.to

  if (!isBookingStatus(to)) {
    throw new TransitionError("Missing or invalid `to` status", 400)
  }

  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: BOOKING_FULL_INCLUDE,
  })
  if (!booking) throw new TransitionError("Booking not found", 404)

  // Actor resolution
  let actor: BookingEventActor | undefined
  if (isAdmin && body.actor && isBookingActor(body.actor)) {
    actor = body.actor
  } else {
    actor = resolveActorForUser(booking, userId) ?? undefined
  }
  if (!actor) throw new TransitionError("You are not a party to this booking", 403)

  const options: TransitionOptions = {
    actor,
    mode: deriveModeFromServiceType(booking.serviceType),
  }

  // Operator-reject auto-fail
  let effectiveTo: BookingStatus = to
  let autoFailed = false
  if (
    to === BookingStatus.OPERATOR_PENDING &&
    booking.status === BookingStatus.OPERATOR_ASSIGNED
  ) {
    const priorRejections = countOperatorRejections(booking.stateLogs)
    if (priorRejections + 1 >= OPERATOR_REJECTION_LIMIT) {
      effectiveTo = BookingStatus.FAILED_NO_OPERATOR
      autoFailed = true
    }
  }
  if (autoFailed) {
    actor = BookingEventActor.SYSTEM
    options.actor = BookingEventActor.SYSTEM
  }

  // Owner accept — explicit operator choice
  let selfServiceAccepted = false
  if (
    effectiveTo === BookingStatus.OWNER_ACCEPTED &&
    booking.status === BookingStatus.OWNER_PENDING &&
    deriveModeFromServiceType(booking.serviceType) === "WITH_OPERATOR"
  ) {
    if (body.operatorMode !== "assign_operator" && body.operatorMode !== "self_service") {
      throw new TransitionError(
        "Choose how to fulfil this booking: assign an operator, or accept it as self-service.",
        400,
        { from: booking.status, to: effectiveTo, actor },
      )
    }
    if (body.operatorMode === "self_service") {
      if (booking.tool.requiresCertifiedOperator) {
        throw new TransitionError(
          "This tool requires a certified operator, so it cannot be accepted as self-service. Assign an operator instead, or decline.",
          400,
          { from: booking.status, to: effectiveTo, actor },
        )
      }
      selfServiceAccepted = true
    }
  }

  // Owner accept → auto-queue for operator dispatch
  const autoAdvanceToOperatorPending =
    effectiveTo === BookingStatus.OWNER_ACCEPTED &&
    booking.status === BookingStatus.OWNER_PENDING &&
    deriveModeFromServiceType(booking.serviceType) === "WITH_OPERATOR" &&
    body.operatorMode === "assign_operator"

  try {
    assertTransition(booking.status, effectiveTo, options)
  } catch (error) {
    if (error instanceof InvalidBookingTransitionError) {
      throw new TransitionError(error.message, 400, {
        from: booking.status,
        to,
        actor,
        permittedTargets: getPermittedTargets(booking.status, options),
      })
    }
    throw error
  }

  // Deposit must be resolved before COMPLETED
  if (effectiveTo === BookingStatus.COMPLETED && isDepositResolutionRequired(booking.deposit, booking.payment)) {
    throw new TransitionError(
      "The refundable deposit is still frozen and must be resolved before this booking can be completed.",
      400,
      {
        from: booking.status,
        to: effectiveTo,
        actor,
        deposit: booking.deposit,
        payment: booking.payment
          ? {
              depositFrozen: booking.payment.depositFrozen,
              depositRefunded: booking.payment.depositRefunded,
              depositDeducted: booking.payment.depositDeducted,
              disputeLocked: booking.payment.disputeLocked,
            }
          : null,
        permittedTargets: getPermittedTargets(booking.status, options),
      },
    )
  }

  // Cancellation / refund policy
  let cancellationPolicy: ReturnType<typeof computeCancellationPolicy> | null = null
  if (isTerminalCancellation(effectiveTo)) {
    cancellationPolicy = computeCancellationPolicy(booking.status, effectiveTo, booking.totalAmount)
  }

  const noteParts: string[] = []
  if (body.note) noteParts.push(body.note)
  if (selfServiceAccepted) {
    noteParts.push(
      `Owner accepted as SELF-SERVICE (explicit choice) — operator fee removed, booking runs self-operate`,
    )
  }
  if (autoFailed) {
    noteParts.push(
      `Auto-failed after ${OPERATOR_REJECTION_LIMIT} operator rejections — no operator available; payment refunded in full`,
    )
  }
  if (cancellationPolicy) {
    noteParts.push(
      `Cancellation policy (${cancellationPolicy.reason}): refund ₹${(cancellationPolicy.refundAmount / 100).toFixed(
        2,
      )}, operator fee ₹${(cancellationPolicy.operatorFee / 100).toFixed(2)}`,
    )
  }

  const result = await prisma.$transaction(async (tx) => {
    const updated = await tx.booking.update({
      where: { id: booking.id },
      data: {
        status: effectiveTo,
        ...(selfServiceAccepted
          ? {
              serviceType: BookingServiceType.SELF_SERVICE_RENTAL,
              operatorFeePerDay: 0,
              totalOperatorFee: 0,
              subtotal: booking.totalToolFee,
              totalAmount:
                booking.totalToolFee + (booking.deposit ?? 0) + booking.deliveryFee + booking.platformFee,
            }
          : {}),
      },
    })

    if (selfServiceAccepted && booking.payment) {
      await tx.payment.update({
        where: { id: booking.payment.id },
        data: {
          amount:
            booking.totalToolFee + (booking.deposit ?? 0) + booking.deliveryFee + booking.platformFee,
        },
      })
    }

    if (cancellationPolicy && booking.payment) {
      await tx.payment.update({
        where: { id: booking.payment.id },
        data: {
          refundAmount: cancellationPolicy.refundAmount,
          cancellationFee: cancellationPolicy.operatorFee,
          ...(cancellationPolicy.refundAmount > 0 ? { status: "REFUNDED" as const } : {}),
        },
      })
    }

    if (effectiveTo === BookingStatus.DISPUTED && booking.deposit > 0 && booking.payment) {
      await tx.payment.update({
        where: { id: booking.payment.id },
        data: { disputeLocked: true },
      })
    }

    // Physical tool custody, instance allocation, and handover tracking
    let activeToolInstanceId = booking.toolInstanceId || body.toolInstanceId

    // If no tool instance linked yet, auto-allocate an available instance owned by toolOwner
    if (!activeToolInstanceId) {
      const availableInstance = await tx.toolInstance.findFirst({
        where: {
          toolId: booking.toolId,
          ownerId: booking.toolOwnerId,
          status: { in: [ToolInstanceStatus.AVAILABLE, ToolInstanceStatus.RESERVED] },
        },
      })
      if (availableInstance) {
        activeToolInstanceId = availableInstance.id
        await tx.booking.update({
          where: { id: booking.id },
          data: { toolInstanceId: activeToolInstanceId },
        })
      }
    }

    if (activeToolInstanceId) {
      const conditionGrade = body.conditionGrade || "GOOD"
      const photos = body.photos || []

      if (
        effectiveTo === BookingStatus.OWNER_ACCEPTED ||
        effectiveTo === BookingStatus.OPERATOR_ASSIGNED ||
        effectiveTo === BookingStatus.FETCHING_TOOL
      ) {
        await tx.toolInstance.update({
          where: { id: activeToolInstanceId },
          data: { status: ToolInstanceStatus.RESERVED },
        })
      } else if (effectiveTo === BookingStatus.TOOL_COLLECTED) {
        const custodianId =
          deriveModeFromServiceType(booking.serviceType) === "SELF_OPERATE"
            ? booking.farmerId
            : booking.servicePerformerId || userId

        await tx.toolInstance.update({
          where: { id: activeToolInstanceId },
          data: {
            status: ToolInstanceStatus.HANDED_OVER,
            currentCustodianId: custodianId,
          },
        })
        await tx.handoverLog.create({
          data: {
            bookingId: booking.id,
            toolInstanceId: activeToolInstanceId,
            actorId: userId,
            handoverType: HandoverType.PICKUP_FROM_OWNER,
            conditionGrade,
            photos,
            notes: body.note || "Tool collected from owner",
          },
        })
      } else if (effectiveTo === BookingStatus.WORK_STARTED) {
        await tx.toolInstance.update({
          where: { id: activeToolInstanceId },
          data: {
            status: ToolInstanceStatus.IN_USE,
          },
        })
        await tx.handoverLog.create({
          data: {
            bookingId: booking.id,
            toolInstanceId: activeToolInstanceId,
            actorId: userId,
            handoverType: HandoverType.DELIVERY_TO_FARMER,
            conditionGrade,
            photos,
            notes: body.note || "Work started on farm",
          },
        })
      } else if (effectiveTo === BookingStatus.TOOL_RETURNED) {
        await tx.toolInstance.update({
          where: { id: activeToolInstanceId },
          data: {
            status: ToolInstanceStatus.RETURNED,
            currentCustodianId: booking.toolOwnerId,
          },
        })
        await tx.handoverLog.create({
          data: {
            bookingId: booking.id,
            toolInstanceId: activeToolInstanceId,
            actorId: userId,
            handoverType: HandoverType.RETURN_TO_OWNER,
            conditionGrade,
            photos,
            notes: body.note || "Tool returned to owner",
          },
        })
      } else if (effectiveTo === BookingStatus.INSPECTION) {
        await tx.toolInstance.update({
          where: { id: activeToolInstanceId },
          data: {
            status: ToolInstanceStatus.INSPECTION,
          },
        })
      } else if (
        effectiveTo === BookingStatus.COMPLETED ||
        isTerminalCancellation(effectiveTo) ||
        effectiveTo === BookingStatus.FAILED_NO_OPERATOR
      ) {
        await tx.toolInstance.update({
          where: { id: activeToolInstanceId },
          data: {
            status: ToolInstanceStatus.AVAILABLE,
            currentCustodianId: booking.toolOwnerId,
          },
        })
      }
    }

    const log = await tx.bookingStateLog.create({
      data: {
        bookingId: booking.id,
        fromState: booking.status,
        toState: effectiveTo,
        actor,
        actorId: userId,
        note: noteParts.length > 0 ? noteParts.join(" | ") : null,
      },
    })

    let finalBooking = updated
    let advanceLog: BookingStateLog | null = null
    if (autoAdvanceToOperatorPending) {
      finalBooking = await tx.booking.update({
        where: { id: booking.id },
        data: { status: BookingStatus.OPERATOR_PENDING },
      })
      advanceLog = await tx.bookingStateLog.create({
        data: {
          bookingId: booking.id,
          fromState: BookingStatus.OWNER_ACCEPTED,
          toState: BookingStatus.OPERATOR_PENDING,
          actor: BookingEventActor.SYSTEM,
          actorId: userId,
          note: "Owner accepted with operator dispatch — booking auto-queued for operator assignment",
        },
      })
    }

    return { updated: finalBooking, log, advanceLog }
  })

  // Farmer notification
  let notification: Awaited<ReturnType<typeof sendSmsNotification>> | null = null
  if (booking.farmer.phone) {
    if (effectiveTo === BookingStatus.FAILED_NO_OPERATOR) {
      notification = await sendSmsNotification(
        booking.farmer.phone,
        `O~Bele: No operator was available for booking ${booking.bookingRef}. Your payment has been refunded. Please re-book or try again later.`,
      )
    } else if (effectiveTo === BookingStatus.OWNER_ACCEPTED) {
      notification = await sendSmsNotification(
        booking.farmer.phone,
        `O~Bele: The tool owner accepted your booking ${booking.bookingRef}${selfServiceAccepted ? " as self-service." : ". We will assign an operator shortly."}`,
      )
    } else if (effectiveTo === BookingStatus.CANCELLED_BY_OWNER) {
      notification = await sendSmsNotification(
        booking.farmer.phone,
        `O~Bele: The tool owner declined your booking ${booking.bookingRef}. Please re-book or choose another tool.`,
      )
    }
  }

  return {
    booking: result.updated,
    log: result.log,
    advanceLog: result.advanceLog,
    autoAdvanceToOperatorPending,
    autoFailed,
    selfServiceAccepted,
    cancellationPolicy,
    notification,
    permittedTargets: getPermittedTargets(result.updated.status, options),
  }
}

// ─── Deposit resolution ──────────────────────────────────────────────────────

const RESOLVABLE_STATUSES = new Set<BookingStatus>([
  BookingStatus.INSPECTION,
  BookingStatus.DISPUTED,
])

function isResolvableStatus(value: BookingStatus): boolean {
  return RESOLVABLE_STATUSES.has(value)
}

export async function resolveBookingDepositService(params: {
  bookingId: string
  userId: string
  isAdmin: boolean
  body: { action?: unknown; deductedAmount?: unknown; note?: unknown; actor?: unknown }
}) {
  const { bookingId, userId, isAdmin, body } = params

  const action = body.action
  if (!isDepositResolutionAction(action)) {
    throw new TransitionError("Missing or invalid `action` (must be FULL_REFUND, PARTIAL_DEDUCTION or HOLD)", 400)
  }
  const typedAction = action as DepositResolutionAction

  if (
    typedAction === "PARTIAL_DEDUCTION" &&
    (typeof body.deductedAmount !== "number" || !Number.isFinite(body.deductedAmount) || body.deductedAmount < 0)
  ) {
    throw new TransitionError("PARTIAL_DEDUCTION requires a non-negative numeric `deductedAmount` (paise)", 400)
  }

  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      payment: true,
      toolOwner: { select: { id: true } },
    },
  })
  if (!booking) throw new TransitionError("Booking not found", 404)
  if (!booking.payment) throw new TransitionError("No payment record for this booking", 400)

  // Actor gating
  const isToolOwner = booking.toolOwnerId === userId
  let actor: BookingEventActor | undefined
  if (isAdmin && body.actor && isBookingActor(body.actor)) {
    actor = body.actor
  } else if (isToolOwner) {
    actor = BookingEventActor.TOOL_OWNER
  } else {
    actor = resolveActorForUser(booking, userId) ?? undefined
  }
  if (!actor) throw new TransitionError("You are not a party to this booking", 403)
  if (actor !== BookingEventActor.TOOL_OWNER && actor !== BookingEventActor.ADMIN) {
    throw new TransitionError("Only the tool owner or an admin can resolve the deposit", 403)
  }

  // State gating
  const depositAlreadyResolved =
    booking.deposit > 0 &&
    booking.payment.depositFrozen === false &&
    (booking.payment.depositRefunded > 0 || booking.payment.depositDeducted > 0)
  if (!isResolvableStatus(booking.status) && !depositAlreadyResolved) {
    throw new TransitionError(
      "Deposit can only be resolved after the tool is returned and inspection is recorded (booking in INSPECTION, or DISPUTED for admin resolution)",
      400,
      { from: booking.status },
    )
  }
  if (booking.status === BookingStatus.DISPUTED && actor !== BookingEventActor.ADMIN) {
    throw new TransitionError("Only an admin can resolve a disputed deposit", 403)
  }

  try {
    const result = await resolveBookingDeposit(
      prisma,
      razorpayRefundExecutor,
      {
        payment: booking.payment,
        booking: { id: booking.id, bookingRef: booking.bookingRef, deposit: booking.deposit },
        action: typedAction,
        deductedAmount: typeof body.deductedAmount === "number" ? body.deductedAmount : undefined,
        actorIsAdmin: actor === BookingEventActor.ADMIN,
      },
    )

    // Audit trail
    const noteParts = [`Deposit resolved (${typedAction})`]
    if (typedAction === "FULL_REFUND") {
      noteParts.push(`full refund ₹${(result.refunded / 100).toFixed(2)}`)
    } else if (typedAction === "PARTIAL_DEDUCTION") {
      noteParts.push(
        `deducted ₹${(result.deducted / 100).toFixed(2)}, refunded ₹${(result.refunded / 100).toFixed(2)}`,
      )
    } else {
      noteParts.push("deposit held — dispute-locked")
    }
    if (result.refundId) noteParts.push(`Razorpay refund ${result.refundId}`)
    if (typeof body.note === "string" && body.note) noteParts.push(body.note)

    await prisma.bookingStateLog.create({
      data: {
        bookingId: booking.id,
        fromState: booking.status,
        toState: booking.status,
        actor,
        actorId: userId,
        note: noteParts.join(" | "),
      },
    })

    return {
      bookingId: booking.id,
      bookingRef: booking.bookingRef,
      action: result.action,
      alreadyResolved: result.alreadyResolved,
      deposit: booking.deposit,
      refunded: result.refunded,
      deducted: result.deducted,
      refundId: result.refundId,
      payment: result.payment,
    }
  } catch (error) {
    if (error instanceof DepositResolutionError) {
      throw new TransitionError(error.message, error.code === "REFUND_FAILED" ? 502 : error.code === "DISPUTE_LOCKED" ? 403 : 400, { code: error.code })
    }
    throw error
  }
}

// ─── Assign operator ─────────────────────────────────────────────────────────

export async function assignOperator(params: {
  bookingId: string
  userId: string
  operatorId: string
}) {
  const { bookingId, userId, operatorId } = params

  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      tool: { select: { requiresCertifiedOperator: true } },
      farmer: { select: { id: true, name: true, phone: true } },
      toolOwner: { select: { id: true, name: true, phone: true, village: true, taluk: true, district: true, pincode: true } },
      servicePerformer: { select: { id: true, name: true, phone: true } },
    },
  })
  if (!booking) throw new TransitionError("Booking not found", 404)

  const mode = deriveModeFromServiceType(booking.serviceType)
  if (mode !== "WITH_OPERATOR") {
    throw new TransitionError("This booking does not require an operator and cannot be assigned one.", 400)
  }
  if (booking.status !== BookingStatus.OPERATOR_PENDING) {
    throw new TransitionError(
      `Only OPERATOR_PENDING bookings can be assigned. Current status: ${booking.status}`,
      400,
    )
  }

  // Operator candidate validation
  const operator = await prisma.user.findUnique({
    where: { id: operatorId },
    include: { capabilities: { select: { type: true, status: true } } },
  })
  if (!operator) throw new TransitionError("Operator does not exist", 400)
  const cap = operator.capabilities.find((c) => c.type === "OPERATOR")
  if (!cap || cap.status !== "VERIFIED") {
    throw new TransitionError(
      `Operator ${operator.name ?? operator.phone} is not VERIFIED for OPERATOR capability.`,
      400,
      { operatorId, capabilityStatus: cap?.status ?? null },
    )
  }
  if (operator.id === booking.farmerId) {
    throw new TransitionError("The farmer of this booking cannot be assigned as its own operator.", 400)
  }

  // State machine guard
  const options: TransitionOptions = {
    actor: BookingEventActor.ADMIN,
    mode,
  }
  try {
    assertTransition(booking.status, BookingStatus.OPERATOR_ASSIGNED, options)
  } catch (error) {
    if (error instanceof InvalidBookingTransitionError) {
      throw new TransitionError(error.message, 400, {
        from: booking.status,
        to: BookingStatus.OPERATOR_ASSIGNED,
        permittedTargets: getPermittedTargets(booking.status, options),
      })
    }
    throw error
  }

  // Atomic: transition + bind the REAL service performer
  const result = await prisma.$transaction(async (tx) => {
    const updated = await tx.booking.update({
      where: { id: booking.id },
      data: {
        status: BookingStatus.OPERATOR_ASSIGNED,
        servicePerformerId: operatorId,
      },
    })
    const log = await tx.bookingStateLog.create({
      data: {
        bookingId: booking.id,
        fromState: booking.status,
        toState: BookingStatus.OPERATOR_ASSIGNED,
        actor: BookingEventActor.ADMIN,
        actorId: userId,
        note: `Admin assigned operator ${operator.name ?? operator.phone} to this booking`,
      },
    })
    return { updated, log }
  })

  return {
    booking: {
      id: result.updated.id,
      bookingRef: result.updated.bookingRef,
      status: result.updated.status,
      servicePerformerId: result.updated.servicePerformerId,
      servicePerformer: {
        id: operator.id,
        name: operator.name,
        phone: operator.phone,
      },
      toolOwner: booking.toolOwner,
      farmer: booking.farmer,
    },
    log: result.log,
    permittedTargets: getPermittedTargets(BookingStatus.OPERATOR_ASSIGNED, options),
  }
}

// ─── Record Handover Log ──────────────────────────────────────────────────

export async function recordHandoverLog(params: {
  bookingId: string
  userId: string
  handoverType: HandoverType
  conditionGrade?: string
  notes?: string
  photos?: string[]
}) {
  const { bookingId, userId, handoverType, conditionGrade = "GOOD", notes, photos = [] } = params

  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { toolInstance: true },
  })

  if (!booking) {
    throw new TransitionError("Booking not found", 404)
  }

  if (!booking.toolInstanceId) {
    throw new TransitionError("No physical tool instance assigned to this booking", 400)
  }

  const log = await prisma.handoverLog.create({
    data: {
      bookingId: booking.id,
      toolInstanceId: booking.toolInstanceId,
      actorId: userId,
      handoverType,
      conditionGrade,
      notes: notes || `Handover completed: ${handoverType}`,
      photos,
    },
    include: {
      actorUser: { select: { id: true, name: true, phone: true } },
      toolInstance: { select: { assetCode: true, status: true } },
    },
  })

  return log
}

// ─── Get Asset by Code ──────────────────────────────────────────────────────

export async function getAssetByCode(assetCode: string) {
  const instance = await prisma.toolInstance.findUnique({
    where: { assetCode },
    include: {
      tool: true,
      owner: { select: { id: true, name: true, phone: true, village: true, taluk: true, district: true } },
      custodian: { select: { id: true, name: true, phone: true } },
      bookings: {
        where: {
          status: {
            in: [
              BookingStatus.TOOL_COLLECTED,
              BookingStatus.TRAVELLING_TO_FARM,
              BookingStatus.ARRIVED,
              BookingStatus.WORK_STARTED,
              BookingStatus.WORK_PAUSED,
              BookingStatus.WORK_RESUMED,
              BookingStatus.WORK_COMPLETED,
              BookingStatus.RETURNING_TOOL,
              BookingStatus.INSPECTION,
            ],
          },
        },
        include: {
          farmer: { select: { id: true, name: true, phone: true } },
          servicePerformer: { select: { id: true, name: true, phone: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
      handoverLogs: {
        include: { actorUser: { select: { id: true, name: true, phone: true } } },
        orderBy: { createdAt: "desc" },
        take: 5,
      },
    },
  })

  if (!instance) return null

  return {
    id: instance.id,
    assetCode: instance.assetCode,
    status: instance.status,
    notes: instance.notes,
    tool: {
      id: instance.tool.id,
      name: instance.tool.name,
      slug: instance.tool.slug,
      category: instance.tool.category,
      pricePerDay: instance.tool.pricePerDay,
      thumbnailUrl: instance.tool.thumbnailUrl ?? instance.tool.images[0] ?? null,
      requiresCertifiedOperator: instance.tool.requiresCertifiedOperator,
    },
    owner: instance.owner,
    custodian: instance.custodian,
    activeBooking: instance.bookings[0] ?? null,
    recentHandovers: instance.handoverLogs,
  }
}

// ─── Error class ────────────────────────────────────────────────────────────

export class TransitionError extends Error {
  readonly statusCode: number
  readonly data?: Record<string, unknown>

  constructor(message: string, statusCode: number, data?: Record<string, unknown>) {
    super(message)
    this.name = "TransitionError"
    this.statusCode = statusCode
    this.data = data
  }
}

