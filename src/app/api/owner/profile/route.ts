import { NextResponse } from "next/server"
import { getServerSession } from "@/lib/auth"
import { getOwnerProfile, OwnerServiceError } from "@/server/services/owners"

export async function GET() {
  const session = await getServerSession()
  if (!session?.user) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }

  try {
    const data = await getOwnerProfile(session.user.id)
    return NextResponse.json({ success: true, data })
  } catch (error) {
    if (error instanceof OwnerServiceError) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.statusCode })
    }
    throw error
  }
}
