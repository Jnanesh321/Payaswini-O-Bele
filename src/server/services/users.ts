import { Prisma } from "@prisma/client"
import { prisma } from "@/server/db/prisma"

// ─── Get user profile ────────────────────────────────────────────────────────

export async function getUserProfile(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    include: { bookings: { include: { tool: true } } },
  })
}

// ─── Update user profile ─────────────────────────────────────────────────────

export async function updateUserProfile(userId: string, data: Prisma.UserUncheckedUpdateInput) {
  return prisma.user.update({
    where: { id: userId },
    data,
  })
}
