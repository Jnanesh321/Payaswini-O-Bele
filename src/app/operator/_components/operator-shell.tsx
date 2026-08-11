"use client"

import { ReactNode } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"

interface OperatorShellProps {
  children: ReactNode
  eyebrow: string
  title: string
  action?: ReactNode
}

export default function OperatorShell({
  children,
  eyebrow,
  title,
  action,
}: OperatorShellProps) {
  const router = useRouter()

  return (
    <div className="min-h-screen bg-background px-0 sm:px-4 sm:py-6">
      <div className="mx-auto flex min-h-screen w-full max-w-[430px] flex-col overflow-hidden bg-background sm:min-h-[800px] sm:rounded-[32px] sm:border sm:border-border sm:shadow-xl">
        <header className="flex items-center justify-between border-b border-border px-5 py-3.5">
          <button
            type="button"
            aria-label="Go back"
            onClick={() => router.back()}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border bg-white transition hover:bg-muted"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M12.5 15L7.5 10L12.5 5" stroke="#2D5016" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
          <Link href="/operator" className="flex items-center gap-1.5">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M1.9992 21C1.9992 17.9999 3.8493 15.6398 7.07948 14.9998C9.49962 14.5197 11.9998 12.9997 12.9998 11.9996M10.9994 20C9.2434 20.0053 7.5495 19.3504 6.25369 18.1653C4.95788 16.9802 4.15482 15.3513 4.00378 13.6018C3.85274 11.8523 4.36476 10.1099 5.43828 8.72023C6.5118 7.33055 8.0684 6.39509 9.79937 6.09938C15.4997 4.99933 16.9998 6.17938 21 9.99954C21 15.4998 16.2197 20 10.9994 20Z" stroke="#D4A017" strokeWidth="2" strokeLinecap="round" />
            </svg>
            <span className="font-display text-[22px] font-bold text-primary">O~Bele</span>
          </Link>
          <span className="rounded-md border border-accent bg-muted px-2.5 py-1 text-[9px] font-bold uppercase tracking-wide text-secondary">DK Coast</span>
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
      </div>
    </div>
  )
}
