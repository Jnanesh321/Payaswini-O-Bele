"use client"

import { Clock } from "lucide-react"

export type ShiftType = "MORNING" | "AFTERNOON" | "FULL_DAY" | "MULTI_DAY"

export interface ShiftOption {
  id: ShiftType
  icon: string
  labelEn: string
  labelKn: string
  timeEn: string
  timeKn: string
  daysMultiplier: number
  badge?: string
}

export const FARM_SHIFTS: ShiftOption[] = [
  {
    id: "MORNING",
    icon: "🌅",
    labelEn: "Morning Shift",
    labelKn: "ಬೆಳಗಿನ ಪಾಳಿ",
    timeEn: "6:00 AM – 12:00 PM",
    timeKn: "ಬೆಳಗ್ಗೆ 6:00 – ಮಧ್ಯಾಹ್ನ 12:00",
    daysMultiplier: 0.6,
    badge: "Popular",
  },
  {
    id: "AFTERNOON",
    icon: "☀️",
    labelEn: "Afternoon Shift",
    labelKn: "ಮಧ್ಯಾಹ್ನದ ಪಾಳಿ",
    timeEn: "1:00 PM – 6:30 PM",
    timeKn: "ಮಧ್ಯಾಹ್ನ 1:00 – ಸಂಜೆ 6:30",
    daysMultiplier: 0.6,
  },
  {
    id: "FULL_DAY",
    icon: "🚜",
    labelEn: "Full Day",
    labelKn: "ಪೂರ್ಣ ದಿನ",
    timeEn: "6:00 AM – 6:00 PM",
    timeKn: "ಬೆಳಗ್ಗೆ 6:00 – ಸಂಜೆ 6:00",
    daysMultiplier: 1.0,
    badge: "Best Value",
  },
  {
    id: "MULTI_DAY",
    icon: "⚡",
    labelEn: "2-Day Intensive",
    labelKn: "2-ದಿನದ ಪ್ಯಾಕೇಜ್",
    timeEn: "2 Full Days",
    timeKn: "2 ಪೂರ್ಣ ದಿನಗಳು",
    daysMultiplier: 1.85,
    badge: "15% Off",
  },
]

interface ShiftSelectorProps {
  selectedShift: ShiftType
  onSelectShift: (shift: ShiftType) => void
  baseDailyRatePaise: number
  locale: string
}

export function ShiftSelector({
  selectedShift,
  onSelectShift,
  baseDailyRatePaise,
  locale,
}: ShiftSelectorProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
          <Clock size={13} className="text-primary" />
          <span>{locale === "kn" ? "ಕೆಲಸದ ಪಾಳಿ ಆಯ್ಕೆಮಾಡಿ" : "Select Farm Shift"}</span>
        </label>
        <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
          {locale === "kn" ? "ಫ್ಲೆಕ್ಸಿಬಲ್ ಗಂಟೆಗಳು" : "Flexible Field Hours"}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {FARM_SHIFTS.map((shift) => {
          const isSelected = selectedShift === shift.id
          const calculatedPriceRupees = Math.round(
            (baseDailyRatePaise * shift.daysMultiplier) / 100
          )

          return (
            <button
              key={shift.id}
              type="button"
              onClick={() => onSelectShift(shift.id)}
              className={`relative flex flex-col items-start rounded-2xl border p-2.5 text-left transition-all active:scale-98 ${
                isSelected
                  ? "border-primary bg-primary/10 ring-2 ring-primary/20 shadow-xs"
                  : "border-border/80 bg-card hover:border-primary/40"
              }`}
            >
              {/* Badge if present */}
              {shift.badge && (
                <span
                  className={`absolute -top-2 right-2 rounded-full px-1.5 py-0.2 text-[9px] font-extrabold ${
                    isSelected
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground border border-border"
                  }`}
                >
                  {shift.badge}
                </span>
              )}

              <div className="flex items-center gap-1.5">
                <span className="text-base leading-none">{shift.icon}</span>
                <span className="font-display text-xs font-bold text-foreground">
                  {locale === "kn" ? shift.labelKn : shift.labelEn}
                </span>
              </div>

              <span className="mt-1 text-[10px] font-medium text-muted-foreground">
                {locale === "kn" ? shift.timeKn : shift.timeEn}
              </span>

              <div className="mt-1.5 flex items-baseline gap-1">
                <span className="text-xs font-extrabold text-primary">
                  ₹{calculatedPriceRupees.toLocaleString("en-IN")}
                </span>
                <span className="text-[9px] text-muted-foreground">est.</span>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
