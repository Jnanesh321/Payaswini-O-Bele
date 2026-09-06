"use client"

import { useState } from "react"

interface SafeAvatarProps {
  src?: string | null
  alt?: string
  name?: string | null
  className?: string
  fallbackClassName?: string
}

export function SafeAvatar({
  src,
  alt,
  name,
  className = "h-11 w-11 rounded-xl object-cover",
  fallbackClassName = "flex h-11 w-11 items-center justify-center rounded-xl bg-bele-green-muted font-display text-sm font-bold text-primary",
}: SafeAvatarProps) {
  const [hasError, setHasError] = useState(false)
  const initial = (name?.trim()?.[0] ?? alt?.trim()?.[0] ?? "U").toUpperCase()

  if (!src || hasError) {
    return (
      <div className={fallbackClassName}>
        {initial}
      </div>
    )
  }

  return (
    <img
      src={src}
      alt={alt || name || "Avatar"}
      className={className}
      onError={() => setHasError(true)}
      loading="lazy"
    />
  )
}
