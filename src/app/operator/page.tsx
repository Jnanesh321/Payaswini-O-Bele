"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import OperatorShell from "./_components/operator-shell"
import { statusToRoute } from "./_components/use-operator-booking"
import { bookingStatusLabel } from "@/lib/booking-status"

interface Job {
  id: string
  bookingRef: string
  status: string
  startDate: string
  endDate: string
  totalDays: number
  totalOperatorFee: number
  totalAmount: number
  tool: { name: string; images: string[] }
  farmer: { id: string; name: string; phone: string }
  stateLogs: { fromState: string; toState: string; note: string | null; createdAt: string }[]
  permittedTargets: string[]
}

function formatPhone(raw: string): string {
  const digits = raw.replace(/\D/g, "")
  if (digits.length === 12 && digits.startsWith("91")) {
    return `+91 ${digits.slice(2, 5)} ${digits.slice(5, 9)} ${digits.slice(9)}`
  }
  return raw
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
  })
}

const ACTIVE_STATUSES = new Set([
  "OPERATOR_ASSIGNED",
  "OPERATOR_ACCEPTED",
  "FETCHING_TOOL",
  "TOOL_COLLECTED",
  "TRAVELLING_TO_FARM",
  "ARRIVED",
  "WORK_STARTED",
  "WORK_PAUSED",
  "WORK_RESUMED",
  "WORK_COMPLETED",
  "RETURNING_TOOL",
  "TOOL_RETURNED",
  "INSPECTION",
])

