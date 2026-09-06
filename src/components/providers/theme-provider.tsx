"use client"

import { useEffect } from "react"
import { ThemeProvider as NextThemesProvider } from "next-themes"
import type { ThemeProviderProps } from "next-themes"

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  useEffect(() => {
    const origError = console.error
    console.error = (...args: unknown[]) => {
      if (
        typeof args[0] === "string" &&
        args[0].includes("script tag while rendering React component")
      ) {
        return
      }
      origError(...args)
    }
    return () => {
      console.error = origError
    }
  }, [])

  return <NextThemesProvider {...props}>{children}</NextThemesProvider>
}
