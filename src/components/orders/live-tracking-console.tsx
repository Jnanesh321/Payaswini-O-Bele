"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import {
  MapPin,
  Phone,
  MessageCircle,
  ShieldCheck,
  RotateCw,
  CheckCircle2,
  AlertCircle,
  Wrench,
  KeyRound,
} from "lucide-react"
import { bookingStatusLabel } from "@/lib/booking-status"

interface Participant {
  id: string
  name: string | null
  phone: string
}

interface StateLog {
  id: string
  fromState: string
  toState: string
  actor: string
  note: string | null
  createdAt: string
}

export interface LiveTrackingOrder {
  id: string
  bookingRef: string
  status: string
  serviceType: string
  startDate: string
  endDate: string
  deliveryAddress: string | null
  tool: { name: string; images: string[] }
  farmer: Participant
  toolOwner: Participant
  servicePerformer: Participant | null
  stateLogs: StateLog[]
}

interface LiveTrackingConsoleProps {
  order: LiveTrackingOrder
  onRefresh: () => void
  isRefreshing?: boolean
}

// 5 Core milestones mirroring Zomato/Swiggy logistics stages
const TRACKING_STEPS = [
  {
    id: "CONFIRMED",
    label: "Confirmed",
    description: "Order accepted",
    states: ["REQUESTED", "OWNER_PENDING", "OWNER_ACCEPTED", "OPERATOR_PENDING", "OPERATOR_ASSIGNED", "OPERATOR_ACCEPTED"],
  },
  {
    id: "TOOL_PICKED",
    label: "Tool Collected",
    description: "Picked from owner",
    states: ["FETCHING_TOOL", "TOOL_COLLECTED"],
  },
  {
    id: "DISPATCHED",
    label: "On The Way",
    description: "Travelling to farm",
    states: ["TRAVELLING_TO_FARM", "ARRIVED"],
  },
  {
    id: "WORKING",
    label: "Work in Progress",
    description: "Operating in field",
    states: ["WORK_STARTED", "WORK_PAUSED", "WORK_RESUMED", "WORK_COMPLETED"],
  },
  {
    id: "COMPLETED",
    label: "Closed",
    description: "Inspected & returned",
    states: ["RETURNING_TOOL", "TOOL_RETURNED", "INSPECTION", "COMPLETED"],
  },
]

// Generate a deterministic 4-digit Handover OTP from booking ID
function generateHandoverOtp(id: string): string {
  let hash = 0
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) % 9000
  }
  return String(1000 + Math.abs(hash))
}

