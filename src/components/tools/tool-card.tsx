"use client"

import { useState } from "react"
import Link from "next/link"
import { useLocale, useTranslations } from "next-intl"
import { Card, Badge, Button } from "@/components/ui"
import { formatPrice, getLocaleName } from "@/lib/utils"
import type { ToolCard as ToolCardType } from "@/types"

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
  fallbackLetter,
  category,
  gradientClass,
  isActive,
}: {
  src?: string | null
  alt: string
  fallbackLetter: string
  category: string
  gradientClass: string
  isActive: boolean
}) {
  const [hasError, setHasError] = useState(!src)
  const tc = useTranslations("categories")
  const tt = useTranslations("tools")

  return (
    <div className="relative aspect-[4/3] w-full overflow-hidden bg-muted">
      {!hasError && src && (
        <img
          src={src}
          alt={alt}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          onError={() => setHasError(true)}
        />
      )}

      {hasError && (
        <div
          className={`absolute inset-0 flex items-center justify-center bg-gradient-to-br ${gradientClass}`}
        >
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/60 backdrop-blur-sm">
            <span className="text-2xl font-bold text-bele-green">
              {fallbackLetter}
            </span>
          </div>
        </div>
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
}

export function ToolCard({ tool, index = 0 }: ToolCardProps) {
  const locale = useLocale()
  const tfeat = useTranslations("featuredTools")
  const displayName = getLocaleName(tool, locale)
  const fp = (n: number) => formatPrice(n, locale)

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
