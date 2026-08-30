import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

import { REGION_CONFIG, formatRegionalPrice } from "./region"

export function formatPrice(amount: number, locale = "en"): string {
  return formatRegionalPrice(amount, locale)
}

export function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(d)
}

export type ToolTranslations = Record<string, { name?: string; description?: string }>

export function getLocaleName(
  tool: { name: string; translations?: ToolTranslations | null },
  locale: string,
): string {
  return tool.translations?.[locale]?.name ?? tool.name
}

export function getLocaleDescription(
  tool: { description: string; translations?: ToolTranslations | null },
  locale: string,
): string {
  return tool.translations?.[locale]?.description ?? tool.description
}

export function calculateRentalPrice(
  pricePerDay: number,
  startDate: Date,
  endDate: Date
): { days: number; totalAmount: number; discount: number } {
  const days = Math.ceil(
    (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
  )
  return { days: Math.max(days, 1), totalAmount: pricePerDay * Math.max(days, 1), discount: 0 }
}
