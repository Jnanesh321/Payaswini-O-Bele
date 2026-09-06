import { NextRequest, NextResponse } from "next/server"
import { requireCapability, AuthGuardError } from "@/server/lib/auth-guard"
import { getOwnerEquipment } from "@/server/services/owners"
import { prisma } from "@/server/db/prisma"
import { CapabilityType, ToolCategory, ToolInstanceStatus } from "@prisma/client"

export async function GET() {
  try {
    const user = await requireCapability(CapabilityType.TOOL_OWNER)
    const data = await getOwnerEquipment(user.id)
    return NextResponse.json({ success: true, data })
  } catch (error) {
    if (error instanceof AuthGuardError) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.statusCode })
    }
    console.error("Failed to fetch equipment:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireCapability(CapabilityType.TOOL_OWNER)
    const body = await request.json()
    const {
      name,
      category,
      pricePerDay,
      deposit,
      requiresCertifiedOperator,
      operatorFeePerDay,
      description,
      quantity,
      imageUrl,
    } = body

    // Validation
    if (!name || !category || !pricePerDay || !description) {
      return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 })
    }

    const rate = parseInt(pricePerDay)
    const dep = parseInt(deposit || 0)
    const qty = parseInt(quantity || 1)
    const opFee = requiresCertifiedOperator ? parseInt(operatorFeePerDay || 0) : 0

    if (isNaN(rate) || isNaN(dep) || isNaN(qty) || (requiresCertifiedOperator && isNaN(opFee))) {
      return NextResponse.json({ success: false, error: "Invalid pricing or quantity numbers" }, { status: 400 })
    }

    // Generate unique slug
    const baseSlug = name.toLowerCase().replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "")
    const randomSuffix = Math.floor(1000 + Math.random() * 9000)
    const slug = `${baseSlug}-${randomSuffix}`

    // Assign image
    let toolImage = imageUrl?.trim()
    if (!toolImage) {
      // Fallback based on category
      switch (category as ToolCategory) {
        case ToolCategory.TILLERS:
          toolImage = "/images/power-tiller.svg"
          break
        case ToolCategory.SPRAYERS:
          toolImage = "/images/battery-sprayer.svg"
          break
        case ToolCategory.CLIMBING_POLES:
          toolImage = "/images/carbon-fiber-pole.svg"
          break
        case ToolCategory.PRUNERS_CUTTERS:
          toolImage = "/images/weed-cutter.svg"
          break
        default:
          toolImage = "/images/power-tiller.svg"
      }
    }

    // Create Tool and ToolInstance in a transaction
    const userId = user.id
    
    const result = await prisma.$transaction(async (tx) => {
      // Create Tool
      const tool = await tx.tool.create({
        data: {
          name,
          slug,
          description,
          category: category as ToolCategory,
          images: [toolImage],
          thumbnailUrl: toolImage,
          pricePerDay: rate,
          deposit: dep,
          requiresCertifiedOperator,
          operatorFeePerDay: opFee,
        }
      })

      // Generate helper to construct unique assetCodes
      const generateAssetCode = (toolName: string, index: number) => {
        const prefix = toolName
          .toUpperCase()
          .replace(/[^A-Z]/g, "")
          .substring(0, 3) || "TL"
        return `${prefix}_${randomSuffix}_${String(index).padStart(3, "0")}`
      }

      // Create ToolInstance records
      const instancesData = Array.from({ length: qty }).map((_, i) => ({
        assetCode: generateAssetCode(name, i + 1),
        toolId: tool.id,
        ownerId: userId,
        status: ToolInstanceStatus.AVAILABLE,
        currentCustodianId: userId,
        notes: "Initial owner listing",
      }))

      await tx.toolInstance.createMany({
        data: instancesData
      })

      return tool
    })

    return NextResponse.json({ success: true, tool: result })
  } catch (error) {
    if (error instanceof AuthGuardError) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.statusCode })
    }
    console.error("Failed to add new tool:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}
