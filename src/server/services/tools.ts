import { Prisma, VerificationStatus } from "@prisma/client"
import { prisma } from "@/server/db/prisma"
import { getServerSession } from "@/server/lib/auth"

// ─── List tools (filtered, paginated) ────────────────────────────────────────

export async function listTools(params: {
  category?: string
  sortBy?: string
  minPrice?: string
  maxPrice?: string
  search?: string
  page?: number
  limit?: number
}) {
  const { category, sortBy, minPrice, maxPrice, search, page = 1, limit = 12 } = params

  const where: Record<string, unknown> = { isActive: true }
  if (category && category !== "all") where.category = category
  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
    ]
  }
  if (minPrice || maxPrice) {
    const priceFilter: Record<string, number> = {}
    if (minPrice) priceFilter.gte = parseFloat(minPrice)
    if (maxPrice) priceFilter.lte = parseFloat(maxPrice)
    where.pricePerDay = priceFilter
  }

  const orderBy: Record<string, string> = { createdAt: "desc" }
  if (sortBy === "price_asc") orderBy.pricePerDay = "asc"
  else if (sortBy === "price_desc") orderBy.pricePerDay = "desc"

  const [tools, total] = await Promise.all([
    prisma.tool.findMany({
      where,
      orderBy,
      skip: (page - 1) * limit,
      take: limit,
      include: {
        instances: {
          where: { verificationStatus: "VERIFIED" },
          include: {
            owner: {
              select: {
                id: true,
                name: true,
                image: true,
                village: true,
                taluk: true,
                district: true,
                phone: true,
              },
            },
          },
        },
      },
    }),
    prisma.tool.count({ where }),
  ])

  const mappedTools = tools.map((t) => {
    const { instances, ...rest } = t
    const availableInstances = instances.filter((i) => i.status === "AVAILABLE")
    const ownerOffers = availableInstances.map((inst) => {
      const pricePerDay = inst.pricePerDay ?? t.pricePerDay
      const deposit = inst.deposit ?? t.deposit
      const location =
        [inst.owner.village, inst.owner.taluk].filter(Boolean).join(", ") ||
        inst.owner.district ||
        "Coastal Karnataka"
      return {
        instanceId: inst.id,
        assetCode: inst.assetCode,
        ownerId: inst.owner.id,
        ownerName: inst.owner.name ?? "Verified Tool Owner",
        ownerLocation: location,
        taluk: inst.owner.taluk || "Puttur",
        pricePerDay,
        deposit,
        images: inst.images?.length ? inst.images : t.images,
        conditionGrade: inst.conditionGrade || "GOOD",
        rating: inst.rating ?? 4.8,
        reviewCount: inst.reviewCount ?? 0,
        notes: inst.notes,
      }
    })
    const prices = ownerOffers.map((o) => o.pricePerDay)
    const minPrice = prices.length ? Math.min(...prices) : t.pricePerDay
    const maxPrice = prices.length ? Math.max(...prices) : t.pricePerDay

    return {
      ...rest,
      totalCount: instances.length,
      availableCount: availableInstances.length,
      minPrice,
      maxPrice,
      ownerOffers,
    }
  })

  return {
    tools: mappedTools,
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
  }
}

// ─── Create tool ─────────────────────────────────────────────────────────────

export async function createTool(data: Prisma.ToolCreateInput) {
  return prisma.tool.create({ data })
}

// ─── Get tool by slug or ID ──────────────────────────────────────────────────