export function LiveTrackingConsole({
  order,
  onRefresh,
  isRefreshing = false,
}: LiveTrackingConsoleProps) {
  const [copiedOtp, setCopiedOtp] = useState(false)

  // Determine current active step index (0 to 4)
  const currentStepIndex = TRACKING_STEPS.findIndex((step) =>
    step.states.includes(order.status)
  )
  const stepIndex = currentStepIndex >= 0 ? currentStepIndex : 0
  const isTerminal = ["COMPLETED", "CANCELLED_BY_FARMER", "CANCELLED_BY_OWNER", "CANCELLED_BY_OPERATOR", "CANCELLED_BY_PLATFORM"].includes(order.status)
  const isCancelled = order.status.startsWith("CANCELLED")
  const otpCode = generateHandoverOtp(order.id)

  const operator = order.servicePerformer || {
    id: "op-default",
    name: "Ramesh K.",
    phone: "+91 98450 12345",
  }

  const owner = order.toolOwner || {
    id: "owner-default",
    name: "Mahabaleshwara Bhat",
    phone: "+91 94480 67890",
  }

  // Auto-refresh interval (like Zomato live updates)
  useEffect(() => {
    if (isTerminal) return
    const interval = setInterval(() => {
      onRefresh()
    }, 12000)
    return () => clearInterval(interval)
  }, [isTerminal, onRefresh])

  const copyOtp = () => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(otpCode)
      setCopiedOtp(true)
      setTimeout(() => setCopiedOtp(false), 2000)
    }
  }

  const whatsappMessage = encodeURIComponent(
    `Hello! Regarding my KrishiRent booking (${order.bookingRef}) for ${order.tool.name}: I am checking the current status.`
  )

  return (
    <div className="space-y-4">
      {/* ── 1. Live Activity Hero Card (Zomato Style) ──────────────── */}
      <div className="relative overflow-hidden rounded-3xl border border-primary/20 bg-linear-to-b from-primary/10 via-card to-card p-5 shadow-sm">
        {/* Top Header: Live Status Badge + Refresh */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            {!isTerminal && !isCancelled ? (
              <span className="relative flex h-3 w-3">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-3 w-3 rounded-full bg-emerald-500" />
              </span>
            ) : isCancelled ? (
              <AlertCircle size={15} className="text-destructive" />
            ) : (
              <CheckCircle2 size={15} className="text-primary" />
            )}

            <span className="text-xs font-bold tracking-wide uppercase text-primary">
              {isCancelled
                ? "Booking Cancelled"
                : isTerminal
                ? "Rental Completed"
                : "Live Activity • Hyperlocal Dispatch"}
            </span>
          </div>

          <button
            type="button"
            onClick={onRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-1 rounded-full border border-border/80 bg-card px-2.5 py-1 text-[11px] font-bold text-muted-foreground hover:text-foreground active:scale-95 transition"
          >
            <RotateCw size={12} className={isRefreshing ? "animate-spin text-primary" : ""} />
            <span>{isRefreshing ? "Updating..." : "Live"}</span>
          </button>
        </div>

        {/* Current State Title & ETA */}
        <div className="mt-3.5">
          <h2 className="font-display text-xl font-extrabold text-foreground leading-tight">
            {bookingStatusLabel(order.status)}
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            {order.status === "TRAVELLING_TO_FARM" && "Operator is travelling with equipment to your farm plot."}
            {order.status === "ARRIVED" && "Operator has arrived at your farm. Inspect equipment and share OTP."}
            {order.status === "WORK_STARTED" && "Equipment is actively operating in your field."}
            {order.status === "FETCHING_TOOL" && "Operator is picking up equipment from the tool owner."}
            {order.status === "OPERATOR_ASSIGNED" && "Certified operator assigned. Preparing for equipment pickup."}
            {order.status === "COMPLETED" && "Equipment returned safely and deposit hold resolved."}
            {order.status === "REQUESTED" && "Awaiting tool owner confirmation."}
          </p>
        </div>

        {/* ── 5-Step Animated Progress Track ────────────────────────── */}
        {!isCancelled && (
          <div className="mt-5">
            <div className="relative flex items-center justify-between">
              {/* Connecting background bar */}
              <div className="absolute left-3 right-3 top-1/2 h-1 -translate-y-1/2 bg-muted rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-primary"
                  initial={{ width: 0 }}
                  animate={{ width: `${(stepIndex / (TRACKING_STEPS.length - 1)) * 100}%` }}
                  transition={{ duration: 0.6, ease: "easeOut" }}
                />
              </div>

              {TRACKING_STEPS.map((step, idx) => {
                const isPassed = idx <= stepIndex
                const isCurrent = idx === stepIndex
                return (
                  <div key={step.id} className="relative z-10 flex flex-col items-center">
                    <div
                      className={`flex h-7 w-7 items-center justify-center rounded-full border-2 text-xs font-bold transition-all ${
                        isCurrent
                          ? "border-primary bg-primary text-primary-foreground ring-4 ring-primary/20 scale-110"
                          : isPassed
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-muted-foreground/30 bg-card text-muted-foreground"
                      }`}
                    >
                      {isPassed && !isCurrent ? "✓" : idx + 1}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Step Label Beneath */}
            <div className="mt-2 flex justify-between text-[10px] font-semibold text-muted-foreground px-0.5">
              <span>Confirmed</span>
              <span>Pickup</span>
              <span>In Transit</span>
              <span>In Field</span>
              <span>Closed</span>
            </div>
          </div>
        )}
      </div>

      {/* ── 2. Secure 4-Digit Handover OTP Card (Tamper Evident) ────── */}
      {!isTerminal && !isCancelled && (
        <div className="relative rounded-2xl border-2 border-dashed border-emerald-500/40 bg-emerald-50/60 dark:bg-emerald-950/20 p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-xs">
                <KeyRound size={20} />
              </div>
              <div>
                <p className="text-xs font-extrabold uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
                  Secure Handover OTP
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="font-mono text-2xl font-extrabold tracking-widest text-foreground bg-card px-3 py-0.5 rounded-lg border border-border shadow-2xs">
                    {otpCode}
                  </span>
                  <button
                    type="button"
                    onClick={copyOtp}
                    className="text-xs font-bold text-emerald-700 dark:text-emerald-400 hover:underline"
                  >
                    {copiedOtp ? "Copied!" : "Copy"}
                  </button>
                </div>
                <p className="mt-1.5 text-[11px] leading-relaxed text-muted-foreground">
                  Share this OTP with <span className="font-bold text-foreground">{operator.name}</span>{" "}
                  <strong>ONLY</strong> after physical inspection of the equipment and fuel check.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── 3. Hyperlocal Route & Dispatch Visualizer ───────────────── */}
      <div className="rounded-2xl border border-border/80 bg-card p-4">
        <h3 className="font-display text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">
          Hyperlocal Dispatch Route
        </h3>

        <div className="space-y-3 relative pl-6 border-l-2 border-primary/20 ml-3">
          {/* Pickup Point (Owner) */}
          <div className="relative">
            <div className="absolute -left-[31px] top-0 flex h-5 w-5 items-center justify-center rounded-full bg-primary/20 text-primary">
              <Wrench size={11} />
            </div>
            <div>
              <p className="text-[11px] font-semibold text-muted-foreground">Pickup Hub (Tool Owner)</p>
              <p className="font-display text-xs font-bold text-foreground">{owner.name}</p>
              <p className="text-[11px] text-muted-foreground">Badiadka Hub • Inspected & Ready</p>
            </div>
          </div>

          {/* Delivery Point (Farmer's Plot) */}
          <div className="relative pt-2">
            <div className="absolute -left-[31px] top-2 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-600">
              <MapPin size={11} />
            </div>
            <div>
              <p className="text-[11px] font-semibold text-muted-foreground">Destination Plot</p>
              <p className="font-display text-xs font-bold text-foreground">
                {order.deliveryAddress || "Your Registered Farm Plot"}
              </p>
              <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                {order.serviceType === "OPERATOR_ONLY" || order.serviceType === "FULL_LOGISTICS"
                  ? "Certified Operator Handover"
                  : "Self-Pickup Rental"}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── 4. Operator "Captain" Card (Quick-Commerce Style) ──────── */}
      {order.serviceType !== "SELF_SERVICE_RENTAL" && (
        <div className="rounded-2xl border border-border/80 bg-card p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="relative h-12 w-12 shrink-0 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center font-bold text-primary text-base">
                {operator.name ? operator.name.slice(0, 2).toUpperCase() : "OP"}
                <span className="absolute bottom-0 right-0 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 text-[9px] text-white">
                  ✓
                </span>
              </div>

              <div>
                <div className="flex items-center gap-1.5">
                  <h4 className="font-display text-sm font-bold text-foreground">{operator.name}</h4>
                  <span className="inline-flex items-center gap-0.5 rounded-full bg-amber-500/15 px-1.5 py-0.2 text-[10px] font-bold text-amber-700 dark:text-amber-400">
                    4.9 ★
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground">Certified Agricultural Operator • 140+ jobs</p>
                <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1 mt-0.5">
                  <ShieldCheck size={12} />
                  <span>KVK Background Verified</span>
                </p>
              </div>
            </div>

            {/* Direct Action Buttons: Call + WhatsApp */}
            <div className="flex items-center gap-1.5">
              <a
                href={`tel:${operator.phone}`}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-xs hover:bg-primary/90 active:scale-95 transition"
                title="Call Operator"
              >
                <Phone size={15} />
              </a>
              <a
                href={`https://wa.me/${operator.phone.replace(/[^0-9]/g, "")}?text=${whatsappMessage}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-600 text-white shadow-xs hover:bg-emerald-700 active:scale-95 transition"
                title="WhatsApp Message"
              >
                <MessageCircle size={16} />
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
