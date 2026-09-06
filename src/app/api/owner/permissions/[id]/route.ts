import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "@/lib/auth"
import { revokeOwnerPermission, deleteOwnerPermission, OwnerServiceError } from "@/server/services/owners"

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession()
  if (!session?.user?.id) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params

  try {
    const result = await deleteOwnerPermission(session.user.id, id)
    return NextResponse.json({ success: true, data: result })
  } catch (error) {
    if (error instanceof OwnerServiceError) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.statusCode })
    }
    console.error("Failed to delete permission:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}

export async function PATCH(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession()
  if (!session?.user?.id) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params

  try {
    const result = await revokeOwnerPermission(session.user.id, id)
    return NextResponse.json({ success: true, data: result })
  } catch (error) {
    if (error instanceof OwnerServiceError) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.statusCode })
    }
    console.error("Failed to revoke permission:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}
