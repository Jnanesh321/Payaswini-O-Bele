import { prisma } from "@/server/db/prisma"
import { getServerSession } from "@/server/lib/auth"
import { UtilityFeedClient } from "@/components/home/utility-feed-client"
import type { ToolCard as ToolCardType } from "@/types"
import type { ActiveBookingData } from "@/components/home/active-rental-banner"
import type { BookingStatus } from "@prisma/client"

import { resolveToolImage } from "@/lib/tool-images"

export const dynamic = "force-dynamic"

function mapMachineryPhoto(
  name: string,
  category: string,
  existingImages?: string[],
  thumbnailUrl?: string | null
): string {
  const first = existingImages?.[0] || thumbnailUrl
  return resolveToolImage(first, category, name)
}

async function getToolsForFeed(): Promise<ToolCardType[]> {
  try {
    const rows = await prisma.tool.findMany({
      where: { isActive: true },
      orderBy: [{ isFeatured: "desc" }, { createdAt: "desc" }],
      include: {
        instances: {
          include: {
            owner: {
              select: {
                id: true,
                name: true,
                taluk: true,
                district: true,
              },
            },
          },
        },
      },
    })

    return rows.map((t) => {
      const totalCount = t.instances.length
      const availableCount = t.instances.filter((i) => i.status === "AVAILABLE").length
      const owner = t.instances[0]?.owner
      const photo = mapMachineryPhoto(t.name, t.category, t.images, t.thumbnailUrl)

      return {
        id: t.id,
        slug: t.slug,
        name: t.name,
        translations: t.translations as ToolCardType["translations"],
        description: t.description,
        category: t.category,
        images: [photo, ...t.images.filter((img) => !img.includes("cloudinary") && !img.endsWith(".svg"))],
        thumbnailUrl: photo,
        pricePerDay: t.pricePerDay,
        deposit: t.deposit,
        availableCount,
        totalCount,
        minRentalDays: t.minRentalDays,
        maxRentalDays: t.maxRentalDays,
        isActive: t.isActive,
        isFeatured: t.isFeatured,
        deliveryAvailable: t.deliveryAvailable,
        deliveryRadiusKm: t.deliveryRadiusKm,
        freeDeliveryRadiusKm: t.freeDeliveryRadiusKm,
        requiresCertifiedOperator: t.requiresCertifiedOperator,
        operatorFeePerDay: t.operatorFeePerDay,
        taluk: owner?.taluk || "Badiadka",
        canSelfOperate: !t.requiresCertifiedOperator,
        ownerName: owner?.name || "Verified Owner",
        ownerVerified: true,
        owner: owner
          ? {
              id: owner.id,
              name: owner.name || "Verified Owner",
              isVerified: true,
            }
          : null,
        createdAt: t.createdAt.toISOString(),
      }
    })
  } catch (err) {
    console.warn("[HomePage] DB error fetching tools:", err)
    return []
  }
}

async function getActiveBookingForUser(): Promise<ActiveBookingData | null> {
  try {
    const session = await getServerSession()
    if (!session?.user?.id) return null

    const terminalStatuses: BookingStatus[] = [
      "COMPLETED",
      "CANCELLED_BY_FARMER",
      "CANCELLED_BY_OWNER",
      "CANCELLED_BY_OPERATOR",
      "CANCELLED_BY_PLATFORM",
      "FAILED_NO_OPERATOR",
      "DISPUTED",
    ]

    const booking = await prisma.booking.findFirst({
      where: {
        farmerId: session.user.id,
        status: { notIn: terminalStatuses },
      },
      orderBy: { updatedAt: "desc" },
      include: {
        tool: { select: { name: true } },
        servicePerformer: { select: { name: true } },
      },
    })

    if (!booking) return null

    return {
      id: booking.id,
      bookingRef: booking.bookingRef,
      status: booking.status,
      toolName: booking.tool?.name || "Machinery Rental",
      operatorName: booking.servicePerformer?.name || null,
      startDate: booking.startDate,
      endDate: booking.endDate,
      serviceType: booking.serviceType,
    }
  } catch (err) {
    console.warn("[HomePage] Error fetching active booking:", err)
    return null
  }
}

export default async function HomePage() {
  const [tools, activeBooking] = await Promise.all([
    getToolsForFeed(),
    getActiveBookingForUser(),
  ])

  return (
    <UtilityFeedClient
      initialTools={tools}
      activeBooking={activeBooking}
    />
  )
}
