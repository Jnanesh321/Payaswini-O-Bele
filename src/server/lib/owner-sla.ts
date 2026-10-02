import { BookingEventActor, BookingStatus } from "@prisma/client"
import { prisma } from "@/server/db/prisma"
import { sendSmsNotification } from "@/server/lib/sms"
import { computeCancellationPolicy } from "@/server/lib/booking-state-machine"

// Owner Response SLA (confirmed 2026-08-11): an OWNER_PENDING request that is
// left unanswered auto-cancels after 4 hours (CANCELLED_BY_PLATFORM) and the
// farmer is notified by SMS. This mirrors the operator-reject auto-fail rule —
// never leave a farmer stranded, but never silently downgrade a safety-relevant
// choice. Run lazily on read (no cron infrastructure in this app yet).
export const OWNER_RESPONSE_SLA_MS = 4 * 60 * 60 * 1000

export async function expireOverdueOwnerRequests(now = new Date()): Promise<number> {
  const deadline = new Date(now.getTime() - OWNER_RESPONSE_SLA_MS)

  const overdue = await prisma.booking.findMany({
    where: {
      status: BookingStatus.OWNER_PENDING,
      createdAt: { lt: deadline },
    },
    include: {
      farmer: { select: { id: true, phone: true, name: true } },
      payment: true,
    },
  })

  for (const booking of overdue) {
    const policy = computeCancellationPolicy(
      BookingStatus.OWNER_PENDING,
      BookingStatus.CANCELLED_BY_PLATFORM,
      booking.totalAmount,
    )

    await prisma.$transaction(async (tx) => {
      await tx.booking.update({
        where: { id: booking.id },
        data: { status: BookingStatus.CANCELLED_BY_PLATFORM },
      })
      await tx.bookingStateLog.create({
        data: {
          bookingId: booking.id,
          fromState: BookingStatus.OWNER_PENDING,
          toState: BookingStatus.CANCELLED_BY_PLATFORM,
          actor: BookingEventActor.SYSTEM,
          note: `Auto-cancelled: tool owner did not respond within the 4-hour SLA. Full refund of ₹${(
            policy.refundAmount / 100
          ).toFixed(2)} recorded.`,
        },
      })

      if (booking.payment) {
        await tx.payment.update({
          where: { id: booking.payment.id },
          data: {
            refundAmount: policy.refundAmount,
            cancellationFee: policy.operatorFee,
            ...(policy.refundAmount > 0 ? { status: "REFUNDED" as const } : {}),
          },
        })
      }
    })

    if (booking.farmer.phone) {
      await sendSmsNotification(
        booking.farmer.phone,
        `O~Bele: The tool owner did not respond to your booking ${booking.bookingRef} within 4 hours, so it was cancelled. A full refund of ₹${(
          policy.refundAmount / 100
        ).toFixed(2)} has been recorded for your payment.`,
      )
    }
  }

  return overdue.length
}
