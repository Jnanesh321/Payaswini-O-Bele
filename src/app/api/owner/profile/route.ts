import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getServerSession } from "@/lib/auth"
import { BookingStatus } from "@prisma/client"

export async function GET() {
  const session = await getServerSession()
  if (!session?.user) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }

  const [user, toolCount, rentalCount, completedWithPayment] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.user.id },
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
    prisma.toolInstance.count({ where: { ownerId: session.user.id } }),
    prisma.booking.count({
      where: { toolOwnerId: session.user.id, status: BookingStatus.COMPLETED },
    }),
    prisma.booking.aggregate({
      where: { toolOwnerId: session.user.id, status: BookingStatus.COMPLETED },
      _sum: { totalToolFee: true },
    }),
  ])

  if (!user) {
    return NextResponse.json({ success: false, error: "User not found" }, { status: 404 })
  }

  return NextResponse.json({
    success: true,
    data: {
      ...user,
      toolsCount: toolCount,
      rentalsCount: rentalCount,
      lifetimeEarnings: completedWithPayment._sum.totalToolFee ?? 0,
      location: [user.village, user.taluk, user.district].filter(Boolean).join(", "),
    },
  })
}
