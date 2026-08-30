"use client"

import { useSearchParams } from "next/navigation"
import { Suspense, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import OperatorShell from "../_components/operator-shell"
import { useOperatorBooking } from "../_components/use-operator-booking"

const TASKS = [
  "Complete the agreed field work",
  "Bundle & stack cut material",
  "Clear debris from pathways",
  "Final walkthrough with the farmer",
]

function OperatorWorkInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const bookingId = searchParams.get("booking")
  const { booking, loading, error, transition, can } = useOperatorBooking(bookingId)
  const [elapsed, setElapsed] = useState(0)
  const [tasks, setTasks] = useState(TASKS.map(() => false))
  const [busy, setBusy] = useState(false)
  const done = tasks.filter(Boolean).length

  useEffect(() => {
    if (booking?.status === "WORK_STARTED" || booking?.status === "WORK_RESUMED") {
      const id = setInterval(() => setElapsed((e) => e + 1), 1000)
      return () => clearInterval(id)
    }
  }, [booking?.status])

  if (!bookingId) {
    return <p className="text-center text-sm font-semibold text-secondary">No job selected.</p>
  }

  const hrs = String(Math.floor(elapsed / 3600)).padStart(2, "0")
  const mins = String(Math.floor((elapsed % 3600) / 60)).padStart(2, "0")
  const secs = String(elapsed % 60).padStart(2, "0")

  const canPause = can("WORK_PAUSED")
  const canResume = can("WORK_RESUMED")
  const canComplete = can("WORK_COMPLETED")
  const running = canPause || canResume

  const pauseResume = async () => {
    setBusy(true)
    const to = canResume ? "WORK_RESUMED" : "WORK_PAUSED"
    await transition(to, to === "WORK_PAUSED" ? "Operator paused work" : "Operator resumed work")
    setBusy(false)
  }

  const completeWork = async () => {
    setBusy(true)
    await transition("WORK_COMPLETED", "Operator completed the field work")
    setBusy(false)
    router.push(`/operator/return?booking=${bookingId}`)
  }

  return (
    <OperatorShell eyebrow="Field work" title="Work in progress">
      <div className="flex flex-col gap-5">
        {loading && <div className="h-24 animate-pulse rounded-[22px] bg-muted" />}
        {error && <p className="rounded-2xl bg-muted px-4 py-3 text-center text-sm font-semibold text-secondary">{error}</p>}

        <div className="flex flex-col items-center gap-1.5 rounded-[22px] border border-border bg-gradient-to-br from-primary/10 to-accent/20 px-5 py-6">
          <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-secondary">Time elapsed</p>
          <p className="font-display text-4xl font-bold tracking-wider text-primary">{hrs}:{mins}:{secs}</p>
          {booking && (
            <p className="text-sm font-bold text-secondary">
              ₹{(booking.totalOperatorFee / 100).toLocaleString("en-IN")} flat operator wage
            </p>
          )}
        </div>

        <div className="flex items-center gap-3 text-[11px] font-bold uppercase tracking-[0.16em] text-secondary"><span className="h-px flex-1 bg-border" /><span>Tasks ({done}/{TASKS.length})</span><span className="h-px flex-1 bg-border" /></div>

        <section className="flex flex-col gap-2.5">
          {TASKS.map((label, index) => (
            <button
              key={label}
              type="button"
              disabled={busy || loading}
              onClick={() => setTasks((t) => t.map((v, i) => (i === index ? !v : v)))}
              className={`flex items-center gap-3 rounded-[18px] border p-4 text-left transition ${tasks[index] ? "border-primary bg-primary/10" : "border-border bg-card"}`}
            >
              <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 text-sm font-black ${tasks[index] ? "border-primary bg-primary text-primary-foreground" : "border-border text-transparent"}`}>✓</span>
              <span className={`text-sm font-semibold ${tasks[index] ? "text-primary" : "text-foreground"}`}>{label}</span>
            </button>
          ))}
        </section>

        {booking && (
          <section className="rounded-[22px] border border-border bg-muted p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-bold text-foreground">Need help?</p>
                <p className="text-xs text-muted-foreground">Contact {booking.farmer.name}</p>
              </div>
              <a href={`tel:${booking.farmer.phone}`} aria-label={`Call ${booking.farmer.name}`} className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-lg text-primary-foreground">⌕</a>
            </div>
          </section>
        )}
      </div>

      <div className="sticky bottom-0 mt-6 border-t border-border bg-background pb-2 pt-4">
        {running && (
          <button
            type="button"
            disabled={busy || loading}
            onClick={pauseResume}
            className="mb-3 flex h-[50px] w-full items-center justify-center gap-2 rounded-full border border-secondary bg-background text-sm font-bold text-secondary transition hover:bg-muted disabled:opacity-50"
          >
            {busy ? "Working…" : "Pause work"} <span aria-hidden="true">‖</span>
          </button>
        )}
        {canComplete && (
          <button
            type="button"
            disabled={busy || loading}
            onClick={completeWork}
            className="flex h-[54px] w-full items-center justify-center gap-2 rounded-full bg-primary text-base font-bold text-primary-foreground shadow-[0_6px_16px_rgba(45,80,22,0.24)] transition hover:brightness-110 disabled:opacity-50"
          >
            Mark work as completed <span aria-hidden="true">→</span>
          </button>
        )}
      </div>
    </OperatorShell>
  )
}

export default function OperatorWorkPage() {
  return (
    <Suspense>
      <OperatorWorkInner />
    </Suspense>
  )
}