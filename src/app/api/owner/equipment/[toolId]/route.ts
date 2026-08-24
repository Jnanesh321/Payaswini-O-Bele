import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "@/lib/auth"
import { toggleToolAvailability, OwnerServiceError } from "@/server/services/owners"

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ toolId: string }> },
) {
  const session = await getServerSession()
  if (!session?.user) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }

  const { toolId } = await params
  const body = await request.json().catch(() => ({}))
  const { available } = body

  if (typeof available !== "boolean") {
    return NextResponse.json({ success: false, error: "Missing `available` boolean" }, { status: 400 })
  }

  try {
    const data = await toggleToolAvailability(session.user.id, toolId, available)
    return NextResponse.json({ success: true, data })
  } catch (error) {
    if (error instanceof OwnerServiceError) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.statusCode })
    }
    throw error
  }
}
