"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import Image from "next/image"
import AdminShell from "../_components/admin-shell"
import { formatPrice, formatDate } from "@/lib/utils"
import {
  Wrench,
  CheckCircle2,
  XCircle,
  Loader2,
  Search,
  User,
  Phone,
  MapPin,
  AlertCircle,
  Check,
  X,
  Sparkles,
  ShieldCheck,
  Clock,
  Layers,
} from "lucide-react"

interface EquipmentItem {
  id: string
  assetCode: string
  status: string
  pricePerDay: number | null
  deposit: number | null
  images: string[]
  conditionGrade: string
  verificationStatus: "UNVERIFIED" | "PENDING" | "VERIFIED" | "SUSPENDED" | "REVOKED"
  adminReviewNotes: string | null
  rating: number
  reviewCount: number
  notes: string | null
  createdAt: string
  tool: {
    id: string
    name: string
    slug: string
    category: string
    pricePerDay: number
    minAllowedPricePerDay: number | null
    maxAllowedPricePerDay: number | null
    deposit: number
    images: string[]
  }
  owner: {
    id: string
    name: string | null
    phone: string
    village: string | null
    taluk: string | null
    district: string | null
    image: string | null
  }
}

export default function AdminInventoryPage() {
  const [items, setItems] = useState<EquipmentItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("ALL")
  const [actionBusyId, setActionBusyId] = useState<string | null>(null)

  const fetchEquipment = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/equipment")
      const json = await res.json()
      if (res.ok) {
        setItems(json.data ?? [])
      } else {
        setError(json.error || "Failed to load equipment")
      }
    } catch {
      setError("Failed to load equipment")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    let ignore = false
    const load = async () => {
      try {
        const res = await fetch("/api/admin/equipment")
        const json = await res.json()
        if (!ignore) {
          if (res.ok) {
            setItems(json.data ?? [])
          } else {
            setError(json.error || "Failed to load equipment")
          }
        }
      } catch {
        if (!ignore) setError("Failed to load equipment")
      } finally {
        if (!ignore) setLoading(false)
      }
    }
    load()
    return () => {
      ignore = true
    }
  }, [])

  const handleReview = async (id: string, action: "APPROVE" | "REJECT", defaultNotes?: string) => {
    let notes = defaultNotes
    if (action === "REJECT" && !notes) {
      const reason = window.prompt("Reason for rejecting this listing (e.g. Price too high, blurry photos):")
      if (reason === null) return // cancelled
      notes = reason.trim() || "Rejected by admin"
    }

    setActionBusyId(id)
    try {
      const res = await fetch(`/api/admin/equipment/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, notes }),
      })
      const json = await res.json()
      if (res.ok) {
        await fetchEquipment()
      } else {
        alert(json.error || "Failed to process decision")
      }
    } catch {
      alert("Network error — please try again")
    } finally {
      setActionBusyId(null)
    }
  }

  // Statistics
  const pendingCount = items.filter((i) => i.verificationStatus === "PENDING").length
  const verifiedCount = items.filter((i) => i.verificationStatus === "VERIFIED").length
  const uniqueOwnersCount = new Set(items.map((i) => i.owner.id)).size

  // Filter items
  const filteredItems = items.filter((item) => {
    if (statusFilter !== "ALL" && item.verificationStatus !== statusFilter) return false

    if (searchQuery) {
      const q = searchQuery.toLowerCase().trim()
      const toolMatch = item.tool.name.toLowerCase().includes(q)
      const ownerMatch = (item.owner.name ?? "").toLowerCase().includes(q)
      const assetMatch = item.assetCode.toLowerCase().includes(q)
      const locMatch = `${item.owner.village || ""} ${item.owner.taluk || ""}`.toLowerCase().includes(q)
      return toolMatch || ownerMatch || assetMatch || locMatch
    }
    return true
  })

  return (
    <AdminShell
      eyebrow="Marketplace Inventory"
      title="Owner Equipment & Pricing Moderation"
      subtitle="Review custom tool prices, quality condition, and approve listings"
      headerRight={
        <div className="flex items-center gap-2">
          <Link
            href="/admin/verifications"
            className="rounded-xl border border-border bg-card px-3.5 py-2 text-xs font-semibold text-foreground transition hover:bg-muted"
          >
            KYC Verifications →
          </Link>
        </div>
      }
    >
      {/* ── Stats Row ────────────────────────────────────────── */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Pending Listings</p>
          <p className="mt-1 font-heading text-2xl font-bold text-accent">{pendingCount}</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Active Listings</p>
          <p className="mt-1 font-heading text-2xl font-bold text-primary">{verifiedCount}</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Active Tool Owners</p>
          <p className="mt-1 font-heading text-2xl font-bold text-secondary">{uniqueOwnersCount}</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Total Physical Units</p>
          <p className="mt-1 font-heading text-2xl font-bold text-foreground">{items.length}</p>
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
            placeholder="Search by tool, owner, asset code, or taluk…"
            className="w-full rounded-xl border border-border bg-card py-2 pl-9 pr-3 text-xs focus:border-primary focus:outline-none"
          />
        </div>

        {/* Status filters */}
        <div className="flex items-center rounded-xl border border-border bg-card p-1 text-xs">
          {["ALL", "PENDING", "VERIFIED", "REVOKED"].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`rounded-lg px-2.5 py-1 font-semibold transition ${
                statusFilter === st ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {st === "PENDING" ? `Pending (${pendingCount})` : st}
            </button>
          ))}
        </div>
      </div>

      {/* ── Listings Grid ────────────────────────────────────── */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-border bg-card/60 py-16 text-center">
          <Wrench size={36} className="text-muted-foreground/50 mb-3" />
          <h3 className="font-heading text-lg font-bold text-foreground">No Equipment Found</h3>
          <p className="mt-1 text-xs text-muted-foreground">Try adjusting your filters or search keywords.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredItems.map((item) => {
            const isPending = item.verificationStatus === "PENDING"
            const isVerified = item.verificationStatus === "VERIFIED"
            const isBusy = actionBusyId === item.id
            const effectivePrice = item.pricePerDay ?? item.tool.pricePerDay
            const effectiveDeposit = item.deposit ?? item.tool.deposit
            const minLimit = item.tool.minAllowedPricePerDay ?? 30000
            const maxLimit = item.tool.maxAllowedPricePerDay ?? 300000
            const isWithinLimits = effectivePrice >= minLimit && effectivePrice <= maxLimit
            const previewPhoto = (item.images.length > 0 ? item.images[0] : item.tool.images[0]) || "/images/tools/power-tiller.svg"

            return (
              <div
                key={item.id}
                className="flex flex-col justify-between rounded-2xl border border-border bg-card p-4 shadow-sm transition hover:border-primary/40"
              >
                <div>
                  {/* Top line: Category and Verification Status */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="flex items-center gap-1.5 rounded-lg bg-muted px-2.5 py-1 text-[11px] font-bold text-foreground">
                      <Layers size={13} className="text-primary" />
                      <span>{item.tool.category}</span>
                    </span>

                    <span
                      className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                        isPending
                          ? "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                          : isVerified
                          ? "bg-accent/20 text-accent"
                          : "bg-destructive/10 text-destructive"
                      }`}
                    >
                      {isPending ? "Pending Review" : isVerified ? "Approved & Live" : "Rejected"}
                    </span>
                  </div>

                  {/* Tool Title & Asset Code */}
                  <div className="flex items-start gap-3">
                    <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-border bg-muted">
                      <Image
                        src={previewPhoto}
                        alt={item.tool.name}
                        fill
                        className="object-cover"
                        sizes="56px"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="font-heading text-sm font-bold text-foreground line-clamp-1">
                        {item.tool.name}
                      </h4>
                      <p className="text-[11px] font-mono text-muted-foreground mt-0.5">
                        Asset: <span className="text-foreground font-semibold">{item.assetCode}</span>
                      </p>
                      <div className="mt-1 flex items-center gap-1.5">
                        <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-bold text-primary">
                          Grade {item.conditionGrade}
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          ⭐ {item.rating.toFixed(1)} ({item.reviewCount} rentals)
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Owner Info */}
                  <div className="mt-3 rounded-xl bg-background/80 p-2.5 text-[11px] flex items-center justify-between">
                    <div>
                      <p className="font-bold text-foreground flex items-center gap-1">
                        <User size={12} className="text-secondary" />
                        <span>{item.owner.name ?? "Tool Owner"}</span>
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-0.5 flex items-center gap-1">
                        <MapPin size={10} />
                        <span>{[item.owner.village, item.owner.taluk].filter(Boolean).join(", ") || "Coastal Karnataka"}</span>
                      </p>
                    </div>
                    <p className="text-[10px] font-mono text-muted-foreground flex items-center gap-1">
                      <Phone size={10} />
                      <span>{item.owner.phone.slice(-10)}</span>
                    </p>
                  </div>

                  {/* Pricing Breakdown & Platform Limit Safeguard */}
                  <div className="mt-3 rounded-xl border border-border p-3 bg-card/50 space-y-1.5">
                    <div className="flex items-baseline justify-between">
                      <span className="text-xs text-muted-foreground font-medium">Owner Rent Price:</span>
                      <span className="font-heading text-base font-extrabold text-foreground">
                        {formatPrice(effectivePrice)} <span className="text-[10px] text-muted-foreground font-normal">/ day</span>
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                      <span>Security Deposit:</span>
                      <span className="font-semibold text-foreground">{formatPrice(effectiveDeposit)}</span>
                    </div>

                    <div className="flex items-center justify-between text-[10px] pt-1 border-t border-border/60">
                      <span>Allowed Guardrail:</span>
                      <span className={isWithinLimits ? "text-primary font-bold" : "text-destructive font-bold"}>
                        {formatPrice(minLimit)} - {formatPrice(maxLimit)}
                      </span>
                    </div>

                    {!isWithinLimits && (
                      <p className="text-[10px] font-semibold text-destructive mt-1">
                        ⚠️ Rate is outside standard platform range.
                      </p>
                    )}
                  </div>

                  {/* Quality / Features notes */}
                  {item.notes && (
                    <div className="mt-2.5 text-[11px] text-muted-foreground line-clamp-2">
                      <span className="font-semibold text-foreground">Owner note: </span>
                      {item.notes}
                    </div>
                  )}

                  {item.adminReviewNotes && (
                    <div className="mt-2 text-[10px] text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 p-1.5 rounded-lg">
                      <span className="font-bold">Admin note: </span>
                      {item.adminReviewNotes}
                    </div>
                  )}
                </div>

                {/* ── Action Buttons ─────────────────────────────────── */}
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
                        <span>Approve Listing</span>
                      </button>
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => handleReview(item.id, "REJECT")}
                        className="flex items-center justify-center gap-1 rounded-xl border border-destructive/30 px-3 py-2 text-xs font-semibold text-destructive transition hover:bg-destructive/10 disabled:opacity-50"
                      >
                        <X size={14} />
                        <span>Reject</span>
                      </button>
                    </>
                  ) : isVerified ? (
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => handleReview(item.id, "REJECT", "Listing suspended by admin")}
                      className="w-full rounded-xl border border-border py-1.5 text-xs font-semibold text-muted-foreground transition hover:border-destructive hover:text-destructive disabled:opacity-50"
                    >
                      Suspend / Revoke Listing
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => handleReview(item.id, "APPROVE", "Re-approved by admin")}
                      className="w-full rounded-xl bg-primary/15 py-1.5 text-xs font-bold text-primary transition hover:bg-primary hover:text-primary-foreground disabled:opacity-50"
                    >
                      Re-Approve Listing
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
