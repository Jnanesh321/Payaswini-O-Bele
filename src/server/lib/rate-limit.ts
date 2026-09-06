import { prisma } from "@/server/db/prisma"

export interface RateLimitConfig {
  windowSeconds: number
  maxRequests: number
}

const defaults: RateLimitConfig = { windowSeconds: 60, maxRequests: 5 }

export async function checkRateLimit(
  key: string,
  config: RateLimitConfig = defaults,
): Promise<{ allowed: boolean; remaining: number; resetAt: Date }> {
  const now = new Date()
  const windowMs = config.windowSeconds * 1000
  const windowStart = new Date(Math.floor(now.getTime() / windowMs) * windowMs)
  const expiresAt = new Date(windowStart.getTime() + windowMs * 2)
  const resetAt = new Date(windowStart.getTime() + windowMs)

  const record = await prisma.rateLimit.upsert({
    where: {
      key_windowStart: { key, windowStart },
    },
    update: {
      count: { increment: 1 },
    },
    create: {
      key,
      count: 1,
      windowStart,
      expiresAt,
    },
  })

  const allowed = record.count <= config.maxRequests
  const remaining = Math.max(0, config.maxRequests - record.count)

  return { allowed, remaining, resetAt }
}

export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for")
  if (forwarded) {
    const ip = forwarded.split(",")[0].trim()
    if (ip) return ip
  }
  const realIp = request.headers.get("x-real-ip")
  if (realIp) return realIp.trim()
  return "127.0.0.1"
}
