import { User } from "@prisma/client"

export type SafeUser = Omit<User, "createdAt" | "updatedAt"> & {
  createdAt: string
  updatedAt: string
}

export interface ToolCard {
  id: string
  name: string
  nameKn?: string | null
  description?: string
  category: string
  images: string[]
  thumbnailUrl?: string | null
  pricePerDay: number
  deposit: number
  availableCount: number
  totalCount: number
  minRentalDays: number
  maxRentalDays: number
  isActive: boolean
  isFeatured: boolean
  deliveryAvailable: boolean
  deliveryRadiusKm: number
  freeDeliveryRadiusKm: number
  createdAt: string
}

export interface ToolFilters {
  category?: string
  minPrice?: string
  maxPrice?: string
  available?: string
}

export interface PaginationMeta {
  page: number
  limit: number
  total: number
  totalPages: number
}

export interface CartItem {
  id: string
  toolId: string
  name: string
  nameKn?: string
  pricePerDay: number
  deposit: number
  image: string
  quantity: number
  startDate: Date
  endDate: Date
  days: number
  totalAmount: number
  discount: number
}

export interface RentalSummary {
  items: CartItem[]
  subtotal: number
  totalDeposit: number
  totalDiscount: number
  grandTotal: number
}

export interface SearchFilters {
  category?: string
  minPrice?: number
  maxPrice?: number
  sortBy?: "price_asc" | "price_desc" | "popular" | "newest"
}

export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  meta?: PaginationMeta
  error?: string
  message?: string
}

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      name?: string | null
      email?: string | null
      image?: string | null
      role: "FARMER" | "ADMIN"
    }
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string
    role: "FARMER" | "ADMIN"
  }
}
