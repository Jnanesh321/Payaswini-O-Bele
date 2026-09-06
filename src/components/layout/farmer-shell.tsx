"use client"

import { ReactNode } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Compass, CalendarDays, ShoppingBag, User, Tractor } from "lucide-react"
import { CapabilitySwitcher } from "@/components/layout/capability-switcher"
import { AppLogo } from "@/components/ui/app-logo"
import { useCartStore } from "@/store/cart"
import { useMounted } from "@/hooks/use-mounted"

interface FarmerShellProps {
  children: ReactNode
  eyebrow?: string
  title: string
  subtitle?: string
  headerRight?: ReactNode
}

const tabs = [
  { id: "explore", href: "/", label: "Explore", icon: Compass },
  { id: "tools", href: "/tools", label: "Catalog", icon: Tractor },
  { id: "rentals", href: "/dashboard", label: "Bookings", icon: CalendarDays },
  { id: "cart", href: "/cart", label: "Cart", icon: ShoppingBag, badge: true },
  { id: "profile", href: "/dashboard#account", label: "Account", icon: User },
]

export function FarmerShell({
  children,
  eyebrow,
  title,
  subtitle,
  headerRight,
}: FarmerShellProps) {
  const pathname = usePathname()
  const itemCount = useCartStore((s) => s.getItemCount())
  const mounted = useMounted()

  const activeTab =
    pathname === "/" ? "explore"
    : pathname.startsWith("/tools") ? "tools"
    : pathname.startsWith("/cart") || pathname.startsWith("/checkout") ? "cart"
    : pathname === "/dashboard" ? "rentals"
    : "profile"

  return (
    <div className="min-h-screen bg-background px-0 sm:px-4 sm:py-6">
      <div className="mx-auto flex min-h-screen w-full max-w-[430px] flex-col overflow-hidden bg-background sm:min-h-[800px] sm:rounded-[32px] sm:border sm:border-border sm:shadow-xl">
        {/* Top Header */}
        <header className="flex items-center justify-between border-b border-border px-5 py-3">
          <Link href="/" className="inline-flex items-center transition-opacity hover:opacity-90" title="Payaswini O Bele">
            <AppLogo width={115} height={41} className="h-9 w-auto" priority />
          </Link>
          <CapabilitySwitcher variant="shell" currentRole="FARMER" />
        </header>

        {/* Page Content */}
        <main className="flex flex-1 flex-col overflow-hidden">
          <div className="flex items-start justify-between px-5 pb-3 pt-5">
            <div>
              {eyebrow && (
                <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.14em] text-secondary">
                  {eyebrow}
                </p>
              )}
              <h1 className="font-display text-[26px] font-bold leading-[1.1] text-foreground">
                {title}
              </h1>
              {subtitle && <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>}
            </div>
            {headerRight}
          </div>

          <div className="flex flex-1 flex-col overflow-y-auto px-5 pb-8">
            {children}
          </div>
        </main>

        {/* Bottom Tab Bar */}
        <nav className="flex shrink-0 items-stretch border-t border-border bg-card/95 pb-safe pt-1">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id
            const showBadge = tab.badge && mounted && itemCount > 0

            return (
              <Link
                key={tab.id}
                href={tab.href}
                className="relative flex flex-1 flex-col items-center gap-0.5 pt-2.5"
              >
                <span className="relative">
                  <tab.icon
                    size={20}
                    strokeWidth={isActive ? 2.2 : 1.8}
                    className={isActive ? "text-primary" : "text-muted-foreground"}
                  />
                  {showBadge && (
                    <span className="absolute -right-2.5 -top-1 flex min-w-3.5 items-center justify-center rounded-full bg-accent px-1 py-px text-[8px] font-bold text-white">
                      {itemCount > 9 ? "9+" : itemCount}
                    </span>
                  )}
                </span>
                <span
                  className={`text-[10px] font-semibold ${
                    isActive ? "text-primary" : "text-muted-foreground"
                  }`}
                >
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
