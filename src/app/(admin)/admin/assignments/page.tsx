"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useLocale } from "next-intl"
import { formatPrice, formatDate } from "@/lib/utils"
import { Badge, Select } from "@/components/ui"
import AdminShell from "../_components/admin-shell"
import {
  AlertCircle,
  Calendar,
  Check,
  Loader2,
  MapPin,
  UserCog,
  Users,
  Wrench,
} from "lucide-react"

interface AssignmentBooking {
  id: string
  bookingRef: string
  status: "OPERATOR_PENDING" | "OPERATOR_ASSIGNED"
  serviceType: string
  requiresCertifiedOperator: boolean
  startDate: string
  endDate: string
  totalDays: number
  totalAmount: number
  tool: {
    id: string
    name: string
    slug: string
    image: string | null
    requiresCertifiedOperator: boolean
  }
  farmer: {
    id: string
    name: string | null
    phone: string
    village: string | null
    taluk: string | null
    district: string | null
  }
  toolOwner: { id: string; name: string | null; phone: string }
  servicePerformer: { id: string; name: string | null; phone: string } | null
  payment: { id: string | null; amount: number; status: string | null }
}

interface OperatorCandidate {
  id: string
  name: string | null
  phone: string
  location: string
  status: string
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

function StatusBadge({ status }: { status: AssignmentBooking["status"] }) {
  if (status === "OPERATOR_ASSIGNED") {
    return <Badge variant="success">Assigned</Badge>
  }
  return <Badge variant="warning">Awaiting operator</Badge>
}

interface BookingCardProps {
  booking: AssignmentBooking
  operators: OperatorCandidate[]
  fp: (n: number) => string
  onAssigned: (prevId: string) => void
  showError: (id: string, message: string) => void
}

function BookingCard({ booking, operators, fp, onAssigned, showError }: BookingCardProps) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")

  const assign = useCallback(
    async (operatorId: string) => {
      setBusy(true)
      setError("")
      try {
        const res = await fetch(`/api/rentals/${booking.id}/assign-operator`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ operatorId }),
        })
        const data = await res.json()
        if (!res.ok) {
          setError(data.error || "Could not assign operator")
          return
        }
        onAssigned(booking.id)
      } finally {
        setBusy(false)
      }
    },
    [booking.id, onAssigned],
  )

  const location = [booking.farmer.village, booking.farmer.taluk, booking.farmer.district]
    .filter(Boolean)
    .join(", ")

  // The farmer can never be their own operator — drop them from the picker.
  const pickable = operators.filter((o) => o.id !== booking.farmer.id)

  return (
    <div className="overflow-hidden rounded-[20px] border border-border bg-card shadow-[0_2px_10px_rgba(45,80,22,0.06)]">
      <div className="px-4 pt-4">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-[16px] font-bold text-foreground">{booking.bookingRef}</span>
              <StatusBadge status={booking.status} />
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {booking.tool.name}
              {booking.tool.requiresCertifiedOperator && (
                <span className="ml-1.5 rounded-md border border-accent bg-accent/10 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-accent">
                  Certified
                </span>
              )}
            </p>
          </div>
        </div>

        <div className="mb-3 h-px bg-border" />

        <div className="flex flex-col gap-3 pb-1">
          <InfoRow
            icon={<Wrench size={15} className="text-primary" />}
            label="Tool"
            value={booking.tool.name}
          />
          <InfoRow
            icon={<Users size={15} className="text-primary" />}
            label="Farmer"
            value={[booking.farmer.name, location].filter(Boolean).join(", ") || booking.farmer.phone}
          />
          <InfoRow
            icon={<MapPin size={15} className="text-primary" />}
            label="Owner"
            value={booking.toolOwner.name ?? booking.toolOwner.phone}
          />
          <InfoRow
            icon={<Calendar size={15} className="text-primary" />}
            label="Dates"
            value={`${formatDate(booking.startDate)} → ${formatDate(booking.endDate)} (${booking.totalDays} ${booking.totalDays === 1 ? "day" : "days"})`}
          />
          <InfoRow
            icon={<Calendar size={15} className="text-primary" />}
            label="Amount"
            value={fp(booking.totalAmount)}
          />
        </div>
      </div>

      {booking.status === "OPERATOR_ASSIGNED" && booking.servicePerformer && (
        <div className="mx-4 mt-4 flex items-center gap-3 rounded-2xl border border-success/30 bg-success/10 px-4 py-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary">
            <Check size={16} className="text-white" strokeWidth={3} />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold text-foreground">
              {booking.servicePerformer.name ?? booking.servicePerformer.phone}
            </p>
            <p className="text-[11px] text-muted-foreground">+91 {booking.servicePerformer.phone}</p>
          </div>
        </div>
      )}

      {booking.status === "OPERATOR_PENDING" && (
        <div className="mx-4 mt-4 rounded-2xl border border-accent/30 bg-accent/10 p-4">
          <div className="mb-1.5 flex items-center gap-2">
            <UserCog size={16} className="shrink-0 text-accent" />
            <span className="text-xs font-bold text-[#7A5800]">Assign an operator</span>
          </div>
          <p className="mb-3 text-[11px] leading-relaxed text-[#9A7820]">
            {booking.requiresCertifiedOperator
              ? "This tool requires a certified operator. Pick who will perform the job below."
              : "Pick which verified operator will perform this booking."}
          </p>
          <div className="flex items-center gap-2">
            <Select
              value=""
              disabled={busy}
              onChange={(e) => {
                if (e.target.value) assign(e.target.value)
              }}
              aria-label={`Assign operator to ${booking.bookingRef}`}
            >
              <option value="" disabled>
                {busy ? "Assigning…" : pickable.length ? "Choose an operator…" : "No operators available"}
              </option>
              {pickable.map((op) => (
                <option key={op.id} value={op.id}>
                  {[op.name, op.phone, op.location].filter(Boolean).join(" — ")}
                </option>
              ))}
            </Select>
          </div>
          {error && (
            <p className="mt-3 flex items-center gap-2 rounded-xl bg-destructive/10 px-3 py-2 text-xs font-semibold text-destructive">
              <AlertCircle size={14} /> {error}
            </p>
          )}
        </div>
      )}

      {(booking.status === "OPERATOR_PENDING" && pickable.length === 0 && !busy) && (
        <p className="mx-4 mt-3 flex items-center gap-2 rounded-xl bg-destructive/10 px-3 py-2 text-xs font-semibold text-destructive">
          <AlertCircle size={14} /> No verified operators to assign. Cannot route this booking.
        </p>
      )}
    </div>
  )
}

