import { prisma } from "@/server/db/prisma"
import { getServerSession } from "@/server/lib/auth"
import { UtilityFeedClient } from "@/components/home/utility-feed-client"
import type { ToolCard as ToolCardType } from "@/types"
import type { ActiveBookingData } from "@/components/home/active-rental-banner"
import type { BookingStatus } from "@prisma/client"

export const dynamic = "force-dynamic"

function mapMachineryPhoto(
  name: string,
  category: string,
  existingImages?: string[],
  thumbnailUrl?: string | null
): string {
  const n = (name || "").toLowerCase()
  const c = (category || "").toUpperCase()

  // 1. Power Tiller -> /images/tools/power-tiller.png
  if (n.includes("tiller") || n.includes("cultivator") || n.includes("shakti") || c.includes("TILLER")) {
    return "/images/tools/power-tiller.png"
  }

  // 2. Arecanut / Climbing Pole -> /images/tools/arecanut-pole.png
  if (
    n.includes("pole") ||
    n.includes("areca") ||
    n.includes("harvest") ||
    n.includes("climb") ||
    c.includes("CLIMB") ||
    c.includes("HARVEST")
  ) {
    return "/images/tools/arecanut-pole.png"
  }

  // 3. Weed / Brush Cutter -> /images/tools/brush-cutter.png
  if (
    n.includes("cutter") ||
    n.includes("brush") ||
    n.includes("weed") ||
    n.includes("pruner") ||
    c.includes("PRUNER") ||
    c.includes("CUTTER")
  ) {
    return "/images/tools/brush-cutter.png"
  }

  // 4. Tractor
  if (n.includes("tractor") || c.includes("TRACTOR")) {
    return "/images/tools/tractor.png"
  }

  // Check if existing valid non-svg, non-cloudinary image
  const first = existingImages?.[0] || thumbnailUrl
  if (first && !first.includes("cloudinary") && !first.endsWith(".svg")) {
    return first
  }

  // Fallback to first valid tool image (never an abstract SVG box)
  return "/images/tools/power-tiller.png"
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
