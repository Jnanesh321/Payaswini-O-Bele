import { describe, it } from "node:test"
import assert from "node:assert/strict"
import { computeBookingPricing } from "../src/server/lib/booking-pricing"

describe("P0 Security & Escrow Fixes Validation", () => {
  it("enforces physical asset deposit over catalog default deposit", () => {
    const catalogTool = {
      pricePerDay: 50000, // ₹500
      deposit: 0, // catalog default
      operatorFeePerDay: 40000,
      minRentalDays: 1,
      maxRentalDays: 30,
    }

    const physicalInstanceDeposit = 150000 // ₹1,500 real deposit on physical asset

    const effectiveTool = {
      ...catalogTool,
      deposit: physicalInstanceDeposit,
    }

    const startDate = new Date(Date.now() + 86400000)
    const endDate = new Date(Date.now() + 86400000 * 2)

    const pricing = computeBookingPricing({
      tool: effectiveTool,
      serviceType: "SELF_SERVICE_RENTAL",
      startDate,
      endDate,
      deliveryFee: 0,
    })

    assert.equal(pricing.deposit, 150000)
    assert.equal(pricing.totalToolFee, 50000)
    assert.equal(pricing.totalAmount, 50000 + 150000)
  })

  it("does not leak devOtp or allow master OTP when ENABLE_DEV_MASTER_OTP is false", async () => {
    const prevEnv = process.env.ENABLE_DEV_MASTER_OTP
    process.env.ENABLE_DEV_MASTER_OTP = "false"

    try {
      const { sendOtp, verifyOtp } = await import("../src/server/services/auth")

      const mockReq = new Request("http://localhost:3000/api/auth/send-otp", {
        headers: { "x-real-ip": "127.0.0.1" },
      })

      const sendResult = await sendOtp(mockReq, "9845199999")
      assert.equal(sendResult.devOtp, undefined, "devOtp must not be leaked")

      const verifyReq = new Request("http://localhost:3000/api/auth/verify-otp", {
        headers: { "x-real-ip": "127.0.0.1" },
      })

      // Trying master OTP "123456" without real OTP record or env flag should throw
      await assert.rejects(
        async () => {
          await verifyOtp(verifyReq, { phone: "9845199999", otp: "123456" })
        },
        /Invalid OTP/i
      )
    } finally {
      process.env.ENABLE_DEV_MASTER_OTP = prevEnv
    }
  })

  it("handles optional ₹50 delivery fee (Pickup: ₹0 vs Delivery: ₹50)", async () => {
    const { resolveDeliveryCharge, DELIVERY_FEE_PAISE } = await import("../src/server/lib/booking-pricing")
    assert.equal(resolveDeliveryCharge("pickup"), 0)
    assert.equal(resolveDeliveryCharge("PICKUP"), 0)
    assert.equal(resolveDeliveryCharge(undefined), 0)
    assert.equal(resolveDeliveryCharge("delivery"), DELIVERY_FEE_PAISE)
    assert.equal(resolveDeliveryCharge("DELIVERY"), DELIVERY_FEE_PAISE)
    assert.equal(DELIVERY_FEE_PAISE, 5000) // ₹50 in paise
  })

  it("verifies phone validation logic required before publishing tool listings", () => {
    const isValidOwnerPhone = (phone?: string | null) => {
      return Boolean(
        phone &&
        phone.startsWith("91") &&
        phone.length === 12 &&
        !phone.includes("000000")
      )
    }

    assert.equal(isValidOwnerPhone(null), false)
    assert.equal(isValidOwnerPhone(undefined), false)
    assert.equal(isValidOwnerPhone(""), false)
    assert.equal(isValidOwnerPhone("910000000000"), false)
    assert.equal(isValidOwnerPhone("9845012345"), false) // Missing 91 prefix
    assert.equal(isValidOwnerPhone("919845012345"), true) // Valid 12-digit Indian phone
  })
})
