import { NextResponse } from "next/server"
import { getServerSession } from "@/lib/auth"
import { getAdminAssignments } from "@/server/services/admin"

export async function GET() {
  const session = await getServerSession()
  if (!session?.user) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }
  if (!session.user.isAdmin) {
    return NextResponse.json({ success: false, error: "Forbidden — admin only" }, { status: 403 })
  }

  const data = await getAdminAssignments()
  return NextResponse.json({ success: true, data })
}
