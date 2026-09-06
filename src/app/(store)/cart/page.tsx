"use client"

import { useRouter } from "next/navigation"
import Link from "next/link"
import { ShoppingCart, Trash2, ArrowRight, Plus, Wrench } from "lucide-react"
import { useCartStore } from "@/store/cart"
import { formatPrice, getLocaleName } from "@/lib/utils"
import { useLocale } from "next-intl"
import { FarmerShell } from "@/components/layout/farmer-shell"

export default function CartPage() {
  const router = useRouter()
  const locale = useLocale()
  const fp = (n: number) => formatPrice(n, locale)
  const {
    items,
    removeItem,
    clearCart,
    getSubtotal,
    getTotalDeposit,
    getTotalOperatorFee,
    getGrandTotal,
    getTotalDiscount,
  } = useCartStore()

  if (items.length === 0) {
    return (
      <FarmerShell
        eyebrow="Rental Cart"
        title="Your Cart is Empty"
        subtitle="Select harvesting and tilling equipment to get started"
      >
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card/60 p-8 text-center my-auto">
          <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
            <ShoppingCart size={24} />
          </div>
          <h2 className="font-display text-base font-bold text-foreground">No Tools in Cart</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Browse our verified inventory in Dakshina Karnataka
          </p>
          <Link
            href="/tools"
            className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2.5 text-xs font-bold text-white shadow-sm transition hover:brightness-110"
          >
            <Plus size={14} /> Browse Machinery Catalog
          </Link>
        </div>
      </FarmerShell>
    )
  }

  return (
    <FarmerShell
      eyebrow="Rental Cart"
      title="Shopping Cart"
      subtitle={`${items.length} tool(s) selected for booking`}
      headerRight={
        <button
          type="button"
          onClick={clearCart}
          className="flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-semibold text-destructive hover:bg-destructive/10"
        >
          <Trash2 size={12} /> Clear
        </button>
      }
    >
      <div className="flex flex-col gap-4">
        {/* ── Cart Items List ──────────────────────────────── */}
        <div className="flex flex-col gap-2.5">
          {items.map((item) => (
            <div
              key={item.id}
              className="rounded-2xl border border-border bg-card p-3.5 shadow-sm"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-2.5">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-bele-green-muted text-primary">
                    <Wrench size={18} />
                  </div>
                  <div>
                    <h3 className="font-display text-sm font-bold text-foreground">
                      {getLocaleName(item, locale)}
                    </h3>
                    <p className="text-[11px] text-muted-foreground">
                      {fp(item.pricePerDay)} / day · {item.days} day(s)
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => removeItem(item.id)}
                  className="rounded p-1 text-muted-foreground hover:text-destructive"
                >
                  <Trash2 size={14} />
                </button>
              </div>

              <div className="mt-3 flex items-center justify-between border-t border-border/60 pt-2 text-[11px]">
                <div className="flex flex-wrap gap-2 text-muted-foreground">
                  <span>Deposit: {fp(item.deposit)}</span>
                  {item.serviceType === "OPERATOR_ONLY" && (
                    <span className="text-accent font-semibold">
                      Operator: {fp(item.totalOperatorFee)}
                    </span>
                  )}
                </div>
                <span className="font-bold text-primary">{fp(item.totalAmount)}</span>
              </div>
            </div>
          ))}
        </div>

        {/* ── Pricing Breakdown Card ────────────────────────── */}
        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm text-xs">
          <h3 className="font-display text-xs font-bold text-foreground mb-2.5">
            Order Summary
          </h3>
          <div className="space-y-2 text-muted-foreground">
            <div className="flex justify-between">
              <span>Tool Rental Subtotal</span>
              <span className="text-foreground font-semibold">{fp(getSubtotal())}</span>
            </div>
            {getTotalDiscount() > 0 && (
              <div className="flex justify-between text-success">
                <span>Co-op Discount</span>
                <span>-{fp(getTotalDiscount())}</span>
              </div>
            )}
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
            <div className="border-t border-border pt-2.5 mt-1 flex justify-between items-baseline font-bold text-foreground">
              <span className="text-sm">Total Payable</span>
              <span className="text-base text-primary font-display">{fp(getGrandTotal())}</span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => router.push("/checkout")}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-3 text-xs font-bold text-white shadow-md transition hover:brightness-110 active:scale-[0.98]"
          >
            <span>Proceed to Checkout</span>
            <ArrowRight size={14} />
          </button>
        </div>
      </div>
    </FarmerShell>
  )
}
