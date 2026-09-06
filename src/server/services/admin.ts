import { BookingStatus, CapabilityType, VerificationStatus } from "@prisma/client"
import { prisma } from "@/server/db/prisma"
import { deriveModeFromServiceType } from "@/server/lib/booking-state-machine"

// ─── Admin assignments dashboard ─────────────────────────────────────────────

export async function getAdminAssignments() {
  const assignmentFlow = await prisma.booking.findMany({
    where: {
      status: { in: [BookingStatus.OPERATOR_PENDING, BookingStatus.OPERATOR_ASSIGNED] },
    },
    include: {
      tool: {
        select: {
          id: true,
          name: true,
          slug: true,
          thumbnailUrl: true,
          images: true,
          requiresCertifiedOperator: true,
        },
      },
      farmer: {
        select: { id: true, name: true, phone: true, village: true, taluk: true, district: true },
      },
      toolOwner: {
        select: { id: true, name: true, phone: true },
      },
      servicePerformer: {
        select: { id: true, name: true, phone: true },
      },
      payment: true,
    },
    orderBy: { createdAt: "asc" },
  })

  const bookings = assignmentFlow
    .filter((b) => deriveModeFromServiceType(b.serviceType) === "WITH_OPERATOR")
    .map((b) => ({
      id: b.id,
      bookingRef: b.bookingRef,
      status: b.status,
      serviceType: b.serviceType,
      requiresCertifiedOperator: b.tool.requiresCertifiedOperator,
      startDate: b.startDate,
      endDate: b.endDate,
      totalDays: b.totalDays,
      totalAmount: b.totalAmount,
      tool: {
        id: b.tool.id,
        name: b.tool.name,
        slug: b.tool.slug,
        image: b.tool.thumbnailUrl ?? b.tool.images[0] ?? null,
        requiresCertifiedOperator: b.tool.requiresCertifiedOperator,
      },
      farmer: b.farmer,
      toolOwner: b.toolOwner,
      servicePerformer:
        b.status === BookingStatus.OPERATOR_ASSIGNED
          ? {
              id: b.servicePerformer.id,
              name: b.servicePerformer.name,
              phone: b.servicePerformer.phone,
            }
          : null,
      payment: {
        id: b.payment?.id ?? null,
        amount: b.payment?.amount ?? b.totalAmount,
        status: b.payment?.status ?? null,
      },
    }))

  const operatorCaps = await prisma.userCapability.findMany({
    where: { type: "OPERATOR", status: "VERIFIED" },
    include: {
      user: { select: { id: true, name: true, phone: true, village: true, taluk: true, district: true } },
    },
    orderBy: [{ status: "desc" }, { user: { name: "asc" } }],
  })

  const operators = operatorCaps.map((c) => ({
    id: c.user.id,
    name: c.user.name,
    phone: c.user.phone,
    location: [c.user.village, c.user.taluk, c.user.district].filter(Boolean).join(", "),
    status: c.status,
  }))

  return { bookings, operators }
}

// ─── List capability verifications ──────────────────────────────────────────

export async function listCapabilityVerifications(filter?: {
  type?: CapabilityType
  status?: VerificationStatus
}) {
  const where: Record<string, unknown> = {}
  if (filter?.type) where.type = filter.type
  if (filter?.status) where.status = filter.status

  const items = await prisma.userCapability.findMany({
    where,
    include: {
      user: {
        select: {
          id: true,
          name: true,
          phone: true,
          email: true,
          village: true,
          taluk: true,
          district: true,
          pincode: true,
          phoneVerified: true,
          aadhaarVerified: true,
          image: true,
          createdAt: true,
        },
      },
    },
    orderBy: [
      { status: "asc" }, // PENDING first
      { createdAt: "desc" },
    ],
  })

  return items.map((item) => ({
    id: item.id,
    type: item.type,
    status: item.status,
    verifiedAt: item.verifiedAt,
    deniedAt: item.deniedAt,
    notes: item.notes,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
    user: {
      ...item.user,
      location: [item.user.village, item.user.taluk, item.user.district].filter(Boolean).join(", "),
    },
  }))
}

// ─── Review capability verification ─────────────────────────────────────────

export async function reviewCapabilityVerification(
  capabilityId: string,
  _adminUserId: string,
  decision: "APPROVE" | "REJECT",
  notes?: string,
) {
  const capability = await prisma.userCapability.findUnique({
    where: { id: capabilityId },
    include: { user: { select: { id: true, name: true, phone: true } } },
  })

  if (!capability) {
    throw new AdminServiceError("Capability verification request not found", 404)
  }

  const isApproval = decision === "APPROVE"

  const updated = await prisma.userCapability.update({
    where: { id: capabilityId },
    data: {
      status: isApproval ? VerificationStatus.VERIFIED : VerificationStatus.REVOKED,
      verifiedAt: isApproval ? new Date() : null,
      deniedAt: isApproval ? null : new Date(),
      notes: notes || (isApproval ? "Verified by Admin" : "Declined by Admin"),
    },
    include: {
      user: { select: { id: true, name: true, phone: true } },
    },
  })

  return updated
}

// ─── Error class ────────────────────────────────────────────────────────────

export class AdminServiceError extends Error {
  readonly statusCode: number
  constructor(message: string, statusCode: number) {
    super(message)
    this.name = "AdminServiceError"
    this.statusCode = statusCode
  }
}

