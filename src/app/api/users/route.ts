import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "@/lib/auth"
import { getUserProfile, updateUserProfile } from "@/server/services/users"

export async function GET() {
  const session = await getServerSession()
  if (!session?.user) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }

  const user = await getUserProfile(session.user.id)
  return NextResponse.json({ success: true, data: user })
}

export async function PUT(request: NextRequest) {
  const session = await getServerSession()
  if (!session?.user) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await request.json()
    const user = await updateUserProfile(session.user.id, body)
    return NextResponse.json({ success: true, data: user })
  } catch (error) {
    return NextResponse.json({ success: false, error: "Update failed" }, { status: 500 })
  }
}
