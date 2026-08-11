import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const category = searchParams.get("category")
    const sortBy = searchParams.get("sortBy")
    const minPrice = searchParams.get("minPrice")
    const maxPrice = searchParams.get("maxPrice")
    const search = searchParams.get("search")
    const page = parseInt(searchParams.get("page") || "1")
    const limit = parseInt(searchParams.get("limit") || "12")

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

    return NextResponse.json({
      success: true,
      data: tools,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    })
  } catch (error) {
    return NextResponse.json({ success: false, error: "Failed to fetch tools" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const tool = await prisma.tool.create({ data: body })
    return NextResponse.json({ success: true, data: tool }, { status: 201 })
  } catch (error) {
    return NextResponse.json({ success: false, error: "Failed to create tool" }, { status: 500 })
  }
}
