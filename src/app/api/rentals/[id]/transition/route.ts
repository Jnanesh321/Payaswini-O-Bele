import { NextRequest, NextResponse } from "next/server"
import { BookingEventActor, BookingStatus } from "@prisma/client"
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
      data: { status: effectiveTo },
    })

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
  if (effectiveTo === BookingStatus.FAILED_NO_OPERATOR && booking.farmer.phone) {
    notification = await sendSmsNotification(
      booking.farmer.phone,
      `O~Bele: No operator was available for booking ${booking.bookingRef}. Your payment has been refunded. Please re-book or try again later.`,
    )
  }

  return NextResponse.json({
    success: true,
    data: {
      booking: result.updated,
      log: result.log,
      autoFailed,
      cancellationPolicy,
      notification,
      permittedTargets: getPermittedTargets(effectiveTo, options),
    },
  })
}