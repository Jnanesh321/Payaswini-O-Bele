import { NextRequest, NextResponse } from "next/server"
import { getToolBySlug, updateTool, deleteTool } from "@/server/services/tools"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await params
    const tool = await getToolBySlug(slug)
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
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await params
    const body = await request.json()
    const tool = await updateTool(slug, body)
    return NextResponse.json({ success: true, data: tool })
  } catch (error) {
    return NextResponse.json({ success: false, error: "Failed to update tool" }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await params
    await deleteTool(slug)
    return NextResponse.json({ success: true, message: "Tool deleted" })
  } catch (error) {
    return NextResponse.json({ success: false, error: "Failed to delete tool" }, { status: 500 })
  }
}
