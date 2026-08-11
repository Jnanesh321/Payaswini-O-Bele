import { prisma } from "@/lib/prisma"
import type { ToolTranslations } from "@/lib/utils"
import Hero from "@/components/landing/hero"
import Stats from "@/components/landing/stats"
import FeaturedTools from "@/components/landing/featured-tools"
import HowItWorks from "@/components/landing/how-it-works"
import ToolOperators from "@/components/landing/tool-operators"
import Testimonials from "@/components/landing/testimonials"
import TrustBadges from "@/components/landing/trust-badges"
import { LeafDivider } from "@/components/ui"

type FeaturedToolItem = {
  id: string
  slug: string
  name: string
  translations: ToolTranslations | null
  images: string[]
  pricePerDay: number
  deposit: number
  category: string
}

async function getFeaturedTools(): Promise<FeaturedToolItem[]> {
  try {
    const rows = await prisma.tool.findMany({
      where: { isFeatured: true, isActive: true },
      select: {
        id: true,
        slug: true,
        name: true,
        translations: true,
        images: true,
        pricePerDay: true,
        deposit: true,
        category: true,
      },
      take: 6,
    })
    return rows.map((t) => ({
      ...t,
      translations: t.translations as ToolTranslations | null,
    }))
  } catch (err) {
    console.warn("[HomePage] DB unavailable — rendering without featured tools:", err)
    return []
  }
}

export default async function HomePage() {
  const featuredTools = await getFeaturedTools()

  return (
    <>
      <Hero />
      <Stats />
      <LeafDivider className="mx-auto w-full max-w-2xl" />
      <FeaturedTools tools={featuredTools} />
      <LeafDivider className="mx-auto w-full max-w-2xl" />
      <HowItWorks />
      <ToolOperators />
      <LeafDivider className="mx-auto w-full max-w-2xl" />
      <Testimonials />
      <TrustBadges />
    </>
  )
}
