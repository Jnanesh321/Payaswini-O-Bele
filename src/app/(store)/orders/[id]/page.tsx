"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { ChevronLeft, Package, Phone } from "lucide-react"
import { Badge, Button, Card, Skeleton } from "@/components/ui"
import { bookingStatusLabel, bookingStatusTone } from "@/lib/booking-status"
import { LiveTrackingConsole } from "@/components/orders/live-tracking-console"

interface StateLog {
  id: string
  fromState: string
  toState: string
  actor: string
  note: string | null
  createdAt: string
}

interface Participant {
  id: string
  name: string | null
  phone: string
}

interface BookingDetail {
  id: string
  bookingRef: string
  status: string
  serviceType: string
  startDate: string
  endDate: string
  totalDays: number
  toolFeePerDay: number
  operatorFeePerDay: number
  totalToolFee: number
  totalOperatorFee: number
  deliveryFee: number
  platformFee: number
  deposit: number
  subtotal: number
  totalAmount: number
  deliveryAddress: string | null
  tool: { name: string; images: string[] }
  farmer: Participant
  toolOwner: Participant
  servicePerformer: Participant | null
  stateLogs: StateLog[]
  payment: {
    id: string
    status: string
    paymentMethod: string | null
    amount: number
    depositFrozen: boolean
    depositRefunded: number
    depositDeducted: number
  } | null
  permittedTargets: string[]
}

const ACTOR_LABEL: Record<string, string> = {
  FARMER: "You",
  TOOL_OWNER: "Tool owner",
  OPERATOR: "Operator",
  ADMIN: "Platform",
  SYSTEM: "System",
}

function formatStamp(iso: string): string {
  return new Date(iso).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  })
}

