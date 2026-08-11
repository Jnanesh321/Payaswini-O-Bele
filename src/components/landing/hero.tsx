import Link from "next/link"
import { getTranslations } from "next-intl/server"
import { ChevronDown } from "lucide-react"
import { Button } from "@/components/ui"

export default async function Hero() {
  const t = await getTranslations("hero")

  const stats = [
    { value: "100+", label: t("statsTools") },
    { value: "500+", label: t("statsFarmers") },
    { value: "50+", label: t("statsVillages") },
  ]

  return (
    <section className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-r from-bele-green/90 to-bele-soil/80">
      <div className="absolute inset-0 bg-black/20" />

      <div className="container relative z-10 px-4 py-20 text-center">
        <h1 className="ent-fade-in-up mx-auto max-w-4xl font-heading text-4xl font-bold leading-tight text-white md:text-5xl lg:text-6xl">
          {t("headline")}
        </h1>

        <p className="ent-fade-in-up-d1 mx-auto mt-6 max-w-2xl text-lg text-white/80 md:text-xl">
          {t("subheadline")}
        </p>

        <div className="ent-fade-in-up-d2 mt-10 flex flex-wrap items-center justify-center gap-4">
          <Link href="/tools">
            <Button className="bg-bele-gold text-black hover:scale-105 hover:bg-bele-gold/90 px-8 py-6 text-base">
              {t("ctaPrimary")}
            </Button>
          </Link>
          <Link href="/how-it-works">
            <Button
              variant="outline"
              className="border-white text-white hover:scale-105 hover:bg-white/10 hover:text-white px-8 py-6 text-base"
            >
              {t("ctaSecondary")}
            </Button>
          </Link>
        </div>

        <div className="ent-fade-in-up-d3 mt-16 flex flex-wrap items-center justify-center gap-8 md:gap-12">
          {stats.map((stat) => (
            <div key={stat.label} className="text-center">
              <div className="text-2xl font-bold text-white md:text-3xl">
                {stat.value}
              </div>
              <div className="mt-1 text-sm text-white/60">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="ent-fade-in-d absolute bottom-8 left-1/2 -translate-x-1/2">
        <div className="ent-bounce-y">
          <ChevronDown className="h-6 w-6 text-white/50" />
        </div>
      </div>
    </section>
  )
}
