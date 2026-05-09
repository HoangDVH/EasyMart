import { create } from 'zustand'
import type { Product } from '@/features/products/types/product.types'

export type CartItem = {
  productId: string
  name: string
  price: number | null
  imageUrl: string | null
  stockQuantity: number | null
  quantity: number
}

type CartState = {
  items: CartItem[]
  addItem: (product: Product, quantity?: number) => void
  updateQuantity: (productId: string, quantity: number) => void
  removeItem: (productId: string) => void
  clearCart: () => void
}

function clampQty(qty: number, stock: number | null) {
  const normalized = Number.isFinite(qty) ? Math.round(qty) : 1
  const minApplied = Math.max(1, normalized)
  if (stock == null || stock < 0) return minApplied
  return Math.min(minApplied, Math.max(1, stock))
}

export const useCartStore = create<CartState>((set) => ({
  items: [],
  addItem: (product, quantity = 1) =>
    set((state) => {
      const idx = state.items.findIndex((x) => x.productId === product.id)
      const stock = product.stockQuantity ?? null
      if (idx >= 0) {
        const next = [...state.items]
        next[idx] = {
          ...next[idx],
          quantity: clampQty(next[idx].quantity + quantity, stock),
          name: product.name,
          price: product.price ?? null,
          imageUrl: product.imageUrl ?? null,
          stockQuantity: stock,
        }
        return { items: next }
      }
      return {
        items: [
          ...state.items,
          {
            productId: product.id,
            name: product.name,
            price: product.price ?? null,
            imageUrl: product.imageUrl ?? null,
            stockQuantity: stock,
            quantity: clampQty(quantity, stock),
          },
        ],
      }
    }),
  updateQuantity: (productId, quantity) =>
    set((state) => ({
      items: state.items.map((x) =>
        x.productId === productId ? { ...x, quantity: clampQty(quantity, x.stockQuantity) } : x,
      ),
    })),
  removeItem: (productId) =>
    set((state) => ({
      items: state.items.filter((x) => x.productId !== productId),
    })),
  clearCart: () => set({ items: [] }),
}))

export function calcCartSubtotal(items: CartItem[]) {
  return items.reduce((sum, item) => sum + (item.price ?? 0) * item.quantity, 0)
}

export function calcCartCount(items: CartItem[]) {
  return items.reduce((sum, item) => sum + item.quantity, 0)
}
