"use client"

import { useSearchParams } from "next/navigation"
import { Suspense, useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import OperatorShell from "../_components/operator-shell"
import { useOperatorBooking } from "../_components/use-operator-booking"

function formatPhone(raw: string): string {
  const digits = raw.replace(/\D/g, "")
  if (digits.length === 12 && digits.startsWith("91")) {
    return `+91 ${digits.slice(2, 5)} ${digits.slice(5, 9)} ${digits.slice(9)}`
  }
  return raw
}

function OperatorPickupInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const bookingId = searchParams.get("booking")
  const { booking, loading, error, transition, can } = useOperatorBooking(bookingId)

  const [checks, setChecks] = useState([false, false, false, false])
  const [busy, setBusy] = useState(false)

  const collecting = can("TOOL_COLLECTED")
  const canStart = can("FETCHING_TOOL")

  useEffect(() => {
    if (bookingId && canStart) {
      const t = setTimeout(() => {
        setBusy(true)
        transition("FETCHING_TOOL", "Operator started tool pickup").finally(() => setBusy(false))
      }, 0)
      return () => clearTimeout(t)
    }
  }, [bookingId, canStart, transition])

  const allChecked = checks.every(Boolean)

  const handleCollected = useCallback(async () => {
    if (!bookingId || !allChecked) return
    setBusy(true)
    await transition("TOOL_COLLECTED", "Operator collected tool from owner")
    setBusy(false)
    router.push(`/operator/en-route?booking=${bookingId}`)
  }, [bookingId, allChecked, transition, router])

  if (!bookingId) {
    return <p className="text-center text-sm font-semibold text-secondary">No job selected.</p>
  }

  return (
    <OperatorShell eyebrow="Step 1 of 2" title="Tool pickup" action={<span className="text-xs font-bold text-secondary">1 / 2</span>}>
      <div className="flex flex-col gap-5">
        {loading && <div className="h-24 animate-pulse rounded-[22px] bg-muted" />}
        {error && <p className="rounded-2xl bg-muted px-4 py-3 text-center text-sm font-semibold text-secondary">{error}</p>}

        {booking && (
          <>
            <div className="rounded-[22px] border border-accent bg-[#fffaf0] p-5">
              <div className="flex items-start gap-3.5">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-muted text-2xl text-secondary">✦</span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-secondary">Collect this tool</p>
                    {booking.toolInstance?.assetCode && (
                      <span className="inline-flex items-center gap-1 rounded-md bg-[#2D5016]/10 px-2 py-0.5 text-[11px] font-bold text-[#2D5016]">
                        🏷 {booking.toolInstance.assetCode}
                      </span>
                    )}
                  </div>
                  <h2 className="mt-1 font-display text-[21px] font-bold text-foreground">{booking.tool.name}</h2>
                  <p className="mt-1 text-sm text-muted-foreground">Owner handover before heading to the farm</p>
                </div>
              </div>
            </div>

            <section className="rounded-[22px] border border-border bg-card p-5 shadow-[0_6px_16px_rgba(45,80,22,0.06)]">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-[#b88552] to-[#596b37] font-display text-sm font-bold text-white">
                    {booking.toolOwner.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-display text-[18px] font-bold text-foreground">{booking.toolOwner.name}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">Tool owner</p>
                  </div>
                </div>
                <a href={`tel:${booking.toolOwner.phone}`} aria-label={`Call ${booking.toolOwner.name}`} className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-lg text-primary-foreground transition hover:brightness-110">⌕</a>
              </div>
              <div className="mt-5 flex flex-col gap-3 border-t border-border pt-4">
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 text-lg text-secondary">⌖</span>
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-secondary">Pickup location</p>
                    <p className="mt-1 text-sm font-semibold leading-relaxed text-foreground">
                      {[booking.toolOwner.village, booking.toolOwner.taluk, booking.toolOwner.district]
                        .filter(Boolean)
                        .join(", ") || "Location not specified"}
                    </p>
                  </div>
                </div>
              </div>
            </section>

            <div className="flex items-center gap-3 text-[11px] font-bold uppercase tracking-[0.16em] text-secondary"><span className="h-px flex-1 bg-border" /><span>Handover check</span><span className="h-px flex-1 bg-border" /></div>

            {collecting && (
              <section className="flex flex-col gap-2.5">
                <p className="mb-1 text-sm leading-relaxed text-muted-foreground">Check these with the owner before you leave. It keeps everyone protected.</p>
                {[
                  "Tool is undamaged and working",
                  "All attachments / accessories present",
                  "Owner and operator agreed on condition",
                  "Photos taken at handover",
                ].map((label, index) => (
                  <button
                    key={label}
                    type="button"
                    disabled={busy}
                    onClick={() => setChecks((c) => c.map((v, i) => (i === index ? !v : v)))}
                    className={`flex items-center gap-3 rounded-[18px] border p-4 text-left transition ${checks[index] ? "border-primary bg-primary/10" : "border-border bg-card"}`}
                  >
                    <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 text-sm font-black ${checks[index] ? "border-primary bg-primary text-primary-foreground" : "border-border text-transparent"}`}>✓</span>
                    <span className={`text-sm font-semibold ${checks[index] ? "text-primary" : "text-foreground"}`}>{label}</span>
                  </button>
                ))}
              </section>
            )}
          </>
        )}
      </div>

      <div className="sticky bottom-0 mt-6 border-t border-border bg-background pb-2 pt-4">
        {canStart && !collecting && (
          <button
            type="button"
            disabled={busy}
            onClick={() => transition("FETCHING_TOOL", "Operator started tool pickup")}
            className="flex h-[54px] w-full items-center justify-center gap-2 rounded-full bg-primary text-base font-bold text-primary-foreground shadow-[0_6px_16px_rgba(45,80,22,0.24)] transition hover:brightness-110 disabled:opacity-50"
          >
            {busy ? "Working…" : "Start tool pickup"} <span aria-hidden="true">→</span>
          </button>
        )}
        {collecting && (
          <button
            type="button"
            disabled={!allChecked || busy}
            onClick={handleCollected}
            className="flex h-[54px] w-full items-center justify-center gap-2 rounded-full bg-primary text-base font-bold text-primary-foreground shadow-[0_6px_16px_rgba(45,80,22,0.24)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:bg-border disabled:text-muted-foreground disabled:shadow-none"
          >
            {allChecked ? "Mark pickup complete" : `${checks.filter(Boolean).length} of ${checks.length} checked`} <span aria-hidden="true">→</span>
          </button>
        )}
      </div>
    </OperatorShell>
  )
}

export default function OperatorPickupPage() {
  return (
    <Suspense>
      <OperatorPickupInner />
    </Suspense>
  )
}