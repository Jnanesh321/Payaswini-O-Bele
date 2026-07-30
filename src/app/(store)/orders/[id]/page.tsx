"use client"

import { useEffect } from "react"
import { motion } from "framer-motion"
import Link from "next/link"
import { CheckCircle, Package, ArrowRight } from "lucide-react"
import { Button, Card } from "@/components/ui"
import { useCartStore } from "@/store/cart"
import { useParams } from "next/navigation"

export default function OrderDetailPage() {
  const params = useParams()
  const clearCart = useCartStore((s) => s.clearCart)

  useEffect(() => {
    clearCart()
  }, [clearCart])

  return (
    <div className="container flex items-center justify-center py-20">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md"
      >
        <Card className="p-8 text-center">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-success/10">
            <CheckCircle className="h-10 w-10 text-success" />
          </div>
          <h1 className="text-2xl font-bold">Order #{params.id?.toString().slice(0, 8)}</h1>
          <p className="mt-2 text-muted-foreground">
            Your rental has been confirmed. We&apos;ll send you a confirmation SMS shortly.
          </p>
          <div className="mt-6 space-y-3">
            <Link href="/dashboard">
              <Button variant="default" className="w-full gap-2">
                <Package className="h-4 w-4" /> View My Rentals
              </Button>
            </Link>
            <Link href="/tools">
              <Button variant="outline" className="w-full gap-2">
                Continue Shopping <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </Card>
      </motion.div>
    </div>
  )
}
