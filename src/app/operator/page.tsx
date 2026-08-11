"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import OperatorShell from "./_components/operator-shell"

const equipment = [
  { name: "Brush Cutter", note: "Collect from owner", owner: true, icon: "✦" },
  { name: "Safety Helmet", note: "Farmer-owned", owner: false, icon: "◒" },
  { name: "Fuel & Trimmer Line", note: "Provided by farmer", owner: false, icon: "⌁" },
]

export default function OperatorJobPage() {
  const router = useRouter()
  const [declined, setDeclined] = useState(false)

  return (
    <OperatorShell
      eyebrow="New assignment"
      title="Job details"
      action={<span className="rounded-full bg-accent px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide text-primary">₹1,050 est.</span>}
    >
      <div className="flex flex-col gap-5">
        <section className="rounded-[22px] border border-border bg-card p-5 shadow-[0_6px_16px_rgba(45,80,22,0.06)]">
          <div className="mb-4 flex items-center justify-between gap-3">
            <span className="rounded-full bg-primary/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.08em] text-primary">Field service</span>
            <span className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
              <span className="h-2 w-2 rounded-full bg-accent" /> 6.4 km away
            </span>
          </div>
          <div className="flex items-center gap-3.5">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border-2 border-accent bg-gradient-to-br from-[#d6b77d] via-[#9b6a3c] to-[#3d5d2b] font-display text-lg font-bold text-white shadow-inner">SP</div>
            <div>
              <h2 className="font-display text-[21px] font-bold text-foreground">Sowmya Poojary</h2>
              <p className="mt-1 text-sm text-muted-foreground">Farmer · Kotekar, Mangaluru</p>
            </div>
          </div>
          <div className="mt-5 flex items-center gap-3 rounded-2xl bg-muted px-4 py-3.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-lg text-secondary">◷</div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-secondary">Scheduled</p>
              <p className="mt-0.5 text-sm font-bold text-foreground">Thursday, 14 August · 8:30 AM</p>
            </div>
          </div>
        </section>

        <div className="flex items-center gap-3 text-[11px] font-bold uppercase tracking-[0.16em] text-secondary"><span className="h-px flex-1 bg-border" /><span>Tools for this job</span><span className="h-px flex-1 bg-border" /></div>

        <section className="flex flex-col gap-2.5">
          {equipment.map((item) => (
            <div key={item.name} className={`flex items-center gap-3.5 rounded-[18px] border p-4 ${item.owner ? "border-accent bg-[#fffaf0]" : "border-border bg-card"}`}>
              <span className={`flex h-11 w-11 items-center justify-center rounded-2xl text-xl ${item.owner ? "bg-muted text-secondary" : "bg-muted text-primary"}`}>{item.icon}</span>
              <div className="min-w-0 flex-1">
                <p className="text-[15px] font-bold text-foreground">{item.name}</p>
                <p className={`mt-1 text-xs ${item.owner ? "font-semibold text-secondary" : "text-muted-foreground"}`}>{item.note}</p>
              </div>
              {item.owner && <span className="rounded-full bg-accent px-2.5 py-1 text-[9px] font-bold uppercase text-primary">Pickup</span>}
            </div>
          ))}
        </section>

        <section className="rounded-[22px] border border-border bg-muted p-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-display text-[18px] font-bold text-foreground">Estimated earnings</h2>
            <span className="font-display text-2xl font-black text-accent">₹1,050</span>
          </div>
          <div className="mt-4 flex flex-col gap-2.5 border-t border-border pt-4 text-sm">
            <div className="flex justify-between gap-3 text-muted-foreground"><span>Operator fee · 3 days</span><span className="font-semibold text-foreground">₹1,050</span></div>
            <div className="flex justify-between gap-3 text-muted-foreground"><span>Travel support</span><span className="font-semibold text-foreground">Included</span></div>
            <p className="pt-1 text-xs leading-relaxed text-primary">Paid after the job is completed and the equipment is safely returned.</p>
          </div>
        </section>

        {declined && <p className="rounded-2xl bg-muted px-4 py-3 text-center text-sm font-semibold text-secondary">This job is marked for review. You can still accept it below.</p>}
      </div>

      <div className="sticky bottom-0 mt-6 flex gap-3 border-t border-border bg-background pb-2 pt-4">
        <button type="button" onClick={() => setDeclined(true)} className="flex h-[52px] flex-1 items-center justify-center rounded-full border border-secondary bg-background text-sm font-bold text-secondary transition hover:bg-muted">Decline</button>
        <button type="button" onClick={() => router.push("/operator/pickup")} className="flex h-[52px] flex-[1.45] items-center justify-center gap-2 rounded-full bg-primary text-sm font-bold text-primary-foreground shadow-[0_6px_16px_rgba(45,80,22,0.24)] transition hover:brightness-110">Accept job <span aria-hidden="true">→</span></button>
      </div>
    </OperatorShell>
  )
}
