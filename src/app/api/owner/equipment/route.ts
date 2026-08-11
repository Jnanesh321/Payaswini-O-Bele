import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getServerSession } from "@/lib/auth"
import { BookingStatus, ToolInstanceStatus } from "@prisma/client"

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

export async function GET() {
  const session = await getServerSession()
  if (!session?.user) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }

  const tools = await prisma.tool.findMany({
    where: { instances: { some: { ownerId: session.user.id } } },
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
        where: { ownerId: session.user.id },
        select: {
          id: true,
          status: true,
          bookings: { select: { status: true } },
        },
      },
    },
    orderBy: { updatedAt: "desc" },
  })

  const data = tools.map((tool) => {
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

  return NextResponse.json({ success: true, data })
}
