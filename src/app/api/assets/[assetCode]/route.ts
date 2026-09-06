import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "@/lib/auth"
import { getAssetByCode } from "@/server/services/bookings"

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ assetCode: string }> },
) {
  const session = await getServerSession()
  if (!session?.user?.id) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }

  const { assetCode } = await params

  try {
    const asset = await getAssetByCode(assetCode)
    if (!asset) {
      return NextResponse.json({ success: false, error: "Asset not found" }, { status: 404 })
    }

    return NextResponse.json({ success: true, data: asset })
  } catch (error) {
    console.error("Asset lookup error:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}
