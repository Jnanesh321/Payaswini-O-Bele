"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import { useLocale, useTranslations } from "next-intl"
import { Search, MapPin, ChevronDown, ShoppingBag, User, X, SlidersHorizontal, Sparkles } from "lucide-react"
import { AppLogo } from "@/components/ui/app-logo"
import { useCartStore } from "@/store/cart"
import { ToolCard } from "@/components/tools/tool-card"
import { BottomNav } from "@/components/layout/bottom-nav"
import { LocationSelectorSheet, type TalukOption, REGIONAL_TALUKS } from "./location-selector-sheet"
import { TaskCarousel, type TaskFilter, SEASONAL_TASKS } from "./task-carousel"
import { ActiveRentalBanner, type ActiveBookingData } from "./active-rental-banner"
import type { ToolCard as ToolCardType } from "@/types"

interface UtilityFeedClientProps {
  initialTools: ToolCardType[]
  activeBooking: ActiveBookingData | null
}

export function UtilityFeedClient({ initialTools, activeBooking }: UtilityFeedClientProps) {
  const locale = useLocale()
  const t = useTranslations("homeUtility")
  const itemCount = useCartStore((s) => s.getItemCount())

  // State
  const [selectedLocation, setSelectedLocation] = useState<TalukOption>(REGIONAL_TALUKS[0])
  const [isLocationSheetOpen, setIsLocationSheetOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedTaskId, setSelectedTaskId] = useState<string>("ALL")

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
    return initialTools.filter((tool) => {
      // 1. Task filter
      if (activeTask.categories.length > 0) {
        if (!activeTask.categories.includes(tool.category)) {
          return false
        }
      }

      // 2. Search query filter
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
  }, [initialTools, activeTask, searchQuery])

  return (
    <div className="relative min-h-screen bg-background text-foreground flex flex-col items-center">
      {/* Container restricted to mobile app viewport width on larger screens */}
      <div className="relative flex w-full max-w-[440px] flex-col min-h-screen bg-background border-x border-border/40 shadow-sm">
        
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
              <span className="text-sm leading-none">📍</span>
              <div className="flex flex-col">
                <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground leading-none">
                  {locale === "kn" ? "ಸೇವಾ ಕೇಂದ್ರ" : "Operating Hub"}
                </span>
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

          {/* Lower Row: Embedded Quick Search Field */}
          <div className="relative mt-1 flex items-center">
            <Search size={16} className="absolute left-3.5 text-primary pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t("searchPlaceholder")}
              className="w-full rounded-2xl border border-border/80 bg-card/90 py-2.5 pl-10 pr-9 text-xs text-foreground placeholder:text-muted-foreground shadow-2xs focus:border-primary focus:bg-card focus:outline-hidden transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-3 flex h-5 w-5 items-center justify-center rounded-full bg-muted text-muted-foreground hover:text-foreground"
              >
                <X size={12} />
              </button>
            )}
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

            {/* Utility Tool Cards Grid */}
            {filteredTools.length > 0 ? (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {filteredTools.map((tool, idx) => (
                  <ToolCard
                    key={tool.id}
                    tool={tool}
                    index={idx}
                    variant="utility"
                  />
                ))}
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
        <LocationSelectorSheet
          isOpen={isLocationSheetOpen}
          onClose={() => setIsLocationSheetOpen(false)}
          selectedLocation={selectedLocation.id}
          onSelectLocation={(taluk) => setSelectedLocation(taluk)}
          locale={locale}
        />
      </div>
    </div>
  )
}
