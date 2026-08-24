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
    }),
    prisma.tool.count({ where }),
  ])

  return {
    tools,
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
  }
}

// ─── Create tool ─────────────────────────────────────────────────────────────

export async function createTool(data: Prisma.ToolCreateInput) {
  return prisma.tool.create({ data })
}

// ─── Get tool by slug or ID ──────────────────────────────────────────────────

export async function getToolBySlug(slug: string) {
  let tool

  if (slug.match(/^[0-9a-fA-F]{25,}$/)) {
    tool = await prisma.tool.findUnique({
      where: { id: slug },
      include: {
        reviews: { include: { user: true } },
        instances: { include: { owner: { select: { id: true, name: true } } } },
      },
    })
  } else {
    tool = await prisma.tool.findFirst({
      where: { OR: [{ id: slug }, { name: { contains: slug } }] },
      include: {
        reviews: { include: { user: true } },
        instances: { include: { owner: { select: { id: true, name: true } } } },
      },
    })
  }

  if (!tool) return null

  const { instances, ...toolWithoutInstances } = tool
  const owner = instances[0]?.owner ?? null

  const session = await getServerSession()
  let canSelfOperate = false
  if (session?.user?.id && owner) {
    const permission = await prisma.selfOperatePermission.findUnique({
      where: {
        farmerId_toolOwnerId: {
          farmerId: session.user.id,
          toolOwnerId: owner.id,
        },
      },
    })
    canSelfOperate = permission?.status === VerificationStatus.VERIFIED
  }

  return {
    ...toolWithoutInstances,
    toolOwner: owner,
    canSelfOperate,
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
