"use client"

import { useState, useEffect } from "react"
import { X } from "lucide-react"
import { Button, Input, Select } from "@/components/ui"
import type { ToolFilters } from "@/types"

interface Category {
  id: string
  name: string
  nameKn?: string | null
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

  const hasFilters = filters.category || filters.minPrice || filters.maxPrice || filters.available

  return (
    <>
      {open && (
        <div className="fixed inset-0 z-40 bg-black/40 lg:hidden" onClick={onClose} />
      )}
      <aside
        className={`
          fixed inset-y-0 left-0 z-50 w-72 -translate-x-full bg-white p-6 shadow-xl transition-transform lg:inset-auto lg:z-auto lg:block lg:w-64 lg:shrink-0 lg:translate-x-0 lg:shadow-none lg:sticky lg:top-24 lg:h-[calc(100vh-8rem)] lg:overflow-y-auto
          ${open ? "translate-x-0" : ""}
        `}
      >
        <div className="mb-6 flex items-center justify-between lg:hidden">
          <h3 className="font-semibold text-foreground">Filters</h3>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="space-y-6">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">
              Category
            </label>
            <Select
              value={filters.category || ""}
              onChange={(e) => update("category", e.target.value)}
            >
              <option value="">All Categories</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.nameKn || cat.name}
                  {cat._count ? ` (${cat._count.tools})` : ""}
                </option>
              ))}
            </Select>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">
              Price Range / Day
            </label>
            <div className="flex items-center gap-2">
              <Input
                placeholder="Min"
                type="number"
                value={filters.minPrice || ""}
                onChange={(e) => update("minPrice", e.target.value)}
              />
              <span className="text-muted-foreground">—</span>
              <Input
                placeholder="Max"
                type="number"
                value={filters.maxPrice || ""}
                onChange={(e) => update("maxPrice", e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">
              Availability
            </label>
            <Select
              value={filters.available || ""}
              onChange={(e) => update("available", e.target.value)}
            >
              <option value="">All</option>
              <option value="true">Available Now</option>
            </Select>
          </div>

          {hasFilters && (
            <Button variant="ghost" size="sm" onClick={clear} className="w-full text-muted-foreground">
              Clear All Filters
            </Button>
          )}
        </div>
      </aside>
    </>
  )
}
