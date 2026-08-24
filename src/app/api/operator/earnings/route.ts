import { NextResponse } from "next/server"
import { getServerSession } from "@/lib/auth"
import { getOperatorEarnings } from "@/server/services/operators"

export async function GET(request: Request) {
  const session = await getServerSession()
  if (!session?.user) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }

  const url = new URL(request.url)
  const periodParam = url.searchParams.get("period")
  const data = await getOperatorEarnings(session.user.id, periodParam)
  return NextResponse.json({ success: true, data })
}
