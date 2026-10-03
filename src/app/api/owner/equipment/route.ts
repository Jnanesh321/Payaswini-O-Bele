import { NextRequest, NextResponse } from "next/server"
import { requireCapability, AuthGuardError } from "@/server/lib/auth-guard"
import { getOwnerEquipment } from "@/server/services/owners"
import { prisma } from "@/server/db/prisma"
import { CapabilityType, ToolCategory, ToolInstanceStatus, VerificationStatus } from "@prisma/client"

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
      conditionGrade = "GOOD",
    } = body

    // Validation
    if (!name || !category || !pricePerDay || !description) {
      return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 })
    }

    const rateInr = parseInt(pricePerDay)
    const depInr = parseInt(deposit || 0)
    const qty = parseInt(quantity || 1)
    const opFeeInr = requiresCertifiedOperator ? parseInt(operatorFeePerDay || 0) : 0

    if (isNaN(rateInr) || isNaN(depInr) || isNaN(qty) || (requiresCertifiedOperator && isNaN(opFeeInr))) {
      return NextResponse.json({ success: false, error: "Invalid pricing or quantity numbers" }, { status: 400 })
    }

    // Platform guardrail limits (in Rupees)
    const minLimit = 100
    const maxLimit = 15000
    if (rateInr < minLimit || rateInr > maxLimit) {
      return NextResponse.json(
        { success: false, error: `Daily rental rate must be between ₹${minLimit} and ₹${maxLimit.toLocaleString("en-IN")}/day` },
        { status: 400 },
      )
    }

    const ratePaise = rateInr * 100
    const depPaise = depInr * 100
    const opFeePaise = opFeeInr * 100

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
          toolImage = "/images/tools/power-tiller.svg"
          break
        case ToolCategory.SPRAYERS:
          toolImage = "/images/tools/battery-sprayer.svg"
          break
        case ToolCategory.CLIMBING_POLES:
          toolImage = "/images/tools/carbon-fiber-pole.svg"
          break
        case ToolCategory.PRUNERS_CUTTERS:
          toolImage = "/images/tools/weed-cutter.svg"
          break
        default:
          toolImage = "/images/tools/power-tiller.svg"
      }
    }

    // Create Tool and ToolInstance in a transaction
    const userId = user.id
    
    const result = await prisma.$transaction(async (tx) => {
      // Check if a catalog tool of this category and similar name exists
      let tool = await tx.tool.findFirst({
        where: { category: category as ToolCategory, name: { contains: name.split(" ")[0], mode: "insensitive" } },
      })

      if (!tool) {
        tool = await tx.tool.create({
          data: {
            name,
            slug,
            description,
            category: category as ToolCategory,
            images: [toolImage],
            thumbnailUrl: toolImage,
            pricePerDay: ratePaise,
            deposit: depPaise,
            requiresCertifiedOperator: !!requiresCertifiedOperator,
            operatorFeePerDay: opFeePaise,
          },
        })
      }

      // Generate helper to construct unique assetCodes
      const generateAssetCode = (toolName: string, index: number) => {
        const prefix = toolName
          .toUpperCase()
          .replace(/[^A-Z]/g, "")
          .substring(0, 3) || "TL"
        return `${prefix}_${randomSuffix}_${String(index).padStart(3, "0")}`
      }

      // Create ToolInstance records with owner-specific rate, deposit, photos, condition, and PENDING status
      const instancesData = Array.from({ length: qty }).map((_, i) => ({
        assetCode: generateAssetCode(name, i + 1),
        toolId: tool.id,
        ownerId: userId,
        status: ToolInstanceStatus.AVAILABLE,
        currentCustodianId: userId,
        pricePerDay: ratePaise,
        deposit: depPaise,
        images: [toolImage],
        conditionGrade: typeof conditionGrade === "string" ? conditionGrade : "GOOD",
        verificationStatus: VerificationStatus.PENDING,
        notes: description,
      }))

      await tx.toolInstance.createMany({
        data: instancesData,
      })

      return tool
    })

    return NextResponse.json({
      success: true,
      tool: result,
      message: "Tool listing submitted successfully. Pending admin approval before going live.",
    })
  } catch (error) {
    if (error instanceof AuthGuardError) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.statusCode })
    }
    console.error("Failed to add new tool:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}
