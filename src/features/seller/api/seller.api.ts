import { parseProductFromApi } from '@/features/products/api/products.api'
import { parseOrder } from '@/features/orders/api/orders.api'
import { httpClient } from '@/shared/api/http-client'
import type { ApiEnvelope } from '@/shared/types/api-result'
import type { Product } from '@/features/products/types/product.types'
import type { Order } from '@/features/orders/types/order.types'

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

/** Parse đơn từ payload realtime / API envelope. */
export function parseSellerOrder(raw: unknown): Order | null {
  return parseOrder(raw)
}

export const sellerApi = {
  async listMyProducts(): Promise<Product[]> {
    const { data } = await httpClient.get<ApiEnvelope<unknown>>(`${SELLER_PRODUCTS_BASE}/seller/my`)
    return pickArray(data.result)
      .map((row) => parseProductFromApi(row))
      .filter((product): product is Product => product !== null)
  },

  async createProduct(payload: SellerProductPayload): Promise<Product | null> {
    const { data } = await httpClient.post<ApiEnvelope<unknown>>(SELLER_PRODUCTS_BASE, payload)
    return parseProductFromApi(data.result)
  },

  async updateProduct(productId: string, payload: SellerProductPayload): Promise<Product | null> {
    const { data } = await httpClient.put<ApiEnvelope<unknown>>(`${SELLER_PRODUCTS_BASE}/${productId}`, payload)
    return parseProductFromApi(data.result)
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
      .map((row) => parseOrder(row))
      .filter((order): order is Order => order !== null)
  },

  /** Chuyển trạng thái giao hàng (chỉ tuần tự, đơn PAID). Backend trả 409 nếu sai thứ tự. */
  async updateSellerStatus(orderId: string, status: string): Promise<Order | null> {
    const { data } = await httpClient.patch<ApiEnvelope<unknown>>(
      `/api/v1/orders/${orderId}/seller-status`,
      { status },
    )
    return parseOrder(data.result)
  },
}
