import { NextRequest, NextResponse } from "next/server"
import { requireAuth, AuthGuardError } from "@/server/lib/auth-guard"
import { getAssetByCode } from "@/server/services/bookings"

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ assetCode: string }> },
) {
  try {
    await requireAuth()
    const { assetCode } = await params

    const asset = await getAssetByCode(assetCode)
    if (!asset) {
      return NextResponse.json({ success: false, error: "Asset not found" }, { status: 404 })
    }

    return NextResponse.json({ success: true, data: asset })
  } catch (error) {
    if (error instanceof AuthGuardError) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.statusCode })
    }
    console.error("Asset lookup error:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}
