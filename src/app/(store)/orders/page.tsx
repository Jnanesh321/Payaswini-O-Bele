"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { Package, ArrowRight, ChevronRight } from "lucide-react"
import { Button, Card, Badge, Skeleton } from "@/components/ui"
import { bookingStatusLabel, bookingStatusTone } from "@/lib/booking-status"

interface Booking {
  id: string
  bookingRef: string
  status: string
  totalAmount: number
  startDate: string
  endDate: string
  tool: { name: string; images: string[] }
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/rentals", { cache: "no-store" })
      const json = await res.json()
      setOrders(json.data || [])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const t = setTimeout(refresh, 0)
    return () => clearTimeout(t)
  }, [refresh])

  return (
    <div className="container py-8">
      <div className="mb-8 flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-bold">My Orders</h1>
          <p className="mt-1 text-muted-foreground">Track your tool rentals end to end</p>
        </div>
        <Link href="/tools">
          <Button variant="ghost" className="gap-1">
            Browse Tools <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
      </div>

      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      ) : orders.length === 0 ? (
        <Card className="p-12 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <Package className="h-8 w-8 text-primary" />
          </div>
          <h2 className="text-xl font-semibold">No orders yet</h2>
          <p className="mt-2 text-muted-foreground">Your rental orders will appear here</p>
          <Link href="/tools">
            <Button className="mt-6 gap-2">
              Browse Tools <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </Card>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => (
            <Link key={order.id} href={`/orders/${order.id}`}>
              <Card className="flex items-center gap-4 rounded-2xl p-4 transition hover:border-primary/40">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-xl">
                  🌾
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate font-medium">{order.tool.name}</p>
                    <Badge variant={bookingStatusTone(order.status)}>
                      {bookingStatusLabel(order.status)}
                    </Badge>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {order.bookingRef} ·{" "}
                    {new Date(order.startDate).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                    {" – "}
                    {new Date(order.endDate).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="text-sm font-semibold">
                    ₹{(order.totalAmount / 100).toLocaleString("en-IN")}
                  </span>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}