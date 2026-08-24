import { BookingStatus, ToolInstanceStatus } from "@prisma/client"
import { prisma } from "@/server/db/prisma"
import { deriveModeFromServiceType } from "@/server/lib/booking-state-machine"
import { expireOverdueOwnerRequests, OWNER_RESPONSE_SLA_MS } from "@/server/lib/owner-sla"

// ─── List owner requests ─────────────────────────────────────────────────────

export async function listOwnerRequests(userId: string) {
  await expireOverdueOwnerRequests()

  const bookings = await prisma.booking.findMany({
    where: { toolOwnerId: userId, status: BookingStatus.OWNER_PENDING },
    include: {
      tool: {
        select: {
          id: true,
          name: true,
          slug: true,
          thumbnailUrl: true,
          images: true,
          pricePerDay: true,
          requiresCertifiedOperator: true,
        },
      },
      farmer: {
        select: {
          id: true,
          name: true,
          phone: true,
          district: true,
          taluk: true,
          village: true,
          image: true,
        },
      },
      payment: true,
    },
    orderBy: { createdAt: "asc" },
  })

  const now = Date.now()
  return bookings.map((b) => {
    const mode = deriveModeFromServiceType(b.serviceType)
    return {
      id: b.id,
      bookingRef: b.bookingRef,
      status: b.status,
      serviceType: b.serviceType,
      mode,
      needsOperator: mode === "WITH_OPERATOR",
      startDate: b.startDate,
      endDate: b.endDate,
      totalDays: b.totalDays,
      toolFeePerDay: b.toolFeePerDay,
      operatorFeePerDay: b.operatorFeePerDay,
      totalToolFee: b.totalToolFee,
      totalOperatorFee: b.totalOperatorFee,
      deliveryFee: b.deliveryFee,
      platformFee: b.platformFee,
      totalAmount: b.totalAmount,
      tool: {
        id: b.tool.id,
        name: b.tool.name,
        slug: b.tool.slug,
        image: b.tool.thumbnailUrl ?? b.tool.images[0] ?? null,
        pricePerDay: b.tool.pricePerDay,
        requiresCertifiedOperator: b.tool.requiresCertifiedOperator,
      },
      farmer: {
        id: b.farmer.id,
        name: b.farmer.name,
        phone: b.farmer.phone,
        district: b.farmer.district,
        taluk: b.farmer.taluk,
        village: b.farmer.village,
        image: b.farmer.image,
      },
      payment: {
        id: b.payment?.id ?? null,
        amount: b.payment?.amount ?? b.totalAmount,
        status: b.payment?.status ?? null,
      },
      slaDeadline: new Date(b.createdAt.getTime() + OWNER_RESPONSE_SLA_MS).toISOString(),
      slaRemainingMs: Math.max(0, b.createdAt.getTime() + OWNER_RESPONSE_SLA_MS - now),
    }
  })
}

// ─── Owner equipment summary ─────────────────────────────────────────────────

const ACTIVE_BOOKING_STATUSES: BookingStatus[] = [
  BookingStatus.REQUESTED,
  BookingStatus.OWNER_PENDING,
  BookingStatus.OWNER_ACCEPTED,
  BookingStatus.OPERATOR_PENDING,
  BookingStatus.OPERATOR_ASSIGNED,
  BookingStatus.OPERATOR_ACCEPTED,
  BookingStatus.FETCHING_TOOL,
  BookingStatus.TOOL_COLLECTED,
  BookingStatus.TRAVELLING_TO_FARM,
  BookingStatus.ARRIVED,
  BookingStatus.WORK_STARTED,
  BookingStatus.WORK_PAUSED,
  BookingStatus.WORK_RESUMED,
  BookingStatus.WORK_COMPLETED,
  BookingStatus.RETURNING_TOOL,
]

export async function getOwnerEquipment(userId: string) {
  const tools = await prisma.tool.findMany({
    where: { instances: { some: { ownerId: userId } } },
    select: {
      id: true,
      name: true,
      slug: true,
      images: true,
      thumbnailUrl: true,
      pricePerDay: true,
      category: true,
      requiresCertifiedOperator: true,
      instances: {
        where: { ownerId: userId },
        select: {
          id: true,
          status: true,
          bookings: { select: { status: true } },
        },
      },
    },
    orderBy: { updatedAt: "desc" },
  })

  return tools.map((tool) => {
    const instances = tool.instances
    const available = instances.filter((i) => i.status === ToolInstanceStatus.AVAILABLE).length
    const paused = instances.filter((i) => i.status === ToolInstanceStatus.MAINTENANCE).length
    const activeBookings = instances.reduce(
      (sum, inst) =>
        sum +
        inst.bookings.filter((b) => ACTIVE_BOOKING_STATUSES.includes(b.status)).length,
      0,
    )
    return {
      id: tool.id,
      name: tool.name,
      slug: tool.slug,
      image: tool.thumbnailUrl ?? tool.images[0] ?? null,
      pricePerDay: tool.pricePerDay,
      category: tool.category,
      requiresCertifiedOperator: tool.requiresCertifiedOperator,
      totalInstances: instances.length,
      available,
      paused,
      isAvailable: available > 0,
      activeBookings,
    }
  })
}

// ─── Toggle tool instance availability ───────────────────────────────────────

