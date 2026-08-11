"use client"

import { motion } from "framer-motion"
import Link from "next/link"
import { useLocale, useTranslations } from "next-intl"
import { Search, Calendar, Truck, ThumbsUp, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui"

const steps = [
  {
    icon: Search,
    labelKn: "ಹುಡುಕಿ",
    labelEn: "Browse Tools",
    desc: "Explore our catalog of farming tools available for rent near you.",
  },
  {
    icon: Calendar,
    labelKn: "ಬುಕ್ ಮಾಡಿ",
    labelEn: "Book & Pay",
    desc: "Select your dates, pay securely via UPI or card, and confirm instantly.",
  },
  {
    icon: Truck,
    labelKn: "ಪಡೆಯಿರಿ",
    labelEn: "Pickup or Delivery",
    desc: "Pick up from our center or get same-day delivery to your doorstep.",
  },
  {
    icon: ThumbsUp,
    labelKn: "ಹಿಂತಿರುಗಿಸಿ",
    labelEn: "Return & Deposit",
    desc: "Return the tool after use. Your security deposit is refunded within 48h.",
  },
]

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.15 } },
}

const itemVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
}

export default function HowItWorks() {
  const t = useTranslations("howItWorks")
  const locale = useLocale()
  return (
    <section className="bg-bele-cream py-16 md:py-24">
      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-12 text-center md:mb-16"
        >
          <h2 className="font-heading text-3xl font-bold text-foreground md:text-4xl">
            {t("title")}
          </h2>
        </motion.div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="grid gap-6 md:grid-cols-2 md:gap-8"
        >
          {steps.map((step, i) => (
            <motion.div
              key={step.labelEn}
              variants={itemVariants}
              className="group relative flex gap-5 rounded-2xl bg-white p-6 shadow-sm transition-all hover:-translate-y-1 hover:shadow-md md:p-8"
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
                    {locale === "kn" ? step.labelKn : step.labelEn}
                  </h3>
                </div>
                <p className="mt-1.5 text-sm text-muted-foreground">
                  {step.desc}
                </p>
              </div>
            </motion.div>
          ))}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.4 }}
          className="mt-12 text-center"
        >
          <Link href="/tools">
            <Button className="bg-bele-gold text-black hover:scale-105 hover:bg-bele-gold/90 px-8 py-6 text-base">
              {t("cta")}
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
        </motion.div>
      </div>
    </section>
  )
}