export default function OrderDetailPage() {
  const params = useParams()
  const id = Array.isArray(params.id) ? params.id[0] : params.id
  const [order, setOrder] = useState<BookingDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [acting, setActing] = useState(false)

  const refresh = useCallback(async () => {
    if (!id) return
    try {
      const res = await fetch(`/api/rentals/${id}`, { cache: "no-store" })
      const json = await res.json()
      if (!res.ok) setError(json.error || "Order not found")
      else setOrder(json.data)
    } catch {
      setError("Failed to load order")
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    const t = setTimeout(refresh, 0)
    return () => clearTimeout(t)
  }, [refresh])

  const fp = (n: number) => `₹${(n / 100).toLocaleString("en-IN")}`

  const canCancel = order?.permittedTargets?.includes("CANCELLED_BY_FARMER") ?? false

  const handleCancel = async () => {
    if (!id) return
    setActing(true)
    try {
      const res = await fetch(`/api/rentals/${id}/transition`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: "CANCELLED_BY_FARMER",
          note: "Farmer cancelled the booking",
        }),
      })
      const json = await res.json()
      if (!res.ok) setError(json.error || "Could not cancel this booking")
      else await refresh()
    } catch {
      setError("Network error — try again")
    } finally {
      setActing(false)
    }
  }

  const withOperator =
    order?.servicePerformer &&
    order.servicePerformer.id !== order.farmer.id &&
    ["OPERATOR_ONLY", "FULL_LOGISTICS"].includes(order.serviceType || "")

  return (
    <div className="container py-8">
      <Link
        href="/orders"
        className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="h-4 w-4" /> Back to orders
      </Link>

      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      ) : error || !order ? (
        <Card className="p-12 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <Package className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-xl font-semibold">Order not found</h1>
          <p className="mt-2 text-muted-foreground">{error || "This order does not exist."}</p>
          <Link href="/orders">
            <Button className="mt-6">Back to orders</Button>
          </Link>
        </Card>
      ) : (
        <div className="space-y-6">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-3xl font-bold">{order.tool.name}</h1>
              <Badge variant={bookingStatusTone(order.status)}>{bookingStatusLabel(order.status)}</Badge>
            </div>
            <p className="mt-1 text-muted-foreground">{order.bookingRef}</p>
          </div>

          {/* Zomato-Style Live Tracking Console */}
          <LiveTrackingConsole
            order={order}
            onRefresh={refresh}
            isRefreshing={acting}
          />

          <Card className="rounded-2xl p-6">
            <h2 className="mb-5 font-heading font-semibold">Tracking</h2>
            {order.stateLogs.length === 0 ? (
              <p className="text-sm text-muted-foreground">No status updates yet.</p>
            ) : (
              <ol className="relative space-y-5 border-l-2 border-border pl-5">
                {order.stateLogs.map((log, i) => {
                  const isCurrent = i === order!.stateLogs.length - 1
                  return (
                    <li key={log.id} className="relative">
                      <span
                        className={`absolute -left-[27px] top-0.5 h-3 w-3 rounded-full ring-4 ring-background ${
                          isCurrent ? "bg-primary" : "bg-muted-foreground/40"
                        }`}
                      />
                      <div className="flex items-center gap-2">
                        <p className={`text-sm font-semibold ${isCurrent ? "text-primary" : "text-foreground"}`}>
                          {bookingStatusLabel(log.toState)}
                        </p>
                        <span className="text-xs text-muted-foreground">· {ACTOR_LABEL[log.actor] ?? log.actor}</span>
                      </div>
                      <p className="mt-0.5 text-xs text-muted-foreground">{formatStamp(log.createdAt)}</p>
                      {log.note && <p className="mt-1 text-xs leading-relaxed text-muted-foreground/80">{log.note}</p>}
                    </li>
                  )
                })}
              </ol>
            )}
          </Card>

          <Card className="rounded-2xl p-6">
            <div className="grid gap-6 sm:grid-cols-2">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Rental period</p>
                <p className="mt-1 font-semibold">
                  {new Date(order.startDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                  {" – "}
                  {new Date(order.endDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">{order.totalDays} day{order.totalDays === 1 ? "" : "s"}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Service</p>
                <p className="mt-1 font-semibold">
                  {order.serviceType === "OPERATOR_ONLY" || order.serviceType === "FULL_LOGISTICS"
                    ? "Platform operator included"
                    : "Self-service rental"}
                </p>
              </div>
            </div>
            {order.deliveryAddress && (
              <div className="mt-4 rounded-xl bg-muted px-4 py-3 text-sm">
                <p className="text-xs font-medium text-muted-foreground">Delivery address</p>
                <p className="mt-0.5 font-semibold">{order.deliveryAddress}</p>
              </div>
            )}
          </Card>

          {withOperator && order.servicePerformer && (
            <Card className="rounded-2xl p-6">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 font-semibold text-primary">
                    {order.servicePerformer.name?.slice(0, 2).toUpperCase() ?? "OP"}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Your operator</p>
                    <p className="font-semibold">{order.servicePerformer.name}</p>
                  </div>
                </div>
                <a href={`tel:${order.servicePerformer.phone}`} className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm font-medium hover:bg-muted">
                  <Phone className="h-4 w-4" /> Call
                </a>
              </div>
            </Card>
          )}

          <Card className="rounded-2xl p-6">
            <h2 className="mb-4 font-heading font-semibold">Price breakdown</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tool fee · {order.totalDays} day{order.totalDays === 1 ? "" : "s"}</span>
                <span className="font-medium">{fp(order.totalToolFee)}</span>
              </div>
              {order.totalOperatorFee > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Operator fee</span>
                  <span className="font-medium">{fp(order.totalOperatorFee)}</span>
                </div>
              )}
              {order.deliveryFee > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Delivery</span>
                  <span className="font-medium">{fp(order.deliveryFee)}</span>
                </div>
              )}
              {order.platformFee > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Platform fee</span>
                  <span className="font-medium">{fp(order.platformFee)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">Deposit {order.deposit > 0 ? "(refundable)" : ""}</span>
                <span className="font-medium">{fp(order.deposit)}</span>
              </div>
              <div className="flex justify-between border-t border-border pt-2 text-lg font-semibold">
                <span>Total</span>
                <span className="text-primary">{fp(order.totalAmount)}</span>
              </div>
            </div>
            {order.payment && (
              <div className="mt-5 space-y-2">
                <div className="flex items-center justify-between rounded-xl bg-muted px-4 py-3 text-sm">
                  <span className="text-muted-foreground">Payment</span>
                  <span className="font-semibold">{order.payment.status}</span>
                </div>
                {order.payment.depositFrozen && order.deposit > 0 && (
                  <div className="flex items-center justify-between rounded-xl bg-muted px-4 py-3 text-sm">
                    <span className="text-muted-foreground">Refundable deposit hold</span>
                    <span className="font-semibold">{fp(order.deposit - order.payment.depositRefunded - order.payment.depositDeducted)}</span>
                  </div>
                )}
              </div>
            )}
          </Card>

          {canCancel && (
            <Card className="rounded-2xl border-destructive/30 p-6">
              <h2 className="font-heading font-semibold">Cancel this booking</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Cancellation is free until an operator is assigned. After assignment, a flat ₹50 operator
                compensation applies.
              </p>
              <Button
                variant="destructive"
                disabled={acting}
                onClick={handleCancel}
                className="mt-4"
              >
                {acting ? "Cancelling…" : "Cancel booking"}
              </Button>
            </Card>
          )}

          <div className="flex gap-3">
            <Link href="/tools" className="flex-1">
              <Button variant="outline" className="w-full">
                Browse more tools
              </Button>
            </Link>
            <Link href="/orders" className="flex-1">
              <Button className="w-full">View all orders</Button>
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}