export async function getToolBySlug(slug: string) {
  const include = {
    reviews: { include: { user: { select: { id: true, name: true, image: true } } } },
    instances: {
      where: { verificationStatus: VerificationStatus.VERIFIED },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            image: true,
            village: true,
            taluk: true,
            district: true,
            phone: true,
          },
        },
      },
      orderBy: { pricePerDay: "asc" as const },
    },
  }

  let tool = null
  if (slug.match(/^[0-9a-fA-F]{25,}$/)) {
    tool = await prisma.tool.findUnique({
      where: { id: slug },
      include,
    })
  } else {
    tool = await prisma.tool.findFirst({
      where: { OR: [{ id: slug }, { slug: slug }] },
      include,
    })
  }

  if (!tool) return null

  const { instances, ...toolWithoutInstances } = tool

  const session = await getServerSession()
  const userId = session?.user?.id

  // Fetch self-operate permissions if logged in
  const userPermissions = userId
    ? await prisma.selfOperatePermission.findMany({
        where: { farmerId: userId, status: VerificationStatus.VERIFIED },
        select: { toolOwnerId: true },
      })
    : []
  const verifiedOwnerIds = new Set(userPermissions.map((p) => p.toolOwnerId))

  const availableInstances = instances.filter((i) => i.status === "AVAILABLE")
  const ownerOffers = availableInstances.map((inst) => {
    const effectivePrice = inst.pricePerDay ?? tool.pricePerDay
    const effectiveDeposit = inst.deposit ?? tool.deposit
    const ownerLocation =
      [inst.owner.village, inst.owner.taluk].filter(Boolean).join(", ") ||
      inst.owner.district ||
      "Coastal Karnataka"

    return {
      instanceId: inst.id,
      assetCode: inst.assetCode,
      ownerId: inst.owner.id,
      ownerName: inst.owner.name ?? "Verified Tool Owner",
      ownerLocation,
      taluk: inst.owner.taluk || "Puttur",
      pricePerDay: effectivePrice,
      deposit: effectiveDeposit,
      images: inst.images.length > 0 ? inst.images : tool.images,
      conditionGrade: inst.conditionGrade || "GOOD",
      rating: inst.rating ?? 4.8,
      reviewCount: inst.reviewCount ?? 0,
      notes: inst.notes,
      canSelfOperate: verifiedOwnerIds.has(inst.owner.id),
    }
  })

  const primaryOwner = instances[0]?.owner ?? null
  const prices = ownerOffers.map((o) => o.pricePerDay)
  const minPrice = prices.length ? Math.min(...prices) : tool.pricePerDay
  const maxPrice = prices.length ? Math.max(...prices) : tool.pricePerDay

  return {
    ...toolWithoutInstances,
    totalCount: instances.length,
    availableCount: availableInstances.length,
    toolOwner: primaryOwner,
    canSelfOperate: primaryOwner ? verifiedOwnerIds.has(primaryOwner.id) : false,
    minPrice,
    maxPrice,
    ownerOffers,
  }
}

// ─── Update tool ─────────────────────────────────────────────────────────────

export async function updateTool(slug: string, data: Prisma.ToolUncheckedUpdateInput) {
  return prisma.tool.update({
    where: { id: slug },
    data,
  })
}

// ─── Delete tool ─────────────────────────────────────────────────────────────

export async function deleteTool(slug: string) {
  return prisma.tool.delete({ where: { id: slug } })
}

// ─── Tool categories ─────────────────────────────────────────────────────────

export function getToolCategories() {
  return [
    { id: "CLIMBING_POLES", name: "Climbing Poles", slug: "climbing-poles" },
    { id: "TILLERS", name: "Tillers", slug: "tillers" },
    { id: "NETS_COVERS", name: "Nets & Covers", slug: "nets-covers" },
    { id: "TRANSPLANTERS", name: "Transplanters", slug: "transplanters" },
    { id: "SPRAYERS", name: "Sprayers", slug: "sprayers" },
    { id: "PRUNERS_CUTTERS", name: "Pruners & Cutters", slug: "pruners-cutters" },
    { id: "WATER_PUMPS", name: "Water Pumps", slug: "water-pumps" },
    { id: "HARVESTING_TOOLS", name: "Harvesting Tools", slug: "harvesting-tools" },
  ]
}
