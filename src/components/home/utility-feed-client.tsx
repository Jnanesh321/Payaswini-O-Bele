"use client"

import { useState, useMemo, useCallback, useEffect } from "react"
import Link from "next/link"
import dynamic from "next/dynamic"
import { useLocale, useTranslations } from "next-intl"
import { Search, MapPin, ChevronDown, ShoppingBag, User, X, SlidersHorizontal, Sparkles, Mic } from "lucide-react"
import { AppLogo } from "@/components/ui/app-logo"
import { useCartStore } from "@/store/cart"
import { getLocaleName } from "@/lib/utils"
import { ToolCard } from "@/components/tools/tool-card"
import { BottomNav } from "@/components/layout/bottom-nav"
import { type TalukOption, REGIONAL_TALUKS } from "./location-selector-sheet"
import { TaskCarousel, type TaskFilter, SEASONAL_TASKS } from "./task-carousel"
import { ActiveRentalBanner, type ActiveBookingData } from "./active-rental-banner"
import type { ToolCard as ToolCardType } from "@/types"

const LocationSelectorSheet = dynamic(
  () => import("./location-selector-sheet").then((mod) => mod.LocationSelectorSheet),
  { ssr: false }
)
const BookingBottomSheet = dynamic(
  () => import("@/components/tools/booking-bottom-sheet").then((mod) => mod.BookingBottomSheet),
  { ssr: false }
)
const VoiceSearchModal = dynamic(
  () => import("./voice-search-modal").then((mod) => mod.VoiceSearchModal),
  { ssr: false }
)

interface UtilityFeedClientProps {
  initialTools: ToolCardType[]
  activeBooking: ActiveBookingData | null
}

import { useUserLocation } from "@/hooks/use-user-location"

