"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  MapPin,
  Star,
  Phone,
  MessageCircle,
  UserPlus,
} from "lucide-react"
import { Button, Badge } from "@/components/ui"

type ViewMode = "rent" | "wage"

const operators = [
  {
    id: "op1",
    name: "Ramesh Shetty",
    nameKn: "ರಮೇಶ್ ಶೆಟ್ಟಿ",
    location: "Puttur",
    tools: ["Carbon Fiber Pole", "Sprayer"],
    rentalPricePerDay: 250,
    dailyWage: 600,
    rating: 4.8,
    jobsCompleted: 120,
    phone: "+919876543210",
  },
  {
    id: "op2",
    name: "Suresh Rai",
    nameKn: "ಸುರೇಶ್ ರೈ",
    location: "Bantwal",
    tools: ["Carbon Fiber Pole"],
    rentalPricePerDay: 200,
    dailyWage: 500,
    rating: 4.5,
    jobsCompleted: 85,
    phone: "+919876543211",
  },
  {
    id: "op3",
    name: "Manjunath Gowda",
    nameKn: "ಮಂಜುನಾಥ್ ಗೌಡ",
    location: "Belthangady",
    tools: ["Power Tiller", "Weed Cutter", "Water Pump"],
    rentalPricePerDay: 450,
    dailyWage: 800,
    rating: 4.9,
    jobsCompleted: 200,
    phone: "+919876543212",
  },
  {
    id: "op4",
    name: "Kavitha Poojary",
    nameKn: "ಕವಿತಾ ಪೂಜಾರಿ",
    location: "Mangaluru",
    tools: ["Battery Sprayer", "Chainsaw"],
    rentalPricePerDay: 180,
    dailyWage: 450,
    rating: 4.7,
    jobsCompleted: 65,
    phone: "+919876543213",
  },
  {
    id: "op5",
    name: "Ganapathi Hegde",
    nameKn: "ಗಣಪತಿ ಹೆಗ್ಡೆ",
    location: "Sullia",
    tools: ["Carbon Fiber Pole", "Sprayer", "Water Pump"],
    rentalPricePerDay: 300,
    dailyWage: 700,
    rating: 4.6,
    jobsCompleted: 150,
    phone: "+919876543214",
  },
]

export default function ToolOperators() {
  const [view, setView] = useState<ViewMode>("rent")

  const filtered = operators.filter((op) =>
    view === "rent" ? op.rentalPricePerDay > 0 : op.dailyWage > 0
  )

  return (
    <section className="bg-white py-16 md:py-24">
      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-4 text-center"
        >
          <h2 className="text-3xl font-bold text-foreground md:text-4xl">
            ಸಾಧನ ನಿರ್ವಾಹಕರಿಲ್ಲವೇ? ನಮ್ಮ ಪಾಲುದಾರರನ್ನು ನೋಡಿ
          </h2>
          <p className="mt-1 text-sm text-muted-foreground md:text-base">
            Don&apos;t have a tool operator? Here are our partners
          </p>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="mx-auto mb-8 max-w-2xl text-center text-sm text-muted-foreground"
        >
          Our verified operators provide tools on rent OR skilled labor with
          tools on wage basis — whatever suits your farm.
        </motion.p>

        <div className="mb-10 flex justify-center">
          <div className="inline-flex rounded-lg border border-border bg-bele-cream p-1">
            <button
              onClick={() => setView("rent")}
              className={`rounded-md px-5 py-2 text-sm font-medium transition-all ${
                view === "rent"
                  ? "bg-bele-green text-white shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Rent
            </button>
            <button
              onClick={() => setView("wage")}
              className={`rounded-md px-5 py-2 text-sm font-medium transition-all ${
                view === "wage"
                  ? "bg-bele-green text-white shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Wage
            </button>
          </div>
        </div>

        <AnimatePresence mode="wait">
          {filtered.length === 0 ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="flex flex-col items-center justify-center py-16 text-center"
            >
              <UserPlus className="mb-4 h-12 w-12 text-muted-foreground/40" />
              <p className="text-lg font-medium text-foreground">
                No operators found for this category
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Interested in becoming a partner? Reach out to us.
              </p>
              <Button className="mt-6 bg-bele-green text-white hover:bg-bele-green/90">
                Become a Partner
              </Button>
            </motion.div>
          ) : (
            <motion.div
              key={view}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
            >
              {filtered.map((op, i) => (
                <motion.div
                  key={op.id}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.08, duration: 0.4 }}
                  className="rounded-xl border border-border bg-bele-cream p-5 shadow-sm transition-all hover:-translate-y-1 hover:shadow-md"
                >
                  <div className="mb-3 flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-foreground">
                        {op.nameKn}
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        {op.name}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 text-sm">
                      <Star className="h-4 w-4 fill-bele-gold text-bele-gold" />
                      <span className="font-medium text-foreground">
                        {op.rating}
                      </span>
                    </div>
                  </div>

                  <div className="mb-3 flex items-center gap-1 text-xs text-muted-foreground">
                    <MapPin className="h-3 w-3" />
                    {op.location}
                    <span className="ml-auto">
                      {op.jobsCompleted} jobs
                    </span>
                  </div>

                  <div className="mb-3 flex flex-wrap gap-1.5">
                    {op.tools.map((tool) => (
                      <Badge
                        key={tool}
                        variant="outline"
                        className="border-bele-green/20 bg-bele-green/5 text-[10px] text-bele-green"
                      >
                        {tool}
                      </Badge>
                    ))}
                  </div>

                  <div className="mb-4 text-center">
                    {view === "rent" ? (
                      <div>
                        <span className="text-xl font-bold text-bele-gold">
                          ₹{op.rentalPricePerDay}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          /day rental
                        </span>
                      </div>
                    ) : (
                      <div>
                        <span className="text-xl font-bold text-bele-gold">
                          ₹{op.dailyWage}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          /day wage
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      className="flex-1 bg-bele-green text-white hover:bg-bele-green/90"
                      asChild
                    >
                      <a href={`tel:${op.phone}`}>
                        <Phone className="mr-1 h-3.5 w-3.5" />
                        Call
                      </a>
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 border-bele-green/30 text-bele-green hover:bg-bele-green/5"
                      asChild
                    >
                      <a
                        href={`https://wa.me/${op.phone.replace(/\D/g, "")}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <MessageCircle className="mr-1 h-3.5 w-3.5" />
                        WhatsApp
                      </a>
                    </Button>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  )
}
