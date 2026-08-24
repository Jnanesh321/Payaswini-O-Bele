import { NextResponse } from "next/server"
import { getServerSession } from "@/lib/auth"
import { getOwnerEquipment } from "@/server/services/owners"

export async function GET() {
  const session = await getServerSession()
  if (!session?.user) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }

  const data = await getOwnerEquipment(session.user.id)
  return NextResponse.json({ success: true, data })
}
