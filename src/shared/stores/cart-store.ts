import { create } from 'zustand'
import { createJSONStorage, persist, type StateStorage } from 'zustand/middleware'
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
  /** Id sản phẩm được chọn để thanh toán (Shopee-style). */
  selectedIds: string[]
  addItem: (product: Product, quantity?: number) => void
  /** Thêm/cộng dòng từ đơn cũ (Mua lại) — không cần Product đầy đủ. */
  upsertLine: (item: CartItem) => void
  prepareBuyNow: (product: Product, quantity?: number) => void
  updateQuantity: (productId: string, quantity: number) => void
  updateBuyNowQuantity: (productId: string, quantity: number) => void
  removeItem: (productId: string) => void
  removeItems: (productIds: string[]) => void
  toggleSelected: (productId: string) => void
  setSelectedIds: (productIds: string[]) => void
  selectAll: () => void
  deselectAll: () => void
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

const CART_STORAGE_KEY = 'easymart-cart-owners'
const LEGACY_CART_STORAGE_KEY = 'easymart-cart'
const GUEST_OWNER = 'guest'

let activeCartOwner = GUEST_OWNER

function readOwnerRoot(): Record<string, string> {
  try {
    const raw = localStorage.getItem(CART_STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as unknown
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        const root: Record<string, string> = {}
        for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
          if (typeof value === 'string') root[key] = value
        }
        return root
      }
    }

    const legacy = localStorage.getItem(LEGACY_CART_STORAGE_KEY)
    if (legacy) {
      const root = { [GUEST_OWNER]: legacy }
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(root))
      localStorage.removeItem(LEGACY_CART_STORAGE_KEY)
      return root
    }
  } catch {
    /* ignore */
  }
  return {}
}

function writeOwnerRoot(root: Record<string, string>) {
  try {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(root))
  } catch {
    /* ignore quota / private mode */
  }
}

