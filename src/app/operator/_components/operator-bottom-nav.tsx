"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

export default function OperatorBottomNav() {
  const pathname = usePathname()

  const isHome = pathname === "/operator"
  const isJobHistory = pathname.startsWith("/operator/history")
  const isEarnings = pathname.startsWith("/operator/earnings")
  const isProfile = pathname.startsWith("/operator/profile")

  const tabs = [
    { href: "/operator", label: "Jobs", icon: "📋", active: isHome },
    { href: "/operator/history", label: "History", icon: "🕒", active: isJobHistory },
    { href: "/operator/earnings", label: "Earnings", icon: "₹", active: isEarnings },
    { href: "/operator/profile", label: "Profile", icon: "👤", active: isProfile },
  ]

  return (
    <nav className="flex justify-around border-t border-border bg-card px-2 pb-[calc(12px+env(safe-area-inset-bottom))] pt-2.5">
      {tabs.map((t) => (
        <Link
          key={t.href}
          href={t.href}
          className="flex min-w-[64px] flex-col items-center gap-1 rounded-xl px-3 py-1.5 transition hover:bg-muted"
        >
          <span
            className={`font-body text-base leading-none ${t.active ? "text-primary" : "text-muted-foreground/70"}`}
          >
            {t.icon}
          </span>
          <span
            className={`text-[10px] font-bold leading-none ${
              t.active ? "text-primary" : "text-muted-foreground/70"
            }`}
          >
            {t.label}
          </span>
        </Link>
      ))}
    </nav>
  )
}