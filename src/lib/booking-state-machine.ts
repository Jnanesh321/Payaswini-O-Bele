import { BookingEventActor, BookingServiceType, BookingStatus } from "@prisma/client"

export const BOOKING_MODES = {
  withOperator: "WITH_OPERATOR",
  selfOperate: "SELF_OPERATE",
} as const

export type BookingMode = (typeof BOOKING_MODES)[keyof typeof BOOKING_MODES]

// ─── Mode derivation (single source of truth: serviceType) ──────────────────

/** serviceType values that describe a booking with NO platform operator dispatch. */
const SELF_OPERATE_SERVICE_TYPES: ReadonlySet<BookingServiceType> = new Set([
  BookingServiceType.SELF_SERVICE_RENTAL,
  BookingServiceType.SELF_SERVICE_OWN_TOOL,
  BookingServiceType.OWNER_OPERATED,
])

/**
 * Derive the state-machine booking mode from the booking's serviceType.
 * Deliberately NOT a persisted field — serviceType already encodes whether a
 * platform operator is dispatched (OPERATOR_ONLY / FULL_LOGISTICS) or not
 * (SELF_SERVICE_* / OWNER_OPERATED). Do not add a parallel `mode` column.
 */
export function deriveModeFromServiceType(serviceType: BookingServiceType): BookingMode {
  return SELF_OPERATE_SERVICE_TYPES.has(serviceType)
    ? BOOKING_MODES.selfOperate
    : BOOKING_MODES.withOperator
}

// ─── Cancellation & refund policy (MVP rules, confirmed 2026-08-11) ───────────
//
// Same rule for every cancelling actor (farmer/owner/operator/platform):
//   1. Free cancellation (100% refund) until the booking reaches OPERATOR_ASSIGNED
//   2. After OPERATOR_ASSIGNED but before TOOL_COLLECTED: flat ₹50 cancellation
//      fee, paid to the operator as travel/time compensation (NOT the platform)
//   3. After TOOL_COLLECTED (tool has physically moved / work underway):
//      no refund — tool and operator time are already committed
// FAILED_NO_OPERATOR is always a full refund (no operator was ever available).
// All amounts are in paise.

/** Flat ₹50 operator compensation fee (in paise). */
export const OPERATOR_CANCELLATION_FEE_PAISE = 50 * 100

/** Number of operator rejections before the booking auto-fails. */
export const OPERATOR_REJECTION_LIMIT = 3

export type CancellationReason = "FREE" | "OPERATOR_COMPENSATION" | "NO_REFUND"

export interface CancellationPolicy {
  reason: CancellationReason
  /** Amount refunded to the farmer (paise). */
  refundAmount: number
  /** Amount withheld for the operator (paise) — travel/time compensation. */
  operatorFee: number
}

const FREE_CANCELLATION_STATES: ReadonlySet<BookingStatus> = new Set([
  BookingStatus.REQUESTED,
  BookingStatus.OWNER_PENDING,
  BookingStatus.OWNER_ACCEPTED,
  BookingStatus.OPERATOR_PENDING,
])

const OPERATOR_FEE_CANCELLATION_STATES: ReadonlySet<BookingStatus> = new Set([
  BookingStatus.OPERATOR_ASSIGNED,
  BookingStatus.OPERATOR_ACCEPTED,
  BookingStatus.FETCHING_TOOL,
])

/**
 * Compute the refund policy for a cancellation/`FAILED_NO_OPERATOR` transition.
 * `from` is the booking status BEFORE the terminal transition (the state the
 * cancellation is being made from). `to` is the target terminal state.
 */
export function computeCancellationPolicy(
  from: BookingStatus,
  to: BookingStatus,
  totalAmount: number,
): CancellationPolicy {
  // No operator was ever available — refund in full regardless of current state.
  if (to === BookingStatus.FAILED_NO_OPERATOR) {
    return { reason: "FREE", refundAmount: totalAmount, operatorFee: 0 }
  }

  if (FREE_CANCELLATION_STATES.has(from)) {
    return { reason: "FREE", refundAmount: totalAmount, operatorFee: 0 }
  }

  if (OPERATOR_FEE_CANCELLATION_STATES.has(from)) {
    const refundAmount = Math.max(0, totalAmount - OPERATOR_CANCELLATION_FEE_PAISE)
    return {
      reason: "OPERATOR_COMPENSATION",
      refundAmount,
      operatorFee: OPERATOR_CANCELLATION_FEE_PAISE,
    }
  }

  // TOOL_COLLECTED onward: tool has moved / work is committed.
  return { reason: "NO_REFUND", refundAmount: 0, operatorFee: 0 }
}

