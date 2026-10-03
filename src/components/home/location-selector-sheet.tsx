"use client"

import { useState } from "react"
import { MapPin, Check, X, Search, Navigation, Loader2, Sparkles } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { useUserLocation, calculateDistanceKm } from "@/hooks/use-user-location"

export interface TalukOption {
  id: string
  name: string
  nameKn: string
  district: "Kasaragod" | "Dakshina Kannada"
  distanceApprox?: string
  lat: number
  lng: number
}

export const REGIONAL_TALUKS: TalukOption[] = [
  // Kasaragod District (Kerala)
  { id: "kumble", name: "Kumble / Kalathur", nameKn: "ಕುಂಬಳೆ / ಕಾಳತ್ತೂರು", district: "Kasaragod", distanceApprox: "Primary Hub", lat: 12.5937, lng: 74.9458 },
  { id: "manjeshwar", name: "Manjeshwar", nameKn: "ಮಂಜೇಶ್ವರ", district: "Kasaragod", distanceApprox: "8-12 km", lat: 12.7153, lng: 74.8872 },
  { id: "kasaragod_town", name: "Kasaragod Town", nameKn: "ಕಾಸರಗೋಡು ನಗರ", district: "Kasaragod", distanceApprox: "10-14 km", lat: 12.4996, lng: 74.9869 },
  { id: "badiadka", name: "Badiadka", nameKn: "ಬದಿಯಡ್ಕ", district: "Kasaragod", distanceApprox: "12-16 km", lat: 12.5843, lng: 75.0536 },
  
  // Dakshina Kannada District (Karnataka)
  { id: "puttur", name: "Puttur", nameKn: "ಪುತ್ತೂರು", district: "Dakshina Kannada", distanceApprox: "45-50 km", lat: 12.7687, lng: 75.2071 },
  { id: "sullia", name: "Sullia", nameKn: "ಸುಳ್ಯ", district: "Dakshina Kannada", distanceApprox: "55-60 km", lat: 12.5606, lng: 75.3908 },
  { id: "bantwal", name: "Bantwal", nameKn: "ಬಂಟ್ವಾಳ", district: "Dakshina Kannada", distanceApprox: "40-45 km", lat: 12.8943, lng: 75.0345 },
  { id: "belthangady", name: "Belthangady", nameKn: "ಬೆಳ್ತಂಗಡಿ", district: "Dakshina Kannada", distanceApprox: "60-65 km", lat: 12.9991, lng: 75.2635 },
  { id: "mangaluru", name: "Mangaluru Rural", nameKn: "ಮಂಗಳೂರು ಗ್ರಾಮಾಂತರ", district: "Dakshina Kannada", distanceApprox: "35-40 km", lat: 12.9141, lng: 74.8560 },
]

interface LocationSelectorSheetProps {
  isOpen: boolean
  onClose: () => void
  selectedLocation: string
  onSelectLocation: (taluk: TalukOption, coords?: { latitude: number; longitude: number }) => void
  locale?: string
}

