"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import Link from "next/link"
import OwnerShell from "../_components/owner-shell"
import { useLocale } from "next-intl"
import { formatPrice, formatDate } from "@/lib/utils"
import {
  AlertCircle,
  Bell,
  Calendar,
  Check,
  Clock,
  Loader2,
  MapPin,
  Wrench,
  X,
} from "lucide-react"

interface OwnerRequest {
  id: string
  bookingRef: string
  status: string
  serviceType: string
  mode: string
  needsOperator: boolean
  startDate: string
  endDate: string
  totalDays: number
  toolFeePerDay: number
  operatorFeePerDay: number
  totalToolFee: number
  totalOperatorFee: number
  deliveryFee: number
  platformFee: number
  totalAmount: number
  tool: {
    id: string
    name: string
    slug: string
    image: string | null
    pricePerDay: number
    requiresCertifiedOperator: boolean
  }
  farmer: {
    id: string
    name: string | null
    phone: string
    district: string | null
    taluk: string | null
    village: string | null
    image: string | null
  }
  payment: { id: string | null; amount: number; status: string | null }
  slaDeadline: string
  slaRemainingMs: number
}

function useCountdown(deadlineIso: string): string {
  const [, tick] = useState(0)
  useEffect(() => {
    const id = setInterval(() => tick((n) => n + 1), 30_000)
    return () => clearInterval(id)
  }, [])
  const ms = Math.max(0, new Date(deadlineIso).getTime() - Date.now())
  const h = Math.floor(ms / 3_600_000)
  const m = Math.floor((ms % 3_600_000) / 60_000)
  if (ms <= 0) return "Expiring…"
  return h > 0 ? `${h}h ${m}m left` : m > 0 ? `${m}m left` : "Expiring…"
}

function Avatar({ name, image, className }: { name: string | null; image: string | null; className?: string }) {
  const initial = (name?.trim()?.[0] ?? "F").toUpperCase()
  if (image) {
    return <img src={image} alt={name ?? "Farmer"} className={`h-[60px] w-[60px] rounded-[18px] object-cover ${className ?? ""}`} />
  }
  return (
    <div className={`flex h-[60px] w-[60px] items-center justify-center rounded-[18px] bg-bele-green-muted text-xl font-bold text-primary ${className ?? ""}`}>
      {initial}
    </div>
  )
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex min-w-0 items-center gap-2.5">
        {icon}
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
      </div>
      <span className="truncate text-right text-[13px] font-bold text-foreground">{value}</span>
    </div>
  )
}

interface RequestCardProps {
  request: OwnerRequest
  fp: (n: number) => string
  onAction: () => void
}

