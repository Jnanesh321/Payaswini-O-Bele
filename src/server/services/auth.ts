import { prisma } from "@/server/db/prisma"
import { checkRateLimit, getClientIp } from "@/server/lib/rate-limit"
import { sendOtpSms } from "@/server/lib/sms"

// ─── Phone normalization & validation ─────────────────────────────────────────
// Standard Indian phone format: 10 digits starting with 6-9 (optionally with +91 or 91 prefix).
// Canonical format: 12-digit with "91" country code (e.g. "919845100001").

export function normalizePhone(rawPhone?: string): string | null {
  if (!rawPhone) return null
  const digits = rawPhone.replace(/\D/g, "")
  if (digits.length === 10) return `91${digits}`
  if (digits.length === 12 && digits.startsWith("91")) return digits
  if (digits.length === 11 && digits.startsWith("0")) return `91${digits.slice(1)}`
  return null
}

export function isValidIndianPhone(phone?: string): boolean {
  if (!phone) return false
  const normalized = normalizePhone(phone)
  return normalized ? /^91[6-9]\d{9}$/.test(normalized) : false
}

// ─── Register ────────────────────────────────────────────────────────────────

export async function registerUser(data: { name?: string; phone?: string; address?: string }) {
  const { name, phone } = data
  if (!phone || !isValidIndianPhone(phone)) {
    throw new AuthServiceError("Please enter a valid 10-digit Indian phone number", 400)
  }
  const normalized = normalizePhone(phone)!
  if (!name?.trim()) {
    throw new AuthServiceError("Name is required", 400)
  }

  const existing = await prisma.user.findUnique({ where: { phone: normalized } })
  if (existing) {
    throw new AuthServiceError("Phone already registered", 409)
  }

  await prisma.user.create({
    data: {
      name: name.trim(),
      phone: normalized,
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
  if (!phone || !isValidIndianPhone(phone)) {
    throw new AuthServiceError("Please enter a valid 10-digit Indian phone number", 400)
  }
  const normalized = normalizePhone(phone)!

  const ip = getClientIp(request)
  const phoneLimit = await checkRateLimit(`phone:${normalized}`, { windowSeconds: 60, maxRequests: 3 })
  if (!phoneLimit.allowed) {
    throw new AuthServiceError("Too many requests. Try again later.", 429)
  }
  const ipLimit = await checkRateLimit(`ip:${ip}`, { windowSeconds: 60, maxRequests: 10 })
  if (!ipLimit.allowed) {
    throw new AuthServiceError("Too many requests. Try again later.", 429)
  }

  const otp = generateOtp()
  // 60 min in dev, 5 min in prod
  const otpTtlMs = process.env.NODE_ENV === "production" ? 5 * 60 * 1000 : 60 * 60 * 1000
  const expiresAt = new Date(Date.now() + otpTtlMs)

  await prisma.otpRequest.create({
    data: { phone: normalized, otp, expiresAt, ip },
  })

  const sms = await sendOtpSms(normalized, otp)
  const sent = sms.sent

  if (!sent && process.env.NODE_ENV !== "production" && process.env.SMS_ENABLED !== "true") {
    console.log(`[DEV] OTP for ${normalized}: ${otp}`)
  }

  return {
    message: sent ? "OTP sent successfully" : sms.message,
    devOtp: !sent && process.env.NODE_ENV !== "production" ? otp : undefined,
  }
}

// ─── Verify OTP ──────────────────────────────────────────────────────────────

export async function verifyOtp(request: Request, data: { phone?: string; otp?: string }) {
  const { phone, otp } = data
  const normalized = normalizePhone(phone)
  const cleanedOtp = otp?.toString().trim()

  if (!normalized || !cleanedOtp) {
    throw new AuthServiceError("Phone and OTP required", 400)
  }

  const ip = getClientIp(request)
  const ipLimit = await checkRateLimit(`verify:ip:${ip}`, { windowSeconds: 60, maxRequests: 10 })
  if (!ipLimit.allowed) {
    throw new AuthServiceError("Too many attempts. Try again later.", 429)
  }

  const isDevMasterOtp =
    process.env.NODE_ENV !== "production" && (cleanedOtp === "123456" || cleanedOtp === "000000")

  let record = await prisma.otpRequest.findFirst({
    where: {
      phone: normalized,
      ...(isDevMasterOtp ? {} : { otp: cleanedOtp }),
      expiresAt: { gte: new Date() },
      verifiedAt: null,
    },
    orderBy: { createdAt: "desc" },
  })

  // In development, if master OTP is used without a prior record, create a transient record
  if (!record && isDevMasterOtp) {
    record = await prisma.otpRequest.create({
      data: {
        phone: normalized,
        otp: cleanedOtp,
        expiresAt: new Date(Date.now() + 3600000),
        ip,
      },
    })
  }

  if (!record) {
    throw new AuthServiceError("Invalid or expired OTP", 400)
  }

  await prisma.otpRequest.update({
    where: { id: record.id },
    data: { verifiedAt: new Date() },
  })

  let user = await prisma.user.findUnique({ where: { phone: normalized } })
  // In development, if user doesn't exist yet, auto-create farmer user
  if (!user && process.env.NODE_ENV !== "production") {
    user = await prisma.user.create({
      data: {
        phone: normalized,
        name: "Farmer",
        phoneVerified: true,
        preferredLang: "en",
      },
    })
  }

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
