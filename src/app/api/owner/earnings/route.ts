import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getServerSession } from "@/lib/auth"
import { BookingStatus, PaymentStatus } from "@prisma/client"

const SETTLED_BOOKING_STATUSES: BookingStatus[] = [BookingStatus.COMPLETED]

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
  BookingStatus.INSPECTION,
]

type Period = "today" | "week" | "month"

function periodStart(period: Period, now = new Date()): Date {
  const d = new Date(now)
  if (period === "today") {
    d.setHours(0, 0, 0, 0)
  } else if (period === "week") {
    const day = d.getDay()
    const diff = day === 0 ? 6 : day - 1 // Monday start
    d.setDate(d.getDate() - diff)
    d.setHours(0, 0, 0, 0)
  } else {
    d.setDate(1)
    d.setHours(0, 0, 0, 0)
  }
  return d
}

export async function GET(request: Request) {
  const session = await getServerSession()
  if (!session?.user) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }

  const url = new URL(request.url)
  const periodParam = url.searchParams.get("period")
  const period: Period = periodParam === "today" || periodParam === "week" || periodParam === "month"
    ? periodParam
    : "month"

  const window = periodStart(period)

  const bookings = await prisma.booking.findMany({
    where: {
      toolOwnerId: session.user.id,
      status: { in: [...SETTLED_BOOKING_STATUSES, ...ACTIVE_BOOKING_STATUSES] },
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

  return NextResponse.json({
    success: true,
    data: {
      period,
      total,
      settled: settledAmount,
      pending: pendingAmount,
      settlePct: total > 0 ? Math.round((settledAmount / total) * 100) : 0,
      payouts: payouts.slice(0, 20),
    },
  })
}