function RequestCard({ request, fp, onAction }: RequestCardProps) {
  const [operatorMode, setOperatorMode] = useState<"assign_operator" | "self_service" | null>(null)
  const [busy, setBusy] = useState<"accept" | "decline" | null>(null)
  const [error, setError] = useState("")
  const [done, setDone] = useState<"accepted" | "declined" | null>(null)

  const respond = useCallback(
    async (action: "accept" | "decline") => {
      setBusy(action)
      setError("")
      try {
        const res = await fetch(`/api/rentals/${request.id}/transition`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            to: action === "accept" ? "OWNER_ACCEPTED" : "CANCELLED_BY_OWNER",
            ...(action === "accept" && request.needsOperator ? { operatorMode } : {}),
          }),
        })
        const data = await res.json()
        if (!res.ok) {
          setError(data.error || (action === "accept" ? "Could not accept booking" : "Could not decline booking"))
          return
        }
        setDone(action === "accept" ? "accepted" : "declined")
        onAction()
      } finally {
        setBusy(null)
      }
    },
    [request.id, request.needsOperator, operatorMode, onAction],
  )

  const canAccept = !request.needsOperator || operatorMode !== null
  const certifiedOnly = request.tool.requiresCertifiedOperator
  const location = [request.farmer.village, request.farmer.taluk, request.farmer.district]
    .filter(Boolean)
    .join(", ")

  return (
    <div className="overflow-hidden rounded-[20px] border border-border bg-card shadow-[0_2px_10px_rgba(45,80,22,0.06)]">
      {done ? (
        /* ── Post-decision state ─────────────────────────── */
        <div
          className={`px-6 py-8 text-center ${
            done === "accepted" ? "bg-bele-green-muted/50" : "bg-bele-soil-muted/40"
          }`}
        >
          <div
            className={`mx-auto mb-4 flex h-[60px] w-[60px] items-center justify-center rounded-full ${
              done === "accepted" ? "bg-primary" : "bg-secondary"
            }`}
          >
            {done === "accepted" ? <Check size={28} className="text-white" /> : <X size={28} className="text-white" />}
          </div>
          <h3 className={`font-display text-xl font-bold ${done === "accepted" ? "text-primary" : "text-secondary"}`}>
            {done === "accepted" ? "Request Accepted!" : "Request Declined"}
          </h3>
          <p className="mx-auto mt-2 max-w-[280px] text-[13px] leading-relaxed text-muted-foreground">
            {done === "accepted"
              ? `${request.farmer.name ?? "The farmer"} has been notified by SMS.`
              : `${request.farmer.name ?? "The farmer"} has been notified. The slot is now open.`}
          </p>
        </div>
      ) : (
        <>
          {/* ── Farmer card ──────────────────────────────── */}
          <div className="px-4 pt-4">
            <div className="mb-4 flex items-center gap-3.5">
              <div className="relative shrink-0">
                <Avatar name={request.farmer.name} image={request.farmer.image} />
                <div className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full border-2 border-card bg-primary">
                  <Check size={10} className="text-white" strokeWidth={3} />
                </div>
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-[17px] font-bold text-foreground">
                  {request.farmer.name ?? "Farmer"}
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                  {location && (
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <MapPin size={12} /> {location}
                    </span>
                  )}
                  <span className="text-xs text-muted-foreground">+91 {request.farmer.phone}</span>
                </div>
              </div>
            </div>

            <div className="mb-3 h-px bg-border" />

            <div className="flex flex-col gap-3 pb-1">
              <InfoRow icon={<Wrench size={15} className="text-primary" />} label="Requested Tool" value={request.tool.name} />
              <InfoRow
                icon={<Calendar size={15} className="text-primary" />}
                label="Dates"
                value={`${formatDate(request.startDate)} → ${formatDate(request.endDate)} (${request.totalDays} ${request.totalDays === 1 ? "day" : "days"})`}
              />
            </div>
          </div>

          {/* ── Earnings estimate ─────────────────────────── */}
          <div className="mx-4 mt-4 rounded-[20px] bg-primary px-5 py-5 shadow-[0_4px_20px_rgba(45,80,22,0.25)]">
            <div className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.1em] text-white/55">
              Estimated Earnings
            </div>
            <div className="mb-3.5 flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <span className="font-display text-[34px] font-bold leading-none text-accent">{fp(request.totalAmount)}</span>
              <span className="text-xs text-white/50">
                {fp(request.toolFeePerDay)}/day × {request.totalDays} days
                {request.operatorFeePerDay > 0 && ` + ${fp(request.operatorFeePerDay)}/day operator`}
              </span>
            </div>
            <div className="mb-3 h-px bg-white/15" />
            <div className="flex items-center gap-2 text-[11px] text-white/50">
              <Clock size={13} />
              Paid to your UPI · 24 hrs after tool return
            </div>
          </div>

          {/* ── Operator choice (EXPLICIT, never implicit) ── */}
          {request.needsOperator && (
            <div className="mx-4 mt-4 rounded-2xl border border-accent/30 bg-accent/10 p-4">
              <div className="mb-1.5 flex items-center gap-2">
                <AlertCircle size={16} className="shrink-0 text-accent" />
                <span className="text-xs font-bold text-[#7A5800]">Operator assignment needed</span>
              </div>
              <p className="mb-3 text-[11px] leading-relaxed text-[#9A7820]">
                {certifiedOnly
                  ? "This tool requires a certified operator, so it cannot be accepted as self-service. Assign an operator, or decline."
                  : "The farmer requested an operator. Choose how you will fulfil this booking before accepting — there is no default."}
              </p>
              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => setOperatorMode("assign_operator")}
                  className={`flex items-center gap-2.5 rounded-xl border px-3.5 py-3 text-left transition ${
                    operatorMode === "assign_operator"
                      ? "border-primary bg-primary/10"
                      : "border-border bg-card"
                  }`}
                >
                  <span
                    className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 ${
                      operatorMode === "assign_operator" ? "border-primary" : "border-muted-foreground/40"
                    }`}
                  >
                    {operatorMode === "assign_operator" && <span className="h-2 w-2 rounded-full bg-primary" />}
                  </span>
                  <span>
                    <span className="block text-[13px] font-bold text-foreground">Assign an operator</span>
                    <span className="block text-[11px] text-muted-foreground">Platform dispatches a certified operator</span>
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => !certifiedOnly && setOperatorMode("self_service")}
                  disabled={certifiedOnly}
                  className={`flex items-center gap-2.5 rounded-xl border px-3.5 py-3 text-left transition ${
                    certifiedOnly
                      ? "cursor-not-allowed border-border bg-muted/50 opacity-60"
                      : operatorMode === "self_service"
                        ? "border-primary bg-primary/10"
                        : "border-border bg-card"
                  }`}
                >
                  <span
                    className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 ${
                      operatorMode === "self_service" ? "border-primary" : "border-muted-foreground/40"
                    }`}
                  >
                    {operatorMode === "self_service" && <span className="h-2 w-2 rounded-full bg-primary" />}
                  </span>
                  <span>
                    <span className="block text-[13px] font-bold text-foreground">Accept as self-service</span>
                    <span className="block text-[11px] text-muted-foreground">
                      {certifiedOnly ? "Not allowed — this tool needs a certified operator" : "You run the tool yourself — no operator fee"}
                    </span>
                  </span>
                </button>
              </div>
            </div>
          )}

          {error && (
            <p className="mx-4 mt-3 rounded-2xl bg-destructive/10 px-4 py-3 text-center text-sm font-semibold text-destructive">
              {error}
            </p>
          )}

          {/* ── Action buttons ────────────────────────────── */}
          <div className="flex gap-3 p-4">
            <button
              type="button"
              onClick={() => respond("decline")}
              disabled={busy !== null}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-[18px] border-2 border-secondary py-4 text-sm font-bold text-secondary transition hover:bg-secondary/5 disabled:opacity-50"
            >
              {busy === "decline" ? <Loader2 size={16} className="animate-spin" /> : <X size={16} />} Decline
            </button>
            <button
              type="button"
              onClick={() => respond("accept")}
              disabled={busy !== null || !canAccept}
              className="flex flex-[2] items-center justify-center gap-1.5 rounded-[18px] bg-primary py-4 text-sm font-bold text-primary-foreground shadow-[0_4px_16px_rgba(45,80,22,0.30)] transition hover:brightness-110 disabled:opacity-50"
            >
              {busy === "accept" ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />} Accept Booking
            </button>
          </div>
        </>
      )}
    </div>
  )
}

