import { BookingEventActor } from "@prisma/client"

/**
 * Map the requesting user to the actor role they may legitimately hold on a
 * booking. Shared by the transition route and the deposit-resolution route so
 * actor gating stays in one place.
 */
export function resolveActorForUser(
  booking: { farmerId: string; toolOwnerId: string; servicePerformerId: string; serviceType: string },
  userId: string,
): BookingEventActor | null {
  if (booking.farmerId === userId) return BookingEventActor.FARMER
  if (booking.toolOwnerId === userId) return BookingEventActor.TOOL_OWNER
  if (
    booking.servicePerformerId === userId &&
    booking.serviceType !== "SELF_SERVICE_RENTAL" &&
    booking.serviceType !== "SELF_SERVICE_OWN_TOOL"
  ) {
    return BookingEventActor.OPERATOR
  }
  return null
}

export function isBookingActor(value: unknown): value is BookingEventActor {
  return Object.values(BookingEventActor).includes(value as BookingEventActor)
}
