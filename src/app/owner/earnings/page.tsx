"use client"

import { useCallback, useEffect, useState } from "react"
import OwnerShell from "../_components/owner-shell"
import { useLocale } from "next-intl"
import { formatPrice, formatDate } from "@/lib/utils"
import { Loader2, Wallet, Check, Settings } from "lucide-react"

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
  period: Period
  total: number
  settled: number
  pending: number
  settlePct: number
  payouts: Payout[]
}

const periodLabels: Record<Period, string> = {
  today: "Today",
  week: "This Week",
  month: "This Month",
}

export default function OwnerEarningsPage() {
  const locale = useLocale()
  const fp = (n: number) => formatPrice(n, locale)
  const [period, setPeriod] = useState<Period>("month")
  const [data, setData] = useState<EarningsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  const fetchEarnings = useCallback(async (p: Period) => {
    setLoading(true)
    setError("")
    try {
      const res = await fetch(`/api/owner/earnings?period=${p}`)
      const json = await res.json()
      if (res.ok) {
        setData(json.data)
      } else {
        setError(json.error || "Failed to load earnings")
      }
    } catch {
      setError("Failed to load earnings")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchEarnings(period)
  }, [period, fetchEarnings])

  const settlePct = data ? data.settlePct : 0

  return (
    <OwnerShell
      title="Earnings"
      subtitle="O~Bele · Dakshina Kannada"
      headerRight={
        <button
          type="button"
          aria-label="Settings"
          className="mt-1 flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10"
        >
          <Settings size={16} className="text-primary" />
        </button>
      }
    >
      {/* ── Period tabs ───────────────────────────────────── */}
      <div className="mb-3 mt-4 flex rounded-2xl bg-primary/10 p-1">
        {(["today", "week", "month"] as Period[]).map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => setPeriod(p)}
            className={`flex-1 rounded-xl py-2.5 text-[13px] font-semibold transition-all ${
              period === p
                ? "bg-card text-primary shadow-[0_1px_5px_rgba(0,0,0,0.09)]"
                : "text-muted-foreground"
            }`}
          >
            {periodLabels[p]}
          </button>
        ))}
      </div>

      {error && (
        <p className="mb-3 rounded-2xl bg-destructive/10 px-4 py-3 text-center text-sm font-semibold text-destructive">
          {error}
        </p>
      )}

      {loading && !data ? (
        <div className="flex flex-1 items-center justify-center py-24">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : data ? (
        <>
          {/* ── Hero total card ───────────────────────────────── */}
          <div className="rounded-[22px] bg-primary px-5 py-6 shadow-[0_6px_28px_rgba(45,80,22,0.28)]">
            <div className="mb-1 text-[10px] font-bold uppercase tracking-[0.1em] text-white/50">
              Total Earned · {periodLabels[data.period]}
            </div>
            <div className="mb-4 font-display text-[40px] font-bold leading-[1.1] text-accent">
              {fp(data.total)}
            </div>

            {/* Settled bar */}
            <div className="mb-3.5">
              <div className="mb-1.5 flex justify-between">
                <span className="text-[11px] text-white/60">Settled</span>
                <span className="text-[13px] font-bold text-[#90EE90]">{fp(data.settled)}</span>
              </div>
              <div className="h-[7px] overflow-hidden rounded-full bg-white/15">
                <div
                  className="h-full rounded-full bg-[#90EE90] transition-all duration-500"
                  style={{ width: `${settlePct}%` }}
                />
              </div>
            </div>

            {/* Pending bar */}
            <div>
              <div className="mb-1.5 flex justify-between">
                <span className="text-[11px] text-white/60">Pending</span>
                <span className="text-[13px] font-bold text-accent">{fp(data.pending)}</span>
              </div>
              <div className="h-[7px] overflow-hidden rounded-full bg-white/15">
                <div
                  className="h-full rounded-full bg-accent transition-all duration-500"
                  style={{ width: `${100 - settlePct}%` }}
                />
              </div>
            </div>
          </div>

          {/* ── Stat pills ────────────────────────────────────── */}
          <div className="mt-3 grid grid-cols-2 gap-3">
            {[
              { label: "Settled", value: data.settled, color: "text-[#2E7D32]", note: "In your account" },
              { label: "Pending", value: data.pending, color: "text-accent", note: "After tool return" },
            ].map((stat) => (
              <div
                key={stat.label}
                className="rounded-[18px] border border-border bg-card px-4 py-4 shadow-[0_2px_8px_rgba(45,80,22,0.05)]"
              >
                <div className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.07em] text-muted-foreground">
                  {stat.label}
                </div>
                <div className={`font-display text-[22px] font-bold ${stat.color}`}>{fp(stat.value)}</div>
                <div className="mt-1 text-[11px] text-muted-foreground">{stat.note}</div>
              </div>
            ))}
          </div>

          {/* ── Recent payouts ────────────────────────────────── */}
          <div className="mt-6">
            <div className="mb-2.5 font-display text-base font-bold text-primary">Recent Payouts</div>
            <div className="overflow-hidden rounded-[20px] border border-border bg-card shadow-[0_2px_10px_rgba(45,80,22,0.05)]">
              {data.payouts.length === 0 ? (
                <div className="px-5 py-10 text-center text-[13px] text-muted-foreground">
                  No activity in this period yet.
                </div>
              ) : (
                data.payouts.map((p, i) => (
                  <div key={p.id}>
                    {i > 0 && <div className="ml-[60px] h-px bg-border" />}
                    <div className="flex items-center gap-3 px-4 py-3.5">
                      <div
                        className={`flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-[13px] ${
                          p.settled ? "bg-[#2E7D32]/10" : "bg-accent/10"
                        }`}
                      >
                        <Wallet size={15} className={p.settled ? "text-[#2E7D32]" : "text-accent"} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[13px] font-semibold text-foreground">{p.farmer}</div>
                        <div className="mt-0.5 truncate text-[11px] text-muted-foreground">
                          {p.tool} · {formatDate(p.date)}
                        </div>
                      </div>
                      <div className="shrink-0 text-right">
                        <div className={`text-sm font-bold ${p.settled ? "text-[#2E7D32]" : "text-accent"}`}>
                          {fp(p.amount)}
                        </div>
                        <div className={`mt-0.5 text-[10px] font-bold ${p.settled ? "text-[#2E7D32]" : "text-accent"}`}>
                          {p.settled ? "Settled" : "Pending"}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      ) : null}

      {/* Verified payout note */}
      <div className="mt-4 flex items-center gap-2 rounded-2xl bg-bele-green-muted px-4 py-3 text-[11px] text-primary">
        <Check size={14} />
        Payouts settle to your bank / UPI 24 hours after the tool is returned.
      </div>
    </OwnerShell>
  )
}
