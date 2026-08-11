"use client"

import { ReactNode, useEffect, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Package, Bell, TrendingUp, User } from "lucide-react"

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
