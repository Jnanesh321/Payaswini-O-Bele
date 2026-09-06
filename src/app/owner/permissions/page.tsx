"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import OwnerShell from "../_components/owner-shell"
import { formatDate } from "@/lib/utils"
import {
  ShieldCheck,
  Plus,
  Search,
  UserCheck,
  UserX,
  Loader2,
  Phone,
  MapPin,
  AlertCircle,
  CheckCircle2,
  X,
  ArrowLeft,
  Info,
} from "lucide-react"
import { SafeAvatar } from "@/components/ui"

interface FarmerData {
  id: string
  name: string
  phone: string
  district: string | null
  taluk: string | null
  village: string | null
  image: string | null
  phoneVerified: boolean
  location: string
}

interface PermissionItem {
  id: string
  farmerId: string
  toolOwnerId: string
  status: "UNVERIFIED" | "PENDING" | "VERIFIED" | "SUSPENDED" | "REVOKED"
  verifiedAt: string | null
  createdAt: string
  updatedAt: string
  farmer: FarmerData
}

export default function OwnerPermissionsPage() {
  const [permissions, setPermissions] = useState<PermissionItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [searchQuery, setSearchQuery] = useState("")
  const [busyId, setBusyId] = useState<string | null>(null)

  // Modal State
  const [modalOpen, setModalOpen] = useState(false)
  const [phoneInput, setPhoneInput] = useState("")
  const [lookupLoading, setLookupLoading] = useState(false)
  const [lookupError, setLookupError] = useState("")
  const [foundFarmer, setFoundFarmer] = useState<FarmerData | null>(null)
  const [granting, setGranting] = useState(false)
  const [grantSuccess, setGrantSuccess] = useState("")

  const fetchPermissions = useCallback(async () => {
    try {
      setError("")
      const res = await fetch("/api/owner/permissions")
      const json = await res.json()
      if (res.ok) {
        setPermissions(json.data ?? [])
      } else {
        setError(json.error || "Failed to load permissions")
      }
    } catch {
      setError("Failed to load permissions")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchPermissions()
  }, [fetchPermissions])

  // Lookup farmer by phone
  const handleLookupFarmer = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    const cleanDigits = phoneInput.replace(/\D/g, "")
    if (cleanDigits.length < 10) {
      setLookupError("Please enter a valid 10-digit Indian phone number")
      return
    }

    setLookupLoading(true)
    setLookupError("")
    setFoundFarmer(null)
    setGrantSuccess("")

    try {
      const res = await fetch(`/api/owner/farmers/lookup?phone=${encodeURIComponent(cleanDigits)}`)
      const json = await res.json()
      if (res.ok && json.data) {
        setFoundFarmer({
          ...json.data,
          location: [json.data.village, json.data.taluk, json.data.district].filter(Boolean).join(", "),
        })
      } else {
        setLookupError(json.error || "Farmer account not found")
      }
    } catch {
      setLookupError("Failed to lookup farmer")
    } finally {
      setLookupLoading(false)
    }
  }

  // Grant permission
  const handleGrantPermission = async () => {
    if (!foundFarmer) return
    setGranting(true)
    setLookupError("")

    try {
      const res = await fetch("/api/owner/permissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: foundFarmer.phone, status: "VERIFIED" }),
      })
      const json = await res.json()
      if (res.ok) {
        setGrantSuccess(`Self-operate permission granted to ${foundFarmer.name}!`)
        await fetchPermissions()
        setTimeout(() => {
          setModalOpen(false)
          setPhoneInput("")
          setFoundFarmer(null)
          setGrantSuccess("")
        }, 1200)
      } else {
        setLookupError(json.error || "Failed to grant permission")
      }
    } catch {
      setLookupError("An error occurred while granting permission")
    } finally {
      setGranting(false)
    }
  }

  // Toggle/Revoke permission
  const handleTogglePermission = async (item: PermissionItem) => {
    setBusyId(item.id)
    setError("")
    try {
      const newStatus = item.status === "VERIFIED" ? "REVOKED" : "VERIFIED"
      const res = await fetch("/api/owner/permissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: item.farmer.phone, status: newStatus }),
      })
      const json = await res.json()
      if (!res.ok) {
        setError(json.error || "Could not update permission")
        return
      }
      await fetchPermissions()
    } catch {
      setError("Failed to update permission")
    } finally {
      setBusyId(null)
    }
  }

  // Filter permissions
  const filteredPermissions = permissions.filter((p) => {
    const q = searchQuery.toLowerCase().trim()
    if (!q) return true
    return (
      p.farmer.name.toLowerCase().includes(q) ||
      p.farmer.phone.includes(q) ||
      p.farmer.location.toLowerCase().includes(q)
    )
  })

  return (
    <OwnerShell
      eyebrow="Access Control"
      title="Certified Farmers"
      subtitle="Manage who can self-operate your heavy machinery"
      headerRight={
        <Link
          href="/owner"
          className="mt-1 flex h-9 w-9 items-center justify-center rounded-xl bg-muted text-muted-foreground transition hover:bg-muted/80"
          title="Back to Equipment"
        >
          <ArrowLeft size={18} />
        </Link>
      }
    >
      {/* ── Guidance Banner ─────────────────────────────────── */}
      <div className="mb-4 flex items-start gap-3 rounded-2xl border border-primary/15 bg-bele-green-muted p-3.5 text-primary">
        <ShieldCheck size={20} className="mt-0.5 shrink-0 text-primary" />
        <div className="text-xs leading-relaxed">
          <p className="font-bold">Heavy Machinery Protection</p>
          <p className="mt-0.5 text-primary/80">
            For certified tools (e.g. power tillers, carbon poles), farmers can only choose self-service rental if you grant them a verified permission.
          </p>
        </div>
      </div>

      {error && (
        <div className="mb-3 flex items-center gap-2 rounded-2xl bg-destructive/10 px-4 py-3 text-sm font-semibold text-destructive">
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {/* ── Search & Actions Bar ────────────────────────────── */}
      <div className="mb-4 flex items-center gap-2">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name or phone…"
            className="w-full rounded-2xl border border-border bg-card py-2.5 pl-9 pr-3 text-xs placeholder:text-muted-foreground focus:border-primary focus:outline-none"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X size={14} />
            </button>
          )}
        </div>
        <button
          type="button"
          onClick={() => {
            setModalOpen(true)
            setFoundFarmer(null)
            setLookupError("")
            setGrantSuccess("")
          }}
          className="flex shrink-0 items-center gap-1.5 rounded-2xl bg-primary px-3.5 py-2.5 text-xs font-bold text-primary-foreground shadow-sm transition hover:brightness-110"
        >
          <Plus size={15} />
          <span>Grant</span>
        </button>
      </div>

      {/* ── List Content ────────────────────────────────────── */}
      {loading ? (
        <div className="flex flex-1 items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : permissions.length === 0 ? (
        /* Empty State */
        <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-border bg-card/60 px-6 py-14 text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-bele-soil-muted text-secondary">
            <UserCheck size={32} />
          </div>
          <h3 className="font-display text-lg font-bold text-foreground">No Certified Farmers Yet</h3>
          <p className="mt-1.5 max-w-[260px] text-xs leading-relaxed text-muted-foreground">
            Grant trusted farmers permission to rent and self-operate your certified machinery without an assigned operator.
          </p>
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="mt-6 flex items-center gap-2 rounded-2xl bg-primary px-5 py-3 text-xs font-bold text-primary-foreground shadow-md transition hover:brightness-110"
          >
            <Plus size={16} /> Grant First Permission
          </button>
        </div>
      ) : filteredPermissions.length === 0 ? (
        <div className="py-12 text-center text-xs text-muted-foreground">
          No certified farmers matching &ldquo;{searchQuery}&rdquo;
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          <div className="flex items-center justify-between px-1 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            <span>Farmer ({filteredPermissions.length})</span>
            <span>Status / Action</span>
          </div>

          {filteredPermissions.map((item) => {
            const isVerified = item.status === "VERIFIED"
            const isBusy = busyId === item.id

            return (
              <div
                key={item.id}
                className="flex items-center justify-between rounded-2xl border border-border bg-card p-3.5 shadow-sm transition hover:border-primary/30"
              >
                {/* Farmer Info */}
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="relative shrink-0">
                    <SafeAvatar
                      src={item.farmer.image}
                      name={item.farmer.name}
                      alt={item.farmer.name}
                      className="h-11 w-11 rounded-xl object-cover"
                    />
                    {isVerified && (
                      <div className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-accent text-white">
                        <CheckCircle2 size={10} strokeWidth={3} />
                      </div>
                    )}
                  </div>

                  <div className="min-w-0 flex-1 pr-2">
                    <div className="flex items-center gap-1.5">
                      <span className="truncate text-xs font-bold text-foreground">
                        {item.farmer.name}
                      </span>
                      {item.farmer.phoneVerified && (
                        <span className="rounded bg-accent/15 px-1 py-0.2 text-[9px] font-bold text-accent">
                          ✓
                        </span>
                      )}
                    </div>
                    <div className="mt-0.5 flex items-center gap-1 text-[11px] text-muted-foreground">
                      <Phone size={11} className="shrink-0" />
                      <span>+91 {item.farmer.phone.slice(-10)}</span>
                    </div>
                    {item.farmer.location && (
                      <div className="mt-0.5 flex items-center gap-1 truncate text-[10px] text-muted-foreground/80">
                        <MapPin size={10} className="shrink-0" />
                        <span className="truncate">{item.farmer.location}</span>
                      </div>
                    )}
                    <div className="mt-1 text-[9px] text-muted-foreground/60">
                      Granted {formatDate(item.createdAt)}
                    </div>
                  </div>
                </div>

                {/* Status Toggle / Action */}
                <div className="flex shrink-0 flex-col items-end gap-1.5">
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                      isVerified
                        ? "bg-accent/15 text-accent"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {isVerified ? "Verified" : "Revoked"}
                  </span>

                  <button
                    type="button"
                    disabled={isBusy}
                    onClick={() => handleTogglePermission(item)}
                    className={`flex items-center gap-1 rounded-xl px-2.5 py-1 text-[11px] font-semibold transition disabled:opacity-50 ${
                      isVerified
                        ? "border border-destructive/20 text-destructive hover:bg-destructive/10"
                        : "bg-primary text-primary-foreground hover:brightness-110"
                    }`}
                  >
                    {isBusy ? (
                      <Loader2 size={12} className="animate-spin" />
                    ) : isVerified ? (
                      <>
                        <UserX size={12} />
                        <span>Revoke</span>
                      </>
                    ) : (
                      <>
                        <UserCheck size={12} />
                        <span>Restore</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ── Grant Permission Modal ──────────────────────────── */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-[380px] rounded-3xl border border-border bg-card p-5 shadow-2xl animate-in zoom-in-95">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-bele-green-muted text-primary">
                  <ShieldCheck size={18} />
                </div>
                <div>
                  <h3 className="font-display text-sm font-bold text-foreground">Grant Self-Operate</h3>
                  <p className="text-[10px] text-muted-foreground">Certified machinery access</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted"
              >
                <X size={16} />
              </button>
            </div>

            {/* Content */}
            <div className="mt-4 flex flex-col gap-3.5">
              <div>
                <label className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  Farmer Phone Number
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted-foreground">
                      +91
                    </span>
                    <input
                      type="tel"
                      value={phoneInput}
                      onChange={(e) => setPhoneInput(e.target.value)}
                      placeholder="98451 00001"
                      maxLength={14}
                      className="w-full rounded-2xl border border-border bg-background py-2.5 pl-11 pr-3 text-xs font-medium focus:border-primary focus:outline-none"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => handleLookupFarmer()}
                    disabled={lookupLoading || !phoneInput.trim()}
                    className="flex shrink-0 items-center gap-1.5 rounded-2xl bg-secondary px-3.5 py-2.5 text-xs font-bold text-white shadow-sm transition hover:brightness-110 disabled:opacity-50"
                  >
                    {lookupLoading ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
                    <span>Lookup</span>
                  </button>
                </div>
              </div>

              {lookupError && (
                <div className="flex items-center gap-2 rounded-xl bg-destructive/10 px-3 py-2 text-xs font-medium text-destructive">
                  <AlertCircle size={14} className="shrink-0" />
                  <span>{lookupError}</span>
                </div>
              )}

              {grantSuccess && (
                <div className="flex items-center gap-2 rounded-xl bg-accent/15 px-3 py-2.5 text-xs font-bold text-accent">
                  <CheckCircle2 size={15} className="shrink-0" />
                  <span>{grantSuccess}</span>
                </div>
              )}

              {/* Found Farmer Card */}
              {foundFarmer && (
                <div className="rounded-2xl border border-primary/20 bg-bele-green-muted p-3.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-primary">
                      Farmer Found
                    </span>
                    {foundFarmer.phoneVerified && (
                      <span className="flex items-center gap-1 rounded bg-accent/20 px-1.5 py-0.5 text-[9px] font-bold text-accent">
                        ✓ Phone Verified
                      </span>
                    )}
                  </div>
                  <div className="mt-2 flex items-center gap-2.5">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white font-display text-sm font-bold text-primary shadow-sm">
                      {(foundFarmer.name?.[0] ?? "F").toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-bold text-foreground">{foundFarmer.name}</p>
                      <p className="text-[11px] text-muted-foreground">+91 {foundFarmer.phone.slice(-10)}</p>
                      {foundFarmer.location && (
                        <p className="truncate text-[10px] text-muted-foreground">{foundFarmer.location}</p>
                      )}
                    </div>
                  </div>

                  <div className="mt-3.5 flex items-start gap-1.5 text-[10px] text-primary/80">
                    <Info size={13} className="shrink-0 mt-0.5" />
                    <span>
                      Granting this will permit this farmer to rent your certified machinery for self-operation.
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={handleGrantPermission}
                    disabled={granting || Boolean(grantSuccess)}
                    className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-xs font-bold text-primary-foreground shadow-sm transition hover:brightness-110 disabled:opacity-50"
                  >
                    {granting ? (
                      <>
                        <Loader2 size={14} className="animate-spin" />
                        <span>Granting Permission…</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 size={14} />
                        <span>Confirm & Grant Access</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </OwnerShell>
  )
}