const ownerScopedStorage: StateStorage = {
  getItem: (_name) => {
    const root = readOwnerRoot()
    return root[activeCartOwner] ?? null
  },
  setItem: (_name, value) => {
    const root = readOwnerRoot()
    root[activeCartOwner] = value
    writeOwnerRoot(root)
  },
  removeItem: (_name) => {
    const root = readOwnerRoot()
    delete root[activeCartOwner]
    writeOwnerRoot(root)
  },
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      buyNowItems: null,
      selectedIds: [],
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
            return {
              items: next,
              selectedIds: state.selectedIds.includes(product.id)
                ? state.selectedIds
                : [...state.selectedIds, product.id],
            }
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
            selectedIds: [...state.selectedIds, product.id],
          }
        }),
      upsertLine: (item) =>
        set((state) => {
          const idx = state.items.findIndex((x) => x.productId === item.productId)
          if (idx >= 0) {
            const next = [...state.items]
            const stock = item.stockQuantity ?? next[idx].stockQuantity
            next[idx] = {
              ...next[idx],
              ...item,
              quantity: clampQty(next[idx].quantity + item.quantity, stock),
            }
            return {
              items: next,
              selectedIds: state.selectedIds.includes(item.productId)
                ? state.selectedIds
                : [...state.selectedIds, item.productId],
            }
          }
          return {
            items: [
              ...state.items,
              {
                ...item,
                quantity: clampQty(item.quantity, item.stockQuantity),
              },
            ],
            selectedIds: [...state.selectedIds, item.productId],
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
          selectedIds: state.selectedIds.filter((id) => id !== productId),
        })),
      removeItems: (productIds) => {
        const removeSet = new Set(productIds)
        set((state) => ({
          items: state.items.filter((x) => !removeSet.has(x.productId)),
          selectedIds: state.selectedIds.filter((id) => !removeSet.has(id)),
        }))
      },
      toggleSelected: (productId) =>
        set((state) => ({
          selectedIds: state.selectedIds.includes(productId)
            ? state.selectedIds.filter((id) => id !== productId)
            : [...state.selectedIds, productId],
        })),
      setSelectedIds: (productIds) => set({ selectedIds: [...new Set(productIds)] }),
      selectAll: () => set({ selectedIds: get().items.map((item) => item.productId) }),
      deselectAll: () => set({ selectedIds: [] }),
      clearBuyNow: () => set({ buyNowItems: null }),
      clearCart: () => set({ items: [], selectedIds: [] }),
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

        set((state) => {
          const items = syncList(state.items)
          const idSet = new Set(items.map((item) => item.productId))
          return {
            items,
            buyNowItems: state.buyNowItems ? syncList(state.buyNowItems) : null,
            selectedIds: state.selectedIds.filter((id) => idSet.has(id)),
          }
        })

        return removed
      },
    }),
    {
      name: CART_STORAGE_KEY,
      storage: createJSONStorage(() => ownerScopedStorage),
      version: 2,
      partialize: (state) => ({
        items: state.items,
        buyNowItems: state.buyNowItems,
      }),
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

function readCartSnapshotForOwner(owner: string): {
  items: CartItem[]
  buyNowItems: CartItem[] | null
} {
  const raw = readOwnerRoot()[owner]
  if (!raw) return { items: [], buyNowItems: null }
  try {
    const parsed = JSON.parse(raw) as {
      state?: { items?: LegacyCartItem[]; buyNowItems?: CartItem[] | null }
      items?: LegacyCartItem[]
      buyNowItems?: CartItem[] | null
    }
    const state = parsed.state ?? parsed
    return {
      items: (state.items ?? []).map(normalizeCartItem),
      buyNowItems: state.buyNowItems ?? null,
    }
  } catch {
    return { items: [], buyNowItems: null }
  }
}

function writeCartSnapshotForOwner(
  owner: string,
  snapshot: { items: CartItem[]; buyNowItems: CartItem[] | null },
) {
  const root = readOwnerRoot()
  root[owner] = JSON.stringify({
    state: {
      items: snapshot.items,
      buyNowItems: snapshot.buyNowItems,
    },
    version: 2,
  })
  writeOwnerRoot(root)
}

function mergeCartItems(base: CartItem[], incoming: CartItem[]): CartItem[] {
  const map = new Map(base.map((item) => [item.productId, { ...item }]))
  for (const item of incoming) {
    const existing = map.get(item.productId)
    if (existing) {
      const stock = item.stockQuantity ?? existing.stockQuantity
      map.set(item.productId, {
        ...existing,
        ...item,
        quantity: clampQty(existing.quantity + item.quantity, stock),
      })
    } else {
      map.set(item.productId, {
        ...item,
        quantity: clampQty(item.quantity, item.stockQuantity),
      })
    }
  }
  return [...map.values()]
}

/** Gắn giỏ hàng theo user (hoặc guest). Giữ riêng từng tài khoản trên cùng trình duyệt. */
export function bindCartToOwner(ownerId: string | null | undefined) {
  const nextOwner = ownerId?.trim() || GUEST_OWNER
  if (nextOwner === activeCartOwner) return

  const prevOwner = activeCartOwner
  const current = useCartStore.getState()
  writeCartSnapshotForOwner(prevOwner, {
    items: current.items,
    buyNowItems: current.buyNowItems,
  })

  activeCartOwner = nextOwner
  let nextCart = readCartSnapshotForOwner(nextOwner)

  // Đăng nhập: gộp giỏ guest vào giỏ user (pattern marketplace).
  if (prevOwner === GUEST_OWNER && nextOwner !== GUEST_OWNER && current.items.length > 0) {
    nextCart = {
      items: mergeCartItems(nextCart.items, current.items),
      buyNowItems: nextCart.buyNowItems ?? current.buyNowItems,
    }
    writeCartSnapshotForOwner(GUEST_OWNER, { items: [], buyNowItems: null })
  }

  useCartStore.setState({
    items: nextCart.items,
    buyNowItems: nextCart.buyNowItems,
    selectedIds: nextCart.items.map((item) => item.productId),
  })
}

export function calcCartSubtotal(items: CartItem[]) {
  return items.reduce((sum, item) => sum + (item.unitPrice ?? 0) * item.quantity, 0)
}

export function calcCartCount(items: CartItem[]) {
  return items.reduce((sum, item) => sum + item.quantity, 0)
}

export function hasCartDiscount(item: CartItem) {
  return item.originalPrice != null && item.unitPrice != null && item.unitPrice < item.originalPrice
}
