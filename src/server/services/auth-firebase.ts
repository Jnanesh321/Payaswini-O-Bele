import { prisma } from "@/server/db/prisma"
import { VerificationStatus } from "@prisma/client"
import type { VerifiedFirebaseToken } from "@/lib/firebase/admin"
import type { SessionUser } from "@/lib/auth-session"

export class FirebaseUserLinkingError extends Error {
  readonly statusCode: number
  constructor(message: string, statusCode: number = 400) {
    super(message)
    this.name = "FirebaseUserLinkingError"
    this.statusCode = statusCode
  }
}

/**
 * Normalizes any Indian phone representation (+91 98451 00002, 9845100002, etc.)
 * into canonical 12-digit format ("919845100002") and 10-digit format ("9845100002").
 */
export function normalizePhone(phoneInput?: string | null): { normalized: string; raw10: string } | null {
  if (!phoneInput) return null
  const digits = phoneInput.replace(/\D/g, "")
  if (digits.length === 10) {
    return { normalized: `91${digits}`, raw10: digits }
  }
  if (digits.length === 12 && digits.startsWith("91")) {
    return { normalized: digits, raw10: digits.slice(2) }
  }
  if (digits.length > 10) {
    // If country code is prefixed (e.g. +91)
    const last10 = digits.slice(-10)
    return { normalized: `91${last10}`, raw10: last10 }
  }
  return null
}

/**
 * Authoritatively resolves or links a verified Firebase identity to a Prisma User.
 *
 * Linking Rules:
 * 1. If a user already exists with `firebaseUid === uid`, return that user.
 * 2. If a user exists with matching `phone` but no `firebaseUid`, link `firebaseUid = uid`
 *    and set `phoneVerified = true`. This seamlessly migrates existing database users
 *    (e.g., Raju, Suresh, Santhosh) without duplicate account creation.
 * 3. If no user exists with matching UID or phone, provision a new User record with
 *    default verified FARMER capability.
 */
export async function resolveOrCreateFirebaseUser(
  token: VerifiedFirebaseToken
): Promise<SessionUser> {
  const { uid, email, name, picture } = token
  const phoneNumber = token.phoneNumber || token.phone_number || (token as unknown as Record<string, string>).phone

  if (!uid) {
    throw new FirebaseUserLinkingError("Missing Firebase UID in verified token", 400)
  }

  // 1. Check if user is already linked by Firebase UID
  let user = await prisma.user.findUnique({
    where: { firebaseUid: uid },
    include: {
      capabilities: {
        where: { status: VerificationStatus.VERIFIED },
        select: { type: true },
      },
    },
  })

  if (user) {
    return formatSessionUser(user)
  }

  // 2. Lookup by phone number to link existing accounts
  const parsedPhone = normalizePhone(phoneNumber)
  if (parsedPhone) {
    const existingPhoneUser = await prisma.user.findFirst({
      where: {
        OR: [
          { phone: parsedPhone.normalized },
          { phone: parsedPhone.raw10 },
        ],
      },
      include: {
        capabilities: {
          where: { status: VerificationStatus.VERIFIED },
          select: { type: true },
        },
      },
    })

    if (existingPhoneUser) {
      // Link the existing user to this Firebase UID
      user = await prisma.user.update({
        where: { id: existingPhoneUser.id },
        data: {
          firebaseUid: uid,
          phoneVerified: true,
          ...(name && !existingPhoneUser.name ? { name } : {}),
          ...(email && !existingPhoneUser.email ? { email } : {}),
          ...(picture && !existingPhoneUser.image ? { image: picture } : {}),
        },
        include: {
          capabilities: {
            where: { status: VerificationStatus.VERIFIED },
            select: { type: true },
          },
        },
      })

      return formatSessionUser(user)
    }
  }

  // 3. Provision new user if not found by UID or phone
  const canonicalPhone = parsedPhone ? parsedPhone.normalized : `91${uid.slice(0, 10).replace(/\D/g, "").padEnd(10, "0")}`

  user = await prisma.user.create({
    data: {
      phone: canonicalPhone,
      firebaseUid: uid,
      name: name || `Farmer ${canonicalPhone.slice(-4)}`,
      email: email || undefined,
      image: picture || undefined,
      phoneVerified: true,
      capabilities: {
        create: [
          {
            type: "FARMER",
            status: VerificationStatus.VERIFIED,
            verifiedAt: new Date(),
          },
        ],
      },
    },
    include: {
      capabilities: {
        where: { status: VerificationStatus.VERIFIED },
        select: { type: true },
      },
    },
  })

  return formatSessionUser(user)
}

function formatSessionUser(user: {
  id: string
  firebaseUid?: string | null
  phone: string
  name?: string | null
  email?: string | null
  image?: string | null
  isAdmin: boolean
  capabilities: { type: string }[]
}): SessionUser {
  return {
    id: user.id,
    firebaseUid: user.firebaseUid || undefined,
    phone: user.phone,
    name: user.name,
    email: user.email,
    image: user.image,
    isAdmin: user.isAdmin,
    capabilities: user.capabilities.map((c) => c.type),
  }
}
