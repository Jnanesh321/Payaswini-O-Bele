import { CapabilityType, BookingEventActor, VerificationStatus } from "@prisma/client"
import { getServerSession } from "@/server/lib/auth"
import { prisma } from "@/server/db/prisma"

export class AuthGuardError extends Error {
  readonly statusCode: number
  constructor(message: string, statusCode: number = 401) {
    super(message)
    this.name = "AuthGuardError"
    this.statusCode = statusCode
  }
}

export interface AuthenticatedUser {
  id: string
  name?: string | null
  email?: string | null
  image?: string | null
  isAdmin?: boolean
  capabilities?: CapabilityType[]
}

/**
 * Ensures the request is authenticated with a valid session.
 */
export async function requireAuth(): Promise<AuthenticatedUser> {
  let session
  try {
    session = await getServerSession()
  } catch {
    throw new AuthGuardError("Unauthorized — please sign in", 401)
  }
  if (!session?.user?.id) {
    throw new AuthGuardError("Unauthorized — please sign in", 401)
  }
  return session.user as AuthenticatedUser
}

/**
 * Ensures the requesting user has administrator privileges.
 */
export async function requireAdmin(): Promise<AuthenticatedUser> {
  const user = await requireAuth()
  if (!user.isAdmin) {
    throw new AuthGuardError("Forbidden — admin privileges required", 403)
  }
  return user
}

/**
 * Ensures the requesting user possesses an active capability or is an admin.
 */
export async function requireCapability(type: CapabilityType): Promise<AuthenticatedUser> {
  const user = await requireAuth()
  if (user.isAdmin) {
    return user
  }

  // Check capability in database for real-time validity
  const userCap = await prisma.userCapability.findUnique({
    where: {
      userId_type: {
        userId: user.id,
        type,
      },
    },
  })

  if (!userCap) {
    throw new AuthGuardError(`Forbidden — ${type} capability required`, 403)
  }

  if (userCap.status === VerificationStatus.REVOKED || userCap.status === VerificationStatus.SUSPENDED) {
    throw new AuthGuardError(`Forbidden — your ${type.toLowerCase()} capability is currently ${userCap.status.toLowerCase()}`, 403)
  }

  if (userCap.status !== VerificationStatus.VERIFIED && type !== CapabilityType.FARMER) {
    throw new AuthGuardError(`Forbidden — ${type.toLowerCase()} capability is not verified`, 403)
  }

  return user
}

/**
 * Validates that the requesting user is a legitimate party to the booking
 * (Farmer, Tool Owner, assigned Operator, or Admin).
 */
export async function requireBookingAccess(
  bookingId: string,
  userId: string,
  isAdmin?: boolean,
) {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      tool: true,
      toolInstance: true,
      payment: true,
      farmer: { select: { id: true, name: true, phone: true, village: true, taluk: true, district: true, pincode: true } },
      toolOwner: { select: { id: true, name: true, phone: true, village: true, taluk: true, district: true, pincode: true } },
      servicePerformer: { select: { id: true, name: true, phone: true } },
      stateLogs: { orderBy: { createdAt: "asc" } },
      handoverLogs: {
        include: { actorUser: { select: { id: true, name: true, phone: true } } },
        orderBy: { createdAt: "asc" },
      },
    },
  })

  if (!booking) {
    throw new AuthGuardError("Booking not found", 404)
  }

  if (isAdmin) {
    return { booking, actorRole: BookingEventActor.ADMIN }
  }

  if (booking.farmerId === userId) {
    return { booking, actorRole: BookingEventActor.FARMER }
  }

  if (booking.toolOwnerId === userId) {
    return { booking, actorRole: BookingEventActor.TOOL_OWNER }
  }

  const isOperator =
    booking.servicePerformerId === userId &&
    booking.serviceType !== "SELF_SERVICE_RENTAL" &&
    booking.serviceType !== "SELF_SERVICE_OWN_TOOL"

  if (isOperator) {
    return { booking, actorRole: BookingEventActor.OPERATOR }
  }

  throw new AuthGuardError("Forbidden — you are not authorized to access this booking", 403)
}