/** True if the target state is a terminal cancellation or failure state. */
export function isTerminalCancellation(state: BookingStatus): boolean {
  return (
    state === BookingStatus.CANCELLED_BY_FARMER ||
    state === BookingStatus.CANCELLED_BY_OWNER ||
    state === BookingStatus.CANCELLED_BY_OPERATOR ||
    state === BookingStatus.CANCELLED_BY_PLATFORM ||
    state === BookingStatus.FAILED_NO_OPERATOR
  )
}

/** Count how many times this booking has already bounced back from assignment. */
export function countOperatorRejections(logs: { fromState: BookingStatus; toState: BookingStatus }[]): number {
  return logs.filter(
    (l) => l.fromState === BookingStatus.OPERATOR_ASSIGNED && l.toState === BookingStatus.OPERATOR_PENDING,
  ).length
}

export interface TransitionOptions {
  actor?: BookingEventActor
  mode?: BookingMode
}

interface TransitionRule {
  from: BookingStatus
  to: BookingStatus
  actors: readonly BookingEventActor[]
  mode?: BookingMode
}

function tr(
  from: BookingStatus,
  to: BookingStatus,
  actors: readonly BookingEventActor[],
  mode?: BookingMode,
): TransitionRule {
  return { from, to, actors, ...(mode ? { mode } : {}) }
}

