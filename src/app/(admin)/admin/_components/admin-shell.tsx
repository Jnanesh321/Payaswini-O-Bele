"use client"

import { ReactNode } from "react"

interface AdminShellProps {
  children: ReactNode
  eyebrow?: string
  title: string
  subtitle?: string
  headerRight?: ReactNode
}

export default function AdminShell({
  children,
  eyebrow,
  title,
  subtitle,
  headerRight,
}: AdminShellProps) {
  return (
    <div className="container py-8">
      <div className="mb-8 flex items-end justify-between gap-4">
        <div>
          {eyebrow && (
            <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.14em] text-secondary">
              {eyebrow}
            </p>
          )}
          <h1 className="font-heading text-3xl font-bold text-foreground">{title}</h1>
          {subtitle && <p className="mt-1 text-muted-foreground">{subtitle}</p>}
        </div>
        {headerRight}
      </div>
      {children}
    </div>
  )
}