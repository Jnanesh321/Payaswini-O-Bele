"use client"

import { useTranslations } from "next-intl"
import { Sparkles } from "lucide-react"

export interface TaskFilter {
  id: string
  labelEn: string
  labelKn: string
  descEn: string
  descKn: string
  icon: string
  categories: string[] // ToolCategory enum strings
}

export const SEASONAL_TASKS: TaskFilter[] = [
  {
    id: "ALL",
    labelEn: "All Equipment",
    labelKn: "ಎಲ್ಲಾ ಉಪಕರಣಗಳು",
    descEn: "Full catalog",
    descKn: "ಸಂಪೂರ್ಣ ಪಟ್ಟಿ",
    icon: "🌟",
    categories: [],
  },
  {
    id: "HARVEST",
    labelEn: "Arecanut & Coconut Harvest",
    labelKn: "ಅಡಿಕೆ & ತೆಂಗು ಕೊಯ್ಲು",
    descEn: "Poles & climbers",
    descKn: "ಕಾರ್ಬನ್ ಕೋಲುಗಳು",
    icon: "🌾",
    categories: ["CLIMBING_POLES", "HARVESTING_TOOLS"],
  },
  {
    id: "TILLING",
    labelEn: "Soil Prep & Tilling",
    labelKn: "ಉಳುಮೆ & ಸಾಗುವಳಿ",
    descEn: "Tillers & rotavators",
    descKn: "ಪವರ್ ಟಿಲ್ಲರ್ಗಳು",
    icon: "🚜",
    categories: ["TILLERS"],
  },
  {
    id: "WEEDING",
    labelEn: "Weeding & Clearing",
    labelKn: "ಕಳೆ ಕೀಳುವಿಕೆ & ತೆರವು",
    descEn: "Cutters & weeders",
    descKn: "ಬ್ರಶ್ ಕಟ್ಟರ್ಗಳು",
    icon: "🌿",
    categories: ["PRUNERS_CUTTERS"],
  },
  {
    id: "SPRAYING",
    labelEn: "Spraying & Pest Control",
    labelKn: "ಔಷಧ ಸಿಂಪಡಣೆ & ರಕ್ಷಣೆ",
    descEn: "HTP & pumps",
    descKn: "HTP & ಪಂಪ್ಗಳು",
    icon: "💧",
    categories: ["SPRAYERS", "WATER_PUMPS"],
  },
]

interface TaskCarouselProps {
  selectedTaskId: string
  onSelectTask: (task: TaskFilter) => void
  locale?: string
}

export function TaskCarousel({
  selectedTaskId,
  onSelectTask,
  locale = "en",
}: TaskCarouselProps) {
  return (
    <div className="w-full">
      <div className="flex items-center justify-between pb-1.5 px-0.5">
        <span className="text-[11px] font-bold uppercase tracking-wider text-secondary flex items-center gap-1">
          <Sparkles size={12} className="text-accent" />
          {locale === "kn" ? "ಋತುಮಾನದ ಕೃಷಿ ಕೆಲಸಗಳು" : "Seasonal Tasks & Needs"}
        </span>
      </div>

      <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-0.5 no-scrollbar scroll-smooth">
        {SEASONAL_TASKS.map((task) => {
          const isSelected = selectedTaskId === task.id
          const label = locale === "kn" ? task.labelKn : task.labelEn
          const desc = locale === "kn" ? task.descKn : task.descEn

          return (
            <button
              key={task.id}
              type="button"
              onClick={() => onSelectTask(task)}
              className={`group flex shrink-0 items-center gap-2.5 rounded-2xl px-3 py-2 text-left transition-all duration-200 select-none ${
                isSelected
                  ? "bg-[#2D5016] text-white shadow-md ring-2 ring-[#D4A017]/40"
                  : "bg-card border border-border/70 text-foreground hover:border-primary/40 hover:bg-muted/50 shadow-xs"
              }`}
            >
              <span className="text-lg leading-none" role="img" aria-label={label}>
                {task.icon}
              </span>

              <div className="flex flex-col">
                <span
                  className={`font-display text-xs font-bold leading-tight ${
                    isSelected ? "text-white" : "text-foreground group-hover:text-primary"
                  }`}
                >
                  {label}
                </span>
                <span
                  className={`text-[9.5px] leading-tight ${
                    isSelected ? "text-white/80" : "text-muted-foreground"
                  }`}
                >
                  {desc}
                </span>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
