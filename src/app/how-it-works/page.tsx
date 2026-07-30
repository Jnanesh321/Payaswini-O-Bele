"use client"

import { motion } from "framer-motion"
import Link from "next/link"
import { Search, Calendar, IndianRupee, Truck, ShieldCheck, MessageCircle } from "lucide-react"
import { Button, Card } from "@/components/ui"

const steps = [
  {
    icon: Search,
    step: "1",
    title: "Choose Your Tool",
    desc: "Browse our catalog of farming tools including carbon fiber poles, sprayers, tillers, and more. Each tool has detailed specs, images, and real reviews from farmers in your area.",
  },
  {
    icon: Calendar,
    step: "2",
    title: "Pick Rental Period",
    desc: "Choose your rental dates. We offer flexible periods from 1 day to 1 month. Longer rentals get bigger discounts — save up to 20% on monthly rentals.",
  },
  {
    icon: IndianRupee,
    step: "3",
    title: "Secure Payment",
    desc: "Pay securely via UPI (GPay, PhonePe, PayTM), Netbanking, or Credit/Debit Card. Your security deposit is fully refundable upon safe return of the tool.",
  },
  {
    icon: Truck,
    step: "4",
    title: "Delivery & Use",
    desc: "We deliver the tool to your doorstep within 24 hours. Use it for your farming needs, then we'll pick it up. Your deposit is refunded within 48 hours of return.",
  },
]

export default function HowItWorksPage() {
  return (
    <div className="container py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mx-auto max-w-2xl text-center mb-12"
      >
        <h1 className="text-4xl font-bold">How Payaswini O Bele Works</h1>
        <p className="mt-3 text-lg text-muted-foreground">
          Renting farming tools has never been easier. Follow these simple steps.
        </p>
      </motion.div>

      <div className="mx-auto max-w-3xl space-y-8">
        {steps.map((step, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: i % 2 === 0 ? -20 : 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.1 }}
          >
            <Card className="flex items-start gap-6 p-6">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary/10">
                <step.icon className="h-7 w-7 text-primary" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-white">
                    {step.step}
                  </span>
                  <h3 className="text-lg font-semibold">{step.title}</h3>
                </div>
                <p className="mt-2 leading-relaxed text-muted-foreground">{step.desc}</p>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="mt-12 text-center">
        <h2 className="mb-6 text-2xl font-bold">Why Choose Payaswini O Bele?</h2>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[
            { icon: IndianRupee, title: "80% Cheaper than Buying", desc: "A carbon fiber pole costs ₹60,000 to buy. Rent it for as low as ₹99/day." },
            { icon: ShieldCheck, title: "Deposit Protection", desc: "Your deposit is fully refunded within 48 hours of safe tool return." },
            { icon: MessageCircle, title: "Local Support", desc: "Our team speaks Kannada, Tulu and English. We're here to help 24/7." },
          ].map((item, i) => (
            <Card key={i} className="p-6 text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                <item.icon className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold">{item.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{item.desc}</p>
            </Card>
          ))}
        </div>
      </div>

      <div className="mt-12 text-center">
        <Link href="/tools">
          <Button size="xl" variant="accent">
            Get Started Now
          </Button>
        </Link>
      </div>
    </div>
  )
}
