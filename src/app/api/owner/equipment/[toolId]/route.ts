import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getServerSession } from "@/lib/auth"
import { ToolInstanceStatus } from "@prisma/client"

// Availability toggle for ALL of the owner's instances of a tool.
// Maps the reference "Available / Paused" switch onto AVAILABLE ⇄ MAINTENANCE
// (the schema has no PAUSED status). Instances that are mid-booking are left
// untouched — only AVAILABLE and MAINTENANCE instances flip.
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

  const instances = await prisma.toolInstance.findMany({
    where: {
      toolId,
      ownerId: session.user.id,
      status: { in: [ToolInstanceStatus.AVAILABLE, ToolInstanceStatus.MAINTENANCE] },
    },
    select: { id: true },
  })

  if (instances.length === 0) {
    return NextResponse.json({ success: false, error: "No toggleable instances found" }, { status: 404 })
  }

  await prisma.toolInstance.updateMany({
    where: { id: { in: instances.map((i) => i.id) } },
    data: { status: available ? ToolInstanceStatus.AVAILABLE : ToolInstanceStatus.MAINTENANCE },
  })

  return NextResponse.json({ success: true, data: { toolId, available } })
}
