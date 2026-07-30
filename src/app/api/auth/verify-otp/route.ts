import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { checkRateLimit, getClientIp } from "@/lib/rate-limit"

export async function POST(request: NextRequest) {
  try {
    const { phone, otp } = await request.json()
    const cleaned = phone?.replace(/\D/g, "")
    const cleanedOtp = otp?.toString().trim()

    if (!cleaned || !cleanedOtp) {
      return NextResponse.json({ success: false, error: "Phone and OTP required" }, { status: 400 })
    }

    const ip = getClientIp(request)
    const ipLimit = await checkRateLimit(`verify:ip:${ip}`, { windowSeconds: 60, maxRequests: 10 })
    if (!ipLimit.allowed) {
      return NextResponse.json({ success: false, error: "Too many attempts. Try again later." }, { status: 429 })
    }

    const record = await prisma.otpRequest.findFirst({
      where: {
        phone: cleaned,
        otp: cleanedOtp,
        expiresAt: { gte: new Date() },
        verifiedAt: null,
      },
      orderBy: { createdAt: "desc" },
    })

    if (!record) {
      return NextResponse.json({ success: false, error: "Invalid or expired OTP" }, { status: 400 })
    }

    await prisma.otpRequest.update({
      where: { id: record.id },
      data: { verifiedAt: new Date() },
    })

    const user = await prisma.user.findUnique({ where: { phone: cleaned } })
    if (!user) {
      return NextResponse.json({ success: false, error: "No account found. Please register first." }, { status: 404 })
    }

    if (!user.phoneVerified) {
      await prisma.user.update({
        where: { id: user.id },
        data: { phoneVerified: true },
      })
    }

    return NextResponse.json({
      success: true,
      data: { userId: user.id, phone: user.phone, name: user.name, role: user.role },
    })
  } catch (error) {
    return NextResponse.json({ success: false, error: "Verification failed" }, { status: 500 })
  }
}
