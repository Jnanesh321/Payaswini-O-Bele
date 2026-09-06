"use client"

import { ReactNode } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import OperatorBottomNav from "./operator-bottom-nav"
import { CapabilitySwitcher } from "@/components/layout/capability-switcher"
import { AppLogo } from "@/components/ui/app-logo"

interface OperatorShellProps {
  children: ReactNode
  eyebrow: string
  title: string
  action?: ReactNode
  /** Hide the bottom tab bar (terminal screens). */
  hideNav?: boolean
}

export default function OperatorShell({
  children,
  eyebrow,
  title,
  action,
  hideNav = false,
}: OperatorShellProps) {
  const router = useRouter()

  return (
    <div className="min-h-screen bg-background px-0 sm:px-4 sm:py-6">
      <div className="mx-auto flex min-h-screen w-full max-w-[430px] flex-col overflow-hidden bg-background sm:min-h-[800px] sm:rounded-[32px] sm:border sm:border-border sm:shadow-xl">
        <header className="flex items-center justify-between border-b border-border px-5 py-3">
          <button
            type="button"
            aria-label="Go back"
            onClick={() => router.back()}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border bg-card transition hover:bg-muted"
          >
            <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
              <path d="M12.5 15L7.5 10L12.5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
          <Link href="/operator" className="inline-flex items-center transition-opacity hover:opacity-90">
            <AppLogo width={115} height={41} className="h-9 w-auto" priority />
          </Link>
          <CapabilitySwitcher variant="shell" currentRole="OPERATOR" />
        </header>
        <main className="flex flex-1 flex-col px-5 pb-6 pt-6">
          <div className="mb-5 flex items-end justify-between gap-3">
            <div>
              <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.14em] text-secondary">{eyebrow}</p>
              <h1 className="font-display text-[28px] font-bold leading-[1.08] text-foreground">{title}</h1>
            </div>
            {action}
          </div>
          {children}
        </main>
        {!hideNav && <OperatorBottomNav />}
      </div>
    </div>
  )
}
