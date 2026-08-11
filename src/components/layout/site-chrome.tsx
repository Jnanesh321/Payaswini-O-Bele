"use client"

import { usePathname } from "next/navigation"
import { Header } from "./header"
import { Footer } from "./footer"

export function SiteChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isOperatorApp = pathname?.startsWith("/operator")

  if (isOperatorApp) {
    return <main className="min-h-screen">{children}</main>
  }

  return (
    <>
      <Header />
      <main className="min-h-[calc(100vh-4rem)]">{children}</main>
      <Footer />
    </>
  )
}
