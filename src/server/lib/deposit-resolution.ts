import type { Payment } from "@prisma/client"
import type { Prisma, PrismaClient } from "@prisma/client"
import Razorpay from "razorpay"

/**
 * Refundable-deposit lifecycle — the resolution step that runs after the tool
 * is returned and inspection is recorded.
 *
 * Three outcomes:
 *   FULL_REFUND       → refund the whole deposit, record `depositRefunded`.
 *   PARTIAL_DEDUCTION → record `depositDeducted`, refund the remainder.
 *   HOLD              → keep `depositFrozen`, mark `disputeLocked` so the
 *                       deposit can never be silently refunded (admin-only to
 *                       release).
 *
 * Idempotency: the DB claim (an atomic conditional `updateMany`) flips the
 * payment from "unresolved & frozen" to "resolved" exactly once. Any duplicate
 * or concurrent request fails the claim and returns `alreadyResolved: true`
 * without touching Razorpay — so a retried request can never issue a second
 * refund. If the provider refund fails the claim is rolled back so a retry can
 * safely re-attempt.
 */

export type DepositResolutionAction = "FULL_REFUND" | "PARTIAL_DEDUCTION" | "HOLD"

export const DEPOSIT_RESOLUTION_ACTIONS: readonly DepositResolutionAction[] = [
  "FULL_REFUND",
  "PARTIAL_DEDUCTION",
  "HOLD",
]

export function isDepositResolutionAction(value: unknown): value is DepositResolutionAction {
  return DEPOSIT_RESOLUTION_ACTIONS.includes(value as DepositResolutionAction)
}

export interface DepositResolutionBooking {
  id: string
  bookingRef: string
  deposit: number
}

export interface RefundExecutor {
  refundDeposit(params: {
    razorpayPaymentId: string
    amount: number
    receipt: string
    bookingId: string
    bookingRef: string
  }): Promise<{ refundId: string }>
}

/** Real Razorpay refund executor, wired by the API route. */
export const razorpayRefundExecutor: RefundExecutor = {
  async refundDeposit({ razorpayPaymentId, amount, receipt, bookingId, bookingRef }) {
    const razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID!,
      key_secret: process.env.RAZORPAY_KEY_SECRET!,
    })
    const refund = await razorpay.payments.refund(razorpayPaymentId, {
      amount,
      receipt,
      notes: { bookingId, bookingRef },
    })
    return { refundId: refund.id }
  },
}

export type DepositResolutionErrorCode =
  | "NOT_CAPTURED"
  | "INVALID_DEDUCTION"
  | "DISPUTE_LOCKED"
  | "REFUND_FAILED"

export class DepositResolutionError extends Error {
  readonly code: DepositResolutionErrorCode

  constructor(message: string, code: DepositResolutionErrorCode) {
    super(message)
    this.name = "DepositResolutionError"
    this.code = code
  }
}

export interface DepositResolutionOutcome {
  /** True when the request was a safe no-op because the deposit was already resolved. */
  alreadyResolved: boolean
  action: DepositResolutionAction
  refunded: number
  deducted: number
  refundId: string | null
  payment: {
    status: string
    depositFrozen: boolean
    depositRefunded: number
    depositDeducted: number
    disputeLocked: boolean
    depositRefundId: string | null
  }
}

/** True when a booking still has a frozen, unresolved refundable deposit. */
export function isDepositResolutionRequired(
  deposit: number,
  payment: { depositFrozen: boolean } | null | undefined,
): boolean {
  return deposit > 0 && payment?.depositFrozen === true
}

interface ResolveDepositParams {
  payment: Payment
  booking: DepositResolutionBooking
  action: DepositResolutionAction
  /** Paise withheld (PARTIAL_DEDUCTION only). */
  deductedAmount?: number
  /** Admin resolution may release a dispute-locked deposit explicitly. */
  actorIsAdmin?: boolean
}

function outcomeFromPayment(
  action: DepositResolutionAction,
  alreadyResolved: boolean,
  refunded: number,
  deducted: number,
  refundId: string | null,
  payment: Payment,
): DepositResolutionOutcome {
  return {
    alreadyResolved,
    action,
    refunded,
    deducted,
    refundId,
    payment: {
      status: payment.status,
      depositFrozen: payment.depositFrozen,
      depositRefunded: payment.depositRefunded,
      depositDeducted: payment.depositDeducted,
      disputeLocked: payment.disputeLocked,
      depositRefundId: payment.depositRefundId,
    },
  }
}

