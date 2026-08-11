"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import OperatorShell from "../_components/operator-shell"

const checks = [
  "Blades and guard are secure",
  "Engine starts and runs smoothly",
  "Fuel tank and trimmer line checked",
  "Photos taken at handover",
]

export default function OperatorPickupPage() {
  const router = useRouter()
  const [completed, setCompleted] = useState<boolean[]>(checks.map(() => false))
  const allChecked = completed.every(Boolean)

  const toggleCheck = (index: number) => {
    setCompleted((current) => current.map((checked, item) => (item === index ? !checked : checked)))
  }

  return (
    <OperatorShell eyebrow="Step 1 of 2" title="Tool pickup" action={<span className="text-xs font-bold text-secondary">1 / 2</span>}>
      <div className="flex flex-col gap-5">
        <div className="rounded-[22px] border border-accent bg-[#fffaf0] p-5">
          <div className="flex items-start gap-3.5">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-muted text-2xl text-secondary">✦</div>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-secondary">Collect this tool</p>
              <h2 className="mt-1 font-display text-[21px] font-bold text-foreground">Brush Cutter</h2>
              <p className="mt-1 text-sm text-muted-foreground">Owner handover before heading to the farm</p>
            </div>
          </div>
        </div>

        <section className="rounded-[22px] border border-border bg-card p-5 shadow-[0_6px_16px_rgba(45,80,22,0.06)]">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-[#b88552] to-[#596b37] font-display text-sm font-bold text-white">RK</div>
              <div>
                <p className="font-display text-[18px] font-bold text-foreground">Raghav K.</p>
                <p className="mt-0.5 text-xs text-muted-foreground">Tool owner</p>
              </div>
            </div>
            <a href="tel:+919876543210" aria-label="Call Raghav K." className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-lg text-primary-foreground transition hover:brightness-110">⌕</a>
          </div>
          <div className="mt-5 flex flex-col gap-3 border-t border-border pt-4">
            <div className="flex items-start gap-3"><span className="mt-0.5 text-lg text-secondary">⌖</span><div><p className="text-[11px] font-bold uppercase tracking-[0.1em] text-secondary">Pickup location</p><p className="mt-1 text-sm font-semibold leading-relaxed text-foreground">Raghav’s Areca Farm, Kulshekar<br /><span className="font-normal text-muted-foreground">4.2 km from your current location · about 12 min</span></p></div></div>
          </div>
        </section>

        <div className="flex items-center gap-3 text-[11px] font-bold uppercase tracking-[0.16em] text-secondary"><span className="h-px flex-1 bg-border" /><span>Handover check</span><span className="h-px flex-1 bg-border" /></div>

        <section className="flex flex-col gap-2.5">
          <p className="mb-1 text-sm leading-relaxed text-muted-foreground">Check these with the owner before you leave. It keeps everyone protected.</p>
          {checks.map((label, index) => (
            <button key={label} type="button" onClick={() => toggleCheck(index)} className={`flex items-center gap-3 rounded-[18px] border p-4 text-left transition ${completed[index] ? "border-primary bg-primary/10" : "border-border bg-card"}`}>
              <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 text-sm font-black ${completed[index] ? "border-primary bg-primary text-primary-foreground" : "border-border text-transparent"}`}>✓</span>
              <span className={`text-sm font-semibold ${completed[index] ? "text-primary" : "text-foreground"}`}>{label}</span>
            </button>
          ))}
        </section>
      </div>

      <div className="sticky bottom-0 mt-6 border-t border-border bg-background pb-2 pt-4">
        <button type="button" disabled={!allChecked} onClick={() => router.push("/operator/job-complete")} className="flex h-[54px] w-full items-center justify-center gap-2 rounded-full bg-primary text-base font-bold text-primary-foreground shadow-[0_6px_16px_rgba(45,80,22,0.24)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:bg-border disabled:text-muted-foreground disabled:shadow-none">{allChecked ? "Mark pickup complete" : `${completed.filter(Boolean).length} of ${checks.length} checked`} <span aria-hidden="true">→</span></button>
      </div>
    </OperatorShell>
  )
}