const TRANSITION_RULES: readonly TransitionRule[] = [
  tr(BookingStatus.REQUESTED, BookingStatus.OWNER_PENDING, [BookingEventActor.SYSTEM]),
  tr(BookingStatus.REQUESTED, BookingStatus.CANCELLED_BY_FARMER, [BookingEventActor.FARMER]),
  tr(BookingStatus.REQUESTED, BookingStatus.CANCELLED_BY_PLATFORM, [BookingEventActor.ADMIN]),

  tr(BookingStatus.OWNER_PENDING, BookingStatus.OWNER_ACCEPTED, [BookingEventActor.TOOL_OWNER]),
  tr(BookingStatus.OWNER_PENDING, BookingStatus.CANCELLED_BY_OWNER, [BookingEventActor.TOOL_OWNER]),
  tr(BookingStatus.OWNER_PENDING, BookingStatus.CANCELLED_BY_FARMER, [BookingEventActor.FARMER]),
  tr(BookingStatus.OWNER_PENDING, BookingStatus.CANCELLED_BY_PLATFORM, [BookingEventActor.ADMIN]),

  tr(BookingStatus.OWNER_ACCEPTED, BookingStatus.OPERATOR_PENDING, [BookingEventActor.SYSTEM]),
  tr(BookingStatus.OWNER_ACCEPTED, BookingStatus.TOOL_COLLECTED, [BookingEventActor.TOOL_OWNER, BookingEventActor.FARMER, BookingEventActor.SYSTEM], BOOKING_MODES.selfOperate),
  tr(BookingStatus.OWNER_ACCEPTED, BookingStatus.CANCELLED_BY_FARMER, [BookingEventActor.FARMER]),
  tr(BookingStatus.OWNER_ACCEPTED, BookingStatus.CANCELLED_BY_PLATFORM, [BookingEventActor.ADMIN]),

  tr(BookingStatus.OPERATOR_PENDING, BookingStatus.OPERATOR_ASSIGNED, [BookingEventActor.ADMIN, BookingEventActor.SYSTEM]),
  tr(BookingStatus.OPERATOR_PENDING, BookingStatus.FAILED_NO_OPERATOR, [BookingEventActor.ADMIN, BookingEventActor.SYSTEM]),
  tr(BookingStatus.OPERATOR_PENDING, BookingStatus.CANCELLED_BY_FARMER, [BookingEventActor.FARMER]),
  tr(BookingStatus.OPERATOR_PENDING, BookingStatus.CANCELLED_BY_PLATFORM, [BookingEventActor.ADMIN]),

  tr(BookingStatus.OPERATOR_ASSIGNED, BookingStatus.OPERATOR_ACCEPTED, [BookingEventActor.OPERATOR]),
  tr(BookingStatus.OPERATOR_ASSIGNED, BookingStatus.OPERATOR_PENDING, [BookingEventActor.OPERATOR, BookingEventActor.ADMIN, BookingEventActor.SYSTEM]),
  tr(BookingStatus.OPERATOR_ASSIGNED, BookingStatus.CANCELLED_BY_OPERATOR, [BookingEventActor.OPERATOR]),
  tr(BookingStatus.OPERATOR_ASSIGNED, BookingStatus.FAILED_NO_OPERATOR, [BookingEventActor.ADMIN, BookingEventActor.SYSTEM]),
  tr(BookingStatus.OPERATOR_ASSIGNED, BookingStatus.CANCELLED_BY_PLATFORM, [BookingEventActor.ADMIN]),

  tr(BookingStatus.OPERATOR_ACCEPTED, BookingStatus.FETCHING_TOOL, [BookingEventActor.OPERATOR]),
  tr(BookingStatus.OPERATOR_ACCEPTED, BookingStatus.CANCELLED_BY_OPERATOR, [BookingEventActor.OPERATOR]),
  tr(BookingStatus.OPERATOR_ACCEPTED, BookingStatus.CANCELLED_BY_FARMER, [BookingEventActor.FARMER]),
  tr(BookingStatus.OPERATOR_ACCEPTED, BookingStatus.CANCELLED_BY_PLATFORM, [BookingEventActor.ADMIN]),

  tr(BookingStatus.FETCHING_TOOL, BookingStatus.TOOL_COLLECTED, [BookingEventActor.OPERATOR, BookingEventActor.TOOL_OWNER, BookingEventActor.SYSTEM]),
  tr(BookingStatus.FETCHING_TOOL, BookingStatus.CANCELLED_BY_OPERATOR, [BookingEventActor.OPERATOR]),
  tr(BookingStatus.FETCHING_TOOL, BookingStatus.CANCELLED_BY_PLATFORM, [BookingEventActor.ADMIN]),

  tr(BookingStatus.TOOL_COLLECTED, BookingStatus.TRAVELLING_TO_FARM, [BookingEventActor.OPERATOR]),
  tr(BookingStatus.TOOL_COLLECTED, BookingStatus.CANCELLED_BY_PLATFORM, [BookingEventActor.ADMIN]),

  tr(BookingStatus.TRAVELLING_TO_FARM, BookingStatus.ARRIVED, [BookingEventActor.OPERATOR]),
  tr(BookingStatus.TRAVELLING_TO_FARM, BookingStatus.CANCELLED_BY_PLATFORM, [BookingEventActor.ADMIN]),

  tr(BookingStatus.ARRIVED, BookingStatus.WORK_STARTED, [BookingEventActor.OPERATOR]),
  tr(BookingStatus.ARRIVED, BookingStatus.CANCELLED_BY_PLATFORM, [BookingEventActor.ADMIN]),

  tr(BookingStatus.WORK_STARTED, BookingStatus.WORK_PAUSED, [BookingEventActor.OPERATOR]),
  tr(BookingStatus.WORK_STARTED, BookingStatus.WORK_COMPLETED, [BookingEventActor.OPERATOR]),
  tr(BookingStatus.WORK_STARTED, BookingStatus.CANCELLED_BY_PLATFORM, [BookingEventActor.ADMIN]),

  tr(BookingStatus.WORK_PAUSED, BookingStatus.WORK_RESUMED, [BookingEventActor.OPERATOR]),
  tr(BookingStatus.WORK_PAUSED, BookingStatus.CANCELLED_BY_PLATFORM, [BookingEventActor.ADMIN]),

  tr(BookingStatus.WORK_RESUMED, BookingStatus.WORK_PAUSED, [BookingEventActor.OPERATOR]),
  tr(BookingStatus.WORK_RESUMED, BookingStatus.WORK_COMPLETED, [BookingEventActor.OPERATOR]),
  tr(BookingStatus.WORK_RESUMED, BookingStatus.CANCELLED_BY_PLATFORM, [BookingEventActor.ADMIN]),

  tr(BookingStatus.WORK_COMPLETED, BookingStatus.RETURNING_TOOL, [BookingEventActor.OPERATOR, BookingEventActor.SYSTEM]),
  tr(BookingStatus.WORK_COMPLETED, BookingStatus.DISPUTED, [BookingEventActor.FARMER, BookingEventActor.TOOL_OWNER, BookingEventActor.ADMIN]),
  tr(BookingStatus.WORK_COMPLETED, BookingStatus.CANCELLED_BY_PLATFORM, [BookingEventActor.ADMIN]),

  tr(BookingStatus.RETURNING_TOOL, BookingStatus.TOOL_RETURNED, [BookingEventActor.OPERATOR, BookingEventActor.TOOL_OWNER, BookingEventActor.SYSTEM]),
  tr(BookingStatus.RETURNING_TOOL, BookingStatus.DISPUTED, [BookingEventActor.TOOL_OWNER, BookingEventActor.ADMIN]),
  tr(BookingStatus.RETURNING_TOOL, BookingStatus.CANCELLED_BY_PLATFORM, [BookingEventActor.ADMIN]),

  tr(BookingStatus.TOOL_RETURNED, BookingStatus.INSPECTION, [BookingEventActor.SYSTEM, BookingEventActor.TOOL_OWNER]),
  tr(BookingStatus.TOOL_RETURNED, BookingStatus.DISPUTED, [BookingEventActor.TOOL_OWNER, BookingEventActor.ADMIN]),

  tr(BookingStatus.INSPECTION, BookingStatus.COMPLETED, [BookingEventActor.SYSTEM]),
  tr(BookingStatus.INSPECTION, BookingStatus.DISPUTED, [BookingEventActor.SYSTEM, BookingEventActor.TOOL_OWNER, BookingEventActor.ADMIN]),

  tr(BookingStatus.DISPUTED, BookingStatus.COMPLETED, [BookingEventActor.ADMIN]),
  tr(BookingStatus.DISPUTED, BookingStatus.CANCELLED_BY_PLATFORM, [BookingEventActor.ADMIN]),
]

