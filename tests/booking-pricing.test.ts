import { describe, it } from "node:test"
import assert from "node:assert/strict"
import {
  computeBookingPricing,
  computeRentalDays,
  resolveDeliveryCharge,
  BookingPricingError,
  DELIVERY_FEE_PAISE,
  type ToolPricingSource,
} from "../src/server/lib/booking-pricing"

describe("Booking Pricing Engine", () => {
  const dummyTool: ToolPricingSource = {
    pricePerDay: 50000, // ₹500
    deposit: 100000,    // ₹1000
    operatorFeePerDay: 40000, // ₹400
    minRentalDays: 1,
    maxRentalDays: 30,
  }

  it("calculates rental days correctly", () => {
    const start = new Date("2026-09-01T00:00:00Z")
    const sameDay = new Date("2026-09-01T12:00:00Z")
    const nextDay = new Date("2026-09-02T00:00:00Z")
    const threeDays = new Date("2026-09-04T00:00:00Z")

    assert.equal(computeRentalDays(start, sameDay), 1)
    assert.equal(computeRentalDays(start, nextDay), 1)
    assert.equal(computeRentalDays(start, threeDays), 3)
  })

  it("throws BookingPricingError on invalid date ranges", () => {
    const start = new Date("2026-09-05T00:00:00Z")
    const end = new Date("2026-09-01T00:00:00Z")

    assert.throws(() => computeRentalDays(start, end), BookingPricingError)
  })

  it("computes pricing for self-service rental", () => {
    const start = new Date("2026-09-01T00:00:00Z")
    const end = new Date("2026-09-03T00:00:00Z") // 2 days

    const pricing = computeBookingPricing({
      tool: dummyTool,
      serviceType: "SELF_SERVICE_RENTAL",
      startDate: start,
      endDate: end,
      deliveryFee: 0,
    })

    assert.equal(pricing.days, 2)
    assert.equal(pricing.toolFeePerDay, 50000)
    assert.equal(pricing.totalToolFee, 100000)
    assert.equal(pricing.operatorFeePerDay, 0)
    assert.equal(pricing.totalOperatorFee, 0)
    assert.equal(pricing.deposit, 100000)
    assert.equal(pricing.deliveryFee, 0)
    assert.equal(pricing.subtotal, 100000)
    assert.equal(pricing.totalAmount, 200000) // subtotal + deposit
  })

  it("computes pricing for operator-assisted rental with delivery and deposit", () => {
    const start = new Date("2026-09-01T00:00:00Z")
    const end = new Date("2026-09-02T00:00:00Z") // 1 day

    const pricing = computeBookingPricing({
      tool: dummyTool,
      serviceType: "OPERATOR_ONLY",
      startDate: start,
      endDate: end,
      deliveryFee: DELIVERY_FEE_PAISE,
    })

    assert.equal(pricing.days, 1)
    assert.equal(pricing.totalToolFee, 50000)
    assert.equal(pricing.totalOperatorFee, 40000)
    assert.equal(pricing.deposit, 100000)
    assert.equal(pricing.deliveryFee, 5000)
    assert.equal(pricing.subtotal, 90000) // toolFee + operatorFee
    assert.equal(pricing.totalAmount, 195000) // subtotal + deposit + deliveryFee
  })

  it("matches Figma spec: VST Shakti Power Tiller 13HP (₹1200 + ₹400 + ₹1500 = ₹3100)", () => {
    const figmaTool: ToolPricingSource = {
      pricePerDay: 1200 * 100,
      deposit: 1500 * 100,
      operatorFeePerDay: 400 * 100,
      minRentalDays: 1,
      maxRentalDays: 14,
    }

    const start = new Date("2026-09-06T00:00:00Z")
    const end = new Date("2026-09-07T00:00:00Z") // 1 day

    const pricing = computeBookingPricing({
      tool: figmaTool,
      serviceType: "OPERATOR_ONLY",
      startDate: start,
      endDate: end,
      deliveryFee: 0,
    })

    assert.equal(pricing.days, 1)
    assert.equal(pricing.totalToolFee, 120000) // ₹1,200
    assert.equal(pricing.totalOperatorFee, 40000) // ₹400
    assert.equal(pricing.deposit, 150000) // ₹1,500
    assert.equal(pricing.subtotal, 160000)
    assert.equal(pricing.totalAmount, 310000) // ₹3,100 upfront total
  })

  it("resolves delivery charges correctly", () => {
    assert.equal(resolveDeliveryCharge("DELIVERY"), DELIVERY_FEE_PAISE)
    assert.equal(resolveDeliveryCharge("delivery"), DELIVERY_FEE_PAISE)
    assert.equal(resolveDeliveryCharge("PICKUP"), 0)
    assert.equal(resolveDeliveryCharge(undefined), 0)
  })
})
