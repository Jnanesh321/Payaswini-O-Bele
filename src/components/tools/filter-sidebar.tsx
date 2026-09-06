"use client"

import { useState, useEffect } from "react"
import { X, RotateCcw, Check } from "lucide-react"
import { Button, Input, Select } from "@/components/ui"
import type { ToolFilters } from "@/types"

interface Category {
  id: string
  name: string
  slug: string
  _count?: { tools: number }
}

interface FilterSidebarProps {
  filters: ToolFilters
  onFiltersChange: (filters: ToolFilters) => void
  open: boolean
  onClose: () => void
}

export function FilterSidebar({ filters, onFiltersChange, open, onClose }: FilterSidebarProps) {
  const [categories, setCategories] = useState<Category[]>([])

  useEffect(() => {
    fetch("/api/categories")
      .then((r) => r.json())
      .then((res) => {
        if (res.success) setCategories(res.data || [])
      })
      .catch(() => {})
  }, [])

  const update = (key: keyof ToolFilters, value: string) => {
    onFiltersChange({ ...filters, [key]: value })
  }

  const clear = () => {
    onFiltersChange({ category: "", minPrice: "", maxPrice: "", available: "" })
  }

  const hasFilters = Boolean(
    filters.category || filters.minPrice || filters.maxPrice || filters.available
  )

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      {/* Backdrop click dismiss */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Modal Dialog / Sheet */}
      <div className="relative z-10 w-full max-w-[430px] rounded-t-[28px] sm:rounded-[28px] border border-border bg-card p-6 shadow-2xl max-h-[85vh] overflow-y-auto animate-in slide-in-from-bottom-6 duration-200">
        <div className="mb-5 flex items-center justify-between border-b border-border pb-3">
          <div>
            <h3 className="font-display text-lg font-bold text-foreground">Filter Equipment</h3>
            <p className="text-xs text-muted-foreground">Narrow down machinery by type & rate</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
          >
            <X size={16} />
          </button>
        </div>

        <div className="space-y-5">
          {/* Category */}
          <div>
            <label className="mb-1.5 block text-xs font-bold text-foreground uppercase tracking-wider">
              Category
            </label>
            <Select
              value={filters.category || ""}
              onChange={(e) => update("category", e.target.value)}
              className="w-full rounded-xl border border-border bg-background py-2 text-sm"
            >
              <option value="">All Categories</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name} {cat._count ? `(${cat._count.tools})` : ""}
                </option>
              ))}
            </Select>
          </div>

          {/* Price Range */}
          <div>
            <label className="mb-1.5 block text-xs font-bold text-foreground uppercase tracking-wider">
              Daily Rate (₹ / day)
            </label>
            <div className="flex items-center gap-2">
              <Input
                placeholder="Min ₹"
                type="number"
                value={filters.minPrice || ""}
                onChange={(e) => update("minPrice", e.target.value)}
                className="w-full rounded-xl"
              />
              <span className="text-muted-foreground font-bold">—</span>
              <Input
                placeholder="Max ₹"
                type="number"
                value={filters.maxPrice || ""}
                onChange={(e) => update("maxPrice", e.target.value)}
                className="w-full rounded-xl"
              />
            </div>
          </div>

          {/* Availability */}
          <div>
            <label className="mb-1.5 block text-xs font-bold text-foreground uppercase tracking-wider">
              Availability
            </label>
            <Select
              value={filters.available || ""}
              onChange={(e) => update("available", e.target.value)}
              className="w-full rounded-xl border border-border bg-background py-2 text-sm"
            >
              <option value="">All Statuses</option>
              <option value="true">Available Now Only</option>
            </Select>
          </div>

          {/* Actions */}
          <div className="mt-6 flex items-center gap-2.5 pt-2">
            {hasFilters && (
              <Button
                variant="outline"
                onClick={clear}
                className="flex-1 rounded-xl gap-1 text-xs font-bold"
              >
                <RotateCcw size={14} /> Clear
              </Button>
            )}
            <Button
              onClick={onClose}
              className="flex-1 rounded-xl bg-primary text-white hover:bg-primary/90 gap-1 text-xs font-bold shadow-sm"
            >
              <Check size={14} /> Apply Filters
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
