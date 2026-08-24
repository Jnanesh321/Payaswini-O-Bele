/**
 * Server-authoritative booking pricing (C2 fix).
 *
 * Trust boundary: the checkout client is treated as a booking REQUEST only.
 * Every monetary field a client may send (pricePerDay, totalAmount, deposit,
 * operatorFeePerDay, totalOperatorFee, deliveryCharge) is IGNORED. All amounts
 * are recomputed here from the authoritative `Tool` row loaded via Prisma.
 *
 * Current pricing model (unchanged — MVP, no redesign):
 *   days        = ceil((end − start) / 86400000), min 1
 *   toolFee     = Tool.pricePerDay * days
 *   operatorFee = Tool.operatorFeePerDay * days   (OPERATOR_ONLY only)
 *   deposit     = Tool.deposit
 *   platformFee = 0   (pricing engine / GST not implemented yet)
 *   totalAmount = toolFee + operatorFee + deposit + deliveryFee + platformFee
 *
 * Delivery — the "current intended rule", now authoritative server-side:
 *   flat ₹50 (5000 paise) when the order is a delivery, ₹0 for pickup.
 *   It is charged ONCE per order and attributed to the first booking of the
 *   order so that Σ(booking.totalAmount) === order.totalAmount === the Razorpay
 *   order amount. Tool.deliveryChargePerKm / deliveryRadiusKm exist in the
 *   schema but there is no distance data or delivery-pricing system yet, so
 *   they are deliberately NOT used (documented in changelog).
 */

export type RequestedServiceType = "SELF_SERVICE_RENTAL" | "OPERATOR_ONLY"

export const REQUESTED_SERVICE_TYPES: readonly RequestedServiceType[] = [
  "SELF_SERVICE_RENTAL",
  "OPERATOR_ONLY",
]

/** Flat delivery fee (₹50) in paise — see header comment. */
export const DELIVERY_FEE_PAISE = 50 * 100

/** Platform fee is not implemented yet (pricing engine / GST pending). */
export const PLATFORM_FEE_PAISE = 0

export const MS_PER_DAY = 86_400_000

export class BookingPricingError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "BookingPricingError"
  }
}

export function isRequestedServiceType(value: unknown): value is RequestedServiceType {
  return (
    typeof value === "string" &&
    (REQUESTED_SERVICE_TYPES as readonly string[]).includes(value)
  )
}

// The subset of `Tool` fields the pricing engine reads. Kept narrow so the
// computation is pure and unit-testable without a database connection.
export interface ToolPricingSource {
  pricePerDay: number
  deposit: number
  operatorFeePerDay: number
  minRentalDays: number
  maxRentalDays: number
}

export interface BookingPricingInput {
  tool: ToolPricingSource
  serviceType: RequestedServiceType
  startDate: Date
  endDate: Date
  /** Per-order delivery fee — 0 for pickup and for non-first bookings. */
  deliveryFee: number
}

export interface ComputedBookingPricing {
  days: number
  toolFeePerDay: number
  totalToolFee: number
  operatorFeePerDay: number
  totalOperatorFee: number
  deposit: number
  deliveryFee: number
  platformFee: number
  subtotal: number
  totalAmount: number
}

/** Validate dates and compute the rental duration in whole days (min 1). */
export function computeRentalDays(startDate: Date, endDate: Date): number {
  const start = startDate.getTime()
  const end = endDate.getTime()
  if (!Number.isFinite(start) || !Number.isFinite(end)) {
    throw new BookingPricingError("Invalid start/end date")
  }
  if (end < start) {
    throw new BookingPricingError("End date must be on or after the start date")
  }
  return Math.max(1, Math.ceil((end - start) / MS_PER_DAY))
}

/**
 * The delivery charge for an order. Only the client's *intent* (a delivery or
 * not) is used — the fee itself is a server constant, never a client value.
 * Unknown/missing input defaults to pickup (₹0).
 */
export function resolveDeliveryCharge(deliveryType: unknown): number {
  return deliveryType === "delivery" ? DELIVERY_FEE_PAISE : 0
}

/**
 * Recompute every financial figure for one booking from the authoritative tool
 * pricing. `serviceType` must already be validated by the caller.
 */
export function computeBookingPricing(input: BookingPricingInput): ComputedBookingPricing {
  const { tool, serviceType, startDate, endDate, deliveryFee } = input

  const days = computeRentalDays(startDate, endDate)
  if (days < tool.minRentalDays) {
    throw new BookingPricingError(
      `Rental of ${days} day(s) is below this tool's minimum of ${tool.minRentalDays} day(s)`,
    )
  }
  if (days > tool.maxRentalDays) {
    throw new BookingPricingError(
      `Rental of ${days} day(s) exceeds this tool's maximum of ${tool.maxRentalDays} day(s)`,
    )
  }

  const toolFeePerDay = tool.pricePerDay
  const operatorFeePerDay = serviceType === "OPERATOR_ONLY" ? tool.operatorFeePerDay : 0
  const totalToolFee = toolFeePerDay * days
  const totalOperatorFee = operatorFeePerDay * days
  const deposit = tool.deposit
  const platformFee = PLATFORM_FEE_PAISE
  const subtotal = totalToolFee + totalOperatorFee
  const totalAmount = subtotal + deposit + deliveryFee + platformFee

  return {
    days,
    toolFeePerDay,
    totalToolFee,
    operatorFeePerDay,
    totalOperatorFee,
    deposit,
    deliveryFee,
    platformFee,
    subtotal,
    totalAmount,
  }
}
