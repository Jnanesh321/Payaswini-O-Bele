import { NextRequest, NextResponse } from "next/server"
import { requireAdmin, AuthGuardError } from "@/server/lib/auth-guard"
import { listAdminEquipment } from "@/server/services/equipment"

export async function GET(request: NextRequest) {
  try {
    await requireAdmin()
    const { searchParams } = new URL(request.url)
    const status = searchParams.get("status") || "ALL"
    const search = searchParams.get("search") || undefined

    const data = await listAdminEquipment({ status, search })
    return NextResponse.json({ success: true, data })
  } catch (error) {
    if (error instanceof AuthGuardError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.statusCode },
      )
    }
    console.error("Failed to list admin equipment:", error)
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    )
  }
}
