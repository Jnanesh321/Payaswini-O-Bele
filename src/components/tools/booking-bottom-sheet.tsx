"use client"

import { useState, useMemo, useCallback, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "@/components/providers/session-provider"
import { useLocale, useTranslations } from "next-intl"
import { motion, AnimatePresence } from "framer-motion"
import {
  X,
  ShieldCheck,
  MapPin,
  CheckCircle2,
  Minus,
  Plus,
  ArrowRight,
  Lock,
  Info,
  Loader2,
  Check,
  Navigation,
} from "lucide-react"
import { formatPrice } from "@/lib/utils"
import type { ToolCard as ToolCardType } from "@/types"
import { ShiftSelector, type ShiftType, FARM_SHIFTS } from "./shift-selector"
import { useUserLocation } from "@/hooks/use-user-location"
import { PhoneCompletionModal } from "@/components/auth"

declare global {
  interface Window {
    Razorpay: new (options: Record<string, unknown>) => {
      open: () => void
      on: (event: string, cb: (response: Record<string, unknown>) => void) => void
    }
  }
}

function loadRazorpay(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined") return resolve()
    if (window.Razorpay) return resolve()
    const script = document.createElement("script")
    script.src = "https://checkout.razorpay.com/v1/checkout.js"
    script.async = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error("Failed to load Razorpay SDK"))
    document.body.appendChild(script)
  })
}

export interface BookingBottomSheetProps {
  isOpen: boolean
  onClose: () => void
  tool: {
    id: string
    name: string
    slug?: string
    translations?: Record<string, { name?: string; description?: string }> | null
    pricePerDay: number
    deposit?: number
    requiresCertifiedOperator?: boolean
    operatorFeePerDay?: number
    taluk?: string
    distanceKm?: number
    canSelfOperate?: boolean
    toolOwner?: { name?: string; id?: string } | null
    toolInstanceId?: string
  } | null
  initialServiceType?: "OPERATOR_ONLY" | "SELF_SERVICE_RENTAL"
  onSuccess?: () => void
}

