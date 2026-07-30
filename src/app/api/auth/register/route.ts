import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function POST(request: NextRequest) {
  try {
    const { name, phone, address } = await request.json()
    const cleaned = phone?.replace(/\D/g, "")
    if (!cleaned || cleaned.length < 10) {
      return NextResponse.json({ success: false, error: "Invalid phone number" }, { status: 400 })
    }
    if (!name?.trim()) {
      return NextResponse.json({ success: false, error: "Name is required" }, { status: 400 })
    }

    const existing = await prisma.user.findUnique({ where: { phone: cleaned } })
    if (existing) {
      return NextResponse.json({ success: false, error: "Phone already registered" }, { status: 409 })
    }

    await prisma.user.create({
      data: {
        name: name.trim(),
        phone: cleaned,
        phoneVerified: false,
      },
    })

    return NextResponse.json({ success: true, message: "Account created. Verify OTP to login." }, { status: 201 })
  } catch (error) {
    return NextResponse.json({ success: false, error: "Registration failed" }, { status: 500 })
  }
}
