"use client"

import { useState } from "react"
import Link from "next/link"
import { useLocale, useTranslations } from "next-intl"
import { Card, Badge, Button } from "@/components/ui"
import { formatPrice, getLocaleName } from "@/lib/utils"
import type { ToolCard as ToolCardType } from "@/types"

import { resolveToolImage, getCategoryFallbackImage } from "@/lib/tool-images"

const gradients = [
  "from-bele-green/30 to-bele-soil/20",
  "from-bele-gold/30 to-bele-green/20",
  "from-payaswini-blue/30 to-bele-gold/20",
  "from-bele-soil/30 to-payaswini-blue/20",
  "from-bele-green/30 to-bele-gold/20",
  "from-payaswini-blue/30 to-bele-soil/20",
]

function ToolCardImage({
  src,
  alt,
  category,
  gradientClass,
  isActive,
}: {
  src?: string | null
  alt: string
  fallbackLetter?: string
  category: string
  gradientClass: string
  isActive: boolean
}) {
  const initial = resolveToolImage(src, category, alt)
  const fallbackSvg = getCategoryFallbackImage(category, alt)
  const [currentSrc, setCurrentSrc] = useState(initial)
  const [hasError, setHasError] = useState(false)
  const tc = useTranslations("categories")
  const tt = useTranslations("tools")

  const isSvg = hasError || currentSrc.endsWith(".svg")

  return (
    <div className="relative aspect-[4/3] w-full overflow-hidden bg-muted flex items-center justify-center">
      {isSvg ? (
        <div
          className={`absolute inset-0 flex items-center justify-center p-6 bg-gradient-to-br ${gradientClass}`}
        >
          <img
            src={fallbackSvg}
            alt={alt}
            className="h-full w-full max-h-[85%] object-contain drop-shadow-md transition-transform duration-500 group-hover:scale-110"
          />
        </div>
      ) : (
        <img
          src={currentSrc}
          alt={alt}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          onError={() => {
            setHasError(true)
            setCurrentSrc(fallbackSvg)
          }}
          loading="lazy"
        />
      )}

      <Badge
        variant={isActive ? "success" : "destructive"}
        className="absolute left-3 top-3 z-10 font-medium"
      >
        {isActive ? tt("available") : tt("rented")}
      </Badge>

      {category && (
        <Badge
          variant="outline"
          className="absolute right-3 top-3 z-10 bg-white/80 backdrop-blur-sm"
        >
          {tc.has(category) ? tc(category) : category.replace(/_/g, " ")}
        </Badge>
      )}
    </div>
  )
}

interface ToolCardProps {
  tool: ToolCardType
  index?: number
  variant?: "default" | "utility"
}

export function ToolCard({ tool, index = 0, variant = "default" }: ToolCardProps) {
  const locale = useLocale()
  const tfeat = useTranslations("featuredTools")
  const tu = useTranslations("homeUtility")
  const displayName = getLocaleName(tool, locale)
  const fp = (n: number) => formatPrice(n, locale)

  const talukText = tool.taluk || "Badiadka"
  const distanceText = tool.distanceKm ? `${tool.distanceKm} km` : `${(3.5 + (index * 1.8) % 8).toFixed(1)} km`

  if (variant === "utility") {
    return (
      <Link href={`/tools/${tool.slug || tool.id}`} className="group block select-none">
        <div className="relative flex flex-col overflow-hidden rounded-2xl border border-border/80 bg-card p-3 shadow-xs transition-all duration-200 hover:border-primary/50 hover:shadow-md">
          {/* Card Media Header */}
          <div className="relative mb-2.5 aspect-video w-full overflow-hidden rounded-xl bg-muted/50">
            <ToolCardImage
              src={tool.images && tool.images[0]}
              alt={displayName}
              category={tool.category}
              gradientClass={gradients[index % gradients.length]}
              isActive={tool.isActive}
            />

            {/* Distance / Taluk Tag */}
            <div className="absolute bottom-2 left-2 z-10 flex items-center gap-1 rounded-full bg-black/70 backdrop-blur-md px-2 py-0.5 text-[10px] font-semibold text-white">
              <span>📍</span>
              <span>{distanceText} • {talukText}</span>
            </div>
          </div>

          {/* Title & Operator Chip */}
          <div className="flex flex-col gap-1">
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-display text-sm font-bold text-foreground line-clamp-1 group-hover:text-primary transition-colors">
                {displayName}
              </h3>
            </div>

            {/* Operator Chip */}
            <div className="flex items-center gap-1.5 flex-wrap">
              {tool.requiresCertifiedOperator ? (
                <span className="inline-flex items-center gap-1 rounded-md bg-[#D4A017]/15 px-2 py-0.5 text-[10px] font-bold text-[#7A5800] dark:text-[#E5B429]">
                  <span>👨‍🌾</span>
                  <span>{tu("certifiedOperator")}</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-md bg-[#2D5016]/10 px-2 py-0.5 text-[10px] font-bold text-[#2D5016] dark:text-[#4E8A2C]">
                  <span>✅</span>
                  <span>{tu("selfOperate")}</span>
                </span>
              )}
            </div>
          </div>

          {/* Pricing Breakdown & Action CTA */}
          <div className="mt-3 flex items-center justify-between border-t border-border/60 pt-2.5">
            <div>
              <div className="flex items-baseline gap-1">
                <span className="font-display text-base font-extrabold text-[#2D5016] dark:text-[#4E8A2C]">
                  {fp(tool.pricePerDay)}
                </span>
                <span className="text-[10px] text-muted-foreground font-medium">
                  {tu("perDay")}
                </span>
              </div>
              <p className="text-[10px] text-muted-foreground">
                • {fp(tool.deposit)} {tu("refDeposit")}
              </p>
            </div>

            <Button
              size="sm"
              className="h-8 rounded-xl bg-[#2D5016] px-3.5 text-xs font-bold text-white shadow-xs hover:bg-[#1E3A0F] active:scale-95 transition-all"
            >
              {tu("bookNow")}
            </Button>
          </div>
        </div>
      </Link>
    )
  }

  return (
    <Link href={`/tools/${tool.slug || tool.id}`} className="group block">
      <Card className="overflow-hidden rounded-2xl transition-all duration-300 group-hover:-translate-y-1 group-hover:shadow-lg">
        <ToolCardImage
          src={tool.images && tool.images[0]}
          alt={displayName}
          fallbackLetter={displayName.charAt(0)}
          category={tool.category}
          gradientClass={gradients[index % gradients.length]}
          isActive={tool.isActive}
        />
        <div className="p-4">
          <h3 className="font-heading font-semibold text-foreground">
            {displayName}
          </h3>
          <p className="text-xs text-muted-foreground">{tool.name}</p>
          <div className="mt-3 flex items-center justify-between">
            <div>
              <span className="font-heading text-xl font-bold text-bele-gold">
                {fp(tool.pricePerDay)}
              </span>
              <span className="text-xs text-muted-foreground ml-1">{tfeat("perDay")}</span>
            </div>
            <span className="text-xs text-muted-foreground font-medium">
              {tfeat("deposit")}: {fp(tool.deposit)}
            </span>
          </div>
          <Button className="mt-3 w-full bg-bele-green text-white hover:bg-bele-green/90">
            {tfeat("rentNow")}
          </Button>
        </div>
      </Card>
    </Link>
  )
}
