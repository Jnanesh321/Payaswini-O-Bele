import { NextResponse } from "next/server"
import { getServerSession } from "@/server/lib/auth"

export async function GET() {
  const session = await getServerSession()
  if (!session?.user) {
    return NextResponse.json({ success: false, user: null }, { status: 401 })
  }
  return NextResponse.json({ success: true, user: session.user })
}
