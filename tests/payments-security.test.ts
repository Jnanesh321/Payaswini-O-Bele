import { describe, it } from "node:test"
import assert from "node:assert/strict"
import { NextRequest } from "next/server"
import { POST as POSTPayments } from "../src/app/api/payments/route"
import { POST as POSTRazorpayVerify } from "../src/app/api/razorpay/verify/route"

describe("Payments API Security (S1 & S4 Audit Fixes)", () => {
  it("rejects unauthenticated requests to /api/payments with 401 Unauthorized (S1)", async () => {
    const req = new NextRequest("http://localhost:3000/api/payments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        bookingId: "fake-booking-id",
        amount: 500000,
        razorpayOrderId: "order_fake_123",
      }),
    })

    const res = await POSTPayments(req)
    assert.equal(res.status, 401)
    const json = await res.json()
    assert.equal(json.success, false)
    assert.match(json.error, /Unauthorized/i)
  })

  it("rejects unauthenticated requests to /api/razorpay/verify with 401 Unauthorized (S4)", async () => {
    const req = new NextRequest("http://localhost:3000/api/razorpay/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        razorpayOrderId: "order_123",
        razorpayPaymentId: "pay_123",
        razorpaySignature: "dummy_sig",
        bookingIds: ["booking_123"],
      }),
    })

    const res = await POSTRazorpayVerify(req)
    assert.equal(res.status, 401)
    const json = await res.json()
    assert.equal(json.success, false)
    assert.match(json.error, /Unauthorized/i)
  })
})
