"use client"

import { usePathname } from "next/navigation"
import { Header } from "./header"
import { Footer } from "./footer"

export function SiteChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  // These routes render their own mobile-native chrome — no desktop header/footer
  const isBarePath =
    pathname?.startsWith("/operator") ||
    pathname?.startsWith("/login") ||
    pathname?.startsWith("/verify-otp") ||
    pathname?.startsWith("/register") ||
    pathname?.startsWith("/onboarding") ||
    pathname?.startsWith("/owner")

  if (isBarePath) {
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
