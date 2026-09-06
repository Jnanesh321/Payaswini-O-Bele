import { NextRequest, NextResponse } from "next/server"
import { requireAuth, AuthGuardError } from "@/server/lib/auth-guard"
import { getUserProfile, updateUserProfile } from "@/server/services/users"

export async function GET() {
  try {
    const user = await requireAuth()
    const profile = await getUserProfile(user.id)
    return NextResponse.json({ success: true, data: profile })
  } catch (error) {
    if (error instanceof AuthGuardError) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.statusCode })
    }
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await requireAuth()
    const body = await request.json()

    // Whitelist only safe user-editable fields (strictly forbid isAdmin, phoneVerified, aadhaarVerified, phone, id)
    const allowedData: Record<string, string | null> = {}
    if (typeof body.name === "string") allowedData.name = body.name.trim()
    if (typeof body.email === "string") allowedData.email = body.email.trim() || null
    if (typeof body.village === "string") allowedData.village = body.village.trim()
    if (typeof body.taluk === "string") allowedData.taluk = body.taluk.trim()
    if (typeof body.district === "string") allowedData.district = body.district.trim()
    if (typeof body.pincode === "string") allowedData.pincode = body.pincode.trim()
    if (typeof body.image === "string") allowedData.image = body.image.trim()
    if (typeof body.preferredLang === "string") allowedData.preferredLang = body.preferredLang.trim()

    const updatedUser = await updateUserProfile(user.id, allowedData)
    return NextResponse.json({ success: true, data: updatedUser })
  } catch (error) {
    if (error instanceof AuthGuardError) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.statusCode })
    }
    return NextResponse.json({ success: false, error: "Update failed" }, { status: 500 })
  }
}
