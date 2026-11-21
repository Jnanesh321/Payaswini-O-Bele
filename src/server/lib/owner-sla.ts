import { BookingEventActor, BookingStatus } from "@prisma/client"
import Razorpay from "razorpay"
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

    let refundProcessed = false
    let refundId: string | null = null

    if (
      booking.payment &&
      booking.payment.status === "CAPTURED" &&
      booking.payment.razorpayPaymentId &&
      policy.refundAmount > 0
    ) {
      try {
        const razorpayKey = process.env.RAZORPAY_KEY_ID || ""
        if (!razorpayKey.startsWith("rzp_test_placeholder") && process.env.RAZORPAY_KEY_SECRET) {
          const razorpay = new Razorpay({
            key_id: process.env.RAZORPAY_KEY_ID!,
            key_secret: process.env.RAZORPAY_KEY_SECRET!,
          })
          const refundRes = await razorpay.payments.refund(booking.payment.razorpayPaymentId, {
            amount: policy.refundAmount,
            notes: {
              reason: "OWNER_SLA_EXPIRED",
              bookingId: booking.id,
              bookingRef: booking.bookingRef,
            },
          })
          refundId = (refundRes as { id?: string })?.id || null
          refundProcessed = true
        }
      } catch (err) {
        console.error(`[OwnerSLA] Razorpay refund failed for booking ${booking.id}:`, err)
        refundProcessed = false
      }
    }

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
          note: refundProcessed
            ? `Auto-cancelled: tool owner did not respond within the 4-hour SLA. Full refund of ₹${(
                policy.refundAmount / 100
              ).toFixed(2)} processed via Razorpay (${refundId || "online"}).`
            : `Auto-cancelled: tool owner did not respond within the 4-hour SLA. Refund of ₹${(
                policy.refundAmount / 100
              ).toFixed(2)} recorded — pending admin payment gateway resolution.`,
        },
      })

      if (booking.payment) {
        await tx.payment.update({
          where: { id: booking.payment.id },
          data: {
            refundAmount: policy.refundAmount,
            cancellationFee: policy.operatorFee,
            depositRefundId: refundId,
            ...(refundProcessed ? { status: "REFUNDED" as const } : { disputeLocked: true }),
          },
        })
      }
    })

    if (booking.farmer.phone) {
      const smsMessage = refundProcessed
        ? `O~Bele: The tool owner did not respond to your booking ${booking.bookingRef} within 4 hours, so it was cancelled. A full refund of ₹${(
            policy.refundAmount / 100
          ).toFixed(2)} has been refunded to your payment method.`
        : `O~Bele: The tool owner did not respond to your booking ${booking.bookingRef} within 4 hours, so it was cancelled. Our team is processing your refund request.`

      await sendSmsNotification(booking.farmer.phone, smsMessage)
    }
  }

  return overdue.length
}
