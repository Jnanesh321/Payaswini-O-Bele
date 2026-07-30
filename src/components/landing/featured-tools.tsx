"use client"

import { useState, useRef } from "react"
import { motion } from "framer-motion"
import Link from "next/link"
import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react"
import { Button, Card, Badge } from "@/components/ui"
import { formatPrice } from "@/lib/utils"

const tools = [
  {
    id: 1, name: "Carbon Fiber Pole 12m",
    kannadaName: "ಕಾರ್ಬನ್ ಫೈಬರ್ ಪೋಲ್ 12ಮೀ",
    image: "", pricePerDay: 200, deposit: 2000, category: "Harvesting",
  },
  {
    id: 2, name: "Battery Sprayer 16L",
    kannadaName: "ಬ್ಯಾಟರಿ ಸ್ಪ್ರೇಯರ್ 16ಲೀ",
    image: "", pricePerDay: 99, deposit: 500, category: "Spraying",
  },
  {
    id: 3, name: "Power Tiller",
    kannadaName: "ಪವರ್ ಟಿಲ್ಲರ್",
    image: "", pricePerDay: 500, deposit: 5000, category: "Tilling",
  },
  {
    id: 4, name: "Weed Cutter",
    kannadaName: "ವೀಡ್ ಕಟ್ಟರ್",
    image: "", pricePerDay: 150, deposit: 1000, category: "Maintenance",
  },
  {
    id: 5, name: "Water Pump 2HP",
    kannadaName: "ವಾಟರ್ ಪಂಪ್ 2HP",
    image: "", pricePerDay: 250, deposit: 2000, category: "Irrigation",
  },
  {
    id: 6, name: "Chainsaw",
    kannadaName: "ಚೈನ್ಸಾ",
    image: "", pricePerDay: 300, deposit: 3000, category: "Cutting",
  },
]

const gradients = [
  "from-bele-green/30 to-bele-soil/20",
  "from-bele-gold/30 to-bele-green/20",
  "from-payaswini-blue/30 to-bele-gold/20",
  "from-bele-soil/30 to-payaswini-blue/20",
  "from-bele-green/30 to-bele-gold/20",
  "from-payaswini-blue/30 to-bele-soil/20",
]

export default function FeaturedTools() {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(true)

  const scroll = (dir: "left" | "right") => {
    if (!scrollRef.current) return
    const amount = scrollRef.current.clientWidth * 0.8
    scrollRef.current.scrollBy({
      left: dir === "left" ? -amount : amount,
      behavior: "smooth",
    })
  }

  const handleScroll = () => {
    if (!scrollRef.current) return
    const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current
    setCanScrollLeft(scrollLeft > 10)
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10)
  }

  return (
    <section className="bg-white py-16 md:py-24">
      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-10 flex items-center justify-between"
        >
          <div>
            <h2 className="text-3xl font-bold text-foreground md:text-4xl">
              ಜನಪ್ರಿಯ ಸಾಧನಗಳು
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Popular Tools
            </p>
          </div>
          <div className="hidden items-center gap-2 md:flex">
            <Button
              variant="outline"
              size="icon"
              onClick={() => scroll("left")}
              disabled={!canScrollLeft}
              aria-label="Scroll left"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => scroll("right")}
              disabled={!canScrollRight}
              aria-label="Scroll right"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Link href="/tools">
              <Button variant="ghost" className="gap-2">
                View All <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </motion.div>

        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="flex gap-6 overflow-x-auto pb-4 snap-x snap-mandatory scrollbar-hide"
        >
          {tools.map((tool, i) => (
            <motion.div
              key={tool.id}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
              className="w-[280px] shrink-0 snap-start md:w-[300px]"
            >
              <Link href={`/tools/${tool.id}`} className="group block">
                <Card className="overflow-hidden transition-all duration-300 group-hover:-translate-y-1 group-hover:shadow-lg">
                  <div
                    className={`relative flex aspect-[4/3] items-center justify-center bg-gradient-to-br ${gradients[i % gradients.length]}`}
                  >
                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/60 backdrop-blur-sm">
                      <span className="text-2xl font-bold text-bele-green">
                        {tool.kannadaName.charAt(0)}
                      </span>
                    </div>
                    <Badge
                      variant="secondary"
                      className="absolute left-3 top-3"
                    >
                      {tool.category}
                    </Badge>
                  </div>
                  <div className="p-4">
                    <h3 className="font-semibold text-foreground">
                      {tool.kannadaName}
                    </h3>
                    <p className="text-xs text-muted-foreground">{tool.name}</p>
                    <div className="mt-3 flex items-center justify-between">
                      <div>
                        <span className="text-xl font-bold text-bele-gold">
                          {formatPrice(tool.pricePerDay)}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          /day
                        </span>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        Dep: {formatPrice(tool.deposit)}
                      </span>
                    </div>
                    <Button className="mt-3 w-full bg-bele-green text-white hover:bg-bele-green/90">
                      Rent Now
                    </Button>
                  </div>
                </Card>
              </Link>
            </motion.div>
          ))}
        </div>

        <div className="mt-6 text-center md:hidden">
          <Link href="/tools">
            <Button variant="outline" className="gap-2">
              View All Tools
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>
    </section>
  )
}
