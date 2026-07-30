import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { checkRateLimit, getClientIp } from "@/lib/rate-limit"

function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

async function sendSmsViaFast2Sms(phone: string, otp: string): Promise<boolean> {
  const apiKey = process.env.FAST2SMS_API_KEY
  if (!apiKey) return false

  try {
    const res = await fetch("https://www.fast2sms.com/dev/bulkV2", {
      method: "POST",
      headers: {
        authorization: apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        route: "v3",
        sender_id: "FTWSMS",
        message: `Your O Bele~ login OTP is: ${otp}. Valid for 5 minutes.`,
        language: "english",
        flash: 0,
        numbers: phone.replace(/\D/g, ""),
      }),
    })
    const data = await res.json()
    return data.return === true
  } catch {
    return false
  }
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

    const sent = await sendSmsViaFast2Sms(cleaned, otp)

    if (!sent && process.env.NODE_ENV !== "production") {
      console.log(`[DEV] OTP for ${cleaned}: ${otp}`)
    }

    return NextResponse.json({
      success: true,
      message: sent ? "OTP sent successfully" : "OTP logged (SMS unavailable)",
      devOtp: !sent && process.env.NODE_ENV !== "production" ? otp : undefined,
    })
  } catch (error) {
    return NextResponse.json({ success: false, error: "Failed to send OTP" }, { status: 500 })
  }
}