export default function AdminAssignmentsPage() {
  const locale = useLocale()
  const fp = (n: number) => formatPrice(n, locale)
  const [bookings, setBookings] = useState<AssignmentBooking[]>([])
  const [operators, setOperators] = useState<OperatorCandidate[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [flash, setFlash] = useState<string[]>([])
  const fetchSeq = useRef(0)

  const fetchAssignments = useCallback(async () => {
    const seq = ++fetchSeq.current
    setLoading(true)
    try {
      const res = await fetch("/api/admin/assignments")
      const data = await res.json()
      if (res.ok) {
        if (seq === fetchSeq.current) {
          setBookings(data.data?.bookings ?? [])
          setOperators(data.data?.operators ?? [])
        }
      } else if (seq === fetchSeq.current) {
        setError(data.error || "Failed to load assignments")
      }
    } finally {
      if (seq === fetchSeq.current) setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchAssignments()
  }, [fetchAssignments])

  const handleAssigned = useCallback(
    (prevId: string) => {
      const wasPending = bookings.some((b) => b.id === prevId && b.status === "OPERATOR_PENDING")
      if (wasPending) {
        setFlash((prev) => [...prev, prevId])
        window.setTimeout(() => setFlash((prev) => prev.filter((id) => id !== prevId)), 2000)
      }
      fetchAssignments()
    },
    [bookings, fetchAssignments],
  )
  const showError = useCallback((_id: string, message: string) => {
    setError(message)
  }, [])

  const isPending = (b: AssignmentBooking) => b.status === "OPERATOR_PENDING"
  const pendingCount = bookings.filter(isPending).length

  return (
    <AdminShell
      eyebrow="Admin · Assignments"
      title="Assign Operator"
      subtitle={
        loading
          ? "Loading bookings…"
          : pendingCount > 0
            ? `${pendingCount} booking${pendingCount === 1 ? "" : "s"} awaiting an operator — ${operators.length} verified operator${operators.length === 1 ? "" : "s"} available`
            : "No bookings awaiting operator assignment"
      }
    >
      {flash.length > 0 && (
        <p className="mb-4 flex items-center gap-2 rounded-2xl bg-success/10 px-4 py-3 text-sm font-semibold text-success">
          <Check size={16} /> Operator assigned — booking updated.
        </p>
      )}
      {error && (
        <p className="mb-4 rounded-2xl bg-destructive/10 px-4 py-3 text-sm font-semibold text-destructive">
          {error}
        </p>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : bookings.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-[24px] border border-dashed border-border px-6 py-16 text-center">
          <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-3xl bg-bele-green-muted">
            <Users size={34} className="text-primary" strokeWidth={1.5} />
          </div>
          <h2 className="font-heading text-xl font-bold text-primary">No bookings need assignment</h2>
          <p className="mt-2 max-w-[320px] text-sm leading-relaxed text-muted-foreground">
            Bookings that reach OPERATOR_PENDING with an operator required will appear here for you to assign a verified operator.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {bookings.map((booking) => (
            <BookingCard
              key={booking.id}
              booking={booking}
              operators={operators}
              fp={fp}
              onAssigned={handleAssigned}
              showError={showError}
            />
          ))}
        </div>
      )}
    </AdminShell>
  )
}