import { describe, it } from "node:test"
import assert from "node:assert/strict"
import {
  isDepositResolutionAction,
  isDepositResolutionRequired,
  DepositResolutionError,
  resolveBookingDeposit,
  type RefundExecutor,
} from "../src/server/lib/deposit-resolution"
import type { Payment } from "@prisma/client"

describe("Deposit Resolution Logic", () => {
  it("validates deposit resolution actions", () => {
    assert.equal(isDepositResolutionAction("FULL_REFUND"), true)
    assert.equal(isDepositResolutionAction("PARTIAL_DEDUCTION"), true)
    assert.equal(isDepositResolutionAction("HOLD"), true)
    assert.equal(isDepositResolutionAction("INVALID"), false)
  })

  it("checks if deposit resolution is required", () => {
    assert.equal(isDepositResolutionRequired(1000, { depositFrozen: true }), true)
    assert.equal(isDepositResolutionRequired(0, { depositFrozen: true }), false)
    assert.equal(isDepositResolutionRequired(1000, { depositFrozen: false }), false)
    assert.equal(isDepositResolutionRequired(1000, null), false)
  })

  it("handles full refund deposit resolution using mock db and refund executor", async () => {
    const paymentRecord: Payment = {
      id: "pay_1",
      bookingId: "bk_1",
      orderId: "ord_1",
      razorpayOrderId: "order_1",
      razorpayPaymentId: "pay_rzp_1",
      amount: 150000,
      status: "CAPTURED",
      method: "razorpay",
      vpa: null,
      webhookVerified: true,
      webhookReceivedAt: new Date(),
      depositFrozen: true,
      depositDeducted: 0,
      depositRefunded: 0,
      disputeLocked: false,
      depositRefundId: null,
      refundAmount: 0,
      cancellationFee: 0,
      createdAt: new Date(),
    }

    let state = { ...paymentRecord }
    const mockDb = {
      payment: {
        async updateMany(args: { data: Partial<Payment> }) {
          state = { ...state, ...args.data }
          return { count: 1 }
        },
        async update(args: { data: Partial<Payment> }) {
          state = { ...state, ...args.data }
          return state
        },
        async findUnique() {
          return state
        },
      },
    } as unknown as Parameters<typeof resolveBookingDeposit>[0]

    const mockRefund: RefundExecutor = {
      async refundDeposit() {
        return { refundId: "rfnd_123" }
      },
    }

    const outcome = await resolveBookingDeposit(mockDb, mockRefund, {
      payment: paymentRecord,
      booking: { id: "bk_1", bookingRef: "BK123", deposit: 50000 },
      action: "FULL_REFUND",
    })

    assert.equal(outcome.alreadyResolved, false)
    assert.equal(outcome.action, "FULL_REFUND")
    assert.equal(outcome.refunded, 50000)
    assert.equal(outcome.deducted, 0)
    assert.equal(outcome.refundId, "rfnd_123")
  })

  it("throws DepositResolutionError on invalid deduction amount exceeding deposit", async () => {
    const paymentRecord: Payment = {
      id: "pay_1",
      bookingId: "bk_1",
      orderId: "ord_1",
      razorpayOrderId: "order_1",
      razorpayPaymentId: "pay_rzp_1",
      amount: 150000,
      status: "CAPTURED",
      method: "razorpay",
      vpa: null,
      webhookVerified: true,
      webhookReceivedAt: new Date(),
      depositFrozen: true,
      depositDeducted: 0,
      depositRefunded: 0,
      disputeLocked: false,
      depositRefundId: null,
      refundAmount: 0,
      cancellationFee: 0,
      createdAt: new Date(),
    }

    const mockDb = {} as unknown as Parameters<typeof resolveBookingDeposit>[0]
    const mockRefund: RefundExecutor = {
      async refundDeposit() {
        return { refundId: "rfnd_123" }
      },
    }

    await assert.rejects(
      async () => {
        await resolveBookingDeposit(mockDb, mockRefund, {
          payment: paymentRecord,
          booking: { id: "bk_1", bookingRef: "BK123", deposit: 50000 },
          action: "PARTIAL_DEDUCTION",
          deductedAmount: 60000, // exceeds deposit
        })
      },
      (err: unknown) => err instanceof DepositResolutionError && err.code === "INVALID_DEDUCTION",
    )
  })
})
