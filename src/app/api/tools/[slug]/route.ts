import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

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
        include: { reviews: { include: { user: true } } },
      })
    } else {
      tool = await prisma.tool.findFirst({
        where: { OR: [{ id: slug }, { name: { contains: slug } }] },
        include: { reviews: { include: { user: true } } },
      })
    }

    if (!tool) {
      return NextResponse.json({ success: false, error: "Tool not found" }, { status: 404 })
    }

    return NextResponse.json({ success: true, data: tool })
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
