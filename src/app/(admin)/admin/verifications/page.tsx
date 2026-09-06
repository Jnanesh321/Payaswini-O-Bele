"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import AdminShell from "../_components/admin-shell"
import { formatDate } from "@/lib/utils"
import {
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Loader2,
  Search,
  User,
  Phone,
  MapPin,
  Calendar,
  AlertCircle,
  Filter,
  Check,
  X,
  Sprout,
  Wrench,
  Truck,
} from "lucide-react"

interface VerificationItem {
  id: string
  type: "FARMER" | "TOOL_OWNER" | "OPERATOR"
  status: "UNVERIFIED" | "PENDING" | "VERIFIED" | "SUSPENDED" | "REVOKED"
  verifiedAt: string | null
  deniedAt: string | null
  notes: string | null
  createdAt: string
  updatedAt: string
  user: {
    id: string
    name: string | null
    phone: string
    email: string | null
    location: string
    phoneVerified: boolean
    aadhaarVerified: boolean
    image: string | null
    createdAt: string
  }
}

export default function AdminVerificationsPage() {
  const [items, setItems] = useState<VerificationItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("ALL")
  const [typeFilter, setTypeFilter] = useState<string>("ALL")
  const [actionBusyId, setActionBusyId] = useState<string | null>(null)

  const fetchVerifications = useCallback(async () => {
    try {
      setError("")
      const res = await fetch("/api/admin/verifications")
      const json = await res.json()
      if (res.ok) {
        setItems(json.data ?? [])
      } else {
        setError(json.error || "Failed to load verifications")
      }
    } catch {
      setError("Failed to load verifications")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchVerifications()
  }, [fetchVerifications])

  const handleReview = async (id: string, decision: "APPROVE" | "REJECT", notes?: string) => {
    setActionBusyId(id)
    try {
      const res = await fetch(`/api/admin/verifications/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision, notes }),
      })
      const json = await res.json()
      if (res.ok) {
        await fetchVerifications()
      } else {
        alert(json.error || "Failed to process decision")
      }
    } catch {
      alert("Network error — please try again")
    } finally {
      setActionBusyId(null)
    }
  }

  // Stats
  const pendingCount = items.filter((i) => i.status === "PENDING").length
  const verifiedCount = items.filter((i) => i.status === "VERIFIED").length
  const operatorCount = items.filter((i) => i.type === "OPERATOR" && i.status === "VERIFIED").length
  const ownerCount = items.filter((i) => i.type === "TOOL_OWNER" && i.status === "VERIFIED").length

  // Filter items
  const filteredItems = items.filter((item) => {
    if (statusFilter !== "ALL" && item.status !== statusFilter) return false
    if (typeFilter !== "ALL" && item.type !== typeFilter) return false

    if (searchQuery) {
      const q = searchQuery.toLowerCase().trim()
      const nameMatch = (item.user.name ?? "").toLowerCase().includes(q)
      const phoneMatch = item.user.phone.includes(q)
      const locMatch = item.user.location.toLowerCase().includes(q)
      return nameMatch || phoneMatch || locMatch
    }
    return true
  })

  const getCapabilityIcon = (type: string) => {
    switch (type) {
      case "FARMER":
        return <Sprout size={14} className="text-primary" />
      case "TOOL_OWNER":
        return <Wrench size={14} className="text-secondary" />
      case "OPERATOR":
        return <Truck size={14} className="text-accent" />
      default:
        return <User size={14} />
    }
  }

  return (
    <AdminShell
      eyebrow="Verification Queue"
      title="Capability Verifications"
      subtitle="Review and approve farmer, tool owner, and operator profiles"
      headerRight={
        <div className="flex items-center gap-2">
          <Link
            href="/admin/assignments"
            className="rounded-xl border border-border bg-card px-3.5 py-2 text-xs font-semibold text-foreground transition hover:bg-muted"
          >
            Operator Dispatch →
          </Link>
        </div>
      }
    >
      {/* ── Stats Row ────────────────────────────────────────── */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Pending Queue</p>
          <p className="mt-1 font-heading text-2xl font-bold text-accent">{pendingCount}</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Total Verified</p>
          <p className="mt-1 font-heading text-2xl font-bold text-primary">{verifiedCount}</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Verified Owners</p>
          <p className="mt-1 font-heading text-2xl font-bold text-secondary">{ownerCount}</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Verified Operators</p>
          <p className="mt-1 font-heading text-2xl font-bold text-foreground">{operatorCount}</p>
        </div>
      </div>

      {error && (
        <div className="mb-4 flex items-center gap-2 rounded-2xl bg-destructive/10 px-4 py-3 text-sm font-semibold text-destructive">
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {/* ── Filters & Search ─────────────────────────────────── */}
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* Search */}
        <div className="relative flex-1 max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, phone, or location…"
            className="w-full rounded-xl border border-border bg-card py-2 pl-9 pr-3 text-xs focus:border-primary focus:outline-none"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Status filter */}
          <div className="flex items-center rounded-xl border border-border bg-card p-1 text-xs">
            {["ALL", "PENDING", "VERIFIED", "REVOKED"].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`rounded-lg px-2.5 py-1 font-semibold transition ${
                  statusFilter === st ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {st}
              </button>
            ))}
          </div>

          {/* Type filter */}
          <div className="flex items-center rounded-xl border border-border bg-card p-1 text-xs">
            {["ALL", "FARMER", "TOOL_OWNER", "OPERATOR"].map((tp) => (
              <button
                key={tp}
                onClick={() => setTypeFilter(tp)}
                className={`rounded-lg px-2.5 py-1 font-semibold transition ${
                  typeFilter === tp ? "bg-secondary text-white" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {tp === "TOOL_OWNER" ? "OWNER" : tp}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── List Content ────────────────────────────────────── */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-border bg-card/60 py-16 text-center">
          <ShieldCheck size={36} className="text-muted-foreground/50 mb-3" />
          <h3 className="font-heading text-lg font-bold text-foreground">No Verifications Found</h3>
          <p className="mt-1 text-xs text-muted-foreground">Try adjusting your search or filters.</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filteredItems.map((item) => {
            const isPending = item.status === "PENDING"
            const isVerified = item.status === "VERIFIED"
            const isBusy = actionBusyId === item.id

            return (
              <div
                key={item.id}
                className="flex flex-col justify-between rounded-2xl border border-border bg-card p-4 shadow-sm transition hover:border-primary/30"
              >
                <div>
                  {/* Top line: Role badge & Status */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="flex items-center gap-1.5 rounded-lg bg-muted px-2.5 py-1 text-[11px] font-bold text-foreground">
                      {getCapabilityIcon(item.type)}
                      <span>{item.type.replace("_", " ")}</span>
                    </span>

                    <span
                      className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                        isPending
                          ? "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                          : isVerified
                          ? "bg-accent/20 text-accent"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {item.status}
                    </span>
                  </div>

                  {/* User Profile Card */}
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-bele-green-muted font-heading text-sm font-bold text-primary">
                      {(item.user.name?.[0] ?? "U").toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="truncate font-heading text-sm font-bold text-foreground">
                          {item.user.name ?? "Farmer User"}
                        </span>
                        {item.user.phoneVerified && (
                          <span className="rounded bg-accent/15 px-1 py-0.2 text-[9px] font-bold text-accent">✓</span>
                        )}
                      </div>
                      <div className="mt-0.5 flex items-center gap-1 text-[11px] text-muted-foreground">
                        <Phone size={11} className="shrink-0" />
                        <span>+91 {item.user.phone.slice(-10)}</span>
                      </div>
                      {item.user.location && (
                        <div className="mt-0.5 flex items-center gap-1 text-[10px] text-muted-foreground">
                          <MapPin size={10} className="shrink-0" />
                          <span className="truncate">{item.user.location}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Verification Notes / Metadata */}
                  {item.notes && (
                    <div className="mt-3 rounded-xl bg-background/80 p-2.5 text-[11px] leading-relaxed text-foreground/80">
                      <span className="font-semibold text-muted-foreground">Details: </span>
                      {item.notes}
                    </div>
                  )}

                  <div className="mt-2.5 text-[10px] text-muted-foreground">
                    Applied on {formatDate(item.createdAt)}
                    {item.verifiedAt && ` · Verified ${formatDate(item.verifiedAt)}`}
                  </div>
                </div>

                {/* Actions */}
                <div className="mt-4 flex items-center gap-2 border-t border-border pt-3">
                  {isPending ? (
                    <>
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => handleReview(item.id, "APPROVE")}
                        className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-primary py-2 text-xs font-bold text-primary-foreground transition hover:brightness-110 disabled:opacity-50"
                      >
                        {isBusy ? <Loader2 size={13} className="animate-spin" /> : <Check size={14} />}
                        <span>Approve</span>
                      </button>
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => handleReview(item.id, "REJECT")}
                        className="flex items-center justify-center gap-1 rounded-xl border border-destructive/30 px-3 py-2 text-xs font-semibold text-destructive transition hover:bg-destructive/10 disabled:opacity-50"
                      >
                        <X size={14} />
                        <span>Decline</span>
                      </button>
                    </>
                  ) : isVerified ? (
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => handleReview(item.id, "REJECT", "Suspended by admin")}
                      className="w-full rounded-xl border border-border py-1.5 text-xs font-semibold text-muted-foreground transition hover:border-destructive hover:text-destructive disabled:opacity-50"
                    >
                      Revoke Verification
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => handleReview(item.id, "APPROVE")}
                      className="w-full rounded-xl bg-primary/15 py-1.5 text-xs font-bold text-primary transition hover:bg-primary hover:text-primary-foreground disabled:opacity-50"
                    >
                      Re-Verify Profile
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </AdminShell>
  )
}
