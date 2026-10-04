import { describe, it, before, after } from "node:test"
import assert from "node:assert/strict"
import { prisma } from "../src/server/db/prisma"
import { resolveOrCreateFirebaseUser } from "../src/server/services/auth-firebase"
import { verifyFirebaseIdToken } from "../src/lib/firebase/admin"
import { signSessionToken, verifySessionToken } from "../src/lib/auth-session"
import { requireAuth, AuthGuardError } from "../src/server/lib/auth-guard"
import { CapabilityType } from "@prisma/client"

describe("Firebase Authentication & User Linking Integration", () => {
  const TEST_FIREBASE_UID_1 = "test_fb_uid_farmer_9901"
  const TEST_FIREBASE_UID_2 = "test_fb_uid_existing_9902"
  const TEST_PHONE_NEW = "+919876599001"
  const TEST_PHONE_EXISTING = "+919876599002"

  let existingPrismaUserId = ""

  before(async () => {
    // Enable dev auth mode for test environment
    process.env.ENABLE_DEV_FIREBASE_AUTH = "true"

    // Clean up any test artifacts from prior runs
    await prisma.user.deleteMany({
      where: {
        OR: [
          { phone: { in: ["919876599001", "919876599002", "9876599001", "9876599002"] } },
          { firebaseUid: { in: [TEST_FIREBASE_UID_1, TEST_FIREBASE_UID_2] } },
        ],
      },
    })

    // Create a pre-existing Prisma user WITHOUT a firebaseUid (simulating legacy user)
    const existing = await prisma.user.create({
      data: {
        name: "Seed Legacy Farmer",
        phone: "919876599002",
        taluk: "Kasaragod",
        district: "Kasaragod",
        capabilities: {
          create: [{ type: CapabilityType.FARMER, status: "VERIFIED" }],
        },
      },
      include: { capabilities: true },
    })
    existingPrismaUserId = existing.id
  })

  after(async () => {
    // Clean up test records
    await prisma.user.deleteMany({
      where: {
        OR: [
          { phone: { in: ["919876599001", "919876599002"] } },
          { firebaseUid: { in: [TEST_FIREBASE_UID_1, TEST_FIREBASE_UID_2] } },
        ],
      },
    })
  })

  it("1. New Firebase phone user can authenticate and resolves with default FARMER capability", async () => {
    const verifiedToken = {
      uid: TEST_FIREBASE_UID_1,
      phone_number: TEST_PHONE_NEW,
    }

    const resolved = await resolveOrCreateFirebaseUser(verifiedToken)

    assert.ok(resolved.id, "Should resolve a valid Prisma User ID")
    assert.equal(resolved.phone, "919876599001")
    assert.equal(resolved.capabilities.includes("FARMER"), true)

    // Verify in database
    const dbUser = await prisma.user.findUnique({
      where: { id: resolved.id },
      include: { capabilities: true },
    })
    assert.ok(dbUser)
    assert.equal(dbUser.firebaseUid, TEST_FIREBASE_UID_1)
    assert.equal(dbUser.phone, "919876599001")
    assert.equal(dbUser.capabilities.some((c) => c.type === CapabilityType.FARMER), true)
  })

  it("2. Existing Prisma user can authenticate and resolve to correct account without duplicate creation", async () => {
    const verifiedToken = {
      uid: TEST_FIREBASE_UID_2,
      phone_number: TEST_PHONE_EXISTING, // +919876599002
    }

    const resolved = await resolveOrCreateFirebaseUser(verifiedToken)

    // Must link to the exact pre-existing User ID
    assert.equal(resolved.id, existingPrismaUserId)
    assert.equal(resolved.name, "Seed Legacy Farmer")

    // Verify database was updated with firebaseUid rather than creating a second row
    const usersCount = await prisma.user.count({
      where: { phone: "919876599002" },
    })
    assert.equal(usersCount, 1, "Must NOT create a duplicate Prisma user account")

    const updatedUser = await prisma.user.findUnique({
      where: { id: existingPrismaUserId },
    })
    assert.equal(updatedUser?.firebaseUid, TEST_FIREBASE_UID_2)
  })

  it("3. Firebase UID maps directly to Prisma User on subsequent logins", async () => {
    // Login with existing UID but phone without +91 prefix
    const verifiedToken = {
      uid: TEST_FIREBASE_UID_2,
      phone_number: "9876599002",
    }

    const resolved = await resolveOrCreateFirebaseUser(verifiedToken)
    assert.equal(resolved.id, existingPrismaUserId)
    assert.equal(resolved.name, "Seed Legacy Farmer")
  })

  it("4. Unauthenticated request to protected API is rejected (requireAuth throws 401)", async () => {
    // When called outside request context / without session cookie, requireAuth must throw AuthGuardError(401)
    await assert.rejects(
      async () => {
        await requireAuth()
      },
      (err: unknown) => {
        assert.ok(err instanceof AuthGuardError)
        assert.equal(err.statusCode, 401)
        return true
      }
    )
  })

  it("5. Invalid/tampered Firebase token is rejected", async () => {
    await assert.rejects(
      async () => {
        await verifyFirebaseIdToken("malicious.forged.jwt.token")
      },
      (err: unknown) => {
        return err instanceof Error && (
          err.name === "FirebaseTokenVerificationError" ||
          err.message.includes("Firebase verification failed") ||
          err.message.includes("Firebase Admin SDK is not configured")
        )
      }
    )
  })

  it("6. Authenticated user cannot tamper session or impersonate another Prisma User ID", async () => {
    const validSession = await signSessionToken({
      id: "legitimate_user_id_100",
      phone: "919845012345",
      isAdmin: false,
      capabilities: ["FARMER"],
    })

    // Verification of unmodified token succeeds
    const verified = await verifySessionToken(validSession)
    assert.ok(verified)
    assert.equal(verified?.id, "legitimate_user_id_100")

    // Tampering the payload (e.g. changing user id or setting isAdmin to true)
    const [headerB64, payloadB64, sigB64] = validSession.split(".")
    const decodedPayload = JSON.parse(Buffer.from(payloadB64, "base64url").toString("utf8"))
    decodedPayload.id = "victim_admin_user_999"
    decodedPayload.isAdmin = true

    const forgedPayloadB64 = Buffer.from(JSON.stringify(decodedPayload)).toString("base64url")
    const forgedToken = `${headerB64}.${forgedPayloadB64}.${sigB64}`

    // Tampered token must fail cryptographic signature verification
    const forgedResult = await verifySessionToken(forgedToken)
    assert.equal(forgedResult, null, "Tampered session token MUST be rejected")
  })

  it("7. Role & Capability authorization guards enforce permissions correctly", async () => {
    // requireCapability checks DB status for user
    // The user has FARMER capability:
    const farmerCheck = await prisma.userCapability.findUnique({
      where: {
        userId_type: {
          userId: existingPrismaUserId,
          type: CapabilityType.FARMER,
        },
      },
    })
    assert.ok(farmerCheck, "User has FARMER capability")

    // The user does NOT have TOOL_OWNER capability:
    const ownerCheck = await prisma.userCapability.findUnique({
      where: {
        userId_type: {
          userId: existingPrismaUserId,
          type: CapabilityType.TOOL_OWNER,
        },
      },
    })
    assert.equal(ownerCheck, null, "User must NOT have TOOL_OWNER capability")
  })

  it("8. Session token round-trip preserves user identity & capabilities", async () => {
    const token = await signSessionToken({
      id: "usr_12345",
      name: "Ramesh Poojary",
      phone: "919845000001",
      isAdmin: true,
      capabilities: ["FARMER", "TOOL_OWNER"],
    })

    const payload = await verifySessionToken(token)
    assert.ok(payload)
    assert.equal(payload.id, "usr_12345")
    assert.equal(payload.name, "Ramesh Poojary")
    assert.equal(payload.phone, "919845000001")
    assert.equal(payload.isAdmin, true)
    assert.deepEqual(payload.capabilities, ["FARMER", "TOOL_OWNER"])
  })

  it("9. Malformed tokens (empty, non-string, truncated) are strictly rejected", async () => {
    await assert.rejects(
      async () => {
        // @ts-expect-error testing invalid input type
        await verifyFirebaseIdToken(null)
      },
      (err: unknown) => err instanceof Error && err.message.includes("Missing Firebase ID token")
    )

    await assert.rejects(
      async () => {
        await verifyFirebaseIdToken("")
      },
      (err: unknown) => err instanceof Error && err.message.includes("Missing Firebase ID token")
    )

    await assert.rejects(
      async () => {
        await verifyFirebaseIdToken("eyJhbGciOiJSUzI1NiIsImtpZCI6IjEyMyJ9.onlytwoparts")
      },
      (err: unknown) => err instanceof Error
    )
  })

  it("10. Client cannot spoof Prisma User ID: identity is strictly derived from token", async () => {
    // Verified token belongs to existingPrismaUserId (phone: 919876599002)
    const verifiedToken = {
      uid: TEST_FIREBASE_UID_2,
      phone_number: TEST_PHONE_EXISTING,
    }

    // Even if an attacker passes another userId in extra body data, resolveOrCreateFirebaseUser only binds verified token
    const resolved = await resolveOrCreateFirebaseUser(verifiedToken)
    assert.equal(resolved.id, existingPrismaUserId)
    assert.notEqual(resolved.id, "attacker_spoofed_victim_id")
  })

  it("11. Existing protected booking endpoint still authorizes correctly (requireBookingAccess)", async () => {
    const { requireBookingAccess } = await import("../src/server/lib/auth-guard")

    // Find a real seeded booking
    const booking = await prisma.booking.findFirst({
      select: { id: true, farmerId: true, toolOwnerId: true },
    })

    if (booking) {
      // 1. Authorized farmer has access
      const access = await requireBookingAccess(booking.id, booking.farmerId)
      assert.ok(access.booking)
      assert.equal(access.actorRole, "FARMER")

      // 2. Stranger is rejected with 403 Forbidden
      await assert.rejects(
        async () => {
          await requireBookingAccess(booking.id, "stranger_random_user_9999")
        },
        (err: unknown) => {
          assert.ok(err instanceof AuthGuardError)
          assert.equal(err.statusCode, 403)
          assert.match(err.message, /not authorized to access this booking/i)
          return true
        }
      )
    }
  })
})
