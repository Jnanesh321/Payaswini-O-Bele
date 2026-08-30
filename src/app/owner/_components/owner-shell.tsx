"use client"

import { ReactNode, useEffect, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Package, Bell, TrendingUp, User } from "lucide-react"

import { CapabilitySwitcher } from "@/components/layout/capability-switcher"

interface OwnerShellProps {
  children: ReactNode
  eyebrow?: string
  title: string
  subtitle?: string
  headerRight?: ReactNode
}

const tabs = [
  { id: "equipment", href: "/owner", label: "Equipment", icon: Package },
  { id: "requests", href: "/owner/requests", label: "Requests", icon: Bell, badge: true },
  { id: "earnings", href: "/owner/earnings", label: "Earnings", icon: TrendingUp },
  { id: "profile", href: "/owner/profile", label: "Profile", icon: User },
]

export default function OwnerShell({
  children,
  eyebrow,
  title,
  subtitle,
  headerRight,
}: OwnerShellProps) {
  const pathname = usePathname()
  const [pendingCount, setPendingCount] = useState(0)

  useEffect(() => {
    fetch("/api/owner/requests")
      .then((res) => res.json())
      .then((json) => {
        if (json.success) setPendingCount(json.data?.length ?? 0)
      })
      .catch(() => {})
  }, [pathname])

  const activeTab =
    pathname === "/owner" ? "equipment"
    : pathname.startsWith("/owner/requests") ? "requests"
    : pathname.startsWith("/owner/earnings") ? "earnings"
    : pathname.startsWith("/owner/profile") ? "profile"
    : "equipment"

  return (
    <div className="min-h-screen bg-background px-0 sm:px-4 sm:py-6">
      <div className="mx-auto flex min-h-screen w-full max-w-[430px] flex-col overflow-hidden bg-background sm:min-h-[800px] sm:rounded-[32px] sm:border sm:border-border sm:shadow-xl">
        <header className="flex items-center justify-between border-b border-border px-5 py-3.5">
          <Link href="/" className="flex items-center gap-1.5" title="Back to Marketplace">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M1.9992 21C1.9992 17.9999 3.8493 15.6398 7.07948 14.9998C9.49962 14.5197 11.9998 12.9997 12.9998 11.9996M10.9994 20C9.2434 20.0053 7.5495 19.3504 6.25369 18.1653C4.95788 16.9802 4.15482 15.3513 4.00378 13.6018C3.85274 11.8523 4.36476 10.1099 5.43828 8.72023C6.5118 7.33055 8.0684 6.39509 9.79937 6.09938C15.4997 4.99933 16.9998 6.17938 21 9.99954C21 15.4998 16.2197 20 10.9994 20Z" stroke="#D4A017" strokeWidth="2" strokeLinecap="round" />
            </svg>
            <span className="font-display text-[22px] font-bold text-primary">O~Bele</span>
          </Link>
          <CapabilitySwitcher variant="shell" currentRole="TOOL_OWNER" />
        </header>

        <main className="flex flex-1 flex-col overflow-hidden">
          <div className="flex items-start justify-between px-5 pb-4 pt-6">
            <div>
              {eyebrow && (
                <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.14em] text-secondary">
                  {eyebrow}
                </p>
              )}
              <h1 className="font-display text-[28px] font-bold leading-[1.08] text-foreground">
                {title}
              </h1>
              {subtitle && (
                <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>
              )}
            </div>
            {headerRight}
          </div>
          <div className="flex flex-1 flex-col overflow-y-auto px-5 pb-8">
            {children}
          </div>
        </main>

        {/* Bottom tab bar */}
        <nav className="flex shrink-0 items-stretch border-t border-border bg-card pb-1">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id
            const showBadge = tab.badge && pendingCount > 0
            return (
              <Link
                key={tab.id}
                href={tab.href}
                className="relative flex flex-1 flex-col items-center gap-0.5 pt-2.5"
              >
                <span className="relative">
                  <tab.icon size={20} strokeWidth={isActive ? 2.2 : 1.8} className={isActive ? "text-primary" : "text-muted-foreground"} />
                  {showBadge && (
                    <span className="absolute -right-2.5 -top-1 flex min-w-3.5 items-center justify-center rounded-full bg-secondary px-1 py-px text-[8px] font-bold text-white">
                      {pendingCount > 9 ? "9+" : pendingCount}
                    </span>
                  )}
                </span>
                <span className={`text-[10px] font-semibold ${isActive ? "text-primary" : "text-muted-foreground"}`}>
                  {tab.label}
                </span>
                {isActive && <span className="h-0.5 w-1.5 rounded-full bg-accent" />}
              </Link>
            )
          })}
        </nav>
      </div>
    </div>
  )
}
