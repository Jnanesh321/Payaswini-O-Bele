import { getTranslations } from "next-intl/server"
import { Shield, CheckCircle, IndianRupee, Building } from "lucide-react"

export default async function TrustBadges() {
  const t = await getTranslations("trustBadges")

  const badges = [
    { icon: Shield, label: t("verifiedTools") },
    { icon: CheckCircle, label: t("insuredRentals") },
    { icon: IndianRupee, label: t("transparentPricing") },
    { icon: Building, label: t("backedByPayaswini") },
  ]

  return (
    <section className="bg-bele-cream py-12 md:py-16">
      <div className="container">
        <div className="grid grid-cols-2 gap-6 md:grid-cols-4 md:gap-8">
          {badges.map((badge, i) => (
            <div
              key={i}
              className={`ent-fade-in-up-d${i} flex flex-col items-center gap-3 text-center`}
            >
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-bele-green/10">
                <badge.icon className="h-7 w-7 text-bele-green" />
              </div>
              <p className="text-sm font-semibold text-foreground md:text-base">
                {badge.label}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
