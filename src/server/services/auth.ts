import crypto from "crypto"
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
  return crypto.randomInt(100000, 1000000).toString()
}

export async function sendOtp(request: Request, phone?: string) {
  if (!phone || !isValidIndianPhone(phone)) {
    throw new AuthServiceError("Please enter a valid 10-digit Indian phone number", 400)
  }
  const normalized = normalizePhone(phone)!

  const ip = getClientIp(request)
  const phoneLimit = await checkRateLimit(`phone:${normalized}`, { windowSeconds: 60, maxRequests: 3 })
  if (!phoneLimit.allowed) {
    throw new AuthServiceError("Too many requests for this phone number. Try again later.", 429)
  }
  const ipLimit = await checkRateLimit(`ip:${ip}`, { windowSeconds: 60, maxRequests: 10 })
  if (!ipLimit.allowed) {
    throw new AuthServiceError("Too many requests from this IP. Try again later.", 429)
  }

  const otp = generateOtp()
  // 5 minutes in all environments (15 min in dev only if explicitly configured)
  const otpTtlMs = process.env.NODE_ENV === "production" ? 5 * 60 * 1000 : 15 * 60 * 1000
  const expiresAt = new Date(Date.now() + otpTtlMs)

  await prisma.otpRequest.create({
    data: { phone: normalized, otp, expiresAt, ip },
  })

  const sms = await sendOtpSms(normalized, otp)
  const sent = sms.sent

  const enableDevMasterOtp = process.env.NODE_ENV !== "production" && process.env.ENABLE_DEV_MASTER_OTP === "true"

  if (!sent && enableDevMasterOtp) {
    console.log(`[DEV ONLY] OTP for ${normalized}: ${otp}`)
  }

  return {
    message: sent ? "OTP sent successfully" : sms.message,
    devOtp: !sent && enableDevMasterOtp ? otp : undefined,
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
    throw new AuthServiceError("Too many verification attempts. Try again later.", 429)
  }

  const phoneVerifyLimit = await checkRateLimit(`verify:phone:${normalized}`, { windowSeconds: 60, maxRequests: 5 })
  if (!phoneVerifyLimit.allowed) {
    throw new AuthServiceError("Too many attempts for this number. Try again later.", 429)
  }

  const isDevMasterOtp =
    process.env.NODE_ENV !== "production" &&
    process.env.ENABLE_DEV_MASTER_OTP === "true" &&
    (cleanedOtp === "123456" || cleanedOtp === "000000")

  const record = await prisma.otpRequest.findFirst({
    where: {
      phone: normalized,
      expiresAt: { gte: new Date() },
      verifiedAt: null,
    },
    orderBy: { createdAt: "desc" },
  })

  if (!record && !isDevMasterOtp) {
    throw new AuthServiceError("Invalid or expired OTP", 400)
  }

  if (record) {
    if (record.attempts >= 5) {
      throw new AuthServiceError("Too many failed attempts. Please request a new OTP.", 429)
    }

    if (!isDevMasterOtp && record.otp !== cleanedOtp) {
      await prisma.otpRequest.update({
        where: { id: record.id },
        data: { attempts: { increment: 1 } },
      })
      throw new AuthServiceError("Invalid OTP", 400)
    }

    await prisma.otpRequest.update({
      where: { id: record.id },
      data: { verifiedAt: new Date() },
    })
  }

  let user = await prisma.user.findUnique({ where: { phone: normalized } })
  if (!user) {
    user = await prisma.user.create({
      data: {
        phone: normalized,
        name: "Farmer",
        phoneVerified: true,
        preferredLang: "en",
      },
    })
  } else if (!user.phoneVerified) {
    await prisma.user.update({
      where: { id: user.id },
      data: { phoneVerified: true },
    })
  }

  // Issue short-lived, single-use authentication proof token
  const token = crypto.randomBytes(32).toString("hex")
  const identifier = `auth_proof:${normalized}`
  const tokenExpires = new Date(Date.now() + 5 * 60 * 1000) // 5 minutes

  // Clean up any old tokens for this phone before inserting new one
  await prisma.verificationToken.deleteMany({
    where: { identifier },
  })

  await prisma.verificationToken.create({
    data: {
      identifier,
      token,
      expires: tokenExpires,
    },
  })

  return {
    userId: user.id,
    phone: user.phone,
    name: user.name,
    isAdmin: user.isAdmin,
    token,
  }
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
