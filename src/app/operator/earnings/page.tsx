"use client"

import { useCallback, useEffect, useState } from "react"
import OperatorShell from "../_components/operator-shell"

type Period = "today" | "week" | "month"

interface Payout {
  id: string
  bookingRef: string
  farmer: string
  tool: string
  date: string
  amount: number
  settled: boolean
}

interface EarningsData {
  period: string
  total: number
  settled: number
  pending: number
  settlePct: number
  payouts: Payout[]
}

const PERIODS: { key: Period; label: string }[] = [
  { key: "month", label: "This month" },
  { key: "week", label: "This week" },
  { key: "today", label: "Today" },
]

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
  })
}

export default function OperatorEarningsPage() {
  const [period, setPeriod] = useState<Period>("month")
  const [data, setData] = useState<EarningsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/operator/earnings?period=${period}`, { cache: "no-store" })
      const json = await res.json()
      if (!json.success) setError(json.error || "Failed to load your earnings")
      else setData(json.data)
    } catch {
      setError("Failed to load your earnings")
    } finally {
      setLoading(false)
    }
  }, [period])

  useEffect(() => {
    const t = setTimeout(refresh, 0)
    return () => clearTimeout(t)
  }, [refresh])

  const inr = (n: number) => `₹${n.toLocaleString("en-IN")}`
  const paidCount = data?.payouts.filter((p) => p.settled).length ?? 0
  const pendingCount = data?.payouts.filter((p) => !p.settled).length ?? 0

  return (
    <OperatorShell eyebrow="Your income" title="Earnings"
      action={
        <label className="rounded-full border border-border bg-card px-3 py-1.5 text-[11px] font-bold text-primary">
          {PERIODS.find((p) => p.key === period)?.label}
        </label>
      }>
      <div className="flex flex-col gap-5">
        {error && <p className="rounded-2xl bg-muted px-4 py-3 text-center text-sm font-semibold text-secondary">{error}</p>}

        <div className="rounded-[22px] bg-gradient-to-br from-primary to-[#6f9e4c] p-6 text-white shadow-[0_10px_24px_rgba(45,80,22,0.28)]">
          {loading ? (
            <div className="h-24 animate-pulse rounded-xl bg-white/20" />
          ) : (
            <>
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/80">Net earnings</p>
              <p className="mt-1 font-display text-4xl font-black tracking-tight">{inr(data?.total ?? 0)}</p>
              <p className="mt-2 text-xs font-semibold text-white/80">{data?.payouts.length ?? 0} jobs this period</p>
              <div className="mt-5 flex h-2 w-full overflow-hidden rounded-full bg-white/25">
                <div className="h-full rounded-full bg-[#ffe1a8]" style={{ width: `${data?.settlePct ?? 0}%` }} />
              </div>
              <p className="mt-2 text-[11px] font-semibold text-white/85">{data?.settlePct ?? 0}% settled</p>
            </>
          )}
        </div>

        <div className="flex gap-2">
          {PERIODS.map((p) => (
            <button
              key={p.key}
              type="button"
              onClick={() => setPeriod(p.key)}
              className={`flex-1 rounded-full border px-3 py-2 text-xs font-bold transition ${
                period === p.key ? "border-primary bg-primary/10 text-primary" : "border-border bg-card text-muted-foreground"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        <section className="flex gap-3">
          <div className="flex-1 rounded-[20px] border border-border bg-card p-4">
            <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-secondary">Paid</p>
            <p className="mt-1 font-display text-xl font-black text-primary">{inr(data?.settled ?? 0)}</p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">{paidCount} jobs</p>
          </div>
          <div className="flex-1 rounded-[20px] border border-border bg-card p-4">
            <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-secondary">Pending</p>
            <p className="mt-1 font-display text-xl font-black text-[#7A5800]">{inr(data?.pending ?? 0)}</p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">{pendingCount} jobs</p>
          </div>
        </section>

        <div className="flex items-center gap-3 text-[11px] font-bold uppercase tracking-[0.16em] text-secondary"><span className="h-px flex-1 bg-border" /><span>Recent jobs</span><span className="h-px flex-1 bg-border" /></div>

        {loading && <div className="h-24 animate-pulse rounded-[22px] bg-muted" />}

        {!loading && (data?.payouts.length ?? 0) === 0 && (
          <p className="rounded-[22px] border border-dashed border-border bg-muted px-4 py-10 text-center text-sm font-semibold text-muted-foreground">
            No jobs in this period yet
          </p>
        )}

        {!loading && data && data.payouts.length > 0 && (
          <section className="flex flex-col gap-2.5">
            {data.payouts.map((p) => (
              <div key={p.id} className="flex items-start gap-3 rounded-[18px] border border-border bg-card p-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-muted text-lg text-secondary">✦</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[15px] font-bold text-foreground">{p.tool}</p>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">{p.farmer} · {formatDate(p.date)}</p>
                  <p className="mt-0.5 text-[10px] text-muted-foreground">{p.bookingRef}</p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-[13px] font-bold text-primary">{inr(p.amount)}</p>
                  <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[9px] font-bold uppercase ${p.settled ? "bg-primary/10 text-primary" : "bg-[#f7e6c0] text-[#7A5800]"}`}>
                    {p.settled ? "Paid" : "Pending"}
                  </span>
                </div>
              </div>
            ))}
          </section>
        )}
      </div>
    </OperatorShell>
  )
}