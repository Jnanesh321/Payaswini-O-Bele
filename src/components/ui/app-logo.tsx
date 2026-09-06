"use client"

import Image from "next/image"
import { useTheme } from "next-themes"
import { useMounted } from "@/hooks/use-mounted"

interface AppLogoProps {
  width?: number
  height?: number
  className?: string
  priority?: boolean
}

/**
 * O~Bele logo that automatically swaps between day/night variants.
 * Light theme: dark-green wordmark on transparent.
 * Dark theme: luminous-green wordmark on transparent.
 */
export function AppLogo({ width = 120, height = 43, className = "", priority = false }: AppLogoProps) {
  const { resolvedTheme } = useTheme()
  const mounted = useMounted()

  // Avoid hydration mismatch — show light logo on server, swap after mount
  const src = mounted && resolvedTheme === "dark"
    ? "/logos/obele-logo-dark.svg"
    : "/logos/obele-logo.svg"

  return (
    <Image
      src={src}
      alt="O Bele~"
      width={width}
      height={height}
      className={className}
      priority={priority}
    />
  )
}
