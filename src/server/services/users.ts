import { CapabilityType, Prisma, VerificationStatus } from "@prisma/client"
import { prisma } from "@/server/db/prisma"
import { normalizePhone } from "@/server/services/auth"

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

// ─── Find farmer by phone ───────────────────────────────────────────────────

export async function findFarmerByPhone(rawPhone: string) {
  const normalized = normalizePhone(rawPhone)
  if (!normalized) {
    return null
  }

  const user = await prisma.user.findUnique({
    where: { phone: normalized },
    select: {
      id: true,
      name: true,
      phone: true,
      district: true,
      taluk: true,
      village: true,
      image: true,
      phoneVerified: true,
      capabilities: {
        select: {
          type: true,
          status: true,
        },
      },
    },
  })

  if (!user) return null

  return {
    id: user.id,
    name: user.name ?? "Farmer",
    phone: user.phone,
    district: user.district,
    taluk: user.taluk,
    village: user.village,
    image: user.image,
    phoneVerified: user.phoneVerified,
    capabilities: user.capabilities,
  }
}

// ─── Get user capabilities with verification details ─────────────────────────

export async function getUserCapabilitiesWithDetails(userId: string) {
  const capabilities = await prisma.userCapability.findMany({
    where: { userId },
    orderBy: { createdAt: "asc" },
  })

  return capabilities.map((c) => ({
    id: c.id,
    type: c.type,
    status: c.status,
    verifiedAt: c.verifiedAt,
    deniedAt: c.deniedAt,
    notes: c.notes,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
  }))
}

// ─── Submit capability verification ─────────────────────────────────────────

export async function submitCapabilityVerification(
  userId: string,
  data: {
    type: CapabilityType
    notes?: string
    name?: string
    village?: string
    taluk?: string
    district?: string
    pincode?: string
  },
) {
  const { type, notes, name, village, taluk, district, pincode } = data

  // Optionally update user location/profile details
  const updateUserData: Record<string, string> = {}
  if (name?.trim()) updateUserData.name = name.trim()
  if (village?.trim()) updateUserData.village = village.trim()
  if (taluk?.trim()) updateUserData.taluk = taluk.trim()
  if (district?.trim()) updateUserData.district = district.trim()
  if (pincode?.trim()) updateUserData.pincode = pincode.trim()

  if (Object.keys(updateUserData).length > 0) {
    await prisma.user.update({
      where: { id: userId },
      data: updateUserData,
    })
  }

  // Upsert user capability as PENDING
  const capability = await prisma.userCapability.upsert({
    where: {
      userId_type: {
        userId,
        type,
      },
    },
    update: {
      status: VerificationStatus.PENDING,
      notes: notes || "Verification submitted by user",
      deniedAt: null,
    },
    create: {
      userId,
      type,
      status: VerificationStatus.PENDING,
      notes: notes || "Verification submitted by user",
    },
  })

  return capability
}