export function LocationSelectorSheet({
  isOpen,
  onClose,
  selectedLocation,
  onSelectLocation,
  locale = "en",
}: LocationSelectorSheetProps) {
  const [filterQuery, setFilterQuery] = useState("")
  const [activeDistrict, setActiveDistrict] = useState<"ALL" | "Kasaragod" | "Dakshina Kannada">("ALL")
  const { coords, isLocating, errorMessage, detectLocation } = useUserLocation()

  const handleGpsDetect = async () => {
    try {
      const res = await detectLocation()
      onSelectLocation(res.nearestHub, res.coords)
      onClose()
    } catch {
      // Error handled in hook state
    }
  }

  const filteredTaluks = REGIONAL_TALUKS.filter((t) => {
    const matchesDistrict = activeDistrict === "ALL" || t.district === activeDistrict
    const matchesText =
      t.name.toLowerCase().includes(filterQuery.toLowerCase()) ||
      t.nameKn.includes(filterQuery) ||
      t.district.toLowerCase().includes(filterQuery.toLowerCase())
    return matchesDistrict && matchesText
  })

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-xs sm:items-center p-0 sm:p-4">
          {/* Backdrop tap to close */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0"
          />

          {/* Sheet Modal */}
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 26, stiffness: 280 }}
            className="relative z-10 flex max-h-[85vh] w-full max-w-md flex-col rounded-t-[28px] sm:rounded-2xl border border-border bg-card shadow-2xl overflow-hidden pb-safe"
          >
            {/* Grab Handle */}
            <div className="mx-auto mt-2.5 h-1.5 w-12 rounded-full bg-muted-foreground/30 sm:hidden" />

            {/* Header */}
            <div className="flex items-center justify-between border-b border-border/70 px-5 py-3.5">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <MapPin size={18} />
                </div>
                <div>
                  <h3 className="font-display text-sm font-bold text-foreground">
                    {locale === "kn" ? "ಸೇವಾ ಕೇಂದ್ರವನ್ನು ಆಯ್ಕೆಮಾಡಿ" : "Select Operating Cluster"}
                  </h3>
                  <p className="text-[11px] text-muted-foreground">
                    {locale === "kn" ? "ಕಾಸರಗೋಡು ಮತ್ತು ದಕ್ಷಿಣ ಕನ್ನಡ ಪ್ರದೇಶಗಳು" : "Kasaragod & Dakshina Kannada Hubs"}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-muted/60 text-muted-foreground hover:bg-muted"
              >
                <X size={16} />
              </button>
            </div>

            {/* ── GPS Auto-Detect Button Card ──────────────── */}
            <div className="px-5 py-3 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border-b border-border/70">
              <button
                type="button"
                onClick={handleGpsDetect}
                disabled={isLocating}
                className="w-full flex items-center justify-between p-3 rounded-2xl bg-white dark:bg-card border-2 border-primary/40 shadow-xs hover:border-primary hover:shadow-md transition-all active:scale-[0.98] group text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-white shadow-xs group-hover:scale-105 transition-transform">
                    {isLocating ? (
                      <Loader2 size={18} className="animate-spin" />
                    ) : (
                      <Navigation size={18} className="fill-white" />
                    )}
                    {!isLocating && (
                      <span className="absolute -top-1 -right-1 flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                      </span>
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <p className="font-display text-xs font-bold text-foreground">
                        {locale === "kn" ? "ನನ್ನ ಪ್ರಸ್ತುತ ಸ್ಥಳವನ್ನು ಪತ್ತೆಹಚ್ಚಿ (GPS)" : "Use Current Location (GPS)"}
                      </p>
                      <span className="rounded bg-emerald-100 dark:bg-emerald-950/60 px-1.5 py-0.2 text-[9px] font-extrabold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">
                        Auto
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      {isLocating
                        ? (locale === "kn" ? "GPS ಉಪಗ್ರಹಗಳ ಮೂಲಕ ಹುಡುಕಲಾಗುತ್ತಿದೆ..." : "Detecting nearest farm hub via GPS...")
                        : coords
                        ? `${locale === "kn" ? "ಪತ್ತೆಯಾಗಿದೆ" : "Detected"}: (${coords.latitude.toFixed(3)}° N, ${coords.longitude.toFixed(3)}° E)`
                        : (locale === "kn" ? "ಬ್ರೌಸರ್ ಅನುಮತಿ ಪಡೆದು ಹತ್ತಿರದ ಕೇಂದ್ರ ಆಯ್ಕೆಮಾಡಿ" : "Tap to find nearest hub & dispatch time")}
                    </p>
                  </div>
                </div>

                <div className="flex items-center text-primary font-bold text-xs pl-2">
                  <Sparkles size={16} />
                </div>
              </button>

              {errorMessage && (
                <p className="mt-2 text-[11px] font-medium text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 p-2 rounded-xl border border-amber-200 dark:border-amber-900/50">
                  ⚠️ {errorMessage}
                </p>
              )}
            </div>

            {/* District Quick Toggle */}
            <div className="flex items-center gap-1.5 border-b border-border/50 px-5 py-2.5 overflow-x-auto no-scrollbar">
              {(["ALL", "Kasaragod", "Dakshina Kannada"] as const).map((dist) => (
                <button
                  key={dist}
                  type="button"
                  onClick={() => setActiveDistrict(dist)}
                  className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold transition-all ${
                    activeDistrict === dist
                      ? "bg-primary text-white shadow-xs"
                      : "bg-muted text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {dist === "ALL" ? (locale === "kn" ? "ಎಲ್ಲಾ ಪ್ರದೇಶಗಳು" : "All Areas") : dist}
                </button>
              ))}
            </div>

            {/* Search Taluk Input */}
            <div className="px-5 pt-3 pb-2">
              <div className="relative flex items-center">
                <Search size={15} className="absolute left-3 text-muted-foreground" />
                <input
                  type="text"
                  value={filterQuery}
                  onChange={(e) => setFilterQuery(e.target.value)}
                  placeholder={locale === "kn" ? "ತಾಲೂಕು ಅಥವಾ ಗ್ರಾಮವನ್ನು ಹುಡುಕಿ..." : "Search taluk or hub..."}
                  className="w-full rounded-xl border border-border bg-muted/40 py-2 pl-9 pr-3 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-hidden"
                />
              </div>
            </div>

            {/* Taluk List */}
            <div className="flex-1 overflow-y-auto px-4 py-2 space-y-1.5 max-h-[340px]">
              {filteredTaluks.map((taluk) => {
                const isSelected = selectedLocation === taluk.id || selectedLocation === taluk.name
                const liveDistance = coords ? calculateDistanceKm(coords.latitude, coords.longitude, taluk.lat, taluk.lng) : null

                return (
                  <button
                    key={taluk.id}
                    type="button"
                    onClick={() => {
                      onSelectLocation(taluk, coords ? { latitude: coords.latitude, longitude: coords.longitude } : undefined)
                      onClose()
                    }}
                    className={`group flex w-full items-center justify-between rounded-xl p-3 text-left transition-all ${
                      isSelected
                        ? "border border-primary/40 bg-primary/8 text-primary shadow-xs"
                        : "border border-transparent bg-card hover:bg-muted/40 text-foreground"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${
                          isSelected ? "bg-primary text-white" : "bg-muted/80 text-muted-foreground group-hover:text-primary"
                        }`}
                      >
                        <MapPin size={14} />
                      </div>
                      <div>
                        <p className="font-display text-xs font-bold leading-tight">
                          {locale === "kn" ? taluk.nameKn : taluk.name}
                        </p>
                        <div className="mt-0.5 flex items-center gap-2 text-[10px] text-muted-foreground">
                          <span>{taluk.district}</span>
                          {liveDistance !== null ? (
                            <>
                              <span>•</span>
                              <span className="font-bold text-emerald-600 dark:text-emerald-400">
                                📍 {liveDistance} km away
                              </span>
                            </>
                          ) : taluk.distanceApprox ? (
                            <>
                              <span>•</span>
                              <span className="font-medium text-accent-foreground">{taluk.distanceApprox}</span>
                            </>
                          ) : null}
                        </div>
                      </div>
                    </div>

                    {isSelected && (
                      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-white">
                        <Check size={14} strokeWidth={2.6} />
                      </div>
                    )}
                  </button>
                )
              })}

              {filteredTaluks.length === 0 && (
                <div className="py-8 text-center text-xs text-muted-foreground">
                  {locale === "kn" ? "ಯಾವುದೇ ಪ್ರದೇಶಗಳು ಕಂಡುಬಂದಿಲ್ಲ" : "No matching taluk found"}
                </div>
              )}
            </div>

            {/* Bottom Info note */}
            <div className="border-t border-border/60 bg-muted/30 px-5 py-2.5 text-center text-[11px] text-muted-foreground">
              {locale === "kn"
                ? "ಉಪಕರಣಗಳು ಕೃಷಿ ಸೇವಾ ಕೇಂದ್ರಗಳಿಂದ ನೇರವಾಗಿ ಲಭ್ಯವಿರುತ್ತವೆ."
                : "Equipment dispatched directly from local cooperative farm hubs."}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
