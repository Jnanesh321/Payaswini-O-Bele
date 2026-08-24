import { NextRequest, NextResponse } from "next/server"
import { listTools, createTool } from "@/server/services/tools"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const result = await listTools({
      category: searchParams.get("category") ?? undefined,
      sortBy: searchParams.get("sortBy") ?? undefined,
      minPrice: searchParams.get("minPrice") ?? undefined,
      maxPrice: searchParams.get("maxPrice") ?? undefined,
      search: searchParams.get("search") ?? undefined,
      page: parseInt(searchParams.get("page") || "1"),
      limit: parseInt(searchParams.get("limit") || "12"),
    })
    return NextResponse.json({
      success: true,
      data: result.tools,
      meta: result.meta,
    })
  } catch (error) {
    return NextResponse.json({ success: false, error: "Failed to fetch tools" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const tool = await createTool(body)
    return NextResponse.json({ success: true, data: tool }, { status: 201 })
  } catch (error) {
    return NextResponse.json({ success: false, error: "Failed to create tool" }, { status: 500 })
  }
}
