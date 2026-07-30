"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { motion } from "framer-motion"
import Link from "next/link"
import {
  ShieldCheck,
  Calendar,
  ChevronLeft,
  Check,
  Info,
} from "lucide-react"
import { Button, Badge, Card, Skeleton } from "@/components/ui"
import { useCartStore } from "@/store/cart"
import { formatPrice, calculateRentalPrice } from "@/lib/utils"

interface ToolDetail {
  id: string
  name: string
  nameKn?: string
  description: string
  descriptionKn?: string
  pricePerDay: number
  deposit: number
  images: string[]
  accessories: string[]
  isActive: boolean
  category: string
  availableCount: number
  specs: Record<string, string>
}

const renderTiers = [
  { label: "1 Day", days: 1 },
  { label: "3 Days", days: 3 },
  { label: "1 Week", days: 7 },
  { label: "1 Month", days: 30 },
]

export default function ToolDetailPage() {
  const params = useParams()
  const router = useRouter()
  const addItem = useCartStore((s) => s.addItem)
  const [tool, setTool] = useState<ToolDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedDays, setSelectedDays] = useState(1)
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")

  useEffect(() => {
    const fetchTool = async () => {
      const res = await fetch(`/api/tools/${params.slug}`)
      const data = await res.json()
      setTool(data.data)
      setLoading(false)
    }
    fetchTool()
  }, [params.slug])

  if (loading) {
    return (
      <div className="container py-8">
        <Skeleton className="h-8 w-48 mb-4" />
        <div className="grid gap-8 lg:grid-cols-2">
          <Skeleton className="aspect-square rounded-xl" />
          <div className="space-y-4">
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-6 w-1/4" />
            <Skeleton className="h-24 w-full" />
          </div>
        </div>
      </div>
    )
  }

  if (!tool) {
    return (
      <div className="container py-16 text-center">
        <h2 className="text-2xl font-bold">Tool not found</h2>
        <Link href="/tools" className="mt-4 inline-flex text-primary hover:underline">
          <ChevronLeft className="h-4 w-4" /> Back to tools
        </Link>
      </div>
    )
  }

  const handleAddToCart = () => {
    const sd = startDate ? new Date(startDate) : new Date()
    const ed = endDate
      ? new Date(endDate)
      : new Date(sd.getTime() + selectedDays * 24 * 60 * 60 * 1000)
    const pricing = calculateRentalPrice(
      tool.pricePerDay,
      sd,
      ed
    )
    addItem({
      id: crypto.randomUUID(),
      toolId: tool.id,
      name: tool.name,
      nameKn: tool.nameKn,
      pricePerDay: tool.pricePerDay,
      deposit: tool.deposit,
      image: tool.images[0] || "",
      quantity: 1,
      startDate: sd,
      endDate: ed,
      days: pricing.days,
      totalAmount: pricing.totalAmount,
      discount: pricing.discount,
    })
    router.push("/cart")
  }

  return (
    <div className="container py-8">
      <Link
        href="/tools"
        className="mb-6 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary"
      >
        <ChevronLeft className="h-4 w-4" /> Back to Tools
      </Link>

      <div className="grid gap-8 lg:grid-cols-2">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="relative aspect-square overflow-hidden rounded-2xl bg-gradient-to-br from-primary/10 to-secondary/10"
        >
          <div className="flex h-full items-center justify-center text-8xl">🌾</div>
          <Badge
            variant={tool.isActive ? "success" : "destructive"}
            className="absolute left-4 top-4"
          >
            {tool.isActive ? "Available for Rent" : "Currently Rented"}
          </Badge>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="space-y-6"
        >
          <div>
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-3xl font-bold">{tool.name}</h1>
                {tool.nameKn && (
                  <p className="text-muted-foreground">{tool.nameKn}</p>
                )}
              </div>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Info className="h-4 w-4" /> {tool.category}
              </span>
            </div>
          </div>

          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-bold text-primary">
              {formatPrice(tool.pricePerDay)}
            </span>
            <span className="text-muted-foreground">/ day</span>
            <span className="ml-4 text-sm text-muted-foreground">
              Deposit: {formatPrice(tool.deposit)}
            </span>
          </div>

          <p className="text-muted-foreground leading-relaxed">
            {tool.descriptionKn || tool.description}
          </p>

          {tool.accessories?.length > 0 && (
            <div>
              <h3 className="mb-2 font-semibold">Included Accessories</h3>
              <div className="flex flex-wrap gap-2">
                {tool.accessories.map((a, i) => (
                  <Badge key={i} variant="secondary" className="gap-1">
                    <Check className="h-3 w-3" /> {a}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          <div className="rounded-xl border border-border bg-card p-4 space-y-4">
            <h3 className="font-semibold flex items-center gap-2">
              <Calendar className="h-4 w-4" /> Rental Period
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1.5 block text-xs font-medium">Start Date</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium">End Date</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium">Quick Select</label>
              <div className="grid grid-cols-4 gap-2">
                {renderTiers.map((tier) => (
                  <button
                    key={tier.days}
                    onClick={() => setSelectedDays(tier.days)}
                    className={`rounded-lg border px-2 py-2 text-center text-xs transition-all ${
                      selectedDays === tier.days
                        ? "border-primary bg-primary text-white"
                        : "border-border hover:border-primary"
                    }`}
                  >
                    <div className="font-medium">{tier.label}</div>
                  </button>
                ))}
              </div>
            </div>

            {!endDate && (
              <div className="rounded-lg bg-primary/5 p-3 text-sm">
                <span className="font-medium">Estimated: </span>
                {formatPrice(
                  calculateRentalPrice(
                    tool.pricePerDay,
                    new Date(),
                    new Date(Date.now() + selectedDays * 86400000)
                  ).totalAmount
                )}{" "}
                for {selectedDays} day{selectedDays > 1 ? "s" : ""}
              </div>
            )}
          </div>

          <div className="flex gap-3">
            <Button
              size="lg"
              variant="accent"
              className="flex-1"
              onClick={handleAddToCart}
              disabled={!tool.isActive}
            >
              Add to Cart
            </Button>
            <Button
              size="lg"
              variant="default"
              className="flex-1"
              onClick={handleAddToCart}
              disabled={!tool.isActive}
            >
              Rent Now
            </Button>
          </div>

          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <ShieldCheck className="h-4 w-4 text-success" />
            100% deposit refund on safe return
          </div>
        </motion.div>
      </div>

      <Card className="mt-8 p-6">
        <h3 className="mb-4 font-semibold flex items-center gap-2">
          <Info className="h-4 w-4 text-accent" /> Terms & Conditions
        </h3>
        <div className="space-y-2 text-sm text-muted-foreground">
          <p>• Late return fee: ₹50 per day beyond the rental period</p>
          <p>• Damage to tool will be assessed and deducted from deposit</p>
          <p>• Full deposit refunded within 48 hours of safe return</p>
          <p>• Delivery charges may apply outside 10km radius</p>
          <p>• ID proof (Aadhaar) required for high-value rentals</p>
        </div>
      </Card>
    </div>
  )
}
