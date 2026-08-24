import { NextResponse } from "next/server"
import { getServerSession } from "@/lib/auth"
import { listOperatorJobs } from "@/server/services/operators"

export async function GET() {
  const session = await getServerSession()
  if (!session?.user) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }

  const data = await listOperatorJobs(session.user.id)
  return NextResponse.json({ success: true, data })
}
