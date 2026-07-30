"use client"

import { useEffect, useState } from "react"
import { Search, SlidersHorizontal } from "lucide-react"
import { Button, Input, Select } from "@/components/ui"

interface SortBarProps {
  onSearchChange: (value: string) => void
  sortBy: string
  onSortChange: (value: string) => void
  totalResults: number
  onToggleFilters: () => void
}

export function SortBar({
  onSearchChange,
  sortBy,
  onSortChange,
  totalResults,
  onToggleFilters,
}: SortBarProps) {
  const [input, setInput] = useState("")

  useEffect(() => {
    const timer = setTimeout(() => onSearchChange(input), 300)
    return () => clearTimeout(timer)
  }, [input, onSearchChange])

  return (
    <div className="mb-6 flex flex-wrap items-center gap-3">
      <div className="relative flex-1 min-w-[200px]">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search tools… ಹುಡುಕಿ"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="pl-9"
        />
      </div>
      <Select value={sortBy} onChange={(e) => onSortChange(e.target.value)}>
        <option value="popular">ಜನಪ್ರಿಯ / Popular</option>
        <option value="price_asc">ಕಡಿಮೆ ಬೆಲೆ / Price Low</option>
        <option value="price_desc">ಹೆಚ್ಚಿನ ಬೆಲೆ / Price High</option>
        <option value="newest">ಹೊಸದು / Newest</option>
      </Select>
      <Button
        variant="outline"
        size="sm"
        className="lg:hidden"
        onClick={onToggleFilters}
      >
        <SlidersHorizontal className="h-4 w-4" />
      </Button>
      {totalResults > 0 && (
        <span className="text-sm text-muted-foreground whitespace-nowrap">
          {totalResults} result{totalResults !== 1 ? "s" : ""}
        </span>
      )}
    </div>
  )
}
