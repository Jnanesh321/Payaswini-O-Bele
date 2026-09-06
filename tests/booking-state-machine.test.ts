import { describe, it } from "node:test"
import assert from "node:assert/strict"
import { BookingEventActor, BookingServiceType, BookingStatus } from "@prisma/client"
import {
  assertTransition,
  InvalidBookingTransitionError,
  getActorPermittedTargets,
  deriveModeFromServiceType,
  computeCancellationPolicy,
  isTerminalCancellation,
  OPERATOR_CANCELLATION_FEE_PAISE,
  BOOKING_MODES,
} from "../src/server/lib/booking-state-machine"

describe("Booking State Machine — Transitions & Rules", () => {
  it("derives correct mode from service type", () => {
    assert.equal(
      deriveModeFromServiceType(BookingServiceType.SELF_SERVICE_RENTAL),
      BOOKING_MODES.selfOperate,
    )
    assert.equal(
      deriveModeFromServiceType(BookingServiceType.OPERATOR_ONLY),
      BOOKING_MODES.withOperator,
    )
    assert.equal(
      deriveModeFromServiceType(BookingServiceType.FULL_LOGISTICS),
      BOOKING_MODES.withOperator,
    )
  })

  it("permits valid linear transitions in withOperator mode", () => {
    const opts = { mode: BOOKING_MODES.withOperator }
    assert.doesNotThrow(() => assertTransition(BookingStatus.REQUESTED, BookingStatus.OWNER_PENDING, opts))
    assert.doesNotThrow(() => assertTransition(BookingStatus.OWNER_PENDING, BookingStatus.OWNER_ACCEPTED, opts))
    assert.doesNotThrow(() => assertTransition(BookingStatus.OWNER_ACCEPTED, BookingStatus.OPERATOR_PENDING, opts))
    assert.doesNotThrow(() => assertTransition(BookingStatus.OPERATOR_PENDING, BookingStatus.OPERATOR_ASSIGNED, opts))
    assert.doesNotThrow(() => assertTransition(BookingStatus.OPERATOR_ASSIGNED, BookingStatus.OPERATOR_ACCEPTED, opts))
    assert.doesNotThrow(() => assertTransition(BookingStatus.OPERATOR_ACCEPTED, BookingStatus.FETCHING_TOOL, opts))
    assert.doesNotThrow(() => assertTransition(BookingStatus.FETCHING_TOOL, BookingStatus.TOOL_COLLECTED, opts))
    assert.doesNotThrow(() => assertTransition(BookingStatus.TOOL_COLLECTED, BookingStatus.TRAVELLING_TO_FARM, opts))
    assert.doesNotThrow(() => assertTransition(BookingStatus.TRAVELLING_TO_FARM, BookingStatus.ARRIVED, opts))
    assert.doesNotThrow(() => assertTransition(BookingStatus.ARRIVED, BookingStatus.WORK_STARTED, opts))
    assert.doesNotThrow(() => assertTransition(BookingStatus.WORK_STARTED, BookingStatus.WORK_COMPLETED, opts))
    assert.doesNotThrow(() => assertTransition(BookingStatus.WORK_COMPLETED, BookingStatus.RETURNING_TOOL, opts))
    assert.doesNotThrow(() => assertTransition(BookingStatus.RETURNING_TOOL, BookingStatus.TOOL_RETURNED, opts))
    assert.doesNotThrow(() => assertTransition(BookingStatus.TOOL_RETURNED, BookingStatus.INSPECTION, opts))
    assert.doesNotThrow(() => assertTransition(BookingStatus.INSPECTION, BookingStatus.COMPLETED, opts))
  })

  it("permits valid transitions in selfOperate mode", () => {
    const opts = { mode: BOOKING_MODES.selfOperate }
    assert.doesNotThrow(() => assertTransition(BookingStatus.REQUESTED, BookingStatus.OWNER_PENDING, opts))
    assert.doesNotThrow(() => assertTransition(BookingStatus.OWNER_PENDING, BookingStatus.OWNER_ACCEPTED, opts))
    assert.doesNotThrow(() => assertTransition(BookingStatus.OWNER_ACCEPTED, BookingStatus.TOOL_COLLECTED, opts))
    assert.doesNotThrow(() => assertTransition(BookingStatus.TOOL_COLLECTED, BookingStatus.TRAVELLING_TO_FARM, opts))
    assert.doesNotThrow(() => assertTransition(BookingStatus.TRAVELLING_TO_FARM, BookingStatus.ARRIVED, opts))
    assert.doesNotThrow(() => assertTransition(BookingStatus.ARRIVED, BookingStatus.WORK_STARTED, opts))
    assert.doesNotThrow(() => assertTransition(BookingStatus.WORK_STARTED, BookingStatus.WORK_COMPLETED, opts))
    assert.doesNotThrow(() => assertTransition(BookingStatus.WORK_COMPLETED, BookingStatus.RETURNING_TOOL, opts))
    assert.doesNotThrow(() => assertTransition(BookingStatus.RETURNING_TOOL, BookingStatus.TOOL_RETURNED, opts))
    assert.doesNotThrow(() => assertTransition(BookingStatus.TOOL_RETURNED, BookingStatus.INSPECTION, opts))
    assert.doesNotThrow(() => assertTransition(BookingStatus.INSPECTION, BookingStatus.COMPLETED, opts))
  })

  it("blocks invalid transitions and throws InvalidBookingTransitionError", () => {
    const opts = { mode: BOOKING_MODES.withOperator }
    assert.throws(
      () => assertTransition(BookingStatus.REQUESTED, BookingStatus.COMPLETED, opts),
      InvalidBookingTransitionError,
    )
    assert.throws(
      () => assertTransition(BookingStatus.COMPLETED, BookingStatus.REQUESTED, opts),
      InvalidBookingTransitionError,
    )
    assert.throws(
      () => assertTransition(BookingStatus.CANCELLED_BY_FARMER, BookingStatus.OWNER_ACCEPTED, opts),
      InvalidBookingTransitionError,
    )
  })

  it("enforces actor restrictions correctly", () => {
    const opts = { mode: BOOKING_MODES.withOperator }

    // Farmer can cancel REQUESTED
    const farmerTargets = getActorPermittedTargets(BookingStatus.REQUESTED, BookingEventActor.FARMER, opts)
    assert.ok(farmerTargets.includes(BookingStatus.CANCELLED_BY_FARMER))
    assert.ok(!farmerTargets.includes(BookingStatus.OWNER_ACCEPTED))

    // Tool owner can accept OWNER_PENDING
    const ownerTargets = getActorPermittedTargets(BookingStatus.OWNER_PENDING, BookingEventActor.TOOL_OWNER, opts)
    assert.ok(ownerTargets.includes(BookingStatus.OWNER_ACCEPTED))
    assert.ok(ownerTargets.includes(BookingStatus.CANCELLED_BY_OWNER))
    assert.ok(!ownerTargets.includes(BookingStatus.WORK_COMPLETED))

    // Operator can accept OPERATOR_ASSIGNED
    const opTargets = getActorPermittedTargets(BookingStatus.OPERATOR_ASSIGNED, BookingEventActor.OPERATOR, opts)
    assert.ok(opTargets.includes(BookingStatus.OPERATOR_ACCEPTED))
    assert.ok(opTargets.includes(BookingStatus.CANCELLED_BY_OPERATOR))
  })

  it("calculates cancellation refund policies correctly", () => {
    const totalAmount = 100000 // ₹1000 in paise

    // Free cancellation before operator assigned
    const freePolicy = computeCancellationPolicy(
      BookingStatus.OWNER_ACCEPTED,
      BookingStatus.CANCELLED_BY_FARMER,
      totalAmount,
    )
    assert.equal(freePolicy.reason, "FREE")
    assert.equal(freePolicy.refundAmount, totalAmount)
    assert.equal(freePolicy.operatorFee, 0)

    // Operator compensation cancellation
    const compPolicy = computeCancellationPolicy(
      BookingStatus.OPERATOR_ASSIGNED,
      BookingStatus.CANCELLED_BY_FARMER,
      totalAmount,
    )
    assert.equal(compPolicy.reason, "OPERATOR_COMPENSATION")
    assert.equal(compPolicy.operatorFee, OPERATOR_CANCELLATION_FEE_PAISE)
    assert.equal(compPolicy.refundAmount, totalAmount - OPERATOR_CANCELLATION_FEE_PAISE)

    // No refund after tool collected
    const noRefundPolicy = computeCancellationPolicy(
      BookingStatus.TOOL_COLLECTED,
      BookingStatus.CANCELLED_BY_FARMER,
      totalAmount,
    )
    assert.equal(noRefundPolicy.reason, "NO_REFUND")
    assert.equal(noRefundPolicy.refundAmount, 0)
    assert.equal(noRefundPolicy.operatorFee, 0)

    // FAILED_NO_OPERATOR is always 100% refund
    const failedPolicy = computeCancellationPolicy(
      BookingStatus.OPERATOR_PENDING,
      BookingStatus.FAILED_NO_OPERATOR,
      totalAmount,
    )
    assert.equal(failedPolicy.reason, "FREE")
    assert.equal(failedPolicy.refundAmount, totalAmount)
  })

  it("identifies terminal cancellation states", () => {
    assert.equal(isTerminalCancellation(BookingStatus.CANCELLED_BY_FARMER), true)
    assert.equal(isTerminalCancellation(BookingStatus.CANCELLED_BY_OWNER), true)
    assert.equal(isTerminalCancellation(BookingStatus.CANCELLED_BY_OPERATOR), true)
    assert.equal(isTerminalCancellation(BookingStatus.CANCELLED_BY_PLATFORM), true)
    assert.equal(isTerminalCancellation(BookingStatus.FAILED_NO_OPERATOR), true)
    assert.equal(isTerminalCancellation(BookingStatus.OWNER_ACCEPTED), false)
    assert.equal(isTerminalCancellation(BookingStatus.COMPLETED), false)
  })
})
