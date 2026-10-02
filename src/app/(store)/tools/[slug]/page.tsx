"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import {
  ShieldCheck,
  Calendar,
  ChevronLeft,
  Check,
  Info,
  User as UserIcon,
  Wrench,
  Loader2,
} from "lucide-react"
import { useCartStore } from "@/store/cart"
import { formatPrice, calculateRentalPrice, getLocaleName, getLocaleDescription } from "@/lib/utils"
import { useLocale, useTranslations } from "next-intl"
import { FarmerShell } from "@/components/layout/farmer-shell"
import { ToolImage } from "@/components/ui"
import { BookingBottomSheet } from "@/components/tools/booking-bottom-sheet"

interface ToolOwner {
  id: string
  name: string
}

interface ToolDetail {
  id: string
  name: string
  slug: string
  translations?: Record<string, { name?: string; description?: string }> | null
  description: string
  pricePerDay: number
  deposit: number
  images: string[]
  accessories: string[]
  isActive: boolean
  category: string
  availableCount: number
  specs: Record<string, string>
  requiresCertifiedOperator: boolean
  operatorFeePerDay: number
  toolOwner: ToolOwner | null
  canSelfOperate: boolean
}

const renderTiers = [
  { label: "1 Day", days: 1 },
  { label: "3 Days", days: 3 },
  { label: "1 Wk", days: 7 },
  { label: "1 Mo", days: 30 },
]

type Scenario = "self" | "operator"

