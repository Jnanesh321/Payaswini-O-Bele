"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { useLocale } from "next-intl"
import { useSession, signOut } from "@/components/providers/session-provider"
import { formatPrice, formatDate } from "@/lib/utils"
import { FarmerShell } from "@/components/layout/farmer-shell"
import { CapabilityVerificationModal } from "@/components/verification/capability-verification-modal"
import {
  Package,
  Clock,
  CreditCard,
  ShieldCheck,
  ChevronRight,
  Plus,
  Loader2,
  Calendar,
  Wrench,
  CheckCircle2,
  AlertCircle,
  User,
  LogOut,
} from "lucide-react"

interface RentalItem {
  id: string
  bookingRef: string
  startDate: string
  endDate: string
  totalAmount: number
  deposit: number
  status: string
  tool: { id: string; name: string; slug: string; thumbnailUrl?: string; images: string[] }
  toolInstance?: { assetCode: string } | null
  serviceType: string
}

interface CapabilityItem {
  id: string
  type: string
  status: string
  notes?: string | null
}

export default function DashboardPage() {
  const { data: session } = useSession()
  const locale = useLocale()
  const fp = (n: number) => formatPrice(n, locale)
  const [rentals, setRentals] = useState<RentalItem[]>([])
  const [capabilities, setCapabilities] = useState<CapabilityItem[]>([])
  const [loading, setLoading] = useState(true)
  const [kycModalOpen, setKycModalOpen] = useState(false)

  // Scroll to #account if navigated from bottom-nav Profile tab
  useEffect(() => {
    if (typeof window !== "undefined" && window.location.hash === "#account") {
      const timer = setTimeout(() => {
        document.getElementById("account")?.scrollIntoView({ behavior: "smooth" })
      }, 150)
      return () => clearTimeout(timer)
    }
  }, [])

  const fetchData = useCallback(async () => {
    try {
      const [rentalsRes, capsRes] = await Promise.all([
        fetch("/api/rentals"),
        fetch("/api/user/capabilities"),
      ])
      const rentalsData = await rentalsRes.json()
      const capsData = await capsRes.json()

      if (rentalsRes.ok) setRentals(rentalsData.data || [])
      if (capsRes.ok && capsData.detailedCapabilities) {
        setCapabilities(capsData.detailedCapabilities)
      }
    } catch {
      // Ignored
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchData()
  }, [fetchData])

  const farmerCap = capabilities.find((c) => c.type === "FARMER")
  const isKycVerified = farmerCap?.status === "VERIFIED"
  const isKycPending = farmerCap?.status === "PENDING"

  const activeRentals = rentals.filter((r) =>
    [
      "OWNER_ACCEPTED",
      "OPERATOR_ASSIGNED",
      "FETCHING_TOOL",
      "TOOL_COLLECTED",
      "TRAVELLING_TO_FARM",
      "ARRIVED",
      "WORK_STARTED",
      "WORK_PAUSED",
      "WORK_RESUMED",
      "RETURNING_TOOL",
    ].includes(r.status)
  )

  const completedRentals = rentals.filter((r) =>
    ["TOOL_RETURNED", "INSPECTION", "COMPLETED"].includes(r.status)
  )

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "WORK_STARTED":
      case "ARRIVED":
      case "TOOL_COLLECTED":
        return <span className="rounded-full bg-accent/20 px-2 py-0.5 text-[10px] font-bold text-accent">In Progress</span>
      case "OWNER_PENDING":
        return <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold text-amber-600">Pending Owner</span>
      case "COMPLETED":
        return <span className="rounded-full bg-bele-green-muted px-2 py-0.5 text-[10px] font-bold text-primary">Completed</span>
      default:
        return <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold text-muted-foreground">{status.replace("_", " ")}</span>
    }
  }

  return (
    <FarmerShell
      eyebrow="Farmer Portal"
      title="My Farm Hub"
      subtitle="Track active tool bookings and farm machinery"
    >
      <div className="flex flex-col gap-4">
        {/* ── KYC / Verification Banner ──────────────────────── */}
        {!isKycVerified && (
          <div className="rounded-2xl border border-primary/20 bg-bele-green-muted p-4">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white shadow-sm text-primary">
                {isKycPending ? <AlertCircle size={18} /> : <ShieldCheck size={18} />}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <h3 className="font-display text-xs font-bold text-primary">
                    {isKycPending ? "Verification In Review" : "Verify Farmer Profile"}
                  </h3>
                  <span className="text-[10px] font-bold text-primary/70">
                    {isKycPending ? "Pending" : "Required"}
                  </span>
                </div>
                <p className="mt-0.5 text-[11px] leading-relaxed text-primary/80">
                  {isKycPending
                    ? "Your farm profile is pending admin approval. You can still rent tools."
                    : "Add your land size and location to unlock direct farmer pricing discounts."}
                </p>
                {!isKycPending && (
                  <button
                    type="button"
                    onClick={() => setKycModalOpen(true)}
                    className="mt-2.5 rounded-xl bg-primary px-3 py-1.5 text-[11px] font-bold text-white shadow-sm transition hover:brightness-110"
                  >
                    Complete Profile →
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── Quick Stats Grid ──────────────────────────────── */}
        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-2xl border border-border bg-card p-3 text-center">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Active</p>
            <p className="mt-1 font-display text-lg font-bold text-primary">{activeRentals.length}</p>
          </div>
          <div className="rounded-2xl border border-border bg-card p-3 text-center">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Completed</p>
            <p className="mt-1 font-display text-lg font-bold text-secondary">{completedRentals.length}</p>
          </div>
          <div className="rounded-2xl border border-border bg-card p-3 text-center">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Deposits</p>
            <p className="mt-1 font-display text-sm font-bold text-foreground">
              {fp(rentals.reduce((sum, r) => sum + (r.deposit || 0), 0))}
            </p>
          </div>
        </div>

        {/* ── Active Bookings Section ───────────────────────── */}
        <div>
          <div className="mb-2.5 flex items-center justify-between">
            <h2 className="font-display text-sm font-bold text-foreground">
              Active Rentals ({activeRentals.length})
            </h2>
            <Link href="/tools" className="text-[11px] font-bold text-primary hover:underline">
              + Rent New
            </Link>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-7 w-7 animate-spin text-primary" />
            </div>
          ) : activeRentals.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card/60 p-6 text-center">
              <Package size={28} className="text-muted-foreground/50 mb-2" />
              <p className="text-xs font-bold text-foreground">No active rentals right now</p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                Need a power tiller or carbon pole for your harvest?
              </p>
              <Link
                href="/tools"
                className="mt-3 inline-flex items-center gap-1 rounded-xl bg-primary px-3.5 py-2 text-xs font-bold text-white shadow-sm transition hover:brightness-110"
              >
                <Plus size={13} /> Explore Catalog
              </Link>
            </div>
          ) : (
            <div className="flex flex-col gap-2.5">
              {activeRentals.map((rental) => (
                <div
                  key={rental.id}
                  className="overflow-hidden rounded-2xl border border-border bg-card p-3.5 shadow-sm transition hover:border-primary/40"
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <span className="font-mono text-[10px] text-muted-foreground font-bold">
                        {rental.bookingRef}
                      </span>
                      <h3 className="font-display text-sm font-bold text-foreground">
                        {rental.tool.name}
                      </h3>
                    </div>
                    {getStatusBadge(rental.status)}
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-muted-foreground border-t border-border/60 pt-2.5 mt-2">
                    <div className="flex items-center gap-1">
                      <Calendar size={12} />
                      <span>
                        {formatDate(rental.startDate)} – {formatDate(rental.endDate)}
                      </span>
                    </div>
                    <span className="font-bold text-foreground">{fp(rental.totalAmount)}</span>
                  </div>

                  {rental.toolInstance?.assetCode && (
                    <div className="mt-2 flex items-center justify-between rounded-lg bg-muted px-2.5 py-1 text-[10px]">
                      <span className="text-muted-foreground">Asset Tag:</span>
                      <span className="font-mono font-bold text-foreground">
                        🏷 {rental.toolInstance.assetCode}
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Rental History Section ────────────────────────── */}
        {completedRentals.length > 0 && (
          <div className="mt-2">
            <h2 className="mb-2.5 font-display text-sm font-bold text-foreground">
              Past Rentals ({completedRentals.length})
            </h2>
            <div className="flex flex-col gap-2">
              {completedRentals.map((rental) => (
                <div
                  key={rental.id}
                  className="flex items-center justify-between rounded-xl border border-border bg-card p-3 text-xs"
                >
                  <div>
                    <p className="font-bold text-foreground">{rental.tool.name}</p>
                    <p className="text-[10px] text-muted-foreground">{formatDate(rental.endDate)}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-foreground">{fp(rental.totalAmount)}</p>
                    <span className="text-[10px] text-primary font-semibold">Completed</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Farmer Account & Profile Section (#account) ───────── */}
        <section id="account" className="mt-8 scroll-mt-24 border-t border-border pt-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-display text-sm font-bold text-foreground">
              Account & Profile
            </h2>
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
              Farmer
            </span>
          </div>

          <div className="rounded-2xl border border-border bg-card p-4 shadow-sm space-y-4">
            {/* User Profile Card */}
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 font-display text-base font-bold text-primary">
                {session?.user?.name ? session.user.name.charAt(0).toUpperCase() : <User size={20} />}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-display text-sm font-bold text-foreground">
                  {session?.user?.name || "O~Bele Farmer"}
                </p>
                <p className="text-xs text-muted-foreground font-mono">
                  {session?.user?.email || session?.user?.phone || "Verified Member"}
                </p>
              </div>
            </div>

            {/* KYC Status Banner */}
            <div className="flex items-center justify-between rounded-xl bg-muted/60 p-3 text-xs">
              <div className="flex items-center gap-2">
                <ShieldCheck size={16} className={isKycVerified ? "text-primary" : "text-amber-600"} />
                <div>
                  <p className="font-semibold text-foreground">
                    {isKycVerified ? "KYC Verified Farmer" : isKycPending ? "KYC Verification Pending" : "KYC Unverified"}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {isKycVerified ? "Eligible for priority doorstep machinery delivery" : "Verify Aadhaar to unlock zero-deposit rentals"}
                  </p>
                </div>
              </div>
              {!isKycVerified && (
                <button
                  type="button"
                  onClick={() => setKycModalOpen(true)}
                  className="rounded-lg bg-primary px-2.5 py-1 text-[11px] font-bold text-primary-foreground hover:bg-primary/90 transition shrink-0"
                >
                  Verify
                </button>
              )}
            </div>

            {/* Account Quick Links */}
            <div className="divide-y divide-border/60 text-xs">
              <Link
                href="/onboarding"
                className="flex items-center justify-between py-2.5 text-muted-foreground hover:text-foreground"
              >
                <span>Switch or Add Roles (Tool Owner / Operator)</span>
                <ChevronRight size={14} />
              </Link>
              <Link
                href="/how-it-works"
                className="flex items-center justify-between py-2.5 text-muted-foreground hover:text-foreground"
              >
                <span>Rental Policies & How O~Bele Works</span>
                <ChevronRight size={14} />
              </Link>
            </div>

            {/* Sign Out Button */}
            <div className="border-t border-border/80 pt-3">
              <button
                type="button"
                onClick={() => signOut({ callbackUrl: "/" })}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-destructive/20 bg-destructive/10 py-2.5 text-xs font-bold text-destructive hover:bg-destructive hover:text-destructive-foreground transition"
              >
                <LogOut size={15} />
                Sign Out from O~Bele
              </button>
            </div>
          </div>
        </section>
      </div>

      {/* Verification Modal */}
      <CapabilityVerificationModal
        type="FARMER"
        isOpen={kycModalOpen}
        onClose={() => setKycModalOpen(false)}
        onSuccess={() => fetchData()}
      />
    </FarmerShell>
  )
}
