"use client"

import { ReactNode } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { LayoutDashboard, ShieldCheck, Truck, Package, Users } from "lucide-react"
import { CapabilitySwitcher } from "@/components/layout/capability-switcher"
import { AppLogo } from "@/components/ui/app-logo"

interface AdminShellProps {
  children: ReactNode
  eyebrow?: string
  title: string
  subtitle?: string
  headerRight?: ReactNode
}

const tabs = [
  { id: "dashboard", href: "/admin", label: "Overview", icon: LayoutDashboard },
  { id: "verifications", href: "/admin/verifications", label: "KYC Review", icon: ShieldCheck },
  { id: "assignments", href: "/admin/assignments", label: "Dispatch", icon: Truck },
]

export function AdminShell({
  children,
  eyebrow,
  title,
  subtitle,
  headerRight,
}: AdminShellProps) {
  const pathname = usePathname()

  const activeTab =
    pathname === "/admin" ? "dashboard"
    : pathname.startsWith("/admin/verifications") ? "verifications"
    : pathname.startsWith("/admin/assignments") ? "assignments"
    : "dashboard"

  return (
    <div className="min-h-screen bg-background px-0 sm:px-4 sm:py-6">
      <div className="mx-auto flex min-h-screen w-full max-w-[460px] flex-col overflow-hidden bg-background sm:min-h-[800px] sm:rounded-[32px] sm:border sm:border-border sm:shadow-xl">
        {/* Top Header */}
        <header className="flex items-center justify-between border-b border-border px-5 py-3">
          <Link href="/admin" className="inline-flex items-center gap-1.5 transition-opacity hover:opacity-90" title="O Bele Staff Admin">
            <AppLogo width={115} height={41} className="h-9 w-auto" priority />
            <span className="rounded-md bg-secondary/15 px-1.5 py-0.5 text-[9px] font-bold uppercase text-secondary">
              Staff
            </span>
          </Link>
          <CapabilitySwitcher variant="shell" currentRole="FARMER" />
        </header>

        {/* Content */}
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
        <nav className="flex shrink-0 items-stretch border-t border-border bg-card pb-1">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id

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

export default AdminShell