"use client"

import { useState } from "react"
import { Badge } from "@/components/ui"
import { resolveToolImage, getCategoryFallbackImage } from "@/lib/tool-images"

export function FeaturedToolImage({
  src,
  alt,
  categoryLabel,
  gradientClass,
}: {
  src?: string | null
  alt: string
  fallbackLetter?: string
  categoryLabel?: string
  gradientClass: string
}) {
  const initial = resolveToolImage(src, categoryLabel, alt)
  const fallbackSvg = getCategoryFallbackImage(categoryLabel, alt)
  const [currentSrc, setCurrentSrc] = useState(initial)
  const [hasError, setHasError] = useState(false)

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

      {categoryLabel && (
        <Badge
          variant="secondary"
          className="absolute left-3 top-3 bg-white/95 text-[#143626] font-medium border border-[#D5D9C9]/50 shadow-sm backdrop-blur-sm"
        >
          {categoryLabel}
        </Badge>
      )}
    </div>
  )
}