export function UtilityFeedClient({ initialTools, activeBooking }: UtilityFeedClientProps) {
  const locale = useLocale()
  const t = useTranslations("homeUtility")
  const itemCount = useCartStore((s) => s.getItemCount())
  const { coords: liveGpsCoords, nearestHub: gpsNearestHub } = useUserLocation()

  // State
  const [manualLocation, setManualLocation] = useState<TalukOption | null>(null)
  const [manualGps, setManualGps] = useState<{ latitude: number; longitude: number } | null>(null)
  const selectedLocation = manualLocation || gpsNearestHub || REGIONAL_TALUKS[0]
  const gpsCoords = manualGps || (liveGpsCoords ? { latitude: liveGpsCoords.latitude, longitude: liveGpsCoords.longitude } : null)

  const [isLocationSheetOpen, setIsLocationSheetOpen] = useState(false)
  const [selectedBookingTool, setSelectedBookingTool] = useState<ToolCardType | null>(null)
  const [isBookingSheetOpen, setIsBookingSheetOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedTaskId, setSelectedTaskId] = useState<string>("ALL")
  const [quickTag, setQuickTag] = useState<"ALL" | "FAST" | "ASSURED" | "OPERATOR">("ALL")
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false)

  const handleOpenBooking = useCallback((toolObj?: ToolCardType) => {
    if (toolObj) {
      setSelectedBookingTool(toolObj)
      setIsBookingSheetOpen(true)
    }
  }, [])

  // Switch Language
  const toggleLanguage = () => {
    const nextLocale = locale === "kn" ? "en" : "kn"
    if (typeof document !== "undefined") {
      document.cookie = `NEXT_LOCALE=${nextLocale}; path=/; max-age=${365 * 24 * 60 * 60}; SameSite=Lax`
      window.location.reload()
    }
  }

  // Filtered Tools
  const activeTask = useMemo(
    () => SEASONAL_TASKS.find((task) => task.id === selectedTaskId) || SEASONAL_TASKS[0],
    [selectedTaskId]
  )

  const filteredTools = useMemo(() => {
    return initialTools.filter((tool, idx) => {
      // 1. Task filter
      if (activeTask.categories.length > 0) {
        if (!activeTask.categories.includes(tool.category)) {
          return false
        }
      }

      // 2. Quick tag filter (Instamart style)
      if (quickTag === "FAST") {
        const dist = tool.distanceKm ?? Number((3.2 + ((idx * 1.7) % 7)).toFixed(1))
        if (dist > 5) return false
      } else if (quickTag === "ASSURED") {
        if (!tool.ownerVerified) return false
      } else if (quickTag === "OPERATOR") {
        if (!tool.requiresCertifiedOperator) return false
      }

      // 3. Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim()
        const nameEn = (tool.name || "").toLowerCase()
        const nameKn = ((tool.translations?.kn as { name?: string })?.name || "").toLowerCase()
        const category = (tool.category || "").toLowerCase()
        const desc = (tool.description || "").toLowerCase()
        if (!nameEn.includes(q) && !nameKn.includes(q) && !category.includes(q) && !desc.includes(q)) {
          return false
        }
      }

      return true
    })
  }, [initialTools, activeTask, quickTag, searchQuery])

  return (
    <div className="relative min-h-screen bg-neutral-100/70 dark:bg-neutral-900 text-foreground flex flex-col items-center justify-start">
      {/* Container restricted to mobile app viewport width on larger screens */}
      <div className="relative flex w-full max-w-md mx-auto flex-col min-h-screen bg-[#FAF7F0] dark:bg-background border-x border-neutral-200/80 shadow-md">
        
        {/* ── 1. Top Mobile App Bar (Sticky + pt-safe) ──────────────── */}
        <header className="sticky top-0 z-30 flex flex-col border-b border-border/70 bg-background/95 backdrop-blur-md pt-safe px-4 pb-3 shadow-xs">
          {/* Upper Row: Location + Brand Logo + Actions */}
          <div className="flex items-center justify-between py-2 gap-2">
            {/* Location Selector Trigger */}
            <button
              type="button"
              onClick={() => setIsLocationSheetOpen(true)}
              className="flex items-center gap-1.5 rounded-full border border-border/80 bg-card px-2.5 py-1 text-left shadow-2xs hover:border-primary/50 transition active:scale-98"
            >
              <div className="relative flex items-center justify-center">
                <span className="text-sm leading-none">📍</span>
                {gpsCoords && (
                  <span className="absolute -top-1 -right-1 flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                )}
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-1">
                  <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground leading-none">
                    {locale === "kn" ? "ಸೇವಾ ಕೇಂದ್ರ" : "Operating Hub"}
                  </span>
                  {gpsCoords && (
                    <span className="text-[8px] bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-400 font-extrabold px-1 rounded leading-none">
                      GPS
                    </span>
                  )}
                </div>
                <span className="font-display text-xs font-bold text-foreground leading-tight flex items-center gap-0.5">
                  <span className="max-w-[130px] truncate">
                    {locale === "kn" ? selectedLocation.nameKn : selectedLocation.name}
                  </span>
                  <ChevronDown size={13} className="text-muted-foreground shrink-0" />
                </span>
              </div>
            </button>

            {/* Right Action Icons: Language Toggle + Cart + Account */}
            <div className="flex items-center gap-1.5">
              {/* Language Switcher Button */}
              <button
                type="button"
                onClick={toggleLanguage}
                title="Switch Language"
                className="flex h-7 items-center justify-center rounded-lg border border-border/80 bg-card px-2 text-[11px] font-bold text-foreground hover:bg-muted active:scale-95 transition"
              >
                <span className={locale === "kn" ? "text-primary font-extrabold" : "text-muted-foreground"}>
                  KN
                </span>
                <span className="mx-0.5 text-muted-foreground/60">|</span>
                <span className={locale === "en" ? "text-primary font-extrabold" : "text-muted-foreground"}>
                  EN
                </span>
              </button>

              {/* Cart Icon */}
              <Link
                href="/cart"
                className="relative flex h-8 w-8 items-center justify-center rounded-full bg-card border border-border/80 text-foreground hover:bg-muted active:scale-95 transition"
                aria-label="Cart"
              >
                <ShoppingBag size={17} />
                {itemCount > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[9px] font-bold text-accent-foreground shadow-xs">
                    {itemCount > 9 ? "9+" : itemCount}
                  </span>
                )}
              </Link>

              {/* Profile Icon */}
              <Link
                href="/dashboard#account"
                className="flex h-8 w-8 items-center justify-center rounded-full bg-card border border-border/80 text-foreground hover:bg-muted active:scale-95 transition"
                aria-label="Profile"
              >
                <User size={17} />
              </Link>
            </div>
          </div>

          {/* Lower Row: Embedded Quick Search Field with Mic Button */}
          <div className="relative mt-1 flex items-center">
            <Search size={16} className="absolute left-3.5 text-primary pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={locale === "kn" ? "ಉಪಕರಣ ಅಥವಾ ಧ್ವನಿ ಮೂಲಕ ಹುಡುಕಿ..." : "Search machinery or tap mic..."}
              className="w-full rounded-2xl border border-border/80 bg-card/90 py-2.5 pl-10 pr-16 text-xs text-foreground placeholder:text-muted-foreground shadow-2xs focus:border-primary focus:bg-card focus:outline-hidden transition-all"
            />
            <div className="absolute right-2 flex items-center gap-1">
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="flex h-5 w-5 items-center justify-center rounded-full bg-muted text-muted-foreground hover:text-foreground"
                >
                  <X size={12} />
                </button>
              )}
              {/* Vernacular Voice Mic Button */}
              <button
                type="button"
                onClick={() => setIsVoiceModalOpen(true)}
                title={locale === "kn" ? "ಧ್ವನಿ ಹುಡುಕಾಟ" : "Voice Search"}
                className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-primary hover:bg-primary/20 active:scale-95 transition"
              >
                <Mic size={14} className="text-primary" />
              </button>
            </div>
          </div>

          {/* Quick-Commerce Filter Chips (Instamart Style) */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-2 pb-0.5">
            {[
              { id: "ALL", labelEn: "All", labelKn: "ಎಲ್ಲವೂ", icon: null },
              { id: "FAST", labelEn: "⚡ Fast Dispatch", labelKn: "⚡ ತ್ವರಿತ ಸೇವೆ", icon: null },
              { id: "ASSURED", labelEn: "🛡️ Assured", labelKn: "🛡️ ಖಚಿತ", icon: null },
              { id: "OPERATOR", labelEn: "👨‍🌾 Operator", labelKn: "👨‍🌾 ಆಪರೇಟರ್", icon: null },
            ].map((chip) => {
              const isSelected = quickTag === chip.id
              return (
                <button
                  key={chip.id}
                  type="button"
                  onClick={() => setQuickTag(chip.id as "ALL" | "FAST" | "ASSURED" | "OPERATOR")}
                  className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold transition-all ${
                    isSelected
                      ? "bg-primary text-primary-foreground shadow-2xs"
                      : "border border-border/80 bg-card text-muted-foreground hover:text-foreground hover:border-primary/40"
                  }`}
                >
                  {locale === "kn" ? chip.labelKn : chip.labelEn}
                </button>
              )
            })}
          </div>
        </header>

        {/* ── 2. Scrollable Body Content (High density) ─────────────── */}
        <main className="flex-1 px-4 py-3 space-y-4 pb-28">
          
          {/* Active Booking Banner (if ongoing rental) */}
          <ActiveRentalBanner booking={activeBooking} locale={locale} />

          {/* Seasonal Task / Crop Quick-Filters Carousel */}
          <TaskCarousel
            selectedTaskId={selectedTaskId}
            onSelectTask={(task) => setSelectedTaskId(task.id)}
            locale={locale}
          />

          {/* Section: Available Near You Today */}
          <div>
            <div className="mb-2.5 flex items-center justify-between px-0.5">
              <div className="flex items-center gap-1.5">
                <h2 className="font-display text-sm font-bold text-foreground">
                  {t("availableNearYou")}
                </h2>
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-extrabold text-primary">
                  {filteredTools.length}
                </span>
              </div>

              <Link
                href="/tools"
                className="text-[11px] font-bold text-primary hover:underline flex items-center gap-0.5"
              >
                <span>{locale === "kn" ? "ಎಲ್ಲಾ ಉಪಕರಣಗಳು" : "Catalog"}</span>
              </Link>
            </div>

            {/* Utility Tool Cards 1-Column Vertical List */}
            {filteredTools.length > 0 ? (
              <div className="flex flex-col gap-3.5">
                {filteredTools.map((tool, idx) => {
                  const dailyRateInRupees =
                    tool.pricePerDay >= 1000 ? Math.round(tool.pricePerDay / 100) : tool.pricePerDay;
                  const depositInRupees =
                    tool.deposit >= 10000 ? Math.round(tool.deposit / 100) : (tool.deposit || 1000);
                  const distanceKm =
                    tool.distanceKm ?? Number((3.2 + ((idx * 1.7) % 7)).toFixed(1));

                  return (
                    <ToolCard
                      key={tool.id}
                      id={tool.id}
                      slug={tool.slug}
                      title={getLocaleName(tool, locale)}
                      imageUrl={tool.images?.[0] || tool.thumbnailUrl || null}
                      ownerName={tool.owner?.name || "Verified Owner"}
                      ownerVerified={tool.owner?.isVerified ?? true}
                      taluk={tool.taluk || "Kasaragod"}
                      distanceKm={distanceKm}
                      dailyRate={dailyRateInRupees}
                      deposit={depositInRupees}
                      allowsSelfOperate={tool.canSelfOperate ?? !tool.requiresCertifiedOperator}
                      requiresCertifiedOperator={tool.requiresCertifiedOperator}
                      onBook={handleOpenBooking}
                      tool={tool}
                    />
                  )
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card/60 p-8 text-center">
                <span className="text-3xl mb-2">🚜</span>
                <p className="font-display text-xs font-bold text-foreground">
                  {locale === "kn" ? "ಯಾವುದೇ ಉಪಕರಣಗಳು ಕಂಡುಬಂದಿಲ್ಲ" : "No equipment matching filter"}
                </p>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  {locale === "kn"
                    ? "ದಯವಿಟ್ಟು ನಿಮ್ಮ ಹುಡುಕಾಟ ಪದ ಅಥವಾ ಕಾರ್ಯ ಫಿಲ್ಟರ್ ಅನ್ನು ಬದಲಾಯಿಸಿ."
                    : "Try selecting another seasonal task or clearing the search query."}
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery("")
                    setSelectedTaskId("ALL")
                  }}
                  className="mt-3 rounded-xl bg-primary px-3 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-primary/90 transition"
                >
                  {locale === "kn" ? "ಫಿಲ್ಟರ್ ತೆರವುಗೊಳಿಸಿ" : "Reset Filters"}
                </button>
              </div>
            )}
          </div>
        </main>

        {/* ── 3. Persistent Bottom Navigation Bar ─────────────────────── */}
        <BottomNav />

        {/* ── 4. Location Selector Bottom Sheet ─────────────────────── */}
        {isLocationSheetOpen && (
          <LocationSelectorSheet
            isOpen={isLocationSheetOpen}
            onClose={() => setIsLocationSheetOpen(false)}
            selectedLocation={selectedLocation.id}
            onSelectLocation={(taluk, coords) => {
              setManualLocation(taluk)
              if (coords) setManualGps(coords)
            }}
            locale={locale}
          />
        )}

        {/* ── 5. Booking Bottom Sheet (Figma Spec) ──────────────────── */}
        {isBookingSheetOpen && selectedBookingTool && (
          <BookingBottomSheet
            isOpen={isBookingSheetOpen}
            onClose={() => setIsBookingSheetOpen(false)}
            tool={selectedBookingTool}
          />
        )}

        {/* ── 6. Vernacular Voice Search Modal ──────────────────────── */}
        {isVoiceModalOpen && (
          <VoiceSearchModal
            isOpen={isVoiceModalOpen}
            onClose={() => setIsVoiceModalOpen(false)}
            onSelectQuery={(q) => setSearchQuery(q)}
            locale={locale}
          />
        )}
      </div>
    </div>
  )
}
