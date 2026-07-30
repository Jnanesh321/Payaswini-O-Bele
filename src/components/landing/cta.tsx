"use client"

import { motion } from "framer-motion"
import Link from "next/link"
import { ArrowRight, Phone } from "lucide-react"
import { Button } from "@/components/ui"

export function CTASection() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-r from-primary-dark via-primary to-primary-light py-16 md:py-24">
      <div className="container relative z-10 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mx-auto max-w-2xl"
        >
          <h2 className="text-3xl font-bold text-white md:text-4xl">
            Rent Your Farming Tool Today
          </h2>
          <p className="mt-4 text-lg text-white/70">
            Skip the ₹50,000 purchase. Pay as little as ₹99/day. Free delivery and
            100% deposit refund guaranteed.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Link href="/tools">
              <Button size="xl" variant="accent" className="gap-2 text-base">
                Rent Now
                <ArrowRight className="h-5 w-5" />
              </Button>
            </Link>
            <a href="tel:+919876543210">
              <Button
                size="xl"
                variant="outline"
                className="gap-2 border-white/30 text-white hover:bg-white/10"
              >
                <Phone className="h-5 w-5" />
                +91 98765 43210
              </Button>
            </a>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
