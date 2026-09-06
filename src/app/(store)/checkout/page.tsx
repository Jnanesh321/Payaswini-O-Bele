"use client"

import { useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { MapPin, Truck, ShieldCheck, Loader2, CreditCard, IndianRupee } from "lucide-react"
import { useCartStore } from "@/store/cart"
import { formatPrice } from "@/lib/utils"
import { useLocale } from "next-intl"
import { FarmerShell } from "@/components/layout/farmer-shell"

declare global {
  interface Window {
    Razorpay: new (options: Record<string, unknown>) => { open: () => void; on: (event: string, cb: (response: Record<string, unknown>) => void) => void }
  }
}

function loadRazorpay(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.Razorpay) return resolve()
    const script = document.createElement("script")
    script.src = "https://checkout.razorpay.com/v1/checkout.js"
    script.async = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error("Failed to load Razorpay SDK"))
    document.body.appendChild(script)
  })
}

export default function CheckoutPage() {
  const router = useRouter()
  const locale = useLocale()
  const fp = (n: number) => formatPrice(n, locale)
  const { items, getSubtotal, getTotalDeposit, getTotalOperatorFee, getGrandTotal, clearCart } = useCartStore()
  const [loading, setLoading] = useState(false)
  const [deliveryType, setDeliveryType] = useState<"pickup" | "delivery">("delivery")
  const deliveryDisplayFee = deliveryType === "delivery" ? 5000 : 0
  const payTotal = getGrandTotal() + deliveryDisplayFee
  const [address, setAddress] = useState({
    line1: "",
    line2: "",
    city: "",
    pincode: "",
    phone: "",
  })

  const handlePayment = useCallback(async () => {
    setLoading(true)
    try {
      await loadRazorpay()

      const res = await fetch("/api/razorpay/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          deliveryType,
          address: deliveryType === "delivery" ? address : undefined,
          items: items.map((i) => ({
            toolId: i.toolId,
            days: i.days,
            startDate: i.startDate,
            endDate: i.endDate,
            serviceType: i.serviceType,
          })),
        }),
      })

      const resData = await res.json()
      if (!res.ok || !resData.success) {
        alert(resData.error || "Failed to create order")
        setLoading(false)
        return
      }

      const orderPayload = resData.data || resData
      const orderId = orderPayload.orderId
      const key = orderPayload.key || orderPayload.keyId || "rzp_test_placeholder"
      const bookingId = orderPayload.bookingId || orderPayload.bookingIds?.[0]

      // If mock payment mode or dev order
      if (typeof window === "undefined" || !window.Razorpay || orderId?.startsWith("order_mock_")) {
        // Automatically verify mock payment in dev
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
        if (verifyData.success || process.env.NODE_ENV !== "production") {
          clearCart()
          router.push(`/dashboard`)
          return
        }
      }

      const options = {
        key,
        amount: orderPayload.amount,
        currency: orderPayload.currency || "INR",
        name: "Payaswini O Bele",
        description: `Farm Tool Rental — ${items.length} tool(s)`,
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
                ...response,
                bookingId,
              }),
            })
            const verifyData = await verifyRes.json()
            if (verifyData.success) {
              clearCart()
              router.push(`/dashboard`)
            } else {
              alert("Payment verification failed: " + (verifyData.error || "Unknown error"))
            }
          } catch {
            alert("Payment verification failed. Please contact support.")
          }
        },
        prefill: {
          contact: address.phone || "",
        },
        theme: {
          color: "#2D5016",
        },
      }

      const razorpay = new window.Razorpay(options)
      razorpay.on("payment.failed", (response: Record<string, unknown>) => {
        const err = response.error as { description?: string } | undefined
        alert("Payment failed: " + (err?.description || "Unknown error"))
        setLoading(false)
      })

      razorpay.open()
    } catch (err) {
      console.error("Payment error:", err)
      setLoading(false)
    }
  }, [items, deliveryType, address, router, clearCart])

  if (items.length === 0) {
    router.push("/cart")
    return null
  }

  return (
    <FarmerShell
      eyebrow="Checkout"
      title="Confirm Booking"
      subtitle="Select fulfillment method & complete payment"
    >
      <div className="flex flex-col gap-4">
        {/* ── Fulfillment Method ────────────────────────────── */}
        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
          <h3 className="font-display text-xs font-bold text-foreground mb-2.5 flex items-center gap-1.5">
            <Truck size={14} className="text-primary" /> Delivery Method
          </h3>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setDeliveryType("pickup")}
              className={`rounded-xl border p-3 text-center transition ${
                deliveryType === "pickup"
                  ? "border-primary bg-primary/10 text-primary font-bold"
                  : "border-border bg-card text-muted-foreground"
              }`}
            >
              <MapPin size={18} className="mx-auto mb-1" />
              <div className="text-xs">Self Pickup</div>
              <div className="text-[10px] text-muted-foreground">Free from Hub</div>
            </button>
            <button
              type="button"
              onClick={() => setDeliveryType("delivery")}
              className={`rounded-xl border p-3 text-center transition ${
                deliveryType === "delivery"
                  ? "border-primary bg-primary/10 text-primary font-bold"
                  : "border-border bg-card text-muted-foreground"
              }`}
            >
              <Truck size={18} className="mx-auto mb-1" />
              <div className="text-xs">Farm Delivery</div>
              <div className="text-[10px] text-muted-foreground">₹50 flat co-op fee</div>
            </button>
          </div>
        </div>

        {/* ── Delivery Address (if Delivery selected) ───────── */}
        {deliveryType === "delivery" && (
          <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
            <h3 className="font-display text-xs font-bold text-foreground mb-2.5 flex items-center gap-1.5">
              <MapPin size={14} className="text-primary" /> Farm Delivery Address
            </h3>
            <div className="space-y-2 text-xs">
              <input
                placeholder="House / Farm Name / Landmark"
                value={address.line1}
                onChange={(e) => setAddress({ ...address, line1: e.target.value })}
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs focus:border-primary focus:outline-none"
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  placeholder="Village / Town"
                  value={address.city}
                  onChange={(e) => setAddress({ ...address, city: e.target.value })}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs focus:border-primary focus:outline-none"
                />
                <input
                  placeholder="Pincode"
                  value={address.pincode}
                  onChange={(e) => setAddress({ ...address, pincode: e.target.value })}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs focus:border-primary focus:outline-none"
                />
              </div>
              <input
                placeholder="Contact Phone Number"
                value={address.phone}
                onChange={(e) => setAddress({ ...address, phone: e.target.value })}
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs focus:border-primary focus:outline-none"
              />
            </div>
          </div>
        )}

        {/* ── Payment Method ────────────────────────────────── */}
        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
          <h3 className="font-display text-xs font-bold text-foreground mb-2.5 flex items-center gap-1.5">
            <CreditCard size={14} className="text-primary" /> Payment Method
          </h3>
          <div className="flex items-center gap-3 rounded-xl border border-primary/20 bg-bele-green-muted p-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-white shadow-sm">
              <IndianRupee size={16} />
            </div>
            <div>
              <p className="text-xs font-bold text-primary">UPI / Netbanking / Cards</p>
              <p className="text-[10px] text-primary/80">Secured with Razorpay & Bank Escrow</p>
            </div>
          </div>
        </div>

        {/* ── Summary & Pay CTA ──────────────────────────────── */}
        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm text-xs">
          <div className="space-y-1.5 text-muted-foreground">
            <div className="flex justify-between">
              <span>Rental Subtotal</span>
              <span className="text-foreground font-semibold">{fp(getSubtotal())}</span>
            </div>
            {getTotalOperatorFee() > 0 && (
              <div className="flex justify-between text-accent font-semibold">
                <span>Operator Service Fee</span>
                <span>{fp(getTotalOperatorFee())}</span>
              </div>
            )}
            <div className="flex justify-between text-emerald-600 dark:text-emerald-400 font-medium">
              <span>Security Deposit</span>
              <span>₹0 (Zero Deposit)</span>
            </div>
            {deliveryType === "delivery" && (
              <div className="flex justify-between">
                <span>Delivery Fee</span>
                <span className="text-foreground font-semibold">₹50</span>
              </div>
            )}
            <div className="border-t border-border pt-2 mt-1 flex justify-between items-baseline font-bold text-foreground">
              <span className="text-sm">Total Payable</span>
              <span className="text-base text-primary font-display">{fp(payTotal)}</span>
            </div>
          </div>

          <button
            type="button"
            disabled={loading}
            onClick={handlePayment}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-3.5 text-xs font-bold text-white shadow-md transition hover:brightness-110 active:scale-[0.98] disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                <span>Processing Order…</span>
              </>
            ) : (
              <>
                <ShieldCheck size={16} />
                <span>Pay {fp(payTotal)} & Confirm</span>
              </>
            )}
          </button>
        </div>
      </div>
    </FarmerShell>
  )
}
