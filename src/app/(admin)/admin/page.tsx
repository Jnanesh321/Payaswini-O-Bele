"use client"

import Link from "next/link"
import { useLocale } from "next-intl"
import AdminShell from "./_components/admin-shell"
import { formatPrice } from "@/lib/utils"
import {
  Package,
  ShoppingBag,
  Users,
  IndianRupee,
  ShieldCheck,
  Truck,
  Plus,
  ChevronRight,
} from "lucide-react"

const stats = [
  { label: "Active Rentals", value: "18", icon: ShoppingBag, color: "text-primary" },
  { label: "Total Tools", value: "24", icon: Package, color: "text-secondary" },
  { label: "Registered Users", value: "156", icon: Users, color: "text-foreground" },
  { label: "Monthly GMV", value: 4560000, icon: IndianRupee, isPrice: true, color: "text-accent" },
]

export default function AdminDashboardPage() {
  const locale = useLocale()
  const fp = (n: number) => formatPrice(n, locale)

  return (
    <AdminShell
      eyebrow="Admin Portal"
      title="Platform Operations"
      subtitle="Overview of machinery, dispatch, and verification workflows"
    >
      <div className="flex flex-col gap-4">
        {/* ── Operational Quick Action Cards ──────────────── */}
        <div className="grid grid-cols-2 gap-2.5">
          <Link
            href="/admin/verifications"
            className="flex flex-col justify-between rounded-2xl border border-primary/20 bg-bele-green-muted p-3.5 transition hover:brightness-95"
          >
            <div className="flex items-center justify-between">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-white text-primary shadow-sm">
                <ShieldCheck size={18} />
              </div>
              <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-bold text-primary">Queue</span>
            </div>
            <div className="mt-3">
              <h3 className="font-display text-sm font-bold text-primary">KYC Approvals</h3>
              <p className="text-[11px] text-primary/80">Farmer & Operator verifications</p>
            </div>
          </Link>

          <Link
            href="/admin/assignments"
            className="flex flex-col justify-between rounded-2xl border border-secondary/20 bg-secondary/10 p-3.5 transition hover:brightness-95"
          >
            <div className="flex items-center justify-between">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-white text-secondary shadow-sm">
                <Truck size={18} />
              </div>
              <span className="rounded-full bg-secondary/15 px-2 py-0.5 text-[10px] font-bold text-secondary">Live</span>
            </div>
            <div className="mt-3">
              <h3 className="font-display text-sm font-bold text-secondary">Dispatch Shift</h3>
              <p className="text-[11px] text-secondary/80">Assign operators to bookings</p>
            </div>
          </Link>
        </div>

        {/* ── Stats Summary Grid ────────────────────────────── */}
        <div className="grid grid-cols-2 gap-2.5">
          {stats.map((s, idx) => (
            <div key={idx} className="rounded-2xl border border-border bg-card p-3.5 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  {s.label}
                </span>
                <s.icon size={16} className={s.color} />
              </div>
              <p className="mt-2 font-display text-xl font-bold text-foreground">
                {s.isPrice ? fp(s.value as number) : s.value}
              </p>
            </div>
          ))}
        </div>

        {/* ── Quick Tools Link ──────────────────────────────── */}
        <div className="mt-2 flex items-center justify-between rounded-2xl border border-border bg-card p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted text-primary">
              <Package size={20} />
            </div>
            <div>
              <h3 className="font-display text-sm font-bold text-foreground">Machinery Inventory</h3>
              <p className="text-[11px] text-muted-foreground">Manage tillers, poles & sprayers</p>
            </div>
          </div>
          <Link
            href="/admin/inventory"
            className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-white shadow-sm transition hover:brightness-110"
          >
            <ChevronRight size={16} />
          </Link>
        </div>
      </div>
    </AdminShell>
  )
}
