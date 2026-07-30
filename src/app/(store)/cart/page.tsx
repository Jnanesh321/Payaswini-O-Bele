"use client"

import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import Link from "next/link"
import { ShoppingCart, Trash2, ArrowRight, ChevronLeft, IndianRupee } from "lucide-react"
import { Button, Card } from "@/components/ui"
import { useCartStore } from "@/store/cart"
import { formatPrice } from "@/lib/utils"

export default function CartPage() {
  const router = useRouter()
  const { items, removeItem, clearCart, getSubtotal, getTotalDeposit, getGrandTotal, getTotalDiscount } =
    useCartStore()

  if (items.length === 0) {
    return (
      <div className="container flex flex-col items-center justify-center py-20">
        <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-primary/10">
          <ShoppingCart className="h-12 w-12 text-primary" />
        </div>
        <h2 className="text-2xl font-bold">Your Cart is Empty</h2>
        <p className="mt-2 text-muted-foreground">Add some tools to get started</p>
        <Link href="/tools">
          <Button className="mt-6 gap-2">
            <ArrowRight className="h-4 w-4" /> Browse Tools
          </Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="container py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Shopping Cart</h1>
          <p className="text-muted-foreground">{items.length} item(s) in your cart</p>
        </div>
        <Button variant="ghost" size="sm" onClick={clearCart} className="text-destructive">
          <Trash2 className="h-4 w-4" /> Clear All
        </Button>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4">
          {items.map((item, i) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <Card className="flex gap-4 p-4">
                <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-primary/10 to-secondary/10 text-3xl">
                  🌾
                </div>
                <div className="flex-1">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold">{item.name}</h3>
                      {item.nameKn && (
                        <p className="text-xs text-muted-foreground">{item.nameKn}</p>
                      )}
                    </div>
                    <button onClick={() => removeItem(item.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </button>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                    <span>{formatPrice(item.pricePerDay)} / day</span>
                    <span>{item.days} days</span>
                    <span>Deposit: {formatPrice(item.deposit)}</span>
                  </div>
                  {item.discount > 0 && (
                    <div className="mt-1 text-xs text-success">
                      Discount: {formatPrice(item.discount)}
                    </div>
                  )}
                  <div className="mt-2 font-semibold text-primary">
                    {formatPrice(item.totalAmount)}
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>

        <div>
          <Card className="p-6 sticky top-24">
            <h3 className="mb-4 font-semibold">Order Summary</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{formatPrice(getSubtotal())}</span>
              </div>
              {getTotalDiscount() > 0 && (
                <div className="flex justify-between text-success">
                  <span>Discount</span>
                  <span>-{formatPrice(getTotalDiscount())}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Deposit</span>
                <span>{formatPrice(getTotalDeposit())}</span>
              </div>
              <div className="border-t border-border pt-3">
                <div className="flex justify-between font-semibold text-lg">
                  <span>Grand Total</span>
                  <span className="text-primary">{formatPrice(getGrandTotal())}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Deposit of {formatPrice(getTotalDeposit())} is refundable
                </p>
              </div>
            </div>
            <Button
              size="lg"
              variant="accent"
              className="mt-6 w-full gap-2"
              onClick={() => router.push("/checkout")}
            >
              Proceed to Checkout <ArrowRight className="h-4 w-4" />
            </Button>
            <Link href="/tools">
              <Button variant="ghost" className="mt-2 w-full gap-2">
                <ChevronLeft className="h-4 w-4" /> Continue Shopping
              </Button>
            </Link>
          </Card>
        </div>
      </div>
    </div>
  )
}
