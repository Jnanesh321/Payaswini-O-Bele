import Link from "next/link"
import { getTranslations } from "next-intl/server"
import { Search, Calendar, Truck, ThumbsUp, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui"

export default async function HowItWorks() {
  const t = await getTranslations("howItWorks")

  const steps = [
    {
      icon: Search,
      title: t("step1Title"),
      desc: t("step1Desc"),
    },
    {
      icon: Calendar,
      title: t("step2Title"),
      desc: t("step2Desc"),
    },
    {
      icon: Truck,
      title: t("step3Title"),
      desc: t("step3Desc"),
    },
    {
      icon: ThumbsUp,
      title: t("step4Title"),
      desc: t("step4Desc"),
    },
  ]

  return (
    <section className="bg-bele-cream py-16 md:py-24">
      <div className="container">
        <div className="ent-fade-in-up mb-12 text-center md:mb-16">
          <h2 className="font-heading text-3xl font-bold text-foreground md:text-4xl">
            {t("title")}
          </h2>
        </div>

        <div className="grid gap-6 md:grid-cols-2 md:gap-8">
          {steps.map((step, i) => (
            <div
              key={i}
              className={`ent-fade-in-up-d${i} group relative flex gap-5 rounded-2xl bg-white p-6 shadow-sm transition-all hover:-translate-y-1 hover:shadow-md md:p-8`}
            >
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-bele-green/10">
                <step.icon className="h-6 w-6 text-bele-green" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-bele-gold text-xs font-bold text-black">
                    {i + 1}
                  </span>
                  <h3 className="font-heading text-base font-semibold text-foreground md:text-lg">
                    {step.title}
                  </h3>
                </div>
                <p className="mt-1.5 text-sm text-muted-foreground">
                  {step.desc}
                </p>
              </div>
            </div>
          ))}
        </div>

        <div className="ent-fade-in-up-d2 mt-12 text-center">
          <Link href="/tools">
            <Button className="bg-bele-gold text-black hover:scale-105 hover:bg-bele-gold/90 px-8 py-6 text-base">
              {t("cta")}
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
        </div>
      </div>
    </section>
  )
}
