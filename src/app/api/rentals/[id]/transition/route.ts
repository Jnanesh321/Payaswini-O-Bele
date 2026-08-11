import { NextRequest, NextResponse } from "next/server"
import { BookingEventActor, BookingServiceType, BookingStatus } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { getServerSession } from "@/lib/auth"
import {
  assertTransition,
  InvalidBookingTransitionError,
  getPermittedTargets,
  deriveModeFromServiceType,
  computeCancellationPolicy,
  isTerminalCancellation,
  countOperatorRejections,
  OPERATOR_REJECTION_LIMIT,
  type TransitionOptions,
} from "@/lib/booking-state-machine"
import { sendSmsNotification } from "@/lib/sms"

interface TransitionBody {
  to?: string
  note?: string
  actor?: string
  /** Owner accept choice (confirmed 2026-08-11): explicit, never implicit. */
  operatorMode?: "assign_operator" | "self_service"
}

/** Map the requesting user to the actor role they may legitimately hold on this booking. */
function resolveActorForUser(
  booking: { farmerId: string; toolOwnerId: string; servicePerformerId: string; serviceType: string },
  userId: string,
): BookingEventActor | null {
  if (booking.farmerId === userId) return BookingEventActor.FARMER
  if (booking.toolOwnerId === userId) return BookingEventActor.TOOL_OWNER
  if (
    booking.servicePerformerId === userId &&
    booking.serviceType !== "SELF_SERVICE_RENTAL" &&
    booking.serviceType !== "SELF_SERVICE_OWN_TOOL"
  ) {
    return BookingEventActor.OPERATOR
  }
  return null
}

function isBookingActor(value: unknown): value is BookingEventActor {
  return Object.values(BookingEventActor).includes(value as BookingEventActor)
}

function isBookingStatus(value: unknown): value is BookingStatus {
  return Object.values(BookingStatus).includes(value as BookingStatus)
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const booking = await prisma.booking.findUnique({
    where: { id },
    include: {
      tool: true,
      payment: true,
      farmer: true,
      toolOwner: { select: { id: true, name: true, phone: true } },
      servicePerformer: { select: { id: true, name: true, phone: true } },
      stateLogs: { orderBy: { createdAt: "asc" } },
    },
  })
  if (!booking) {
    return NextResponse.json({ success: false, error: "Booking not found" }, { status: 404 })
  }
  return NextResponse.json({
    success: true,
    data: {
      ...booking,
      permittedTargets: getPermittedTargets(booking.status),
    },
  })
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession()
  if (!session?.user) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params
  let body: TransitionBody = {}
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON body" }, { status: 400 })
  }

  const to = body.to
  if (!isBookingStatus(to)) {
    return NextResponse.json({ success: false, error: "Missing or invalid `to` status" }, { status: 400 })
  }

  const booking = await prisma.booking.findUnique({
    where: { id },
    include: {
      tool: { select: { requiresCertifiedOperator: true } },
      farmer: { select: { id: true, name: true, phone: true } },
      toolOwner: { select: { id: true, name: true, phone: true } },
      servicePerformer: { select: { id: true, name: true, phone: true } },
      payment: true,
      stateLogs: { orderBy: { createdAt: "asc" } },
    },
  })
  if (!booking) {
    return NextResponse.json({ success: false, error: "Booking not found" }, { status: 404 })
  }

  // Actor resolution: admins may act on behalf of any party (incl. SYSTEM for
  // automated transitions during manual wiring); everyone else is pinned to the
  // role they hold on this booking.
  const { id: userId, isAdmin } = session.user
  let actor: BookingEventActor | undefined
  if (isAdmin && body.actor && isBookingActor(body.actor)) {
    actor = body.actor
  } else {
    actor = resolveActorForUser(booking, userId) ?? undefined
  }
  if (!actor) {
    return NextResponse.json(
      { success: false, error: "You are not a party to this booking" },
      { status: 403 },
    )
  }

  // Mode is DERIVED from serviceType (single source of truth — no persisted mode).
  const options: TransitionOptions = {
    actor,
    mode: deriveModeFromServiceType(booking.serviceType),
  }

  // ─── Operator-reject auto-fail (confirmed: N=3, full refund, farmer SMS) ────
  // A rejection is an OPERATOR_ASSIGNED → OPERATOR_PENDING bounce. On the Nth
  // rejection, route to FAILED_NO_OPERATOR automatically (performed as SYSTEM,
  // since the operator may only trigger the bounce, not the failure itself).
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

  // ─── Owner accept — EXPLICIT operator choice (confirmed 2026-08-11) ─────────
  // No implicit default: if the booking requires an operator, the owner must say
  // whether they will assign one ("assign_operator") or run it self-service
  // ("self_service"). Self-service is only lawful for tools that don't require a
  // certified operator. Accepting self-service converts the booking financials
  // (removes the operator fee) so the downstream flow is self-operate.
  let selfServiceAccepted = false
  if (
    effectiveTo === BookingStatus.OWNER_ACCEPTED &&
    booking.status === BookingStatus.OWNER_PENDING &&
    deriveModeFromServiceType(booking.serviceType) === "WITH_OPERATOR"
  ) {
    if (body.operatorMode !== "assign_operator" && body.operatorMode !== "self_service") {
      return NextResponse.json(
        {
          success: false,
          error: "Choose how to fulfil this booking: assign an operator, or accept it as self-service.",
          data: { from: booking.status, to: effectiveTo, actor },
        },
        { status: 400 },
      )
    }
    if (body.operatorMode === "self_service") {
      if (booking.tool.requiresCertifiedOperator) {
        return NextResponse.json(
          {
            success: false,
            error:
              "This tool requires a certified operator, so it cannot be accepted as self-service. Assign an operator instead, or decline.",
            data: { from: booking.status, to: effectiveTo, actor },
          },
          { status: 400 },
        )
      }
      selfServiceAccepted = true
    }
  }

  try {
    assertTransition(booking.status, effectiveTo, options)
  } catch (error) {
    if (error instanceof InvalidBookingTransitionError) {
      return NextResponse.json(
        {
          success: false,
          error: error.message,
          data: {
            from: booking.status,
            to,
            actor,
            permittedTargets: getPermittedTargets(booking.status, options),
          },
        },
        { status: 400 },
      )
    }
    throw error
  }

  // ─── Cancellation / no-operator refund policy (§11, confirmed) ──────────────
  // Compute BEFORE the transition mutates booking.status.
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
              totalAmount: booking.totalToolFee + booking.deliveryFee + booking.platformFee,
            }
          : {}),
      },
    })

    if (selfServiceAccepted && booking.payment) {
      await tx.payment.update({
        where: { id: booking.payment.id },
        data: { amount: booking.totalToolFee + booking.deliveryFee + booking.platformFee },
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
    return { updated, log }
  })

  // ─── Farmer notification: never silently fail a booking ────────────────────
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

  return NextResponse.json({
    success: true,
    data: {
      booking: result.updated,
      log: result.log,
      autoFailed,
      selfServiceAccepted,
      cancellationPolicy,
      notification,
      permittedTargets: getPermittedTargets(effectiveTo, options),
    },
  })
}