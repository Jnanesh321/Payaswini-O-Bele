import Link from "next/link"
import { getLocale, getTranslations } from "next-intl/server"
import { Button, Card } from "@/components/ui"
import { formatPrice, getLocaleName, type ToolTranslations } from "@/lib/utils"
import { FeaturedToolsSlider } from "./featured-tools-slider"
import { FeaturedToolImage } from "./featured-tool-image"

export interface FeaturedToolItem {
  id: string
  slug: string
  name: string
  translations: ToolTranslations | null
  images: string[]
  pricePerDay: number
  deposit: number
  category: string
}

const gradients = [
  "from-bele-green/30 to-bele-soil/20",
  "from-bele-gold/30 to-bele-green/20",
  "from-payaswini-blue/30 to-bele-gold/20",
  "from-bele-soil/30 to-payaswini-blue/20",
  "from-bele-green/30 to-bele-gold/20",
  "from-payaswini-blue/30 to-bele-soil/20",
]

export default async function FeaturedTools({ tools }: { tools: FeaturedToolItem[] }) {
  const t = await getTranslations("featuredTools")
  const tc = await getTranslations("categories")
  const locale = await getLocale()
  const fp = (n: number) => formatPrice(n, locale)

  return (
    <section className="bg-white py-16 md:py-24">
      <div className="container">
        <div className="ent-fade-in-up mb-10 flex items-center justify-between">
          <div>
            <h2 className="font-heading text-3xl font-bold text-[#143626] md:text-4xl">
              {t("title")}
            </h2>
            <p className="mt-1.5 text-sm text-[#6B706E]">
              {t("subtitle")}
            </p>
          </div>
        </div>

        {tools.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[#D5D9C9] bg-[#FAF7F0] p-12 text-center">
            <p className="text-muted-foreground font-medium">{t("empty")}</p>
            <Link href="/tools" className="mt-4 inline-block">
              <Button className="bg-[#2D5016] text-white hover:bg-[#1E3A0F]">
                {t("viewAll")}
              </Button>
            </Link>
          </div>
        ) : (
          <FeaturedToolsSlider viewAllLabel={t("viewAll")}>
            {tools.map((tool, i) => {
              const displayName = getLocaleName(tool, locale)
              let categoryLabel = ""
              try {
                categoryLabel = tc.has(tool.category)
                  ? tc(tool.category)
                  : tool.category.replace(/_/g, " ")
              } catch {
                categoryLabel = tool.category.replace(/_/g, " ")
              }

              return (
                <div
                  key={tool.id}
                  className={`w-[280px] shrink-0 snap-start md:w-[300px] ${
                    i === 0 ? "ent-fade-in-up" : `ent-fade-in-up-d${Math.min(i, 3)}`
                  }`}
                >
                  <Link href={`/tools/${tool.slug}`} className="group block">
                    <Card className="overflow-hidden rounded-2xl border border-[#D5D9C9]/70 bg-white transition-all duration-300 group-hover:-translate-y-1 group-hover:shadow-md">
                      <FeaturedToolImage
                        src={tool.images && tool.images[0]}
                        alt={displayName}
                        fallbackLetter={displayName.charAt(0) || tool.name.charAt(0)}
                        categoryLabel={categoryLabel}
                        gradientClass={gradients[i % gradients.length]}
                      />
                      <div className="p-4">
                        <h3 className="font-heading font-semibold text-[#143626] line-clamp-1">
                          {displayName}
                        </h3>
                        <p className="text-xs text-[#6B706E] line-clamp-1 mt-0.5">
                          {tool.name}
                        </p>
                        <div className="mt-3 flex items-center justify-between border-t border-[#F2ECE1] pt-2.5">
                          <div>
                            <span className="font-heading text-lg font-bold text-[#D4A017]">
                              {fp(tool.pricePerDay)}
                            </span>
                            <span className="text-xs text-[#6B706E] ml-1">
                              {t("perDay")}
                            </span>
                          </div>
                          <span className="text-xs text-[#6B706E] font-medium">
                            {t("deposit")}: {fp(tool.deposit)}
                          </span>
                        </div>
                        <Button className="mt-3.5 w-full bg-[#2D5016] text-white hover:bg-[#1E3A0F] font-semibold transition-all">
                          {t("rentNow")}
                        </Button>
                      </div>
                    </Card>
                  </Link>
                </div>
              )
            })}
          </FeaturedToolsSlider>
        )}
      </div>
    </section>
  )
}