export async function toggleToolAvailability(userId: string, toolId: string, available: boolean) {
  const instances = await prisma.toolInstance.findMany({
    where: {
      toolId,
      ownerId: userId,
      status: { in: [ToolInstanceStatus.AVAILABLE, ToolInstanceStatus.MAINTENANCE] },
    },
    select: { id: true },
  })

  if (instances.length === 0) {
    throw new OwnerServiceError("No toggleable instances found", 404)
  }

  await prisma.toolInstance.updateMany({
    where: { id: { in: instances.map((i) => i.id) } },
    data: { status: available ? ToolInstanceStatus.AVAILABLE : ToolInstanceStatus.MAINTENANCE },
  })

  return { toolId, available }
}

// ─── Owner profile ───────────────────────────────────────────────────────────

export async function getOwnerProfile(userId: string) {
  const [user, toolCount, rentalCount, completedWithPayment] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
        image: true,
        district: true,
        taluk: true,
        village: true,
        pincode: true,
        phoneVerified: true,
        aadhaarVerified: true,
        createdAt: true,
      },
    }),
    prisma.toolInstance.count({ where: { ownerId: userId } }),
    prisma.booking.count({
      where: { toolOwnerId: userId, status: BookingStatus.COMPLETED },
    }),
    prisma.booking.aggregate({
      where: { toolOwnerId: userId, status: BookingStatus.COMPLETED },
      _sum: { totalToolFee: true },
    }),
  ])

  if (!user) throw new OwnerServiceError("User not found", 404)

  return {
    ...user,
    toolsCount: toolCount,
    rentalsCount: rentalCount,
    lifetimeEarnings: completedWithPayment._sum.totalToolFee ?? 0,
    location: [user.village, user.taluk, user.district].filter(Boolean).join(", "),
  }
}

// ─── Owner earnings ──────────────────────────────────────────────────────────

const SETTLED_BOOKING_STATUSES_EARNINGS: BookingStatus[] = [BookingStatus.COMPLETED]

const ACTIVE_BOOKING_STATUSES_EARNINGS: BookingStatus[] = [
  BookingStatus.REQUESTED,
  BookingStatus.OWNER_PENDING,
  BookingStatus.OWNER_ACCEPTED,
  BookingStatus.OPERATOR_PENDING,
  BookingStatus.OPERATOR_ASSIGNED,
  BookingStatus.OPERATOR_ACCEPTED,
  BookingStatus.FETCHING_TOOL,
  BookingStatus.TOOL_COLLECTED,
  BookingStatus.TRAVELLING_TO_FARM,
  BookingStatus.ARRIVED,
  BookingStatus.WORK_STARTED,
  BookingStatus.WORK_PAUSED,
  BookingStatus.WORK_RESUMED,
  BookingStatus.WORK_COMPLETED,
  BookingStatus.RETURNING_TOOL,
  BookingStatus.INSPECTION,
]

type OwnerPeriod = "today" | "week" | "month"

function ownerPeriodStart(period: OwnerPeriod, now = new Date()): Date {
  const d = new Date(now)
  if (period === "today") {
    d.setHours(0, 0, 0, 0)
  } else if (period === "week") {
    const day = d.getDay()
    const diff = day === 0 ? 6 : day - 1
    d.setDate(d.getDate() - diff)
    d.setHours(0, 0, 0, 0)
  } else {
    d.setDate(1)
    d.setHours(0, 0, 0, 0)
  }
  return d
}

export async function getOwnerEarnings(userId: string, periodParam: string | null) {
  const period: OwnerPeriod = periodParam === "today" || periodParam === "week" || periodParam === "month"
    ? periodParam
    : "month"

  const window = ownerPeriodStart(period)

  const bookings = await prisma.booking.findMany({
    where: {
      toolOwnerId: userId,
      status: { in: [...SETTLED_BOOKING_STATUSES_EARNINGS, ...ACTIVE_BOOKING_STATUSES_EARNINGS] },
      createdAt: { gte: window },
    },
    select: {
      id: true,
      bookingRef: true,
      totalToolFee: true,
      status: true,
      createdAt: true,
      tool: { select: { name: true } },
      farmer: { select: { name: true } },
      payment: { select: { status: true, amount: true } },
    },
    orderBy: { createdAt: "desc" },
  })

  const payouts = bookings.map((b) => {
    const settled = b.status === BookingStatus.COMPLETED
    return {
      id: b.id,
      bookingRef: b.bookingRef,
      farmer: b.farmer.name ?? "Farmer",
      tool: b.tool.name,
      date: b.createdAt,
      amount: b.totalToolFee,
      settled,
    }
  })

  const settledAmount = payouts.filter((p) => p.settled).reduce((sum, p) => sum + p.amount, 0)
  const pendingAmount = payouts.filter((p) => !p.settled).reduce((sum, p) => sum + p.amount, 0)
  const total = settledAmount + pendingAmount

  return {
    period,
    total,
    settled: settledAmount,
    pending: pendingAmount,
    settlePct: total > 0 ? Math.round((settledAmount / total) * 100) : 0,
    payouts: payouts.slice(0, 20),
  }
}

// ─── Error class ────────────────────────────────────────────────────────────

export class OwnerServiceError extends Error {
  readonly statusCode: number
  constructor(message: string, statusCode: number) {
    super(message)
    this.name = "OwnerServiceError"
    this.statusCode = statusCode
  }
}
