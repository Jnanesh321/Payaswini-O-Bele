import { create } from "zustand"
import { persist } from "zustand/middleware"
import type { CartItem } from "@/types"

interface CartState {
  items: CartItem[]
  addItem: (item: CartItem) => void
  removeItem: (id: string) => void
  updateItem: (id: string, data: Partial<CartItem>) => void
  clearCart: () => void
  getItemCount: () => number
  getSubtotal: () => number
  getTotalDeposit: () => number
  getTotalDiscount: () => number
  getGrandTotal: () => number
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      addItem: (item) => {
        const existingIndex = get().items.findIndex((i) => i.toolId === item.toolId)
        if (existingIndex > -1) {
          const items = [...get().items]
          items[existingIndex] = item
          set({ items })
        } else {
          set({ items: [...get().items, item] })
        }
      },
      removeItem: (id) => {
        set({ items: get().items.filter((i) => i.id !== id) })
      },
      updateItem: (id, data) => {
        set({
          items: get().items.map((i) => (i.id === id ? { ...i, ...data } : i)),
        })
      },
      clearCart: () => set({ items: [] }),
      getItemCount: () => get().items.length,
      getSubtotal: () => get().items.reduce((sum, i) => sum + i.totalAmount, 0),
      getTotalDeposit: () => get().items.reduce((sum, i) => sum + i.deposit, 0),
      getTotalDiscount: () => get().items.reduce((sum, i) => sum + i.discount, 0),
      getGrandTotal: () => {
        const state = get()
        return state.getSubtotal() + state.getTotalDeposit()
      },
    }),
    {
      name: "krishirent-cart",
    }
  )
)
