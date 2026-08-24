import { BookingStatus } from "@prisma/client"
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
