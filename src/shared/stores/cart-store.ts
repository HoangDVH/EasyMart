import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import type { Product } from '@/features/products/types/product.types'
import { resolveProductUnitPrice } from '@/shared/lib/product-price'

export type CartItem = {
  productId: string
  name: string
  /** Giá bán thực tế (ưu tiên giá khuyến mãi) */
  unitPrice: number | null
  /** Giá gốc khi có khuyến mãi */
  originalPrice: number | null
  imageUrl: string | null
  stockQuantity: number | null
  quantity: number
}

type CartState = {
  items: CartItem[]
  /** Mua ngay: checkout chỉ sản phẩm này, không ảnh hưởng giỏ hàng */
  buyNowItems: CartItem[] | null
  addItem: (product: Product, quantity?: number) => void
  prepareBuyNow: (product: Product, quantity?: number) => void
  updateQuantity: (productId: string, quantity: number) => void
  updateBuyNowQuantity: (productId: string, quantity: number) => void
  removeItem: (productId: string) => void
  clearBuyNow: () => void
  clearCart: () => void
  /** Cập nhật giá/tồn kho từ API; trả về id sản phẩm đã bị xóa khỏi giỏ */
  syncFromProducts: (productsById: Map<string, Product | null>) => string[]
}

function clampQty(qty: number, stock: number | null) {
  const normalized = Number.isFinite(qty) ? Math.round(qty) : 1
  const minApplied = Math.max(1, normalized)
  if (stock == null || stock < 0) return minApplied
  return Math.min(minApplied, Math.max(1, stock))
}

function productToCartFields(product: Product) {
  const { unitPrice, originalPrice } = resolveProductUnitPrice(product)
  const stock = product.stockQuantity ?? product.stock ?? null
  return {
    name: product.name,
    unitPrice,
    originalPrice,
    imageUrl: product.imageUrl ?? product.images?.[0] ?? null,
    stockQuantity: stock,
  }
}

type LegacyCartItem = CartItem & { price?: number | null }

function normalizeCartItem(raw: LegacyCartItem): CartItem {
  const unitPrice = raw.unitPrice ?? raw.price ?? null
  return {
    productId: raw.productId,
    name: raw.name,
    unitPrice,
    originalPrice: raw.originalPrice ?? null,
    imageUrl: raw.imageUrl ?? null,
    stockQuantity: raw.stockQuantity ?? null,
    quantity: raw.quantity,
  }
}

export const useCartStore = create<CartState>()(
  persist(
    (set) => ({
      items: [],
      buyNowItems: null,
      addItem: (product, quantity = 1) =>
        set((state) => {
          const fields = productToCartFields(product)
          const idx = state.items.findIndex((x) => x.productId === product.id)
          const stock = fields.stockQuantity
          if (idx >= 0) {
            const next = [...state.items]
            next[idx] = {
              ...next[idx],
              ...fields,
              quantity: clampQty(next[idx].quantity + quantity, stock),
            }
            return { items: next }
          }
          return {
            items: [
              ...state.items,
              {
                productId: product.id,
                ...fields,
                quantity: clampQty(quantity, stock),
              },
            ],
          }
        }),
      prepareBuyNow: (product, quantity = 1) =>
        set(() => {
          const fields = productToCartFields(product)
          const stock = fields.stockQuantity
          return {
            buyNowItems: [
              {
                productId: product.id,
                ...fields,
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
      updateBuyNowQuantity: (productId, quantity) =>
        set((state) => {
          if (!state.buyNowItems) return state
          return {
            buyNowItems: state.buyNowItems.map((x) =>
              x.productId === productId ? { ...x, quantity: clampQty(quantity, x.stockQuantity) } : x,
            ),
          }
        }),
      removeItem: (productId) =>
        set((state) => ({
          items: state.items.filter((x) => x.productId !== productId),
        })),
      clearBuyNow: () => set({ buyNowItems: null }),
      clearCart: () => set({ items: [] }),
      syncFromProducts: (productsById) => {
        const removed: string[] = []

        const syncList = (list: CartItem[]) => {
          const next: CartItem[] = []
          for (const item of list) {
            if (!productsById.has(item.productId)) continue
            const product = productsById.get(item.productId)
            if (!product) {
              removed.push(item.productId)
              continue
            }
            const fields = productToCartFields(product)
            next.push({
              ...item,
              ...fields,
              quantity: clampQty(item.quantity, fields.stockQuantity),
            })
          }
          return next
        }

        set((state) => ({
          items: syncList(state.items),
          buyNowItems: state.buyNowItems ? syncList(state.buyNowItems) : null,
        }))

        return removed
      },
    }),
    {
      name: 'easymart-cart',
      storage: createJSONStorage(() => localStorage),
      version: 2,
      migrate: (persisted, fromVersion) => {
        const state = persisted as { items?: LegacyCartItem[]; buyNowItems?: CartItem[] | null }
        const items = state?.items?.map(normalizeCartItem) ?? []
        if (fromVersion < 2) {
          return { items, buyNowItems: null }
        }
        return {
          items,
          buyNowItems: state.buyNowItems ?? null,
        }
      },
    },
  ),
)

export function calcCartSubtotal(items: CartItem[]) {
  return items.reduce((sum, item) => sum + (item.unitPrice ?? 0) * item.quantity, 0)
}

export function calcCartCount(items: CartItem[]) {
  return items.reduce((sum, item) => sum + item.quantity, 0)
}

export function hasCartDiscount(item: CartItem) {
  return item.originalPrice != null && item.unitPrice != null && item.unitPrice < item.originalPrice
}