export default function ToolDetailPage() {
  const params = useParams()
  const router = useRouter()
  const locale = useLocale()
  const tc = useTranslations("categories")
  const fp = (n: number) => formatPrice(n, locale)
  const addItem = useCartStore((s) => s.addItem)
  const [tool, setTool] = useState<ToolDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedDays, setSelectedDays] = useState(1)
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [scenario, setScenario] = useState<Scenario>("self")
  const [isBookingSheetOpen, setIsBookingSheetOpen] = useState(false)

  useEffect(() => {
    const fetchTool = async () => {
      try {
        const res = await fetch(`/api/tools/${params.slug}`)
        const data = await res.json()
        setTool(data.data)
        if (data.data?.requiresCertifiedOperator) {
          setScenario(data.data.canSelfOperate ? "self" : "operator")
        }
      } catch {
        // Ignored
      } finally {
        setLoading(false)
      }
    }
    fetchTool()
  }, [params.slug])

  if (loading) {
    return (
      <FarmerShell eyebrow="Equipment" title="Loading Tool…">
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </FarmerShell>
    )
  }

  if (!tool) {
    return (
      <FarmerShell eyebrow="Equipment" title="Tool Not Found">
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Wrench size={32} className="text-muted-foreground mb-2" />
          <p className="text-xs text-muted-foreground">The requested machine does not exist.</p>
          <Link
            href="/tools"
            className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline"
          >
            <ChevronLeft size={14} /> Back to Catalog
          </Link>
        </div>
      </FarmerShell>
    )
  }

  const serviceType: "SELF_SERVICE_RENTAL" | "OPERATOR_ONLY" =
    tool.requiresCertifiedOperator && scenario === "operator"
      ? "OPERATOR_ONLY"
      : "SELF_SERVICE_RENTAL"
  const operatorFeePerDay = serviceType === "OPERATOR_ONLY" ? tool.operatorFeePerDay : 0

  const handleAddToCart = () => {
    const sd = startDate ? new Date(startDate) : new Date()
    const ed = endDate
      ? new Date(endDate)
      : new Date(sd.getTime() + selectedDays * 24 * 60 * 60 * 1000)
    const basePricing = calculateRentalPrice(tool.pricePerDay, sd, ed)
    const totalOperatorFee = operatorFeePerDay * basePricing.days
    const totalAmount = basePricing.totalAmount + totalOperatorFee

    addItem({
      id: `${tool.id}-${Date.now()}`,
      toolId: tool.id,
      name: tool.name,
      translations: tool.translations || undefined,
      pricePerDay: tool.pricePerDay,
      deposit: 0,
      image: tool.images?.[0] || "",
      quantity: 1,
      days: basePricing.days,
      startDate: sd,
      endDate: ed,
      serviceType,
      toolOwnerId: tool.toolOwner?.id || "",
      operatorFeePerDay,
      totalOperatorFee,
      discount: basePricing.discount,
      totalAmount,
    })

    router.push("/cart")
  }

  const scenarioEstimate = () => {
    const sd = startDate ? new Date(startDate) : new Date()
    const ed = endDate
      ? new Date(endDate)
      : new Date(sd.getTime() + selectedDays * 24 * 60 * 60 * 1000)
    const basePricing = calculateRentalPrice(tool.pricePerDay, sd, ed)
    const totalOperatorFee = operatorFeePerDay * basePricing.days
    return basePricing.totalAmount + totalOperatorFee
  }

  return (
    <FarmerShell
      eyebrow={tc(tool.category)}
      title={getLocaleName(tool, locale)}
      subtitle={tool.toolOwner?.name ? `Listed by ${tool.toolOwner.name}` : undefined}
      headerRight={
        <Link
          href="/tools"
          className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-card text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft size={16} />
        </Link>
      }
    >
      <div className="flex flex-col gap-4">
        {/* ── Image Gallery ─────────────────────────────────── */}
        <div className="relative aspect-video w-full overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-primary/10 to-accent/10 shadow-sm flex items-center justify-center p-6">
          <ToolImage
            src={tool.images?.[0]}
            alt={tool.name}
            category={tool.category}
            toolName={tool.name}
            className="h-full w-full max-h-[90%] object-contain drop-shadow-md"
            fallbackClassName="h-full w-full max-h-[90%] object-contain drop-shadow-md"
          />
          <span className="absolute right-3 top-3 rounded-full bg-card/90 px-2.5 py-1 text-[10px] font-bold text-primary shadow-sm backdrop-blur-sm border border-border">
            {tool.availableCount > 0 ? `${tool.availableCount} Available` : "Reserved"}
          </span>
        </div>

        {/* ── Pricing & Specs Header ────────────────────────── */}
        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
          <div className="flex items-baseline justify-between">
            <div>
              <span className="font-display text-2xl font-bold text-primary">
                {fp(tool.pricePerDay)}
              </span>
              <span className="text-xs text-muted-foreground"> / day</span>
            </div>
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 dark:bg-emerald-500/20 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">
              ✓ Zero Deposit
            </span>
          </div>

          <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
            {getLocaleDescription(tool, locale)}
          </p>

          {/* Specs tags */}
          {tool.specs && Object.keys(tool.specs).length > 0 && (
            <div className="mt-3 grid grid-cols-2 gap-1.5 border-t border-border/60 pt-2.5">
              {Object.entries(tool.specs).map(([k, v]) => (
                <div key={k} className="rounded-lg bg-background p-2 text-[10px]">
                  <span className="text-muted-foreground uppercase tracking-wider">{k}: </span>
                  <span className="font-bold text-foreground">{v}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Certified Operator Toggle (if applicable) ─────── */}
        {tool.requiresCertifiedOperator && (
          <div className="rounded-2xl border border-secondary/30 bg-secondary/10 p-3.5 shadow-sm text-xs">
            <h4 className="font-display text-xs font-bold text-secondary mb-2 flex items-center gap-1.5">
              <ShieldCheck size={14} /> Certified Operation Mode
            </h4>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setScenario("operator")}
                className={`rounded-xl border p-2.5 text-center transition ${
                  scenario === "operator"
                    ? "border-secondary bg-white text-secondary font-bold shadow-sm"
                    : "border-secondary/30 text-muted-foreground"
                }`}
              >
                <div className="text-xs">With Operator</div>
                <div className="text-[10px] text-muted-foreground">+{fp(tool.operatorFeePerDay)}/d</div>
              </button>
              <button
                type="button"
                disabled={!tool.canSelfOperate}
                onClick={() => setScenario("self")}
                className={`rounded-xl border p-2.5 text-center transition ${
                  scenario === "self"
                    ? "border-primary bg-white text-primary font-bold shadow-sm"
                    : "border-border text-muted-foreground opacity-60"
                }`}
              >
                <div className="text-xs">Self Operate</div>
                <div className="text-[10px]">
                  {tool.canSelfOperate ? "Permission granted" : "Requires owner grant"}
                </div>
              </button>
            </div>
          </div>
        )}

        {/* ── Rental Duration Selector ──────────────────────── */}
        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm text-xs">
          <h4 className="font-display text-xs font-bold text-foreground mb-2 flex items-center gap-1.5">
            <Calendar size={14} className="text-primary" /> Rental Duration
          </h4>
          <div className="grid grid-cols-4 gap-1.5">
            {renderTiers.map((tier) => (
              <button
                key={tier.days}
                type="button"
                onClick={() => setSelectedDays(tier.days)}
                className={`rounded-xl border py-2 text-center text-xs font-bold transition ${
                  selectedDays === tier.days
                    ? "border-primary bg-primary text-white shadow-sm"
                    : "border-border bg-card text-muted-foreground hover:border-primary/40"
                }`}
              >
                {tier.label}
              </button>
            ))}
          </div>

          <div className="mt-3 flex items-center justify-between rounded-xl bg-background p-2.5">
            <span className="text-[11px] text-muted-foreground">Estimated Total:</span>
            <span className="font-display text-sm font-bold text-primary">
              {fp(scenarioEstimate())}
            </span>
          </div>

          <button
            type="button"
            onClick={() => setIsBookingSheetOpen(true)}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-3.5 text-xs font-bold text-white shadow-md transition hover:brightness-110 active:scale-[0.98]"
          >
            <span>Book Now & Reserve</span>
          </button>
          <button
            type="button"
            onClick={handleAddToCart}
            className="mt-2 flex w-full items-center justify-center gap-1 text-[11px] font-semibold text-muted-foreground hover:text-foreground transition"
          >
            Or add to cart for multiple items
          </button>
        </div>

        {/* ── Mobile Instant Booking Bottom Sheet ───────────── */}
        <BookingBottomSheet
          isOpen={isBookingSheetOpen}
          onClose={() => setIsBookingSheetOpen(false)}
          tool={tool}
          initialServiceType={serviceType}
        />
      </div>
    </FarmerShell>
  )
}
