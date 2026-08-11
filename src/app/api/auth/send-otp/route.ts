import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { checkRateLimit, getClientIp } from "@/lib/rate-limit"
import { sendOtpSms } from "@/lib/sms"

function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

export async function POST(request: NextRequest) {
  try {
    const { phone } = await request.json()
    const cleaned = phone?.replace(/\D/g, "")
    if (!cleaned || cleaned.length < 10) {
      return NextResponse.json({ success: false, error: "Invalid phone number" }, { status: 400 })
    }

    const ip = getClientIp(request)
    const phoneLimit = await checkRateLimit(`phone:${cleaned}`, { windowSeconds: 60, maxRequests: 3 })
    if (!phoneLimit.allowed) {
      return NextResponse.json({ success: false, error: "Too many requests. Try again later." }, { status: 429 })
    }
    const ipLimit = await checkRateLimit(`ip:${ip}`, { windowSeconds: 60, maxRequests: 10 })
    if (!ipLimit.allowed) {
      return NextResponse.json({ success: false, error: "Too many requests. Try again later." }, { status: 429 })
    }

    const otp = generateOtp()
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000)

    await prisma.otpRequest.create({
      data: { phone: cleaned, otp, expiresAt, ip },
    })

    const sms = await sendOtpSms(cleaned, otp)
    const sent = sms.sent

    if (!sent && process.env.NODE_ENV !== "production" && process.env.SMS_ENABLED !== "true") {
      console.log(`[DEV] OTP for ${cleaned}: ${otp}`)
    }

    return NextResponse.json({
      success: true,
      message: sent ? "OTP sent successfully" : sms.message,
      devOtp: !sent && process.env.NODE_ENV !== "production" ? otp : undefined,
    })
  } catch {
    return NextResponse.json({ success: false, error: "Failed to send OTP" }, { status: 500 })
  }
}
