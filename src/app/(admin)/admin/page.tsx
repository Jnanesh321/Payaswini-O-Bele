"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import Link from "next/link"
import {
  Package,
  ShoppingBag,
  Users,
  IndianRupee,
  TrendingUp,
  AlertTriangle,
  ChevronRight,
  Plus,
} from "lucide-react"
import { Button, Card, Badge } from "@/components/ui"
import { formatPrice } from "@/lib/utils"

const stats = [
  { label: "Total Tools", value: 24, icon: Package, change: "+2 this month" },
  { label: "Active Rentals", value: 18, icon: ShoppingBag, change: "+5 this week" },
  { label: "Total Users", value: 156, icon: Users, change: "+12 this month" },
  { label: "Revenue (This Month)", value: 45600, icon: IndianRupee, isPrice: true, change: "+15% vs last month" },
]

const recentBookings = [
  { id: "1", user: "Ramachandra Shetty", tool: "Carbon Fiber Pole - 30ft", amount: 4470, status: "ACTIVE" },
  { id: "2", user: "Parvati Nayak", tool: "Battery Sprayer - 16L", amount: 990, status: "PENDING" },
  { id: "3", user: "Gopala Poojari", tool: "Carbon Fiber Pole - 25ft", amount: 3612, status: "RETURNED" },
]

export default function AdminDashboard() {
  return (
    <div className="container py-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          <p className="text-muted-foreground">Manage your rental platform</p>
        </div>
        <Link href="/admin/inventory">
          <Button variant="accent" className="gap-2">
            <Plus className="h-4 w-4" /> Add Tool
          </Button>
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        {stats.map((item, i) => (
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
                    {item.isPrice ? formatPrice(item.value) : item.value}
                  </p>
                  <p className="mt-1 text-xs text-success">{item.change}</p>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                  <item.icon className="h-5 w-5 text-primary" />
                </div>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold">Recent Bookings</h2>
            <Link href="/admin/bookings">
              <Button variant="ghost" size="sm" className="gap-1">
                View All <ChevronRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
          <div className="space-y-3">
            {recentBookings.map((booking) => (
              <div
                key={booking.id}
                className="flex items-center justify-between rounded-lg border border-border p-3"
              >
                <div>
                  <p className="text-sm font-medium">{booking.user}</p>
                  <p className="text-xs text-muted-foreground">{booking.tool}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold">{formatPrice(booking.amount)}</p>
                  <Badge
                    variant={
                      booking.status === "ACTIVE"
                        ? "success"
                        : booking.status === "PENDING"
                        ? "warning"
                        : "secondary"
                    }
                  >
                    {booking.status}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="mb-4 font-semibold">Quick Actions</h2>
          <div className="grid grid-cols-2 gap-3">
            {[
              { href: "/admin/inventory", label: "Inventory", icon: Package },
              { href: "/admin/bookings", label: "Bookings", icon: ShoppingBag },
              { href: "/admin/users", label: "Users", icon: Users },
              { href: "/admin/analytics", label: "Analytics", icon: TrendingUp },
            ].map((action) => (
              <Link key={action.href} href={action.href}>
                <div className="flex flex-col items-center gap-2 rounded-xl border border-border p-4 text-center transition-colors hover:bg-card">
                  <action.icon className="h-6 w-6 text-primary" />
                  <span className="text-sm font-medium">{action.label}</span>
                </div>
              </Link>
            ))}
          </div>
        </Card>
      </div>
    </div>
  )
}
