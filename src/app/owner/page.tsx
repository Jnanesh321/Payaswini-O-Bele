"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import OwnerShell from "./_components/owner-shell"
import { Plus, Wrench, Loader2, Bell, ShieldCheck } from "lucide-react"
import { formatPrice } from "@/lib/utils"
import { useLocale } from "next-intl"
import { useRouter } from "next/navigation"
import { ToolImage } from "@/components/ui"

interface EquipmentItem {
  id: string
  name: string
  slug: string
  image: string | null
  pricePerDay: number
  category: string
  requiresCertifiedOperator: boolean
  totalInstances: number
  available: number
  paused: number
  isAvailable: boolean
  activeBookings: number
}

function Toggle({ on, onToggle, disabled }: { on: boolean; onToggle: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation()
        onToggle()
      }}
      disabled={disabled}
      aria-label={on ? "Mark unavailable" : "Mark available"}
      className={`relative h-[26px] w-[46px] rounded-full transition-colors disabled:opacity-50 ${on ? "bg-primary" : "bg-[#C9BFB3]"}`}
    >
      <span
        className={`absolute top-[3px] block h-5 w-5 rounded-full bg-white shadow-[0_1px_4px_rgba(0,0,0,0.22)] transition-all ${on ? "left-[23px]" : "left-[3px]"}`}
      />
    </button>
  )
}

