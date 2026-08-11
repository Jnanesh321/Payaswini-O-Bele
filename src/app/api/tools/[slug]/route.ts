import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getServerSession } from "@/lib/auth"
import { VerificationStatus } from "@prisma/client"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params
    let tool

    if (slug.match(/^[0-9a-fA-F]{25,}$/)) {
      tool = await prisma.tool.findUnique({
        where: { id: slug },
        include: {
          reviews: { include: { user: true } },
          instances: { include: { owner: { select: { id: true, name: true } } } },
        },
      })
    } else {
      tool = await prisma.tool.findFirst({
        where: { OR: [{ id: slug }, { name: { contains: slug } }] },
        include: {
          reviews: { include: { user: true } },
          instances: { include: { owner: { select: { id: true, name: true } } } },
        },
      })
    }

    if (!tool) {
      return NextResponse.json({ success: false, error: "Tool not found" }, { status: 404 })
    }

    // The listing owner is the owner of this tool's physical instances
    // (seed data has a single owner per tool type).
    const { instances, ...toolWithoutInstances } = tool
    const owner = instances[0]?.owner ?? null

    // Self-operate is only offered when the current farmer has a VERIFIED
    // permission from this Tool Owner.
    const session = await getServerSession()
    let canSelfOperate = false
    if (session?.user?.id && owner) {
      const permission = await prisma.selfOperatePermission.findUnique({
        where: {
          farmerId_toolOwnerId: {
            farmerId: session.user.id,
            toolOwnerId: owner.id,
          },
        },
      })
      canSelfOperate = permission?.status === VerificationStatus.VERIFIED
    }

    return NextResponse.json({
      success: true,
      data: {
        ...toolWithoutInstances,
        toolOwner: owner,
        canSelfOperate,
      },
    })
  } catch (error) {
    return NextResponse.json({ success: false, error: "Failed to fetch tool" }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params
    const body = await request.json()
    const tool = await prisma.tool.update({
      where: { id: slug },
      data: body,
    })
    return NextResponse.json({ success: true, data: tool })
  } catch (error) {
    return NextResponse.json({ success: false, error: "Failed to update tool" }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params
    await prisma.tool.delete({ where: { id: slug } })
    return NextResponse.json({ success: true, message: "Tool deleted" })
  } catch (error) {
    return NextResponse.json({ success: false, error: "Failed to delete tool" }, { status: 500 })
  }
}
