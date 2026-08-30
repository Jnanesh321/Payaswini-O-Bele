"use client"

import { useEffect, useState } from "react"
import OperatorShell from "../_components/operator-shell"

interface HistoryJob {
  id: string
  bookingRef: string
  status: string
  startDate: string
  endDate: string
  totalDays: number
  totalOperatorFee: number
  tool: { name: string; images: string[] }
  farmer: { id: string; name: string; phone: string }
}

const FILTERS = ["All", "Completed", "Disputed", "Cancelled"] as const
type Filter = (typeof FILTERS)[number]

const CANCELLED_STATUSES = new Set([
  "CANCELLED_BY_FARMER",
  "CANCELLED_BY_OWNER",
  "CANCELLED_BY_OPERATOR",
  "CANCELLED_BY_PLATFORM",
  "FAILED_NO_OPERATOR",
])

function classify(status: string): "completed" | "disputed" | "cancelled" {
  if (status === "COMPLETED") return "completed"
  if (status === "DISPUTED") return "disputed"
  if (CANCELLED_STATUSES.has(status)) return "cancelled"
  return "completed"
}

const statusCfg: Record<"completed" | "disputed" | "cancelled", { label: string; cls: string }> = {
  completed: { label: "Completed", cls: "bg-primary/10 text-primary" },
  disputed: { label: "Disputed", cls: "bg-[#7A5800]/10 text-[#7A5800]" },
  cancelled: { label: "Cancelled", cls: "bg-muted text-muted-foreground" },
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
  })
}

export default function OperatorHistoryPage() {
  const [jobs, setJobs] = useState<HistoryJob[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<Filter>("All")
  const [search, setSearch] = useState("")

  useEffect(() => {
    let alive = true
    fetch("/api/operator/jobs", { cache: "no-store" })
      .then((res) => res.json())
      .then((json) => {
        if (!alive) return
        if (!json.success) setError(json.error || "Failed to load your job history")
        else setJobs(json.data || [])
      })
      .catch(() => {
        if (alive) setError("Failed to load your job history")
      })
      .finally(() => {
        if (alive) setLoading(false)
      })
    return () => {
      alive = false
    }
  }, [])

  const visible = jobs.filter((j) => {
    const kind = classify(j.status)
    const matchFilter = filter === "All" || filter.toLowerCase() === kind
    const q = search.trim().toLowerCase()
    const matchSearch =
      !q ||
      j.tool.name.toLowerCase().includes(q) ||
      (j.farmer.name ?? "").toLowerCase().includes(q) ||
      j.bookingRef.toLowerCase().includes(q)
    return matchFilter && matchSearch
  })

  return (
    <OperatorShell eyebrow="Your past assignments" title="Job History"
      action={loading ? <span className="h-4 w-16 animate-pulse rounded bg-border" /> : undefined}>
      <div className="flex flex-col gap-4">
        {error && <p className="rounded-2xl bg-muted px-4 py-3 text-center text-sm font-semibold text-secondary">{error}</p>}

        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="🔍  Search farm, tool, or job ref…"
          className="w-full rounded-2xl border border-border bg-card px-4 py-3 text-sm font-medium text-foreground outline-none transition placeholder:text-muted-foreground focus:border-primary"
        />

        <div className="flex gap-2 overflow-x-auto pb-1">
          {FILTERS.map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={`shrink-0 rounded-full border px-4 py-1.5 text-xs font-bold transition ${
                filter === f ? "border-primary bg-primary/10 text-primary" : "border-border bg-card text-muted-foreground"
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3 text-[11px] font-bold uppercase tracking-[0.16em] text-secondary"><span className="h-px flex-1 bg-border" /><span>{visible.length} Jobs</span><span className="h-px flex-1 bg-border" /></div>

        {loading && <div className="h-24 animate-pulse rounded-[22px] bg-muted" />}

        {!loading && visible.length === 0 && (
          <p className="rounded-[22px] border border-dashed border-border bg-muted px-4 py-10 text-center text-sm font-semibold text-muted-foreground">
            No jobs found
          </p>
        )}

        {!loading && (
          <section className="flex flex-col gap-2.5">
            {visible.map((job) => {
              const kind = classify(job.status)
              const cfg = statusCfg[kind]
              return (
                <div key={job.id} className="flex items-start gap-3 rounded-[18px] border border-border bg-card p-4">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-muted text-lg text-secondary">✦</span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-[15px] font-bold text-foreground">{job.tool.name}</p>
                      <span className={`shrink-0 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase ${cfg.cls}`}>{cfg.label}</span>
                    </div>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">{job.farmer.name}</p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      {formatDate(job.startDate)} → {formatDate(job.endDate)} · {job.totalDays} day{job.totalDays === 1 ? "" : "s"} · {job.bookingRef}
                    </p>
                  </div>
                  <span className="shrink-0 text-[13px] font-bold text-primary">
                    {kind === "cancelled" ? "—" : `₹${(job.totalOperatorFee / 100).toLocaleString("en-IN")}`}
                  </span>
                </div>
              )
            })}
          </section>
        )}
      </div>
    </OperatorShell>
  )
}