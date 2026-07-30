"use client"

import { motion } from "framer-motion"
import { Shield, CheckCircle, IndianRupee, Building } from "lucide-react"

const badges = [
  { icon: Shield, label: "Verified Tools" },
  { icon: CheckCircle, label: "Insured Rentals" },
  { icon: IndianRupee, label: "Transparent Pricing" },
  { icon: Building, label: "Backed by Payaswini.com" },
]

export default function TrustBadges() {
  return (
    <section className="bg-bele-cream py-12 md:py-16">
      <div className="container">
        <div className="grid grid-cols-2 gap-6 md:grid-cols-4 md:gap-8">
          {badges.map((badge, i) => (
            <motion.div
              key={badge.label}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1, duration: 0.4 }}
              className="flex flex-col items-center gap-3 text-center"
            >
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-bele-green/10">
                <badge.icon className="h-7 w-7 text-bele-green" />
              </div>
              <p className="text-sm font-semibold text-foreground md:text-base">
                {badge.label}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
