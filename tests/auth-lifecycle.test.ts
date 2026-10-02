import { describe, it } from "node:test"
import assert from "node:assert/strict"
import { normalizePhone, isValidIndianPhone, hashOtp, verifyOtpHash } from "../src/server/services/auth"
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

    // S5 Fix: x-real-ip cannot be spoofed by x-forwarded-for
    const mockReqSpoofed = new Request("http://localhost:3000", {
      headers: {
        "x-forwarded-for": "1.2.3.4, 5.6.7.8",
        "x-real-ip": "198.51.100.1",
      },
    })
    assert.equal(getClientIp(mockReqSpoofed), "198.51.100.1")
  })

  it("hashes OTP securely and verifies timing-safe matching (S3 fix)", () => {
    const phone = "919845012345"
    const otp = "481920"
    const hash = hashOtp(phone, otp)

    // Hash should be 64-character SHA-256 hex string
    assert.equal(hash.length, 64)
    assert.notEqual(hash, otp)

    // Same input produces deterministic hash
    assert.equal(hashOtp(phone, otp), hash)

    // Different OTP produces different hash
    assert.notEqual(hashOtp(phone, "481921"), hash)

    // Different phone produces different hash
    assert.notEqual(hashOtp("919845099999", otp), hash)

    // verifyOtpHash succeeds with correct OTP
    assert.equal(verifyOtpHash(phone, otp, hash), true)

    // verifyOtpHash fails with incorrect OTP
    assert.equal(verifyOtpHash(phone, "111111", hash), false)

    // verifyOtpHash backwards compatibility for legacy plaintext records
    assert.equal(verifyOtpHash(phone, "654321", "654321"), true)
    assert.equal(verifyOtpHash(phone, "123456", "654321"), false)
  })
})
