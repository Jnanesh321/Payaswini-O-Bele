import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getServerSession } from "@/lib/auth"
import { BookingStatus } from "@prisma/client"
import { deriveModeFromServiceType } from "@/lib/booking-state-machine"
import { expireOverdueOwnerRequests, OWNER_RESPONSE_SLA_MS } from "@/lib/owner-sla"

export async function GET() {
  const session = await getServerSession()
  if (!session?.user) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }

  // Lazy SLA sweep (no cron infra in this app): any OWNER_PENDING older than
  // the 4-hour response window is auto-cancelled here, before the owner reads
  // the list, so stale requests never linger on screen.
  await expireOverdueOwnerRequests()

  const bookings = await prisma.booking.findMany({
    where: { toolOwnerId: session.user.id, status: BookingStatus.OWNER_PENDING },
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
  const data = bookings.map((b) => {
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

  return NextResponse.json({ success: true, data })
}
