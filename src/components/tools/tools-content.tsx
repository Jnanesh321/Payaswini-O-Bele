"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Skeleton } from "@/components/ui"
import { ToolCard } from "./tool-card"
import { FilterSidebar } from "./filter-sidebar"
import { SortBar } from "./sort-bar"
import { PaginationBar } from "./pagination-bar"
import type { ToolCard as ToolCardType, ToolFilters, PaginationMeta } from "@/types"

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

  const handleFiltersChange = (newFilters: ToolFilters) => {
    setFilters(newFilters)
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

  useEffect(() => {
    let cancelled = false

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
        const res = await fetch(`/api/tools?${params}`)
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
    return () => { cancelled = true }
  }, [debouncedSearch, sortBy, page, filters, meta.limit])

  return (
    <div className="flex gap-6">
      <FilterSidebar
        filters={filters}
        onFiltersChange={handleFiltersChange}
        open={showFilters}
        onClose={() => setShowFilters(false)}
      />

      <div className="flex-1 min-w-0">
        <SortBar
          onSearchChange={handleSearchChange}
          sortBy={sortBy}
          onSortChange={handleSortChange}
          totalResults={meta.total}
          onToggleFilters={() => setShowFilters(true)}
        />

        <AnimatePresence mode="wait">
          {loading ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
            >
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="space-y-3">
                  <Skeleton className="aspect-[4/3] rounded-xl" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-4 w-1/3" />
                  <Skeleton className="h-10 w-full rounded-lg" />
                </div>
              ))}
            </motion.div>
          ) : tools.length === 0 ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center py-20"
            >
              <p className="text-lg font-medium text-foreground">No tools found</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Try adjusting your filters or search term
              </p>
            </motion.div>
          ) : (
            <motion.div
              key="grid"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
            >
              {tools.map((tool, i) => (
                <motion.div
                  key={tool.id}
                  initial={{ opacity: 0, y: 20 }}
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
    </div>
  )
}