export default function OwnerEquipmentPage() {
  const locale = useLocale()
  const router = useRouter()
  const fp = (n: number) => formatPrice(n, locale)
  const [tools, setTools] = useState<EquipmentItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [busyId, setBusyId] = useState<string | null>(null)

  const fetchTools = useCallback(async (showLoading = false) => {
    if (showLoading) setLoading(true)
    const res = await fetch("/api/owner/equipment")
    const data = await res.json()
    if (res.ok) {
      setTools(data.data ?? [])
    } else {
      setError(data.error || "Failed to load equipment")
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchTools(false)
  }, [fetchTools])

  const toggleAvailability = useCallback(
    async (tool: EquipmentItem) => {
      setBusyId(tool.id)
      setError("")
      try {
        const res = await fetch(`/api/owner/equipment/${tool.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ available: !tool.isAvailable }),
        })
        const data = await res.json()
        if (!res.ok) {
          setError(data.error || "Could not update availability")
          return
        }
        await fetchTools()
      } finally {
        setBusyId(null)
      }
    },
    [fetchTools],
  )

  return (
    <OwnerShell
      title="My Equipment"
      subtitle={`${tools.length} ${tools.length === 1 ? "tool" : "tools"} listed`}
      headerRight={
        <div className="relative mt-1">
          <Bell size={20} className="text-primary" />
          <span className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-secondary" />
        </div>
      }
    >
      <div className="mx-0 my-4 h-px bg-border" />

      {error && (
        <p className="mb-3 rounded-2xl bg-destructive/10 px-4 py-3 text-center text-sm font-semibold text-destructive">
          {error}
        </p>
      )}

      {/* ── Certified Permissions Quick Entry ─────────────── */}
      {!loading && tools.some((t) => t.requiresCertifiedOperator) && (
        <Link
          href="/owner/permissions"
          className="mb-4 flex items-center justify-between rounded-2xl border border-primary/20 bg-bele-green-muted px-4 py-3 text-xs text-primary transition hover:border-primary/40 hover:brightness-95"
        >
          <div className="flex items-center gap-2.5">
            <ShieldCheck size={18} className="shrink-0" />
            <div>
              <span className="font-bold">Certified Machinery Permissions</span>
              <p className="text-[11px] text-primary/80">Manage farmers certified to self-operate</p>
            </div>
          </div>
          <span className="font-bold">Manage →</span>
        </Link>
      )}

      {loading ? (
        <div className="flex flex-1 items-center justify-center py-24">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : tools.length === 0 ? (
        /* ── Empty state ─────────────────────────────────── */
        <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
          <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-3xl bg-bele-green-muted">
            <Wrench size={36} className="text-primary" strokeWidth={1.5} />
          </div>
          <h2 className="font-display text-xl font-bold text-primary">No tools listed yet</h2>
          <p className="mt-2 max-w-[260px] text-sm leading-relaxed text-muted-foreground">
            Add your first tool and start earning from idle farm equipment. Takes 2 minutes.
          </p>
          <div className="mt-7 flex w-full flex-col gap-2">
            {["Take a clear photo", "Set your daily rate", "Go live instantly"].map((tip, i) => (
              <div
                key={tip}
                className="flex w-full items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3"
              >
                <span className="flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-lg bg-primary text-xs font-bold text-white">
                  {i + 1}
                </span>
                <span className="text-[13px] font-medium text-foreground">{tip}</span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {tools.map((tool) => (
            <div
              key={tool.id}
              className="overflow-hidden rounded-[20px] border border-border bg-card shadow-[0_2px_10px_rgba(45,80,22,0.06)]"
            >
              {/* Photo */}
              <div className="relative h-[130px] bg-gradient-to-br from-primary/15 to-accent/15 flex items-center justify-center p-3">
                <ToolImage
                  src={tool.image}
                  alt={tool.name}
                  category={tool.category}
                  toolName={tool.name}
                  className="h-full w-full object-cover"
                  fallbackClassName="h-full w-full max-h-[90%] object-contain drop-shadow-md"
                />
                <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[rgba(28,20,9,0.35)] pointer-events-none" />
                <span className="absolute left-3.5 top-3 rounded-full bg-accent px-2.5 py-1 text-xs font-bold text-white shadow-[0_1px_6px_rgba(0,0,0,0.2)]">
                  {fp(tool.pricePerDay)}/day
                </span>
                {tool.activeBookings > 0 && (
                  <span className="absolute bottom-2.5 left-3.5 text-[11px] font-semibold text-white">
                    {tool.activeBookings} active booking{tool.activeBookings > 1 ? "s" : ""}
                  </span>
                )}
              </div>

              {/* Body */}
              <div className="px-4 py-3.5">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[15px] font-bold text-foreground">{tool.name}</div>
                    <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                      {tool.activeBookings > 0 ? (
                        <>
                          <span className="font-semibold text-success">●</span>
                          <span className="font-semibold text-success">{tool.activeBookings} active</span>
                        </>
                      ) : (
                        <span>No active bookings</span>
                      )}
                      {tool.requiresCertifiedOperator && (
                        <span className="ml-1 rounded-full bg-bele-soil-muted px-2 py-0.5 text-[9px] font-bold uppercase text-secondary">
                          Certified operator
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <Toggle on={tool.isAvailable} onToggle={() => toggleAvailability(tool)} disabled={busyId === tool.id} />
                    <span className={`text-[10px] font-bold ${tool.isAvailable ? "text-success" : "text-muted-foreground"}`}>
                      {tool.isAvailable ? "Available" : "Paused"}
                    </span>
                  </div>
                </div>

                <div className="my-3 h-px bg-border" />

                <div className="flex items-center justify-between">
                  <div className="flex gap-1.5">
                    {tool.activeBookings > 0 && (
                      <span className="rounded-full bg-bele-green-muted px-2 py-1 text-[10px] font-bold text-primary">● Active</span>
                    )}
                    {!tool.isAvailable && (
                      <span className="rounded-full bg-bele-soil-muted px-2 py-1 text-[10px] font-bold text-secondary">Paused</span>
                    )}
                    {tool.activeBookings === 0 && tool.isAvailable && (
                      <span className="rounded-full bg-muted px-2 py-1 text-[10px] font-bold text-muted-foreground">Ready to rent</span>
                    )}
                    <span className="rounded-full bg-muted px-2 py-1 text-[10px] font-bold text-muted-foreground">
                      {tool.available}/{tool.totalInstances} live
                    </span>
                  </div>
                  <button
                    type="button"
                    className="flex items-center gap-0.5 text-xs font-semibold text-muted-foreground"
                    onClick={() => (window.location.href = `/tools/${tool.slug}`)}
                  >
                    View <span aria-hidden="true">→</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* FAB — Add Tool */}
      <button
        type="button"
        onClick={() => router.push("/owner/add-tool")}
        className="sticky bottom-5 mt-6 flex items-center gap-2 self-end rounded-full bg-primary px-5 py-3.5 text-sm font-bold text-primary-foreground shadow-[0_6px_24px_rgba(45,80,22,0.40)] transition hover:brightness-110"
      >
        <Plus size={18} /> Add Tool
      </button>
    </OwnerShell>
  )
}
