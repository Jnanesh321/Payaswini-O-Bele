"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import {
  Package,
  Clock,
  CreditCard,
  User,
  MapPin,
  ShieldCheck,
  ChevronRight,
  AlertCircle,
} from "lucide-react"
import { Button, Card, Badge, Skeleton } from "@/components/ui"
import { formatPrice, formatDate } from "@/lib/utils"

interface RentalItem {
  id: string
  startDate: string
  endDate: string
  totalAmount: number
  deposit: number
  status: string
  tool: { name: string; images: string[] }
}

export default function DashboardPage() {
  const [rentals, setRentals] = useState<RentalItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      const res = await fetch("/api/rentals")
      const data = await res.json()
      setRentals(data.data || [])
      setLoading(false)
    }
    fetchData()
  }, [])

  const activeRentals = rentals.filter(
    (r) => r.status === "ACTIVE" || r.status === "CONFIRMED"
  )
  const pastRentals = rentals.filter((r) => r.status === "RETURNED")

  return (
    <div className="container py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">My Dashboard</h1>
        <p className="text-muted-foreground">Manage your account and rentals</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        {[
          { label: "Active Rentals", value: activeRentals.length, icon: Package },
          { label: "Total Rentals", value: rentals.length, icon: Clock },
          { label: "Total Spent", value: rentals.reduce((s, r) => s + r.totalAmount, 0), icon: CreditCard, isPrice: true },
          { label: "KYC Status", value: "Not Verified", icon: ShieldCheck },
        ].map((item, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
          >
            <Card className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{item.label}</p>
                  <p className="mt-1 text-2xl font-bold">
                    {item.isPrice ? formatPrice(item.value as number) : item.value}
                  </p>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                  <item.icon className="h-5 w-5 text-primary" />
                </div>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card className="p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-semibold">Active Rentals</h2>
              <Link href="/dashboard/rentals">
                <Button variant="ghost" size="sm" className="gap-1">
                  View All <ChevronRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
            {loading ? (
              <div className="space-y-3">
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
              </div>
            ) : activeRentals.length === 0 ? (
              <div className="flex flex-col items-center py-8 text-center">
                <Package className="mb-2 h-8 w-8 text-muted-foreground" />
                <p className="font-medium">No active rentals</p>
                <p className="text-sm text-muted-foreground">Browse tools to rent</p>
                <Link href="/tools">
                  <Button size="sm" className="mt-3">
                    Browse Tools
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {activeRentals.map((rental) => (
                  <div
                    key={rental.id}
                    className="flex items-center gap-3 rounded-lg border border-border p-3"
                  >
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-xl">
                      🌾
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-sm">{rental.tool.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(rental.startDate)} - {formatDate(rental.endDate)}
                      </p>
                    </div>
                    <Badge
                      variant={rental.status === "ACTIVE" ? "success" : "warning"}
                    >
                      {rental.status}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="p-6">
            <h2 className="mb-4 font-semibold">Quick Links</h2>
            <div className="space-y-2">
              {[
                { href: "/dashboard/kyc", label: "KYC Verification", icon: ShieldCheck },
                { href: "/dashboard/addresses", label: "Saved Addresses", icon: MapPin },
                { href: "/dashboard/wallet", label: "Wallet & Deposits", icon: CreditCard },
                { href: "/dashboard/rentals", label: "Rental History", icon: Clock },
              ].map((link) => (
                <Link key={link.href} href={link.href}>
                  <div className="flex items-center gap-3 rounded-lg p-3 transition-colors hover:bg-card">
                    <link.icon className="h-5 w-5 text-primary" />
                    <span className="text-sm">{link.label}</span>
                    <ChevronRight className="ml-auto h-4 w-4 text-muted-foreground" />
                  </div>
                </Link>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
