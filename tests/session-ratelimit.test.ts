import { describe, it, before, after } from "node:test"
import assert from "node:assert/strict"
import { NextRequest } from "next/server"
import { prisma } from "../src/server/db/prisma"
import { POST as POSTSession } from "../src/app/api/auth/session/route"

describe("Session API Rate Limiting (POST /api/auth/session)", () => {
  const TEST_IP_ATTACKER = "198.51.100.99"
  const TEST_IP_INNOCENT = "198.51.100.100"
  const TEST_IP_REAL = "203.0.113.50"

  before(async () => {
    process.env.ENABLE_DEV_FIREBASE_AUTH = "true"
    // Clean up any existing rate limit records for test IPs
    await prisma.rateLimit.deleteMany({
      where: {
        key: {
          in: [
            `session:ip:${TEST_IP_ATTACKER}`,
            `session:ip:${TEST_IP_INNOCENT}`,
            `session:ip:${TEST_IP_REAL}`,
          ],
        },
      },
    })
  })

  after(async () => {
    await prisma.rateLimit.deleteMany({
      where: {
        key: {
          in: [
            `session:ip:${TEST_IP_ATTACKER}`,
            `session:ip:${TEST_IP_INNOCENT}`,
            `session:ip:${TEST_IP_REAL}`,
          ],
        },
      },
    })
  })

  it("permits up to 10 requests per minute and blocks the 11th with 429 Too Many Requests", async () => {
    // Send 10 consecutive requests from the same IP
    for (let i = 1; i <= 10; i++) {
      const req = new NextRequest("http://localhost:3000/api/auth/session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-forwarded-for": TEST_IP_ATTACKER,
        },
        body: JSON.stringify({ idToken: "invalid_test_token" }),
      })

      const res = await POSTSession(req)
      // First 10 requests should pass through rate limiting (they may fail token verification with 401 or 400, but NOT 429)
      assert.notEqual(res.status, 429, `Request #${i} should not be rate-limited`)
    }

    // 11th request from the same IP MUST be blocked with HTTP 429
    const blockedReq = new NextRequest("http://localhost:3000/api/auth/session", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-forwarded-for": TEST_IP_ATTACKER,
      },
      body: JSON.stringify({ idToken: "any_token" }),
    })

    const blockedRes = await POSTSession(blockedReq)
    assert.equal(blockedRes.status, 429, "11th request must return HTTP 429")

    const body = await blockedRes.json()
    assert.equal(body.success, false)
    assert.match(body.error, /Too many authentication requests from this IP/i)

    // Verify rate limit headers
    assert.equal(blockedRes.headers.get("X-RateLimit-Limit"), "10")
    assert.equal(blockedRes.headers.get("X-RateLimit-Remaining"), "0")
    assert.ok(blockedRes.headers.get("Retry-After"), "Should include Retry-After header")
  })

  it("does not block a different IP address when one IP is rate-limited", async () => {
    // Innocent IP makes a request — should not be blocked even though TEST_IP_ATTACKER is blocked
    const innocentReq = new NextRequest("http://localhost:3000/api/auth/session", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-forwarded-for": TEST_IP_INNOCENT,
      },
      body: JSON.stringify({ idToken: "" }),
    })

    const res = await POSTSession(innocentReq)
    assert.notEqual(res.status, 429, "Different IP must not be blocked by another IP's rate limit")
    // Missing idToken returns 400
    assert.equal(res.status, 400)
  })

  it("uses trusted x-real-ip over spoofed x-forwarded-for to prevent rate limit evasion", async () => {
    // Hammer 10 times using spoofed x-forwarded-for but constant x-real-ip
    for (let i = 1; i <= 10; i++) {
      const req = new NextRequest("http://localhost:3000/api/auth/session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-real-ip": TEST_IP_REAL,
          "x-forwarded-for": `10.0.0.${i}`, // Attacker rotates spoofed x-forwarded-for
        },
        body: JSON.stringify({ idToken: "" }),
      })

      const res = await POSTSession(req)
      assert.notEqual(res.status, 429)
    }

    // 11th request with yet another spoofed x-forwarded-for should still be blocked because x-real-ip is exhausted
    const req11 = new NextRequest("http://localhost:3000/api/auth/session", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-real-ip": TEST_IP_REAL,
        "x-forwarded-for": "10.0.0.999",
      },
      body: JSON.stringify({ idToken: "" }),
    })

    const res11 = await POSTSession(req11)
    assert.equal(res11.status, 429, "Must rate limit based on trusted x-real-ip, ignoring spoofed x-forwarded-for")
  })
})