export const TERMINAL_BOOKING_STATES: ReadonlySet<BookingStatus> = new Set([
  BookingStatus.COMPLETED,
  BookingStatus.CANCELLED_BY_FARMER,
  BookingStatus.CANCELLED_BY_OWNER,
  BookingStatus.CANCELLED_BY_OPERATOR,
  BookingStatus.CANCELLED_BY_PLATFORM,
  BookingStatus.FAILED_NO_OPERATOR,
])

export function isTerminalState(state: BookingStatus): boolean {
  return TERMINAL_BOOKING_STATES.has(state)
}

function findRule(
  from: BookingStatus,
  to: BookingStatus,
  mode?: BookingMode,
): TransitionRule | undefined {
  return TRANSITION_RULES.find(
    (rule) => rule.from === from && rule.to === to && (rule.mode === undefined || rule.mode === mode),
  )
}

export function getPermittedTargets(
  from: BookingStatus,
  options: Omit<TransitionOptions, "actor"> = {},
): BookingStatus[] {
  return TRANSITION_RULES.filter(
    (rule) => rule.from === from && (rule.mode === undefined || rule.mode === options.mode),
  ).map((rule) => rule.to)
}

export function canTransition(
  from: BookingStatus,
  to: BookingStatus,
  options: TransitionOptions = {},
): boolean {
  const rule = findRule(from, to, options.mode)
  if (!rule) return false
  if (options.actor === undefined) return true
  return rule.actors.includes(options.actor)
}

export class InvalidBookingTransitionError extends Error {
  public readonly from: BookingStatus
  public readonly to: BookingStatus
  public readonly actor: BookingEventActor | undefined

  constructor(from: BookingStatus, to: BookingStatus, actor?: BookingEventActor) {
    const message = [
      `Invalid booking state transition: ${from} -> ${to}`,
      actor ? ` (requested by ${actor})` : "",
      `Sequence is not allowed by the §9 state machine.`,
    ].join("")
    super(message)
    this.name = "InvalidBookingTransitionError"
    this.from = from
    this.to = to
    this.actor = actor
  }
}

export function assertTransition(
  from: BookingStatus,
  to: BookingStatus,
  options: TransitionOptions = {},
): void {
  if (!canTransition(from, to, options)) {
    throw new InvalidBookingTransitionError(from, to, options.actor)
  }
}