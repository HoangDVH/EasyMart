import { httpClient } from '@/shared/api/http-client'
import type { ApiEnvelope } from '@/shared/types/api-result'
import type { Product } from '@/features/products/types/product.types'
import type { Order, OrderItem } from '@/features/orders/types/order.types'

const SELLER_PRODUCTS_BASE = '/api/v1/products'
const SELLER_ORDERS_HISTORY = '/api/v1/orders/seller/history'
const SELLER_UPLOAD_IMAGES = '/api/v1/products/images'

/** Khớp `ProductCreateRequest` trong OpenAPI backend (JwtJava API). */
export type SellerProductPayload = {
  name: string
  description?: string
  price: number
  discountPrice: number
  rating: number
  stock: number
  categoryId: number
  brandId: number
  images: string[]
  isFeatured: boolean
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null
}

function toIdString(value: unknown): string | null {
  if (typeof value === 'string' && value.length > 0) return value
  if (typeof value === 'number' && Number.isFinite(value)) return String(value)
  return null
}

function toNumberOrNull(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null
  if (typeof value === 'string' && value.trim().length > 0) {
    const n = Number(value)
    return Number.isFinite(n) ? n : null
  }
  return null
}

function coerceProduct(raw: unknown): Product | null {
  const row = asRecord(raw)
  if (!row) return null
  const id = toIdString(row.id ?? row.productId)
  const name = typeof row.name === 'string' ? row.name : typeof row.title === 'string' ? row.title : null
  if (!id || !name) return null
  return {
    id,
    name,
    description: typeof row.description === 'string' ? row.description : null,
    price: toNumberOrNull(row.price),
    discountPrice: (() => {
      const candidate = row.discountPrice ?? row.salePrice ?? row.promoPrice ?? row.finalPrice ?? row.discount_price
      const n = toNumberOrNull(candidate)
      const base = toNumberOrNull(row.price)
      if (n == null) return null
      if (base != null && n >= base) return null
      return n
    })(),
    rating: (() => {
      const candidate = row.rating ?? row.averageRating ?? row.avgRating ?? row.rate
      const n = toNumberOrNull(candidate)
      if (n == null) return null
      return Math.max(0, Math.min(5, n))
    })(),
    stock: toNumberOrNull(row.stock ?? row.stockQuantity ?? row.quantityInStock),
    stockQuantity: toNumberOrNull(row.stock ?? row.stockQuantity ?? row.quantityInStock),
    categoryId: toIdString(row.categoryId),
    categoryName: typeof row.categoryName === 'string' ? row.categoryName : null,
    brandId: toIdString(row.brandId),
    sellerId: toIdString(row.sellerId),
    sellerEmail: typeof row.sellerEmail === 'string' ? row.sellerEmail : null,
    status: typeof row.status === 'string' ? row.status : null,
    featured:
      typeof row.featured === 'boolean'
        ? row.featured
        : typeof row.isFeatured === 'boolean'
          ? row.isFeatured
          : null,
    createdAt: typeof row.createdAt === 'string' ? row.createdAt : null,
  }
}

function pickArray(result: unknown): unknown[] {
  if (Array.isArray(result)) return result
  const record = asRecord(result)
  if (!record) return []
  if (Array.isArray(record.items)) return record.items
  if (Array.isArray(record.content)) return record.content
  if (Array.isArray(record.products)) return record.products
  if (Array.isArray(record.results)) return record.results
  if (Array.isArray(record.data)) return record.data
  return []
}

function coerceOrderItem(raw: unknown): OrderItem | null {
  const row = asRecord(raw)
  if (!row) return null
  const productId = toIdString(row.productId)
  if (!productId) return null
  return {
    productId,
    productName: typeof row.productName === 'string' ? row.productName : '',
    unitPrice: toNumberOrNull(row.unitPrice) ?? 0,
    quantity: toNumberOrNull(row.quantity) ?? 0,
    sellerEmail: typeof row.sellerEmail === 'string' ? row.sellerEmail : null,
  }
}

function coerceOrder(raw: unknown): Order | null {
  const row = asRecord(raw)
  if (!row) return null
  const id = toIdString(row.id)
  if (!id) return null
  const itemsRaw = Array.isArray(row.items) ? row.items : []
  const items = itemsRaw.map(coerceOrderItem).filter((item): item is OrderItem => item !== null)
  return {
    id,
    userEmail: typeof row.userEmail === 'string' ? row.userEmail : '',
    items,
    totalAmount: toNumberOrNull(row.totalAmount) ?? 0,
    status: typeof row.status === 'string' ? row.status : 'PENDING',
    createdAt: typeof row.createdAt === 'string' ? row.createdAt : null,
  }
}

export const sellerApi = {
  async listMyProducts(): Promise<Product[]> {
    const { data } = await httpClient.get<ApiEnvelope<unknown>>(`${SELLER_PRODUCTS_BASE}/seller/my`)
    return pickArray(data.result)
      .map((row) => coerceProduct(row))
      .filter((product): product is Product => product !== null)
  },

  async createProduct(payload: SellerProductPayload): Promise<Product | null> {
    const { data } = await httpClient.post<ApiEnvelope<unknown>>(SELLER_PRODUCTS_BASE, payload)
    return coerceProduct(data.result)
  },

  async updateProduct(productId: string, payload: SellerProductPayload): Promise<Product | null> {
    const { data } = await httpClient.put<ApiEnvelope<unknown>>(`${SELLER_PRODUCTS_BASE}/${productId}`, payload)
    return coerceProduct(data.result)
  },

  async deleteProduct(productId: string): Promise<void> {
    await httpClient.delete(`${SELLER_PRODUCTS_BASE}/${productId}`)
  },

  async uploadImages(files: File[]): Promise<string[]> {
    if (files.length === 0) return []
    const form = new FormData()
    for (const file of files) form.append('files', file)
    const { data } = await httpClient.post<ApiEnvelope<unknown>>(SELLER_UPLOAD_IMAGES, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    const result = asRecord(data.result)
    if (!result) return []
    const urlsRaw = Array.isArray(result.urls) ? result.urls : []
    return urlsRaw.filter((url): url is string => typeof url === 'string' && url.trim().length > 0)
  },

  async sellerOrderHistory(): Promise<Order[]> {
    const { data } = await httpClient.get<ApiEnvelope<unknown>>(SELLER_ORDERS_HISTORY)
    return pickArray(data.result)
      .map((row) => coerceOrder(row))
      .filter((order): order is Order => order !== null)
  },
}
