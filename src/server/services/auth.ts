import { prisma } from "@/server/db/prisma"
import { checkRateLimit, getClientIp } from "@/server/lib/rate-limit"
import { sendOtpSms } from "@/server/lib/sms"

// ─── Register ────────────────────────────────────────────────────────────────

export async function registerUser(data: { name?: string; phone?: string; address?: string }) {
  const { name, phone, address } = data
  const cleaned = phone?.replace(/\D/g, "")
  if (!cleaned || cleaned.length < 10) {
    throw new AuthServiceError("Invalid phone number", 400)
  }
  if (!name?.trim()) {
    throw new AuthServiceError("Name is required", 400)
  }

  const existing = await prisma.user.findUnique({ where: { phone: cleaned } })
  if (existing) {
    throw new AuthServiceError("Phone already registered", 409)
  }

  await prisma.user.create({
    data: {
      name: name.trim(),
      phone: cleaned,
      phoneVerified: false,
    },
  })

  return { message: "Account created. Verify OTP to login." }
}

// ─── Send OTP ────────────────────────────────────────────────────────────────

function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

export async function sendOtp(request: Request, phone?: string) {
  const cleaned = phone?.replace(/\D/g, "")
  if (!cleaned || cleaned.length < 10) {
    throw new AuthServiceError("Invalid phone number", 400)
  }

  const ip = getClientIp(request)
  const phoneLimit = await checkRateLimit(`phone:${cleaned}`, { windowSeconds: 60, maxRequests: 3 })
  if (!phoneLimit.allowed) {
    throw new AuthServiceError("Too many requests. Try again later.", 429)
  }
  const ipLimit = await checkRateLimit(`ip:${ip}`, { windowSeconds: 60, maxRequests: 10 })
  if (!ipLimit.allowed) {
    throw new AuthServiceError("Too many requests. Try again later.", 429)
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

  return {
    message: sent ? "OTP sent successfully" : sms.message,
    devOtp: !sent && process.env.NODE_ENV !== "production" ? otp : undefined,
  }
}

// ─── Verify OTP ──────────────────────────────────────────────────────────────

export async function verifyOtp(request: Request, data: { phone?: string; otp?: string }) {
  const { phone, otp } = data
  const cleaned = phone?.replace(/\D/g, "")
  const cleanedOtp = otp?.toString().trim()

  if (!cleaned || !cleanedOtp) {
    throw new AuthServiceError("Phone and OTP required", 400)
  }

  const ip = getClientIp(request)
  const ipLimit = await checkRateLimit(`verify:ip:${ip}`, { windowSeconds: 60, maxRequests: 10 })
  if (!ipLimit.allowed) {
    throw new AuthServiceError("Too many attempts. Try again later.", 429)
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
    throw new AuthServiceError("Invalid or expired OTP", 400)
  }

  await prisma.otpRequest.update({
    where: { id: record.id },
    data: { verifiedAt: new Date() },
  })

  const user = await prisma.user.findUnique({ where: { phone: cleaned } })
  if (!user) {
    throw new AuthServiceError("No account found. Please register first.", 404)
  }

  if (!user.phoneVerified) {
    await prisma.user.update({
      where: { id: user.id },
      data: { phoneVerified: true },
    })
  }

  return { userId: user.id, phone: user.phone, name: user.name, isAdmin: user.isAdmin }
}

// ─── Error class ────────────────────────────────────────────────────────────

export class AuthServiceError extends Error {
  readonly statusCode: number
  constructor(message: string, statusCode: number) {
    super(message)
    this.name = "AuthServiceError"
    this.statusCode = statusCode
  }
}
