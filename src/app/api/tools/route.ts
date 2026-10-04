import { NextRequest, NextResponse } from "next/server"
import { requireAdmin, AuthGuardError } from "@/server/lib/auth-guard"
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
    const message = error instanceof Error ? error.message : "Failed to fetch tools"
    const dbUrl = process.env.DATABASE_URL || process.env.POSTGRES_PRISMA_URL || process.env.POSTGRES_URL
    let dbHost = "UNSET"
    try {
      if (dbUrl) {
        dbHost = new URL(dbUrl).host
      }
    } catch {}
    const envKeys = Object.keys(process.env).filter(k => k.includes("DATABASE") || k.includes("POSTGRES") || k.includes("FIREBASE"))
    console.error("[Tools API Error]:", error)
    return NextResponse.json({ success: false, error: message, dbHost, envKeys }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdmin()
    const body = await request.json()
    const tool = await createTool(body)
    return NextResponse.json({ success: true, data: tool }, { status: 201 })
  } catch (error) {
    if (error instanceof AuthGuardError) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.statusCode })
    }
    return NextResponse.json({ success: false, error: "Failed to create tool" }, { status: 500 })
  }
}
