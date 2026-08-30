"use client"

import { useSearchParams } from "next/navigation"
import { Suspense, useState } from "react"
import { useRouter } from "next/navigation"
import OperatorShell from "../_components/operator-shell"
import { useOperatorBooking } from "../_components/use-operator-booking"

const PRE_CHECKS = [
  "Showed operator ID to farmer",
  "All tools present and functional",
  "PPE (helmet + gloves) on",
  "Received work briefing from farmer",
]

function OperatorArrivedInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const bookingId = searchParams.get("booking")
  const { booking, loading, error, transition, can } = useOperatorBooking(bookingId)
  const [checks, setChecks] = useState(PRE_CHECKS.map(() => false))
  const [busy, setBusy] = useState(false)
  const allChecked = checks.every(Boolean)
  const canStartWork = can("WORK_STARTED")

  if (!bookingId) {
    return <p className="text-center text-sm font-semibold text-secondary">No job selected.</p>
  }

  const startWork = async () => {
    setBusy(true)
    await transition("WORK_STARTED", "Operator started work at the farm")
    setBusy(false)
    router.push(`/operator/work?booking=${bookingId}`)
  }

  return (
    <OperatorShell eyebrow="At the farm" title="Arrival check">
      <div className="flex flex-col gap-5">
        {loading && <div className="h-24 animate-pulse rounded-[22px] bg-muted" />}
        {error && <p className="rounded-2xl bg-muted px-4 py-3 text-center text-sm font-semibold text-secondary">{error}</p>}

        <div className="flex flex-col items-center gap-2 py-2 text-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full border-[3px] border-primary bg-primary/10 text-4xl">✅</div>
          <h2 className="font-display text-xl font-bold text-primary">You{"'"}ve arrived!</h2>
          {booking && <p className="text-xs text-muted-foreground">{booking.farmer.name} · {booking.tool.name}</p>}
        </div>

        <div className="flex items-center gap-3 text-[11px] font-bold uppercase tracking-[0.16em] text-secondary"><span className="h-px flex-1 bg-border" /><span>Pre-work checklist</span><span className="h-px flex-1 bg-border" /></div>

        <p className="text-sm leading-relaxed text-muted-foreground">Complete all checks before starting the clock.</p>

        <section className="flex flex-col gap-2.5">
          {PRE_CHECKS.map((label, index) => (
            <button
              key={label}
              type="button"
              disabled={busy || loading}
              onClick={() => setChecks((c) => c.map((v, i) => (i === index ? !v : v)))}
              className={`flex items-center gap-3 rounded-[18px] border p-4 text-left transition ${checks[index] ? "border-primary bg-primary/10" : "border-border bg-card"}`}
            >
              <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 text-sm font-black ${checks[index] ? "border-primary bg-primary text-primary-foreground" : "border-border text-transparent"}`}>✓</span>
              <span className={`text-sm font-semibold ${checks[index] ? "text-primary" : "text-foreground"}`}>{label}</span>
            </button>
          ))}
        </section>
      </div>

{canStartWork && (
        <div className="sticky bottom-0 mt-6 border-t border-border bg-background pb-2 pt-4">
          <button
            type="button"
            disabled={!allChecked || busy || loading}
            onClick={startWork}
            className="flex h-[54px] w-full items-center justify-center gap-2 rounded-full bg-primary text-base font-bold text-primary-foreground shadow-[0_6px_16px_rgba(45,80,22,0.24)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:bg-border disabled:text-muted-foreground disabled:shadow-none"
          >
            {allChecked ? "Start work — clock is running" : `${checks.filter(Boolean).length} of ${PRE_CHECKS.length} checked`} <span aria-hidden="true">⏱</span>
          </button>
        </div>
      )}
    </OperatorShell>
  )
}

export default function OperatorArrivedPage() {
  return (
    <Suspense>
      <OperatorArrivedInner />
    </Suspense>
  )
}