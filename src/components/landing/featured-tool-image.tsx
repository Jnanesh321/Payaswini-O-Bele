"use client"

import { useState } from "react"
import { Badge } from "@/components/ui"

export function FeaturedToolImage({
  src,
  alt,
  fallbackLetter,
  categoryLabel,
  gradientClass,
}: {
  src?: string | null
  alt: string
  fallbackLetter: string
  categoryLabel?: string
  gradientClass: string
}) {
  const [hasError, setHasError] = useState(!src)

  return (
    <div className="relative aspect-[4/3] w-full overflow-hidden bg-[#FAF7F0]">
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
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/80 shadow-sm backdrop-blur-sm">
            <span className="text-2xl font-bold text-[#2D5016]">
              {fallbackLetter}
            </span>
          </div>
        </div>
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
