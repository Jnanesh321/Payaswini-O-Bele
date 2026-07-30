import { getTranslations } from "next-intl/server"
import { AnimatedNumber } from "./animated-number"

const stats = [
  { target: 100, suffix: "+", label: "statsTools" },
  { target: 500, suffix: "+", label: "statsFarmers" },
  { target: 50, suffix: "+", label: "statsVillages" },
]

export default async function Stats() {
  const t = await getTranslations("hero")

  return (
    <section className="bg-bele-green py-16 md:py-20">
      <div className="container">
        <div className="grid grid-cols-1 gap-8 text-center md:grid-cols-3 md:gap-12">
          {stats.map((stat, i) => (
            <div key={stat.label} className={i === 0 ? "ent-fade-in-up" : `ent-fade-in-up-d${i}`}>
              <AnimatedNumber target={stat.target} suffix={stat.suffix} />
              <p className="mt-2 text-sm text-white/70 md:text-base">
                {t(stat.label)}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
