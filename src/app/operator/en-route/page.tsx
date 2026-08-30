"use client"

import { useSearchParams } from "next/navigation"
import { Suspense, useState } from "react"
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

function OperatorEnRouteInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const bookingId = searchParams.get("booking")
  const { booking, loading, error, transition, can } = useOperatorBooking(bookingId)
  const [busy, setBusy] = useState(false)

  if (!bookingId) {
    return <p className="text-center text-sm font-semibold text-secondary">No job selected.</p>
  }

  const startJourney = async () => {
    setBusy(true)
    await transition("TRAVELLING_TO_FARM", "Operator is travelling to the farm")
    setBusy(false)
  }

  const markArrived = async () => {
    setBusy(true)
    await transition("ARRIVED", "Operator arrived at the farm")
    setBusy(false)
    router.push(`/operator/arrived?booking=${bookingId}`)
  }

  const travel = can("TRAVELLING_TO_FARM")
  const arrived = can("ARRIVED")

  return (
    <OperatorShell eyebrow="Step 2 of 2" title="Head to the farm" action={<span className="text-xs font-bold text-secondary">2 / 2</span>}>
      <div className="flex flex-col gap-5">
        {loading && <div className="h-24 animate-pulse rounded-[22px] bg-muted" />}
        {error && <p className="rounded-2xl bg-muted px-4 py-3 text-center text-sm font-semibold text-secondary">{error}</p>}

        <div className="overflow-hidden rounded-[22px] border border-border bg-gradient-to-br from-[#c8ddb8] via-[#a4c088] to-[#7aaa60] p-8">
          <div className="flex flex-col items-center gap-2">
            <span className="rounded-xl bg-white/85 px-4 py-1.5 text-xs font-bold text-primary">🗺 {booking?.farmer.name || "Farm"}&apos;s farm</span>
            <span className="text-[10px] text-white/90">Route shown for illustration</span>
          </div>
        </div>

        {booking && (
          <>
            <section className="rounded-[22px] border border-border bg-card p-5 shadow-[0_6px_16px_rgba(45,80,22,0.06)]">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-[#d6b77d] to-[#3d5d2b] font-display text-sm font-bold text-white">
                    {booking.farmer.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-display text-[18px] font-bold text-foreground">{booking.farmer.name}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">Farmer</p>
                  </div>
                </div>
                <a href={`tel:${booking.farmer.phone}`} aria-label={`Call ${booking.farmer.name}`} className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-lg text-primary-foreground transition hover:brightness-110">⌕</a>
              </div>
              <div className="mt-5 flex flex-col gap-3 border-t border-border pt-4">
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 text-lg text-secondary">⌖</span>
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-secondary">Farm location</p>
                    <p className="mt-1 text-sm font-semibold leading-relaxed text-foreground">
                      {[booking.deliveryAddress, booking.deliveryTaluk, booking.deliveryDistrict, booking.deliveryPincode]
                        .filter(Boolean)
                        .join(", ") || "Farm location not specified"}
                    </p>
                  </div>
                </div>
              </div>
            </section>

            <section className="rounded-[22px] border border-border bg-muted p-5">
              <div className="flex items-start gap-3">
                <span className="text-lg text-secondary">✦</span>
                <div>
                  <p className="font-display text-[15px] font-bold text-foreground">{booking.tool.name}</p>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                    Carry all tools. Check in with {booking.farmer.name} before starting work.
                  </p>
                  <p className="mt-2 text-xs font-bold text-secondary">Farmer · {formatPhone(booking.farmer.phone)}</p>
                </div>
              </div>
            </section>
          </>
        )}

        <div className="flex items-start gap-3 rounded-2xl bg-[#fdf6e3] px-4 py-3 text-xs leading-relaxed text-[#7A5800]">
          <span className="text-base">⚠️</span>
          <span>Ride safely. Do not use your phone while driving. Pull over to check messages.</span>
        </div>
      </div>

      <div className="sticky bottom-0 mt-6 border-t border-border bg-background pb-2 pt-4">
        {travel && (
          <button
            type="button"
            disabled={busy}
            onClick={startJourney}
            className="mb-3 flex h-[52px] w-full items-center justify-center gap-2 rounded-full border border-secondary bg-background text-sm font-bold text-secondary transition hover:bg-muted disabled:opacity-50"
          >
            {busy ? "Working…" : "Start journey"} <span aria-hidden="true">→</span>
          </button>
        )}
        {arrived && (
          <button
            type="button"
            disabled={busy || loading}
            onClick={markArrived}
            className="flex h-[54px] w-full items-center justify-center gap-2 rounded-full bg-primary text-base font-bold text-primary-foreground shadow-[0_6px_16px_rgba(45,80,22,0.24)] transition hover:brightness-110 disabled:opacity-50"
          >
            {busy ? "Working…" : "Mark as arrived"} <span aria-hidden="true">→</span>
          </button>
        )}
      </div>
    </OperatorShell>
  )
}

export default function OperatorEnRoutePage() {
  return (
    <Suspense>
      <OperatorEnRouteInner />
    </Suspense>
  )
}