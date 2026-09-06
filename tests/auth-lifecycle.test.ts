import { describe, it } from "node:test"
import assert from "node:assert/strict"
import { normalizePhone, isValidIndianPhone } from "../src/server/services/auth"
import { getClientIp } from "../src/server/lib/rate-limit"

describe("Authentication & Phone Validation", () => {
  it("normalizes 10-digit Indian phone numbers to 12-digit canonical format", () => {
    assert.equal(normalizePhone("9845012345"), "919845012345")
    assert.equal(normalizePhone("+91 98450 12345"), "919845012345")
    assert.equal(normalizePhone("09845012345"), "919845012345")
    assert.equal(normalizePhone("919845012345"), "919845012345")
  })

  it("validates legitimate Indian mobile numbers", () => {
    assert.equal(isValidIndianPhone("9845012345"), true)
    assert.equal(isValidIndianPhone("8123456789"), true)
    assert.equal(isValidIndianPhone("7012345678"), true)
    assert.equal(isValidIndianPhone("6361234567"), true)

    // Invalid numbers
    assert.equal(isValidIndianPhone("1234567890"), false) // starts with 1
    assert.equal(isValidIndianPhone("984501234"), false)  // 9 digits
    assert.equal(isValidIndianPhone(""), false)
    assert.equal(isValidIndianPhone(undefined), false)
  })

  it("extracts client IP securely", () => {
    const mockReqWithForwarded = new Request("http://localhost:3000", {
      headers: { "x-forwarded-for": "203.0.113.195, 70.41.3.18" },
    })
    assert.equal(getClientIp(mockReqWithForwarded), "203.0.113.195")

    const mockReqWithRealIp = new Request("http://localhost:3000", {
      headers: { "x-real-ip": "198.51.100.1" },
    })
    assert.equal(getClientIp(mockReqWithRealIp), "198.51.100.1")

    const mockReqFallback = new Request("http://localhost:3000")
    assert.equal(getClientIp(mockReqFallback), "127.0.0.1")
  })
})
