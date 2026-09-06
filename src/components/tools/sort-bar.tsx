"use client"

import { useEffect, useState } from "react"
import { useTranslations } from "next-intl"
import { Search, SlidersHorizontal, ArrowUpDown } from "lucide-react"
import { Button, Input, Select } from "@/components/ui"

interface SortBarProps {
  onSearchChange: (value: string) => void
  sortBy: string
  onSortChange: (value: string) => void
  totalResults: number
  activeFilterCount?: number
  onToggleFilters: () => void
}

export function SortBar({
  onSearchChange,
  sortBy,
  onSortChange,
  totalResults,
  activeFilterCount = 0,
  onToggleFilters,
}: SortBarProps) {
  const t = useTranslations("tools")
  const [input, setInput] = useState("")

  useEffect(() => {
    const timer = setTimeout(() => onSearchChange(input), 300)
    return () => clearTimeout(timer)
  }, [input, onSearchChange])

  return (
    <div className="flex flex-col gap-2.5">
      {/* Search + Filter Trigger */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={t("searchPlaceholder")}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="pl-9 h-10 rounded-xl bg-card border-border text-sm"
          />
        </div>
        <Button
          type="button"
          variant={activeFilterCount > 0 ? "default" : "outline"}
          size="sm"
          className={`h-10 px-3.5 rounded-xl gap-1.5 shrink-0 ${
            activeFilterCount > 0 ? "bg-primary text-white" : "bg-card border-border"
          }`}
          onClick={onToggleFilters}
        >
          <SlidersHorizontal className="h-4 w-4" />
          <span className="text-xs font-semibold">Filter</span>
          {activeFilterCount > 0 && (
            <span className="flex h-4 w-4 items-center justify-center rounded-full bg-accent text-[9px] font-bold text-white">
              {activeFilterCount}
            </span>
          )}
        </Button>
      </div>

      {/* Sort + Count Bar */}
      <div className="flex items-center justify-between gap-2 px-0.5">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span className="font-semibold text-foreground">{totalResults}</span>
          <span>{totalResults === 1 ? t("result") : t("results")}</span>
        </div>

        <div className="flex items-center gap-1.5">
          <ArrowUpDown className="h-3 w-3 text-muted-foreground" />
          <select
            value={sortBy}
            onChange={(e) => onSortChange(e.target.value)}
            className="h-8 rounded-lg border border-border bg-card px-2 text-xs font-semibold text-foreground outline-none cursor-pointer"
          >
            <option value="popular">{t("sortPopular")}</option>
            <option value="price_asc">{t("sortPriceLow")}</option>
            <option value="price_desc">{t("sortPriceHigh")}</option>
            <option value="newest">{t("sortNewest")}</option>
          </select>
        </div>
      </div>
    </div>
  )
}
