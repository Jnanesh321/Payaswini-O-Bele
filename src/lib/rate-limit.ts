import { prisma } from "@/lib/prisma"

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
  const windowStart = new Date(now.getTime() - config.windowSeconds * 1000)

  const record = await prisma.rateLimit.findUnique({
    where: {
      key_windowStart: { key, windowStart },
    },
  })

  if (!record) {
    await prisma.rateLimit.create({
      data: {
        key,
        count: 1,
        windowStart,
        expiresAt: new Date(now.getTime() + config.windowSeconds * 1000 * 2),
      },
    })
    return { allowed: true, remaining: config.maxRequests - 1, resetAt: new Date(now.getTime() + config.windowSeconds * 1000) }
  }

  if (record.count >= config.maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: new Date(windowStart.getTime() + config.windowSeconds * 1000),
    }
  }

  await prisma.rateLimit.update({
    where: { id: record.id },
    data: { count: { increment: 1 } },
  })

  return { allowed: true, remaining: config.maxRequests - record.count - 1, resetAt: new Date(windowStart.getTime() + config.windowSeconds * 1000) }
}

export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for")
  if (forwarded) return forwarded.split(",")[0].trim()
  return "127.0.0.1"
}
