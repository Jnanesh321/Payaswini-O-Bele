"use client"

import { useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { MapPin, Truck, ShieldCheck, Loader2, CreditCard, IndianRupee } from "lucide-react"
import { Button, Card, Input } from "@/components/ui"
import { useCartStore } from "@/store/cart"
import { formatPrice } from "@/lib/utils"

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
  const { items, getSubtotal, getTotalDeposit, getGrandTotal, clearCart } = useCartStore()
  const [loading, setLoading] = useState(false)
  const [deliveryType, setDeliveryType] = useState<"pickup" | "delivery">("delivery")
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

      const deliveryCharge = deliveryType === "delivery" ? 5000 : 0

      const res = await fetch("/api/razorpay/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: items.map((i) => ({
            ...i,
            totalDays: i.days,
            pricePerDay: i.pricePerDay,
            totalAmount: i.totalAmount,
            toolId: i.toolId,
            startDate: i.startDate,
            endDate: i.endDate,
          })),
          deliveryCharge,
        }),
      })
      const { data } = await res.json()
      if (!res.ok) throw new Error("Failed to create order")

      const razorpay = new window.Razorpay({
        key_id: data.keyId,
        amount: data.amount,
        currency: data.currency,
        order_id: data.orderId,
        name: "O Bele~",
        description: "Farm Tool Rental",
        image: "/logos/obele-logo.svg",
        theme: { color: "#2D5016" },
        prefill: { contact: address.phone || "" },
          handler: async (response: Record<string, unknown>) => {
            await fetch("/api/razorpay/verify", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                razorpayOrderId: response.razorpay_order_id,
                razorpayPaymentId: response.razorpay_payment_id,
                razorpaySignature: response.razorpay_signature,
                bookingIds: data.bookingIds,
              }),
            })
            clearCart()
            router.push("/orders/confirm")
          },
        modal: {
          ondismiss: () => setLoading(false),
        },
      })

      razorpay.open()
    } catch {
      setLoading(false)
    }
  }, [items, deliveryType, address, router, clearCart])

  if (items.length === 0) {
    router.push("/cart")
    return null
  }

  return (
    <div className="container py-8">
      <h1 className="mb-8 text-3xl font-bold">Checkout</h1>

      <div className="grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card className="p-6">
            <h3 className="mb-4 font-semibold flex items-center gap-2">
              <Truck className="h-5 w-5 text-primary" /> Delivery Method
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setDeliveryType("pickup")}
                className={`rounded-xl border-2 p-4 text-center transition-all ${
                  deliveryType === "pickup"
                    ? "border-primary bg-primary/5"
                    : "border-border"
                }`}
              >
                <MapPin className="mx-auto mb-1 h-6 w-6" />
                <div className="font-medium text-sm">Self Pickup</div>
                <div className="text-xs text-muted-foreground">Free</div>
              </button>
              <button
                onClick={() => setDeliveryType("delivery")}
                className={`rounded-xl border-2 p-4 text-center transition-all ${
                  deliveryType === "delivery"
                    ? "border-primary bg-primary/5"
                    : "border-border"
                }`}
              >
                <Truck className="mx-auto mb-1 h-6 w-6" />
                <div className="font-medium text-sm">Home Delivery</div>
                <div className="text-xs text-muted-foreground">₹50 - ₹150</div>
              </button>
            </div>
          </Card>

          {deliveryType === "delivery" && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Card className="p-6 space-y-4">
                <h3 className="font-semibold flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-primary" /> Delivery Address
                </h3>
                <Input
                  placeholder="Address Line 1"
                  value={address.line1}
                  onChange={(e) => setAddress({ ...address, line1: e.target.value })}
                />
                <Input
                  placeholder="Address Line 2 (optional)"
                  value={address.line2}
                  onChange={(e) => setAddress({ ...address, line2: e.target.value })}
                />
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    placeholder="City"
                    value={address.city}
                    onChange={(e) => setAddress({ ...address, city: e.target.value })}
                  />
                  <Input
                    placeholder="Pincode"
                    value={address.pincode}
                    onChange={(e) => setAddress({ ...address, pincode: e.target.value })}
                  />
                </div>
                <Input
                  placeholder="Phone Number"
                  value={address.phone}
                  onChange={(e) => setAddress({ ...address, phone: e.target.value })}
                />
              </Card>
            </motion.div>
          )}

          <Card className="p-6">
            <h3 className="mb-4 font-semibold flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-primary" /> Payment Method
            </h3>
            <div className="rounded-xl border-2 border-primary bg-primary/5 p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
                  <IndianRupee className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="font-medium">UPI / Card / Netbanking</p>
                  <p className="text-xs text-muted-foreground">
                    Pay via Razorpay - Secure & Fast
                  </p>
                </div>
              </div>
            </div>
            <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
              <ShieldCheck className="h-4 w-4 text-success" />
              Your payment is secured with 256-bit SSL encryption
            </div>
          </Card>
        </div>

        <div>
          <Card className="p-6 sticky top-24">
            <h3 className="mb-4 font-semibold">Order Summary</h3>
            <div className="space-y-2">
              {items.map((item) => (
                <div key={item.id} className="flex justify-between text-sm">
                  <span className="text-muted-foreground truncate max-w-[180px]">
                    {item.name} x{item.days}d
                  </span>
                  <span>{formatPrice(item.totalAmount)}</span>
                </div>
              ))}
            </div>
            <div className="mt-4 space-y-2 border-t border-border pt-4 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{formatPrice(getSubtotal())}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Deposit (Refundable)</span>
                <span>{formatPrice(getTotalDeposit())}</span>
              </div>
              {deliveryType === "delivery" && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Delivery</span>
                  <span>Calculated later</span>
                </div>
              )}
              <div className="flex justify-between border-t border-border pt-2 text-lg font-semibold">
                <span>Total</span>
                <span className="text-primary">{formatPrice(getGrandTotal())}</span>
              </div>
            </div>
            <Button
              size="lg"
              variant="accent"
              className="mt-6 w-full gap-2"
              onClick={handlePayment}
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <>
                  Pay {formatPrice(getGrandTotal())}
                </>
              )}
            </Button>
            <p className="mt-3 text-center text-xs text-muted-foreground">
              By continuing, you agree to our Terms & Conditions
            </p>
          </Card>
        </div>
      </div>
    </div>
  )
}
