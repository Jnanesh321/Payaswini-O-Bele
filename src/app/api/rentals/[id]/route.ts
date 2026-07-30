import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const booking = await prisma.booking.findUnique({
    where: { id },
    include: { tool: true, payment: true, user: true },
  })
  if (!booking) {
    return NextResponse.json({ success: false, error: "Booking not found" }, { status: 404 })
  }
  return NextResponse.json({ success: true, data: booking })
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const body = await request.json()
  const booking = await prisma.booking.update({
    where: { id },
    data: body,
  })
  return NextResponse.json({ success: true, data: booking })
}
