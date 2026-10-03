import { prisma } from "@/server/db/prisma"
import { VerificationStatus, ToolInstanceStatus } from "@prisma/client"

export async function listAdminEquipment(params?: {
  status?: string
  search?: string
}) {
  const where: Record<string, unknown> = {}

  if (params?.status && params.status !== "ALL") {
    where.verificationStatus = params.status as VerificationStatus
  }

  const instances = await prisma.toolInstance.findMany({
    where,
    include: {
      tool: {
        select: {
          id: true,
          name: true,
          slug: true,
          category: true,
          pricePerDay: true,
          minAllowedPricePerDay: true,
          maxAllowedPricePerDay: true,
          deposit: true,
          images: true,
        },
      },
      owner: {
        select: {
          id: true,
          name: true,
          phone: true,
          village: true,
          taluk: true,
          district: true,
          image: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  })

  if (params?.search) {
    const q = params.search.toLowerCase().trim()
    return instances.filter((inst) => {
      const toolMatch = inst.tool.name.toLowerCase().includes(q)
      const ownerMatch = (inst.owner.name ?? "").toLowerCase().includes(q)
      const assetMatch = inst.assetCode.toLowerCase().includes(q)
      const talukMatch = (inst.owner.taluk ?? "").toLowerCase().includes(q)
      return toolMatch || ownerMatch || assetMatch || talukMatch
    })
  }

  return instances
}

export async function reviewAdminEquipment(
  instanceId: string,
  action: "APPROVE" | "REJECT",
  notes?: string,
) {
  const newStatus =
    action === "APPROVE" ? VerificationStatus.VERIFIED : VerificationStatus.REVOKED

  const instance = await prisma.toolInstance.update({
    where: { id: instanceId },
    data: {
      verificationStatus: newStatus,
      adminReviewNotes: notes || (action === "APPROVE" ? "Approved by Admin" : "Rejected by Admin"),
      ...(action === "APPROVE" ? { status: ToolInstanceStatus.AVAILABLE } : {}),
    },
    include: {
      tool: true,
      owner: true,
    },
  })

  return instance
}
