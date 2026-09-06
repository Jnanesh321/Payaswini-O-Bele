"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Skeleton } from "@/components/ui"
import { ToolCard } from "./tool-card"
import { FilterSidebar } from "./filter-sidebar"
import { SortBar } from "./sort-bar"
import { PaginationBar } from "./pagination-bar"
import type { ToolCard as ToolCardType, ToolFilters, PaginationMeta } from "@/types"

const quickCategories = [
  { id: "", label: "All Tools" },
  { id: "CLIMBING_POLES", label: "Climbing Poles" },
  { id: "SPRAYERS", label: "Sprayers" },
  { id: "TILLERS", label: "Power Tillers" },
  { id: "PRUNERS_CUTTERS", label: "Weed Cutters" },
  { id: "WATER_PUMPS", label: "Water Pumps" },
  { id: "HARVESTING_TOOLS", label: "Harvesters" },
]

export function ToolsContent() {
  const [tools, setTools] = useState<ToolCardType[]>([])
  const [meta, setMeta] = useState<PaginationMeta>({ page: 1, limit: 12, total: 0, totalPages: 0 })
  const [loading, setLoading] = useState(true)
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const [sortBy, setSortBy] = useState("popular")
  const [showFilters, setShowFilters] = useState(false)
  const [filters, setFilters] = useState<ToolFilters>({
    category: "",
    minPrice: "",
    maxPrice: "",
    available: "",
  })
  const [page, setPage] = useState(1)

  const activeFilterCount = [
    Boolean(filters.category),
    Boolean(filters.minPrice),
    Boolean(filters.maxPrice),
    Boolean(filters.available),
  ].filter(Boolean).length

  const handleFiltersChange = (newFilters: ToolFilters) => {
    setFilters(newFilters)
    setPage(1)
  }

  const handleQuickCategorySelect = (catId: string) => {
    setFilters((prev) => ({ ...prev, category: catId }))
    setPage(1)
  }

  const handleSortChange = (value: string) => {
    setSortBy(value)
    setPage(1)
  }

  const handleSearchChange = (value: string) => {
    setDebouncedSearch(value)
    setPage(1)
  }

  const TOOLS_FETCH_TIMEOUT_MS = 8000

  useEffect(() => {
    let cancelled = false
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), TOOLS_FETCH_TIMEOUT_MS)

    async function fetchTools() {
      setLoading(true)
      const params = new URLSearchParams()
      if (debouncedSearch) params.set("search", debouncedSearch)
      params.set("sortBy", sortBy)
      params.set("page", String(page))
      params.set("limit", String(meta.limit))
      if (filters.category) params.set("category", filters.category)
      if (filters.minPrice) params.set("minPrice", filters.minPrice)
      if (filters.maxPrice) params.set("maxPrice", filters.maxPrice)
      if (filters.available) params.set("available", filters.available)

      try {
        const res = await fetch(`/api/tools?${params}`, { signal: controller.signal })
        const json = await res.json()
        if (cancelled) return
        if (json.success) {
          setTools(json.data || [])
          if (json.meta) setMeta(json.meta as PaginationMeta)
        }
      } catch {
        if (!cancelled) setTools([])
      }
      if (!cancelled) setLoading(false)
    }

    fetchTools()
    return () => {
      cancelled = true
      clearTimeout(timeout)
      controller.abort()
    }
  }, [debouncedSearch, sortBy, page, filters, meta.limit])

  return (
    <div className="flex flex-col gap-4">
      {/* Search & Sort Controls */}
      <SortBar
        onSearchChange={handleSearchChange}
        sortBy={sortBy}
        onSortChange={handleSortChange}
        totalResults={meta.total}
        activeFilterCount={activeFilterCount}
        onToggleFilters={() => setShowFilters(true)}
      />

      {/* Quick Category Filter Pills */}
      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 py-1 no-scrollbar">
        {quickCategories.map((cat) => {
          const isSelected = (filters.category || "") === cat.id
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => handleQuickCategorySelect(cat.id)}
              className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                isSelected
                  ? "bg-primary text-white shadow-sm"
                  : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
              }`}
            >
              {cat.label}
            </button>
          )
        })}
      </div>

      {/* Filter Modal Sheet */}
      <FilterSidebar
        filters={filters}
        onFiltersChange={handleFiltersChange}
        open={showFilters}
        onClose={() => setShowFilters(false)}
      />

      {/* Tool Cards List */}
      <AnimatePresence mode="wait">
        {loading ? (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="grid grid-cols-1 gap-4"
          >
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="space-y-3 rounded-2xl border border-border bg-card p-4">
                <Skeleton className="aspect-[4/3] w-full rounded-xl" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
                <Skeleton className="h-10 w-full rounded-xl" />
              </div>
            ))}
          </motion.div>
        ) : tools.length === 0 ? (
          <motion.div
            key="empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card/50 py-16 text-center"
          >
            <span className="text-3xl mb-2">🚜</span>
            <p className="font-display text-base font-bold text-foreground">No tools found</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Try changing your search term or adjusting filters
            </p>
          </motion.div>
        ) : (
          <motion.div
            key="grid"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="grid grid-cols-1 gap-4"
          >
            {tools.map((tool, i) => (
              <motion.div
                key={tool.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: (i % 12) * 0.04 }}
              >
                <ToolCard tool={tool} index={i} />
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      <PaginationBar
        currentPage={page}
        totalPages={meta.totalPages}
        onPageChange={setPage}
      />
    </div>
  )
}
