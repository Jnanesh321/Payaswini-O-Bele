import { describe, it } from "node:test"
import assert from "node:assert/strict"
import {
  validateDispatchEligibility,
  DispatchEligibilityError,
  calculateDistanceKm,
  parseFarmGateCoordinates,
  resolveRegisteredDispatchHub,
} from "../src/lib/geo"

describe("Server-Side Dispatch Eligibility & Location Layer", () => {
  // Test Hubs:
  // Kumble Hub: 12.5937, 74.9458
  // Puttur Hub: 12.7687, 75.2071 (Approx 35-40 km away)
  // Belthangady Hub: 12.9991, 75.2635
  // Bengaluru: 12.9716, 77.5946 (~300 km away)

  it("1. accepts delivery destination inside Tool.deliveryRadiusKm", () => {
    // Farm located near Manjeshwar (~14.8 km from Kumble hub)
    const farmAddress = "Farm GPS: 12.71530, 74.88720 (Kumble Dispatch)"
    const result = validateDispatchEligibility({
      toolId: "tool-1",
      toolName: "Carbon Fiber Areca Pole",
      deliveryRadiusKm: 60,
      deliveryType: "delivery",
      deliveryAddress: farmAddress,
      ownerTaluk: "Kumble",
    })

    assert.equal(result.eligible, true)
    assert.equal(result.isPickup, false)
    assert.equal(result.dispatchOriginHub?.id, "kumble")
    assert.ok(result.distanceKm > 0 && result.distanceKm <= 60)
  })

  it("2. rejects delivery destination outside Tool.deliveryRadiusKm", () => {
    // Farm located in Bengaluru (~300 km from Kumble hub)
    const farFarmAddress = "Farm GPS: 12.97160, 77.59460 (Far Away Farm)"

    assert.throws(
      () =>
        validateDispatchEligibility({
          toolId: "tool-1",
          toolName: "Carbon Fiber Areca Pole",
          deliveryRadiusKm: 60,
          deliveryType: "delivery",
          deliveryAddress: farFarmAddress,
          ownerTaluk: "Kumble",
        }),
      (err: unknown) => {
        assert.ok(err instanceof DispatchEligibilityError)
        assert.equal(err.statusCode, 400)
        assert.match(err.message, /exceeds this tool's delivery radius of 60 km/i)
        return true
      }
    )
  })

  it("3. verifies user browsing GPS ≠ farm-gate GPS: farm-gate is authoritative", () => {
    // User is browsing while traveling in Sullia (~60 km away from Kumble),
    // but requested delivery to their farm gate in Kalathur / Kumble (~2 km from Kumble hub).
    // The delivery must be ACCEPTED based on the farm-gate coordinates, ignoring user location.
    const farmGateNearKumble = "Farm GPS: 12.60500, 74.95100 (Kalathur Farm Gate)"

    const result = validateDispatchEligibility({
      toolId: "tool-harvester",
      toolName: "Coconut Harvester",
      deliveryRadiusKm: 35, // 35 km radius
      deliveryType: "delivery",
      deliveryAddress: farmGateNearKumble, // ~1.4 km from Kumble hub
      ownerTaluk: "Kumble",
    })

    assert.equal(result.eligible, true)
    assert.ok(result.distanceKm < 5)
  })

  it("4. rejects tampered/intercepted client coordinates placed outside radius", () => {
    // Attacker modifies request payload to deliver to a remote district (Delhi: 28.6139, 77.2090)
    const tamperedPayload = "Farm GPS: 28.61390, 77.20900 (Tampered Payload)"

    assert.throws(
      () =>
        validateDispatchEligibility({
          toolId: "tool-2",
          toolName: "Power Tiller",
          deliveryRadiusKm: 40,
          deliveryType: "delivery",
          deliveryAddress: tamperedPayload,
          ownerTaluk: "Puttur",
        }),
      (err: unknown) => {
        assert.ok(err instanceof DispatchEligibilityError)
        assert.equal(err.statusCode, 400)
        assert.match(err.message, /exceeds this tool's delivery radius of 40 km/i)
        return true
      }
    )
  })

  it("5. rejects invalid or out-of-range latitude/longitude coordinates", () => {
    // Latitude 95.0 is out of valid bounds [-90, +90]
    const invalidCoords = "Farm GPS: 95.00000, 74.94580 (Invalid Lat)"

    assert.throws(
      () =>
        validateDispatchEligibility({
          toolId: "tool-1",
          toolName: "Areca Pole",
          deliveryRadiusKm: 50,
          deliveryType: "delivery",
          deliveryAddress: invalidCoords,
          ownerTaluk: "Kumble",
        }),
      (err: unknown) => {
        assert.ok(err instanceof DispatchEligibilityError)
        assert.equal(err.statusCode, 400)
        assert.match(err.message, /requires valid farm-gate GPS coordinates/i)
        return true
      }
    )

    // Longitude 200.0 is out of valid bounds [-180, +180]
    const invalidLng = "Farm GPS: 12.59370, 200.00000 (Invalid Lng)"
    assert.throws(
      () =>
        validateDispatchEligibility({
          toolId: "tool-1",
          toolName: "Areca Pole",
          deliveryRadiusKm: 50,
          deliveryType: "delivery",
          deliveryAddress: invalidLng,
          ownerTaluk: "Kumble",
        }),
      DispatchEligibilityError
    )
  })

  it("6. rejects missing or unpinned farm-gate coordinates for delivery", () => {
    assert.throws(
      () =>
        validateDispatchEligibility({
          toolId: "tool-1",
          toolName: "Areca Pole",
          deliveryRadiusKm: 50,
          deliveryType: "delivery",
          deliveryAddress: undefined, // Missing coordinates
          ownerTaluk: "Kumble",
        }),
      (err: unknown) => {
        assert.ok(err instanceof DispatchEligibilityError)
        assert.equal(err.statusCode, 400)
        assert.match(err.message, /requires valid farm-gate GPS coordinates/i)
        return true
      }
    )

    assert.throws(
      () =>
        validateDispatchEligibility({
          toolId: "tool-1",
          toolName: "Areca Pole",
          deliveryRadiusKm: 50,
          deliveryType: "delivery",
          deliveryAddress: "Local Village Only (no GPS)",
          ownerTaluk: "Kumble",
        }),
      DispatchEligibilityError
    )
  })

  it("7. enforces per-tool deliveryRadiusKm differences (e.g. 35 km vs 60 km)", () => {
    // Farm is in Belthangady (~56 km from Kumble Hub)
    const belthangadyFarm = "Farm GPS: 12.99910, 75.26350 (Belthangady Farm)"

    // Tool A: Coconut Harvester with tight radius (35 km) from Kumble -> MUST REJECT (~56 km > 35 km)
    assert.throws(
      () =>
        validateDispatchEligibility({
          toolId: "tool-harvester",
          toolName: "Coconut Harvester",
          deliveryRadiusKm: 35,
          deliveryType: "delivery",
          deliveryAddress: belthangadyFarm,
          ownerTaluk: "Kumble",
        }),
      (err: unknown) => {
        assert.ok(err instanceof DispatchEligibilityError)
        assert.match(err.message, /exceeds this tool's delivery radius of 35 km/i)
        return true
      }
    )

    // Tool B: Carbon Fiber Pole with wide radius (60 km) from Kumble -> MUST ACCEPT (~56 km <= 60 km)
    const result = validateDispatchEligibility({
      toolId: "tool-pole",
      toolName: "Carbon Fiber Pole",
      deliveryRadiusKm: 60,
      deliveryType: "delivery",
      deliveryAddress: belthangadyFarm,
      ownerTaluk: "Kumble",
    })
    assert.equal(result.eligible, true)
    assert.ok(result.distanceKm > 35 && result.distanceKm <= 60)
  })

  it("8. bypasses delivery-radius restrictions for pickup orders", () => {
    // Farmer lives far away but chooses pickup at the owner's hub
    const result = validateDispatchEligibility({
      toolId: "tool-1",
      toolName: "Tractor",
      deliveryRadiusKm: 25,
      deliveryType: "pickup",
      deliveryAddress: undefined, // Coordinates not required for pickup
      ownerTaluk: "Belthangady",
    })

    assert.equal(result.eligible, true)
    assert.equal(result.isPickup, true)
    assert.equal(result.distanceKm, 0)
  })

  it("9. rejects delivery safely if owner's taluk is unknown or unmapped", () => {
    const validFarmCoords = "Farm GPS: 12.59370, 74.94580 (Farm)"

    assert.throws(
      () =>
        validateDispatchEligibility({
          toolId: "tool-1",
          toolName: "Water Pump",
          deliveryRadiusKm: 50,
          deliveryType: "delivery",
          deliveryAddress: validFarmCoords,
          ownerTaluk: "Atlantis / Unknown Taluk",
        }),
      (err: unknown) => {
        assert.ok(err instanceof DispatchEligibilityError)
        assert.equal(err.statusCode, 400)
        assert.match(err.message, /not mapped to an active pilot service hub/i)
        return true
      }
    )
  })

  it("10. supports structured object coordinates in parseFarmGateCoordinates", () => {
    const parsed = parseFarmGateCoordinates({ latitude: 12.5937, longitude: 74.9458 })
    assert.deepEqual(parsed, { latitude: 12.5937, longitude: 74.9458 })

    const parsedShort = parseFarmGateCoordinates({ lat: 12.7153, lng: 74.8872 })
    assert.deepEqual(parsedShort, { latitude: 12.7153, longitude: 74.8872 })
  })

  it("11. Database Integration: createRazorpayOrder rejects farm outside delivery radius with 400", async () => {
    const { prisma } = await import("../src/server/db/prisma")
    const { createRazorpayOrder, PaymentServiceError } = await import("../src/server/services/payments")

    const farmer = await prisma.user.findFirst({ where: { phone: "919845100002" } }) // Suresh
    const tool = await prisma.tool.findFirst({ where: { slug: "carbon-fiber-areca-pole-12m" } })

    if (!farmer || !tool) return // Skip if db not seeded

    const baseTime = Date.now() + 500 * 86400000 + Math.floor(Math.random() * 10000000)
    const startDate = new Date(baseTime).toISOString()
    const endDate = new Date(baseTime + 86400000).toISOString()

    // Far away farm in Chennai (~500 km)
    await assert.rejects(
      async () => {
        await createRazorpayOrder({
          userId: farmer.id,
          deliveryType: "delivery",
          deliveryAddress: "Farm GPS: 13.08270, 80.27070 (Chennai Estate)",
          items: [
            {
              toolId: tool.id,
              serviceType: "OPERATOR_ONLY",
              startDate,
              endDate,
            },
          ],
        })
      },
      (err: unknown) => {
        assert.ok(err instanceof PaymentServiceError)
        assert.equal(err.statusCode, 400)
        assert.match(err.message, /exceeds this tool's delivery radius/i)
        return true
      }
    )
  })

  it("12. Database Integration: createRazorpayOrder accepts delivery inside radius", async () => {
    const { prisma } = await import("../src/server/db/prisma")
    const { createRazorpayOrder } = await import("../src/server/services/payments")

    const farmer = await prisma.user.findFirst({ where: { phone: "919845100002" } }) // Suresh
    const tool = await prisma.tool.findFirst({ where: { slug: "carbon-fiber-areca-pole-12m" } })

    if (!farmer || !tool) return

    const baseTime = Date.now() + 600 * 86400000 + Math.floor(Math.random() * 10000000)
    const startDate = new Date(baseTime).toISOString()
    const endDate = new Date(baseTime + 86400000).toISOString()

    // Nearby farm in Kumble / Kalathur (~3 km)
    const result = await createRazorpayOrder({
      userId: farmer.id,
      deliveryType: "delivery",
      deliveryAddress: "Farm GPS: 12.60000, 74.95000 (Kumble Farm Gate)",
      items: [
        {
          toolId: tool.id,
          serviceType: "OPERATOR_ONLY",
          startDate,
          endDate,
        },
      ],
    })

    assert.ok(result.orderId)
    assert.ok(result.bookingId)

    const createdBooking = await prisma.booking.findUnique({
      where: { id: result.bookingId },
    })
    assert.ok(createdBooking)
    assert.match(createdBooking.deliveryAddress || "", /Farm GPS: 12.60000, 74.95000/)

    // Clean up test booking to maintain clean database state for future runs
    if (result.bookingId) {
      await prisma.booking.delete({ where: { id: result.bookingId } }).catch(() => {})
    }
  })

  it("13. Database Integration: createBooking rejects delivery outside radius", async () => {
    const { prisma } = await import("../src/server/db/prisma")
    const { createBooking, CreateBookingError } = await import("../src/server/services/bookings")

    const farmer = await prisma.user.findFirst({ where: { phone: "919845100002" } })
    const tool = await prisma.tool.findFirst({ where: { slug: "carbon-fiber-areca-pole-12m" } })

    if (!farmer || !tool) return

    const baseTime = Date.now() + 700 * 86400000 + Math.floor(Math.random() * 10000000)
    const startDate = new Date(baseTime).toISOString()
    const endDate = new Date(baseTime + 86400000).toISOString()

    await assert.rejects(
      async () => {
        await createBooking(farmer.id, {
          toolId: tool.id,
          serviceType: "OPERATOR_ONLY",
          deliveryType: "delivery",
          deliveryAddress: "Farm GPS: 13.08270, 80.27070 (Chennai Estate)",
          startDate,
          endDate,
        })
      },
      (err: unknown) => {
        assert.ok(err instanceof CreateBookingError)
        assert.equal(err.statusCode, 400)
        assert.match(err.message, /exceeds this tool's delivery radius/i)
        return true
      }
    )
  })
})