export async function resolveBookingDeposit(
  db: PrismaClient | Prisma.TransactionClient,
  refund: RefundExecutor,
  params: ResolveDepositParams,
): Promise<DepositResolutionOutcome> {
  const { payment, booking, action, actorIsAdmin = false } = params
  const deposit = booking.deposit

  // Nothing to resolve — treat as an idempotent success so callers don't error.
  if (deposit <= 0) {
    return outcomeFromPayment(action, true, 0, 0, null, payment)
  }

  if (payment.status !== "CAPTURED") {
    throw new DepositResolutionError(
      `Cannot resolve deposit: payment status is "${payment.status}", expected CAPTURED`,
      "NOT_CAPTURED",
    )
  }

  let refunded = 0
  let deducted = 0
  if (action === "FULL_REFUND") {
    refunded = deposit
  } else if (action === "PARTIAL_DEDUCTION") {
    deducted = Math.max(0, Math.round(params.deductedAmount ?? 0))
    if (deducted > deposit) {
      throw new DepositResolutionError(
        `Deducted amount (₹${(deducted / 100).toFixed(2)}) cannot exceed the deposit (₹${(deposit / 100).toFixed(2)})`,
        "INVALID_DEDUCTION",
      )
    }
    refunded = deposit - deducted
  }
  // HOLD: no money moves; only `disputeLocked` is set below.

  // ── Idempotency claim ─────────────────────────────────────────────────────
  // One atomic conditional update. Only the first caller wins (count === 1);
  // every duplicate/concurrent caller loses and is short-circuited below.
  let claimCount = 0
  if (action === "HOLD") {
    const claim = await db.payment.updateMany({
      where: { id: payment.id, depositFrozen: true, disputeLocked: false },
      data: { disputeLocked: true },
    })
    claimCount = claim.count
  } else {
    const claim = await db.payment.updateMany({
      where: {
        id: payment.id,
        status: "CAPTURED",
        depositFrozen: true,
        depositRefunded: 0,
        depositDeducted: 0,
        ...(actorIsAdmin ? {} : { disputeLocked: false }),
      },
      data: { depositFrozen: false, depositRefunded: refunded, depositDeducted: deducted },
    })
    claimCount = claim.count
  }

  if (claimCount !== 1) {
    const fresh = await db.payment.findUnique({ where: { id: payment.id } })
    if (!fresh) throw new Error("Payment row disappeared during deposit resolution")

    // A HOLD re-issued on an already-held deposit is a harmless no-op.
    if (action === "HOLD" && fresh.disputeLocked) {
      return outcomeFromPayment(action, true, fresh.depositRefunded, fresh.depositDeducted, fresh.depositRefundId, fresh)
    }
    // Already resolved (by this request's first attempt or a previous one).
    if (!fresh.depositFrozen || fresh.depositRefunded > 0 || fresh.depositDeducted > 0) {
      return outcomeFromPayment(action, true, fresh.depositRefunded, fresh.depositDeducted, fresh.depositRefundId, fresh)
    }
    if (fresh.disputeLocked && !actorIsAdmin) {
      throw new DepositResolutionError(
        "This deposit is dispute-locked. Only an admin may resolve it (explicit dispute resolution).",
        "DISPUTE_LOCKED",
      )
    }
    throw new DepositResolutionError(
      `Deposit is not in a resolvable state (depositFrozen=${fresh.depositFrozen}, status=${fresh.status})`,
      "NOT_CAPTURED",
    )
  }

  // ── Refund via the payment provider (only when money actually moves) ──────
  let refundId: string | null = null
  if (refunded > 0) {
    if (!payment.razorpayPaymentId) {
      await db.payment.update({
        where: { id: payment.id },
        data: { depositFrozen: true, depositRefunded: 0, depositDeducted: 0 },
      })
      throw new DepositResolutionError(
        "Cannot refund: the payment has no Razorpay payment id recorded",
        "REFUND_FAILED",
      )
    }
    try {
      const res = await refund.refundDeposit({
        razorpayPaymentId: payment.razorpayPaymentId,
        amount: refunded,
        receipt: `dep_${booking.id}`,
        bookingId: booking.id,
        bookingRef: booking.bookingRef,
      })
      refundId = res.refundId
    } catch (error) {
      // Roll the claim back so a retry can safely re-claim and re-attempt.
      await db.payment.update({
        where: { id: payment.id },
        data: { depositFrozen: true, depositRefunded: 0, depositDeducted: 0 },
      })
      throw new DepositResolutionError(
        `Razorpay refund failed: ${error instanceof Error ? error.message : String(error)}`,
        "REFUND_FAILED",
      )
    }
    if (refundId) {
      await db.payment.update({
        where: { id: payment.id },
        data: { depositRefundId: refundId },
      })
    }
  }

  const fresh = await db.payment.findUnique({ where: { id: payment.id } })
  if (!fresh) throw new Error("Payment row disappeared after deposit resolution")
  return outcomeFromPayment(action, false, fresh.depositRefunded, fresh.depositDeducted, fresh.depositRefundId, fresh)
}
