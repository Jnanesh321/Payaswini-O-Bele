"use client"

import { useRef, useState } from "react"
import Link from "next/link"
import { ChevronLeft, ChevronRight, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui"

interface FeaturedToolsSliderProps {
  viewAllLabel: string
  children: React.ReactNode
}

export function FeaturedToolsSlider({
  viewAllLabel,
  children,
}: FeaturedToolsSliderProps) {
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
    <div className="relative">
      <div className="hidden items-center gap-2 md:flex absolute -top-16 right-0">
        <Button
          variant="outline"
          size="icon"
          onClick={() => scroll("left")}
          disabled={!canScrollLeft}
          aria-label="Scroll left"
          className="border-[#D5D9C9] hover:bg-[#FAF7F0] text-[#143626]"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          onClick={() => scroll("right")}
          disabled={!canScrollRight}
          aria-label="Scroll right"
          className="border-[#D5D9C9] hover:bg-[#FAF7F0] text-[#143626]"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
        <Link href="/tools">
          <Button
            variant="ghost"
            className="gap-2 text-[#2D5016] hover:bg-[#FAF7F0] font-semibold"
          >
            {viewAllLabel} <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
      </div>

      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex gap-6 overflow-x-auto pb-4 pt-2 snap-x snap-mandatory scrollbar-hide"
      >
        {children}
      </div>

      <div className="mt-6 text-center md:hidden">
        <Link href="/tools">
          <Button
            variant="outline"
            className="gap-2 w-full max-w-xs border-[#2D5016] text-[#2D5016] hover:bg-[#FAF7F0] font-semibold"
          >
            {viewAllLabel}
            <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
      </div>
    </div>
  )
}
