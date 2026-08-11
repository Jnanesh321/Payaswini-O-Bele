import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getServerSession } from "@/lib/auth"

export async function GET() {
  const session = await getServerSession()
  if (!session?.user) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }

  const bookings = await prisma.booking.findMany({
    where: { farmerId: session.user.id },
    include: { tool: true, payment: true },
    orderBy: { createdAt: "desc" },
  })

  return NextResponse.json({ success: true, data: bookings })
}

export async function POST(request: NextRequest) {
  const session = await getServerSession()
  if (!session?.user) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await request.json()
    const booking = await prisma.booking.create({
      data: { ...body, farmerId: session.user.id },
      include: { tool: true, payment: true },
    })
    return NextResponse.json({ success: true, data: booking }, { status: 201 })
  } catch (error) {
    return NextResponse.json({ success: false, error: "Failed to create booking" }, { status: 500 })
  }
}