export function BookingBottomSheet({
  isOpen,
  onClose,
  tool,
  initialServiceType,
  onSuccess,
}: BookingBottomSheetProps) {
  const router = useRouter()
  const locale = useLocale()
  const { data: session } = useSession()

  // 1. Operator Option State
  const defaultServiceType: "OPERATOR_ONLY" | "SELF_SERVICE_RENTAL" =
    initialServiceType ||
    (tool?.requiresCertifiedOperator ? "OPERATOR_ONLY" : "SELF_SERVICE_RENTAL")

  const [serviceType, setServiceType] = useState<"OPERATOR_ONLY" | "SELF_SERVICE_RENTAL">(
    defaultServiceType
  )

  // 2. Shift / Slot Duration State
  const [selectedShift, setSelectedShift] = useState<ShiftType>("FULL_DAY")
  const [selectedDayOffset, setSelectedDayOffset] = useState<number>(0) // 0 = Today, 1 = Tomorrow, 2 = Day After
  const [days, setDays] = useState<number>(1)
  const [loading, setLoading] = useState<boolean>(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [showPhoneModal, setShowPhoneModal] = useState<boolean>(false)

  // 3. Fulfillment Delivery Option State ("pickup": ₹0 vs "delivery": ₹50)
  const [deliveryType, setDeliveryType] = useState<"pickup" | "delivery">("pickup")

  // 4. Payment Mode State ("PAY_ON_HANDOVER" vs "ONLINE")
  const [paymentMode, setPaymentMode] = useState<"PAY_ON_HANDOVER" | "ONLINE">("PAY_ON_HANDOVER")

  // Farm GPS location tracking
  const { coords: cachedGps, isLocating: isLocatingGps, detectLocation: detectGpsLocation } = useUserLocation()
  const [pinnedGps, setPinnedGps] = useState<{ latitude: number; longitude: number; accuracy?: number } | null>(null)
  const farmCoords = pinnedGps || cachedGps

  const handlePinFarmGps = async () => {
    try {
      const res = await detectGpsLocation()
      setPinnedGps({
        latitude: res.coords.latitude,
        longitude: res.coords.longitude,
        accuracy: res.coords.accuracy,
      })
    } catch {
      // Ignored
    }
  }

  // Date pill options
  const dateOptions = useMemo(() => {
    const now = new Date()
    return [0, 1, 2].map((offset) => {
      const d = new Date()
      d.setDate(now.getDate() + offset)
      const dayName =
        offset === 0 ? "Today" : offset === 1 ? "Tomorrow" : d.toLocaleDateString("en-IN", { weekday: "short" })
      const dateStr = d.toLocaleDateString("en-IN", { day: "numeric", month: "short" })
      return {
        offset,
        label: `${dayName}, ${dateStr}`,
        date: d,
      }
    })
  }, [])

  // Dynamic pricing calculations (amounts in paise)
  const rawPricePerDay = tool?.pricePerDay || 0
  const pricePerDay = rawPricePerDay > 0 && rawPricePerDay < 1000 ? rawPricePerDay * 100 : rawPricePerDay
  const rawOpFee = tool?.operatorFeePerDay ?? 40000
  const operatorFeePerDay = rawOpFee > 0 && rawOpFee < 1000 ? rawOpFee * 100 : rawOpFee
  const rawDeposit = tool?.deposit ?? 0
  const deposit = rawDeposit > 0 && rawDeposit < 10000 ? rawDeposit * 100 : rawDeposit

  const activeShift = FARM_SHIFTS.find((s) => s.id === selectedShift) || FARM_SHIFTS[2]
  const effectiveMultiplier = selectedShift === "MULTI_DAY" ? days : activeShift.daysMultiplier

  const toolRentalTotal = Math.round(pricePerDay * effectiveMultiplier)
  const isWithOperator = serviceType === "OPERATOR_ONLY"
  const operatorWageTotal = isWithOperator ? Math.round(operatorFeePerDay * effectiveMultiplier) : 0
  const deliveryFee = deliveryType === "delivery" ? 5000 : 0
  const totalBookingValue = toolRentalTotal + operatorWageTotal + deposit + deliveryFee
  const totalPayableUpfront = paymentMode === "PAY_ON_HANDOVER" ? 0 : totalBookingValue

  // Format Helper
  const fp = (paise: number) => formatPrice(paise, locale)

  // Razorpay or Pay-on-Handover Checkout Trigger
  const handleProceedToPay = useCallback(async () => {
    if (!tool) return
    setErrorMessage(null)

    // Check Authentication
    if (!session?.user?.id) {
      const callback = window.location.pathname
      router.push(`/login?callbackUrl=${encodeURIComponent(callback)}`)
      return
    }

    // Check if user has a verified contact phone number for handovers
    const userPhone = session.user.phone
    const hasValidPhone = Boolean(
      userPhone &&
      userPhone.startsWith("91") &&
      userPhone.length === 12 &&
      !userPhone.includes("000000")
    )

    if (session.user.needsPhone || !hasValidPhone) {
      setShowPhoneModal(true)
      return
    }

    setLoading(true)

    try {
      const startDate = new Date()
      startDate.setDate(startDate.getDate() + selectedDayOffset)
      startDate.setHours(selectedShift === "AFTERNOON" ? 13 : 6, 0, 0, 0)

      const durationDays = selectedShift === "MULTI_DAY" ? days : Math.max(1, Math.ceil(activeShift.daysMultiplier))
      const endDate = new Date(startDate)
      endDate.setDate(endDate.getDate() + durationDays)

      const deliveryAddress = farmCoords
        ? `Farm GPS: ${farmCoords.latitude.toFixed(5)}, ${farmCoords.longitude.toFixed(5)} (${tool.taluk || "Local Hub"})`
        : `${tool.taluk || "Kasaragod / Puttur"} Hub Dispatch`

      // ── A. Pay on Handover (UPI / Cash at Pickup) — Instant Booking in OWNER_PENDING ──
      if (paymentMode === "PAY_ON_HANDOVER") {
        const res = await fetch("/api/rentals", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            toolId: tool.id,
            toolInstanceId: (tool as Record<string, unknown>).toolInstanceId,
            serviceType,
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString(),
            deliveryType,
            deliveryAddress,
            paymentMode: "PAY_ON_HANDOVER",
            notes: "Pay on Handover (UPI/Cash at Pickup)",
          }),
        })

        const resData = await res.json()
        if (!res.ok || !resData.success) {
          throw new Error(resData.error || "Failed to create booking")
        }

        const bookingId = resData.data?.id
        onClose()
        if (onSuccess) onSuccess()
        const targetUrl = bookingId ? `/orders/${bookingId}` : "/dashboard"
        router.push(targetUrl)
        return
      }

      // ── B. Pay Online Now (Razorpay Escrow) ──
      await loadRazorpay()

      const res = await fetch("/api/razorpay/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          deliveryType,
          deliveryAddress,
          items: [
            {
              toolId: tool.id,
              toolInstanceId: (tool as Record<string, unknown>).toolInstanceId,
              toolOwnerId: tool.toolOwner?.id,
              serviceType,
              startDate: startDate.toISOString(),
              endDate: endDate.toISOString(),
            },
          ],
        }),
      })

      const resData = await res.json()
      if (!res.ok || !resData.success) {
        throw new Error(resData.error || "Failed to create order")
      }

      const orderPayload = resData.data || resData
      const orderId = orderPayload.orderId || orderPayload.razorpayOrderId
      const key = orderPayload.key || orderPayload.keyId || "rzp_test_placeholder"
      const bookingId = orderPayload.bookingId || orderPayload.bookings?.[0]?.id

      // Mock order checkout handler (when mock gateway enabled)
      if (orderId?.startsWith("order_mock_")) {
        const verifyRes = await fetch("/api/razorpay/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            razorpay_order_id: orderId,
            razorpay_payment_id: `pay_mock_${Date.now()}`,
            razorpay_signature: "mock_signature_dev",
            bookingId,
          }),
        })

        const verifyData = await verifyRes.json()
        if (verifyData.success) {
          onClose()
          if (onSuccess) onSuccess()
          const targetUrl = bookingId ? `/orders/${bookingId}` : "/dashboard"
          router.push(targetUrl)
          return
        } else {
          setErrorMessage(verifyData.error || "Mock payment verification failed. Please try again.")
          setLoading(false)
          return
        }
      }

      // Verify Razorpay SDK loaded successfully
      if (typeof window === "undefined" || !window.Razorpay) {
        setErrorMessage("Payment gateway failed to load. Please check your mobile data connection and try again.")
        setLoading(false)
        return
      }

      // Live / Sandbox Razorpay Modal
      const options = {
        key,
        amount: orderPayload.amount || totalPayableUpfront,
        currency: orderPayload.currency || "INR",
        name: "Payaswini O Bele",
        description: `${tool.name} (${activeShift.labelEn})`,
        order_id: orderId,
        handler: async (response: {
          razorpay_payment_id: string
          razorpay_order_id: string
          razorpay_signature: string
        }) => {
          try {
            const verifyRes = await fetch("/api/razorpay/verify", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_signature: response.razorpay_signature,
                bookingId,
              }),
            })
            const verifyData = await verifyRes.json()
            if (verifyData.success) {
              onClose()
              if (onSuccess) onSuccess()
              const targetUrl = bookingId ? `/orders/${bookingId}` : "/dashboard"
              router.push(targetUrl)
            } else {
              setErrorMessage(verifyData.error || "Payment verification failed")
            }
          } catch {
            setErrorMessage("Payment verification error")
          }
        },
        prefill: {
          name: session.user.name || undefined,
          email: session.user.email || undefined,
        },
        theme: {
          color: "#2D5016",
        },
        modal: {
          ondismiss: () => {
            setLoading(false)
          },
        },
      }

      const rzp = new window.Razorpay(options)
      rzp.open()
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : "Booking initialization failed")
      setLoading(false)
    }
  }, [
    tool,
    session,
    selectedDayOffset,
    days,
    serviceType,
    deliveryType,
    paymentMode,
    totalPayableUpfront,
    totalBookingValue,
    farmCoords,
    activeShift,
    router,
    onClose,
    onSuccess,
  ])

  if (!tool) return null

  const ownerName = tool.toolOwner?.name || "Mahabaleshwara Bhat"
  const locationTaluk = tool.taluk || "Badiadka"
  const distanceKm = tool.distanceKm || 3.8

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-xs p-0 sm:items-center sm:p-4">
          {/* Backdrop Tap to Close */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0"
          />

          {/* Modal Bottom Sheet */}
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 300 }}
            className="relative z-10 flex max-h-[85vh] w-full max-w-[420px] flex-col rounded-t-3xl sm:rounded-2xl border border-[#E5E7EB] bg-[#FFFFFF] shadow-2xl overflow-hidden pb-safe text-[#1C1C16]"
          >
            {/* ── Drag Handle ──────────────────────────────────── */}
            <div className="mx-auto mt-2.5 h-1.5 w-12 rounded-full bg-[#E5E7EB] sm:hidden" />

            {/* ── Header ───────────────────────────────────────── */}
            <div className="flex items-start justify-between border-b border-[#E5E7EB] px-5 py-3.5">
              <div>
                <h2 className="font-display text-base font-bold text-[#1C1C16] leading-snug line-clamp-1">
                  {tool.name}
                </h2>
                <div className="mt-1 flex items-center gap-2 text-xs text-[#6B7280]">
                  <span className="flex items-center gap-1 font-medium text-[#1C1C16]">
                    <span>{ownerName}</span>
                    <CheckCircle2 size={13} className="text-[#2D5016] fill-[#2D5016]/20" />
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-0.5">
                    <MapPin size={12} className="text-[#8B4513]" />
                    <span>
                      {locationTaluk} ({distanceKm} km)
                    </span>
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#FAF7F0] text-[#6B7280] hover:bg-[#E5E7EB] transition-colors"
                aria-label="Close"
              >
                <X size={17} />
              </button>
            </div>

            {/* ── Scrollable Sheet Body ────────────────────────── */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
              
              {/* Error Callout (if any) */}
              {errorMessage && (
                <div className="rounded-xl border border-red-300 bg-red-50 p-3 text-xs text-red-700">
                  {errorMessage}
                </div>
              )}

              {/* ── Section 1: Operator Selection ───────────────── */}
              <div className="space-y-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#8B4513]">
                  OPERATOR OPTION
                </span>

                <div className="space-y-2.5">
                  {/* Option A: With Operator */}
                  <label
                    onClick={() => setServiceType("OPERATOR_ONLY")}
                    className={`flex cursor-pointer items-start justify-between rounded-2xl border p-3.5 transition-all ${
                      isWithOperator
                        ? "border-[#2D5016] bg-[#2D5016]/5 ring-1 ring-[#2D5016]"
                        : "border-[#E5E7EB] bg-[#FAF7F0]/60 hover:bg-[#FAF7F0]"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
                          isWithOperator
                            ? "border-[#2D5016] bg-[#2D5016] text-white"
                            : "border-[#D1D5DB] bg-white"
                        }`}
                      >
                        {isWithOperator && <Check size={12} strokeWidth={3} />}
                      </div>

                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-display text-xs font-bold text-[#1C1C16]">
                            With Certified Operator
                          </span>
                          <span className="rounded-full bg-[#2D5016]/10 px-2 py-0.5 text-[10px] font-bold text-[#2D5016]">
                            Recommended
                          </span>
                        </div>
                        <p className="mt-0.5 text-[11px] text-[#6B7280] leading-tight">
                          Trained field operator handles machinery, transport, and work. Automatically dispatched by O~Bele for your taluk upon booking.
                        </p>
                      </div>
                    </div>

                    <span className="shrink-0 text-[11px] font-bold text-[#8B4513]">
                      +{fp(operatorFeePerDay)}/d
                    </span>
                  </label>

                  {/* Option B: Self-Operate */}
                  <label
                    onClick={() => {
                      if (!tool.requiresCertifiedOperator || tool.canSelfOperate !== false) {
                        setServiceType("SELF_SERVICE_RENTAL")
                      }
                    }}
                    className={`flex cursor-pointer items-start justify-between rounded-2xl border p-3.5 transition-all ${
                      !isWithOperator
                        ? "border-[#2D5016] bg-[#2D5016]/5 ring-1 ring-[#2D5016]"
                        : "border-[#E5E7EB] bg-[#FAF7F0]/60 hover:bg-[#FAF7F0]"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
                          !isWithOperator
                            ? "border-[#2D5016] bg-[#2D5016] text-white"
                            : "border-[#D1D5DB] bg-white"
                        }`}
                      >
                        {!isWithOperator && <Check size={12} strokeWidth={3} />}
                      </div>

                      <div>
                        <span className="font-display text-xs font-bold text-[#1C1C16]">
                          Self-Operate (Machine Only)
                        </span>
                        <p className="mt-0.5 text-[11px] text-[#6B7280] leading-tight">
                          Requires verified owner certification or operator license.
                        </p>
                      </div>
                    </div>

                    <span className="shrink-0 text-[11px] font-medium text-[#6B7280]">
                      No extra fee
                    </span>
                  </label>
                </div>
              </div>

              {/* ── Section 2: Rental Date & Shift Selection ───── */}
              <div className="space-y-3">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#8B4513]">
                  1. RENTAL DATE
                </span>

                {/* Date Picker Horizontal Pills */}
                <div className="grid grid-cols-3 gap-2">
                  {dateOptions.map((opt) => {
                    const isSelected = selectedDayOffset === opt.offset
                    return (
                      <button
                        key={opt.offset}
                        type="button"
                        onClick={() => setSelectedDayOffset(opt.offset)}
                        className={`rounded-xl border py-2 px-1 text-center text-xs font-bold transition-all ${
                          isSelected
                            ? "border-[#2D5016] bg-[#2D5016] text-white shadow-xs"
                            : "border-[#E5E7EB] bg-[#FAF7F0] text-[#6B7280] hover:text-[#1C1C16]"
                        }`}
                      >
                        {opt.label}
                      </button>
                    )
                  })}
                </div>

                {/* Farm Shift Selector (Instamart Quick-Commerce Style) */}
                <ShiftSelector
                  selectedShift={selectedShift}
                  onSelectShift={(s) => setSelectedShift(s)}
                  baseDailyRatePaise={pricePerDay}
                  locale={locale}
                />

                {/* Day Stepper (Only active if MULTI_DAY is chosen) */}
                {selectedShift === "MULTI_DAY" && (
                  <div className="flex items-center justify-between rounded-2xl border border-[#E5E7EB] bg-[#FAF7F0] p-3">
                    <div className="flex flex-col">
                      <span className="text-[10px] font-bold uppercase text-[#6B7280]">
                        Rental Duration
                      </span>
                      <span className="font-display text-xs font-bold text-[#1C1C16]">
                        {days} {days === 1 ? "Day" : `Days (${days * 8} Hours)`}
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        disabled={days <= 2}
                        onClick={() => setDays((d) => Math.max(2, d - 1))}
                        className="flex h-8 w-8 items-center justify-center rounded-xl bg-white border border-[#E5E7EB] text-[#1C1C16] shadow-2xs hover:bg-muted disabled:opacity-40 transition"
                        aria-label="Decrease days"
                      >
                        <Minus size={15} />
                      </button>

                      <span className="w-5 text-center font-display text-sm font-bold text-[#1C1C16]">
                        {days}
                      </span>

                      <button
                        type="button"
                        disabled={days >= 14}
                        onClick={() => setDays((d) => Math.min(14, d + 1))}
                        className="flex h-8 w-8 items-center justify-center rounded-xl bg-white border border-[#E5E7EB] text-[#1C1C16] shadow-2xs hover:bg-muted disabled:opacity-40 transition"
                        aria-label="Increase days"
                      >
                        <Plus size={15} />
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* ── Section 2.5: Farm GPS Location Pin ── */}
              <div className="space-y-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#8B4513]">
                  2. FARM GATE LOCATION (GPS)
                </span>
                <div className="rounded-2xl border border-[#E5E7EB] bg-white p-3.5 space-y-2 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#2D5016]/10 text-[#2D5016]">
                        <Navigation size={18} />
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <p className="font-display text-xs font-bold text-[#1C1C16]">
                            {farmCoords ? "Farm Location Pinned" : "Pin Farm Gate Coordinates"}
                          </p>
                          {farmCoords && (
                            <span className="rounded bg-emerald-100 text-emerald-800 text-[9px] font-extrabold px-1.5 py-0.2">
                              GPS Active
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-[#6B7280] leading-tight mt-0.5">
                          {farmCoords
                            ? `Lat: ${farmCoords.latitude.toFixed(4)}°, Lng: ${farmCoords.longitude.toFixed(4)}° • Precision ${farmCoords.accuracy ?? 15}m`
                            : "Share GPS coordinates so operator reaches your exact farm gate"}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handlePinFarmGps}
                      disabled={isLocatingGps}
                      className="shrink-0 px-3 py-1.5 rounded-xl border border-[#2D5016]/40 bg-[#2D5016]/10 text-[#2D5016] text-xs font-bold hover:bg-[#2D5016] hover:text-white transition flex items-center gap-1 active:scale-95 disabled:opacity-50"
                    >
                      {isLocatingGps ? (
                        <Loader2 size={13} className="animate-spin" />
                      ) : farmCoords ? (
                        <>
                          <Check size={13} strokeWidth={2.5} />
                          <span>Pinned</span>
                        </>
                      ) : (
                        <>
                          <Navigation size={13} />
                          <span>Use GPS</span>
                        </>
                      )}
                    </button>
                  </div>

                  {farmCoords && (
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${farmCoords.latitude},${farmCoords.longitude}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[10px] font-semibold text-[#2D5016] hover:underline"
                    >
                      <span>📍 View Pinned Location in Google Maps ↗</span>
                    </a>
                  )}
                </div>
              </div>

              {/* ── Section 3: Fulfillment / Delivery Method ───── */}
              <div className="space-y-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#8B4513]">
                  3. FULFILLMENT METHOD
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setDeliveryType("pickup")}
                    className={`rounded-2xl border p-3 text-left transition-all cursor-pointer ${
                      deliveryType === "pickup"
                        ? "border-[#2D5016] bg-[#2D5016]/5 ring-1 ring-[#2D5016]"
                        : "border-[#E5E7EB] bg-[#FAF7F0] hover:bg-[#FAF7F0]/80"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-display text-xs font-bold text-[#1C1C16]">Pickup from Owner</span>
                      <span className="rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-extrabold px-1.5 py-0.2">
                        ₹0
                      </span>
                    </div>
                    <p className="mt-1 text-[10px] text-[#6B7280] leading-tight">
                      Collect directly from {locationTaluk} hub
                    </p>
                    <span className="mt-2 block text-xs font-bold text-[#2D5016]">FREE (₹0)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setDeliveryType("delivery")}
                    className={`rounded-2xl border p-3 text-left transition-all cursor-pointer ${
                      deliveryType === "delivery"
                        ? "border-[#2D5016] bg-[#2D5016]/5 ring-1 ring-[#2D5016]"
                        : "border-[#E5E7EB] bg-[#FAF7F0] hover:bg-[#FAF7F0]/80"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-display text-xs font-bold text-[#1C1C16]">Home / Farm Delivery</span>
                      <span className="text-[10px] font-bold text-[#8B4513]">+₹50</span>
                    </div>
                    <p className="mt-1 text-[10px] text-[#6B7280] leading-tight">
                      Delivered to your pinned farm gate
                    </p>
                    <span className="mt-2 block text-xs font-bold text-[#8B4513]">₹50</span>
                  </button>
                </div>
              </div>

              {/* ── Section 4: Payment Method Toggle ─────────────── */}
              <div className="space-y-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#8B4513]">
                  4. PAYMENT METHOD
                </span>
                <div className="space-y-2.5">
                  {/* Option A: Pay on Handover */}
                  <div
                    onClick={() => setPaymentMode("PAY_ON_HANDOVER")}
                    className={`flex cursor-pointer items-start justify-between rounded-2xl border p-3.5 transition-all ${
                      paymentMode === "PAY_ON_HANDOVER"
                        ? "border-[#2D5016] bg-[#2D5016]/5 ring-1 ring-[#2D5016]"
                        : "border-[#E5E7EB] bg-[#FAF7F0]/60 hover:bg-[#FAF7F0]"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
                          paymentMode === "PAY_ON_HANDOVER"
                            ? "border-[#2D5016] bg-[#2D5016] text-white"
                            : "border-[#D1D5DB] bg-white"
                        }`}
                      >
                        {paymentMode === "PAY_ON_HANDOVER" && <Check size={12} strokeWidth={3} />}
                      </div>

                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-display text-xs font-bold text-[#1C1C16]">
                            Pay on Handover (UPI / Cash)
                          </span>
                          <span className="rounded-full bg-emerald-100 text-emerald-800 px-2 py-0.5 text-[10px] font-bold">
                            Trusted Neighbor
                          </span>
                        </div>
                        <p className="mt-0.5 text-[11px] text-[#6B7280] leading-tight">
                          Inspect machine first. Pay owner directly on handover. ₹0 charged today.
                        </p>
                      </div>
                    </div>

                    <span className="shrink-0 text-[11px] font-bold text-emerald-700">
                      ₹0 online
                    </span>
                  </div>

                  {/* Option B: Pay Online Now */}
                  <div
                    onClick={() => setPaymentMode("ONLINE")}
                    className={`flex cursor-pointer items-start justify-between rounded-2xl border p-3.5 transition-all ${
                      paymentMode === "ONLINE"
                        ? "border-[#2D5016] bg-[#2D5016]/5 ring-1 ring-[#2D5016]"
                        : "border-[#E5E7EB] bg-[#FAF7F0]/60 hover:bg-[#FAF7F0]"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
                          paymentMode === "ONLINE"
                            ? "border-[#2D5016] bg-[#2D5016] text-white"
                            : "border-[#D1D5DB] bg-white"
                        }`}
                      >
                        {paymentMode === "ONLINE" && <Check size={12} strokeWidth={3} />}
                      </div>

                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-display text-xs font-bold text-[#1C1C16]">
                            Pay Online Now (Razorpay Escrow)
                          </span>
                          <span className="rounded-full bg-amber-100 text-amber-800 px-2 py-0.5 text-[10px] font-bold">
                            Escrow Hold
                          </span>
                        </div>
                        <p className="mt-0.5 text-[11px] text-[#6B7280] leading-tight">
                          Pre-authorize via UPI. Deposit held safely in escrow until return.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* ── Section 5: Pricing Breakdown & Guarantee ─────── */}
              <div className="rounded-2xl border border-[#E5E7EB] bg-[#FAF7F0] p-4 space-y-2.5">
                {/* Guarantee Pill */}
                {paymentMode === "PAY_ON_HANDOVER" ? (
                  <div className="flex items-start gap-2 rounded-xl border border-emerald-500/30 bg-emerald-50/60 dark:bg-emerald-950/20 p-2.5 text-xs text-emerald-800 dark:text-emerald-300">
                    <ShieldCheck size={16} className="text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold">Cohort Zero Trust Guarantee</p>
                      <p className="text-[10px] text-muted-foreground leading-tight mt-0.5">
                        Booking dispatches immediately for owner confirmation. Settle payment via UPI or cash directly at handover.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start gap-2 rounded-xl border border-emerald-500/30 bg-emerald-50/60 dark:bg-emerald-950/20 p-2.5 text-xs text-emerald-800 dark:text-emerald-300">
                    <ShieldCheck size={16} className="text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold">Zero Cash Lock • UPI Pre-Authorization</p>
                      <p className="text-[10px] text-muted-foreground leading-tight mt-0.5">
                        No cash is debited for deposit today. A temporary hold is placed on UPI and auto-released upon tool return.
                      </p>
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between text-xs text-[#1C1C16] pt-1">
                  <span className="text-[#6B7280]">
                    Equipment ({activeShift.labelEn})
                  </span>
                  <span className="font-semibold">{fp(toolRentalTotal)}</span>
                </div>

                {isWithOperator && (
                  <div className="flex items-center justify-between text-xs text-[#1C1C16]">
                    <span className="text-[#6B7280]">
                      Certified Operator ({activeShift.labelEn})
                    </span>
                    <span className="font-semibold">{fp(operatorWageTotal)}</span>
                  </div>
                )}

                <div className="flex items-center justify-between text-xs text-[#1C1C16]">
                  <div className="flex items-center gap-1 text-[#6B7280]">
                    <span>Refundable Deposit (Hold)</span>
                    <Info size={13} className="text-[#D4A017]" />
                  </div>
                  <span className="font-semibold">{fp(deposit)}</span>
                </div>

                <div className="flex items-center justify-between text-xs text-[#1C1C16]">
                  <span className="text-[#6B7280]">
                    Fulfillment ({deliveryType === "delivery" ? "Home Delivery" : "Pickup from Owner"})
                  </span>
                  <span className="font-semibold">
                    {deliveryType === "delivery" ? fp(deliveryFee) : "FREE (₹0)"}
                  </span>
                </div>

                <div className="pt-2 border-t border-[#E5E7EB]/80 flex items-baseline justify-between">
                  <div>
                    <span className="font-display text-sm font-bold text-[#1C1C16]">
                      Payable Now
                    </span>
                    <p className="text-[10px] text-[#2D5016] font-medium">
                      {paymentMode === "PAY_ON_HANDOVER"
                        ? `* ${fp(totalBookingValue)} payable on handover`
                        : "* Includes operator, fuel & deposit hold"}
                    </p>
                  </div>

                  <span className="font-display text-lg font-extrabold text-[#2D5016]">
                    {fp(totalPayableUpfront)}
                  </span>
                </div>
              </div>
            </div>

            {/* ── Section 6: Bottom CTA Footer ─────────────────── */}
            <div className="border-t border-[#E5E7EB] p-4 space-y-2 bg-[#FFFFFF]">
              <button
                type="button"
                disabled={loading}
                onClick={handleProceedToPay}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#8B4513] hover:bg-[#74380D] active:scale-[0.98] py-3.5 text-sm font-medium text-white shadow-md transition disabled:opacity-60 cursor-pointer"
              >
                {loading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Processing Booking…</span>
                  </>
                ) : paymentMode === "PAY_ON_HANDOVER" ? (
                  <span>Confirm Booking (Pay on Handover) →</span>
                ) : (
                  <span>Proceed to Pay {fp(totalPayableUpfront)} via UPI →</span>
                )}
              </button>

              <div className="flex items-center justify-center gap-1.5 text-[11px] text-[#6B7280]">
                {paymentMode === "PAY_ON_HANDOVER" ? (
                  <span>🤝 Trusted Neighbor: No online fee charged now. Handover directly with owner.</span>
                ) : (
                  <span>🔒 Deposit held safely in escrow until return</span>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      )}
      {/* ── One-Time Phone Number Completion Prompt ── */}
      <PhoneCompletionModal
        isOpen={showPhoneModal}
        onClose={() => setShowPhoneModal(false)}
        onSuccess={() => {
          setShowPhoneModal(false)
          handleProceedToPay()
        }}
        canDismiss
      />
    </AnimatePresence>
  )
}