export default function OwnerRequestsPage() {
  const locale = useLocale()
  const fp = (n: number) => formatPrice(n, locale)
  const [requests, setRequests] = useState<OwnerRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const fetchSeq = useRef(0)

  const fetchRequests = useCallback(async () => {
    const seq = ++fetchSeq.current
    setLoading(true)
    try {
      const res = await fetch("/api/owner/requests")
      const data = await res.json()
      if (res.ok) {
        if (seq === fetchSeq.current) setRequests(data.data ?? [])
      } else if (seq === fetchSeq.current) {
        setError(data.error || "Failed to load requests")
      }
    } finally {
      if (seq === fetchSeq.current) setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchRequests()
  }, [fetchRequests])

  return (
    <OwnerShell
      title="New Requests"
      subtitle={
        requests.length > 0
          ? `${requests.length} pending — respond within 4 hours to keep your rating high`
          : "Respond to new booking requests"
      }
    >
      {error && (
        <p className="mb-3 rounded-2xl bg-destructive/10 px-4 py-3 text-center text-sm font-semibold text-destructive">
          {error}
        </p>
      )}

      {loading ? (
        <div className="flex flex-1 items-center justify-center py-24">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : requests.length === 0 ? (
        <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
          <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-3xl bg-bele-green-muted">
            <Bell size={34} className="text-primary" strokeWidth={1.5} />
          </div>
          <h2 className="font-display text-xl font-bold text-primary">No pending requests</h2>
          <p className="mt-2 max-w-[270px] text-sm leading-relaxed text-muted-foreground">
            When a farmer books your tool, their request will appear here with a 4-hour response window.
          </p>
          <Link
            href="/owner"
            className="mt-7 rounded-full bg-primary px-6 py-3 text-sm font-bold text-primary-foreground shadow-[0_4px_16px_rgba(45,80,22,0.30)] transition hover:brightness-110"
          >
            Back to Equipment
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-4 pb-2">
          {requests.map((request) => (
            <div key={request.id} className="relative">
              {/* SLA countdown chip */}
              <div className="absolute -top-3 right-3 z-10 flex items-center gap-1.5 rounded-full bg-accent/15 px-3 py-1 text-[11px] font-bold text-accent">
                <Clock size={12} /> <CountdownChip deadline={request.slaDeadline} />
              </div>
              <RequestCard request={request} fp={fp} onAction={fetchRequests} />
            </div>
          ))}
        </div>
      )}
    </OwnerShell>
  )
}

function CountdownChip({ deadline }: { deadline: string }) {
  const label = useCountdown(deadline)
  return <span>{label}</span>
}
