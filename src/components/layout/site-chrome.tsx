"use client"

import { ReactNode } from "react"

export function SiteChrome({ children }: { children: ReactNode }) {
  return <main className="min-h-screen">{children}</main>
}
