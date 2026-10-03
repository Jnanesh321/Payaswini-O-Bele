"use client"

import { useState, useEffect } from "react"
import { resolveToolImage, getCategoryFallbackImage } from "@/lib/tool-images"

interface ToolImageProps extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, "src"> {
  src?: string | null
  alt: string
  category?: string
  toolName?: string
  className?: string
  fallbackClassName?: string
  containerClassName?: string
}

export function ToolImage({
  src,
  alt,
  category,
  toolName,
  className = "h-full w-full object-contain",
  fallbackClassName = "h-full w-full object-contain",
  containerClassName = "relative flex items-center justify-center overflow-hidden",
  ...props
}: ToolImageProps) {
  const initialResolved = resolveToolImage(src, category, toolName || alt)
  const fallbackSvg = getCategoryFallbackImage(category, toolName || alt)
  const [prevResolved, setPrevResolved] = useState(initialResolved)
  const [currentSrc, setCurrentSrc] = useState(initialResolved)
  const [hasError, setHasError] = useState(false)

  if (prevResolved !== initialResolved) {
    setPrevResolved(initialResolved)
    setCurrentSrc(initialResolved)
    setHasError(false)
  }

  const handleError = () => {
    if (!hasError && currentSrc !== fallbackSvg) {
      setHasError(true)
      setCurrentSrc(fallbackSvg)
    }
  }

  return (
    <div className={containerClassName}>
      <img
        {...props}
        src={currentSrc}
        alt={alt}
        className={hasError || currentSrc.endsWith(".svg") ? fallbackClassName : className}
        onError={handleError}
        loading="lazy"
        decoding="async"
      />
    </div>
  )
}