export default function OperatorHomePage() {
  const router = useRouter()
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [acting, setActing] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/operator/jobs", { cache: "no-store" })
      const json = await res.json()
      if (!res.ok) setError(json.error || "Failed to load your jobs")
      else setJobs(json.data || [])
    } catch {
      setError("Failed to load your jobs")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const t = setTimeout(refresh, 0)
    return () => clearTimeout(t)
  }, [refresh])

  const active = jobs.find((j) => ACTIVE_STATUSES.has(j.status))
  const assigned = active && active.status === "OPERATOR_ASSIGNED" ? active : null
  const inProgress = active && active.status !== "OPERATOR_ASSIGNED" ? active : null
  const past = jobs.filter((j) => !ACTIVE_STATUSES.has(j.status))

  const canAccept = assigned?.permittedTargets.includes("OPERATOR_ACCEPTED") ?? false
  const canDecline = assigned?.permittedTargets.includes("OPERATOR_PENDING") ?? false

  const handleAccept = async () => {
    if (!active) return
    setActing(active.id)
    try {
      const res = await fetch(`/api/rentals/${active.id}/transition`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: "OPERATOR_ACCEPTED" }),
      })
      const json = await res.json()
      if (!res.ok) {
        setError(json.error || "Could not accept the job")
        return
      }
      router.push(`/operator/pickup?booking=${active.id}`)
    } catch {
      setError("Network error — try again")
    } finally {
      setActing(null)
    }
  }

  const handleDecline = async () => {
    if (!active) return
    setActing(active.id)
    try {
      const res = await fetch(`/api/rentals/${active.id}/transition`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: "OPERATOR_PENDING", note: "Operator declined assignment" }),
      })
      const json = await res.json()
      if (!res.ok) {
        setError(json.error || "Could not decline the job")
        return
      }
      if (json.data?.autoFailed) {
        setError("You were the last available operator — this booking is now marked as having no operator.")
      }
      await refresh()
    } catch {
      setError("Network error — try again")
    } finally {
      setActing(null)
    }
  }

  const continueRoute = inProgress ? statusToRoute(inProgress.status) : null

  return (
    <OperatorShell eyebrow="Your schedule" title="Operator jobs"
      action={loading ? <span className="h-4 w-16 animate-pulse rounded bg-border" /> : undefined}>
      <div className="flex flex-col gap-5">
        {error && <p className="rounded-2xl bg-muted px-4 py-3 text-center text-sm font-semibold text-secondary">{error}</p>}

        {loading ? (
          <div className="flex flex-col gap-3">
            <div className="h-40 animate-pulse rounded-[22px] bg-muted" />
            <div className="h-24 animate-pulse rounded-[22px] bg-muted" />
          </div>
        ) : assigned ? (
          <section className="rounded-[22px] border border-accent bg-card p-5 shadow-[0_6px_16px_rgba(45,80,22,0.06)]">
            <div className="mb-4 flex items-center justify-between gap-3">
              <span className="rounded-full bg-primary/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.08em] text-primary">New assignment</span>
              <span className="text-[11px] font-semibold text-muted-foreground">{assigned.bookingRef}</span>
            </div>
            <div className="flex items-center gap-3.5">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border-2 border-accent bg-gradient-to-br from-[#d6b77d] via-[#9b6a3c] to-[#3d5d2b] font-display text-lg font-bold text-white shadow-inner">
                {assigned.farmer.name.slice(0, 2).toUpperCase()}
              </div>
              <div>
                <h2 className="font-display text-[21px] font-bold text-foreground">{assigned.farmer.name}</h2>
                <p className="mt-1 text-sm text-muted-foreground">Farmer · {formatPhone(assigned.farmer.phone)}</p>
              </div>
            </div>
            <div className="mt-5 flex items-center gap-3 rounded-2xl bg-muted px-4 py-3.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-lg text-secondary">✦</span>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-secondary">Tool · {assigned.totalDays} day{assigned.totalDays === 1 ? "" : "s"}</p>
                <p className="mt-0.5 text-sm font-bold text-foreground">{assigned.tool.name}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{formatDate(assigned.startDate)} → {formatDate(assigned.endDate)}</p>
              </div>
            </div>
            <section className="mt-5 rounded-2xl bg-muted p-4">
              <div className="flex items-center justify-between gap-3">
                <h3 className="font-display text-[17px] font-bold text-foreground">Estimated earnings</h3>
                <span className="font-display text-2xl font-black text-accent">₹{(assigned.totalOperatorFee / 100).toLocaleString("en-IN")}</span>
              </div>
              <p className="mt-2 text-xs leading-relaxed text-primary">Paid after the job is completed and the equipment is safely returned.</p>
            </section>
          </section>
        ) : inProgress && continueRoute ? (
          <section className="rounded-[22px] border border-border bg-card p-5 shadow-[0_6px_16px_rgba(45,80,22,0.06)]">
            <span className="rounded-full bg-accent px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.08em] text-primary">In progress</span>
            <div className="mt-4 flex items-center gap-3.5">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-muted text-xl text-secondary">✦</div>
              <div className="min-w-0 flex-1">
                <h2 className="font-display text-[19px] font-bold text-foreground">{inProgress.tool.name}</h2>
                <p className="mt-0.5 text-xs font-semibold text-secondary">{bookingStatusLabel(inProgress.status)}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">Farmer · {inProgress.farmer.name}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => router.push(`/operator/${continueRoute}?booking=${inProgress.id}`)}
              className="mt-5 flex h-[52px] w-full items-center justify-center gap-2 rounded-full bg-primary text-sm font-bold text-primary-foreground shadow-[0_6px_16px_rgba(45,80,22,0.24)] transition hover:brightness-110"
            >
              Continue job <span aria-hidden="true">→</span>
            </button>
          </section>
        ) : (
          <section className="flex flex-col items-center gap-3 rounded-[22px] border border-dashed border-border bg-muted p-10 text-center">
            <span className="text-3xl">🟢</span>
            <h2 className="font-display text-lg font-bold text-foreground">No active jobs</h2>
            <p className="max-w-xs text-sm text-muted-foreground">Your new assignments will appear here the moment the admin assigns one to you.</p>
          </section>
        )}

        <div className="grid grid-cols-2 gap-3">
          <Link
            href="/operator/earnings"
            className="flex flex-col items-start gap-1 rounded-[20px] border border-border bg-card p-4 text-left transition hover:border-accent"
          >
            <span className="text-xl">₹</span>
            <span className="text-sm font-bold text-foreground">Earnings</span>
            <span className="text-[11px] text-muted-foreground">Paid · pending</span>
          </Link>
          <Link
            href="/operator/history"
            className="flex flex-col items-start gap-1 rounded-[20px] border border-border bg-card p-4 text-left transition hover:border-accent"
          >
            <span className="text-xl">🕒</span>
            <span className="text-sm font-bold text-foreground">Job History</span>
            <span className="text-[11px] text-muted-foreground">Past assignments</span>
          </Link>
        </div>

        {past.length > 0 && (
          <>
            <div className="flex items-center gap-3 text-[11px] font-bold uppercase tracking-[0.16em] text-secondary"><span className="h-px flex-1 bg-border" /><span>Past jobs</span><span className="h-px flex-1 bg-border" /></div>
            <section className="flex flex-col gap-2.5">
              {past.map((job) => (
                <div key={job.id} className="flex items-center gap-3 rounded-[18px] border border-border bg-card p-4">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-muted text-lg text-secondary">✦</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[15px] font-bold text-foreground">{job.tool.name}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">{bookingStatusLabel(job.status)}</p>
                  </div>
                  <span className="text-[11px] font-bold text-muted-foreground">₹{(job.totalOperatorFee / 100).toLocaleString("en-IN")}</span>
                </div>
              ))}
            </section>
          </>
        )}
      </div>

      {assigned && (canAccept || canDecline) && (
        <div className="sticky bottom-0 mt-6 flex gap-3 border-t border-border bg-background pb-2 pt-4">
          {canDecline && (
            <button
              type="button"
              disabled={acting === assigned.id}
              onClick={handleDecline}
              className="flex h-[52px] flex-1 items-center justify-center rounded-full border border-secondary bg-background text-sm font-bold text-secondary transition hover:bg-muted disabled:opacity-50"
            >
              Decline
            </button>
          )}
          {canAccept && (
            <button
              type="button"
              disabled={acting === assigned.id}
              onClick={handleAccept}
              className="flex h-[52px] flex-[1.45] items-center justify-center gap-2 rounded-full bg-primary text-sm font-bold text-primary-foreground shadow-[0_6px_16px_rgba(45,80,22,0.24)] transition hover:brightness-110 disabled:opacity-50"
            >
              {acting === assigned.id ? "Working…" : "Accept job"} <span aria-hidden="true">→</span>
            </button>
          )}
        </div>
      )}
    </OperatorShell>
  )
}