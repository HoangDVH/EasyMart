import { httpClient } from '@/shared/api/http-client'
import type { ApiEnvelope } from '@/shared/types/api-result'
import type {
  CreateOrderPayload,
  Order,
  OrderItem,
} from '@/features/orders/types/order.types'

const ORDERS_BASE = '/api/v1/orders'

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

function toNumber(value: unknown, fallback = 0): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string') {
    const n = Number(value)
    if (Number.isFinite(n)) return n
  }
  return fallback
}

function coerceItem(raw: Record<string, unknown>): OrderItem | null {
  const productId = toIdString(raw.productId)
  if (!productId) return null
  return {
    productId,
    productName: typeof raw.productName === 'string' ? raw.productName : '',
    unitPrice: toNumber(raw.unitPrice),
    quantity: toNumber(raw.quantity, 1),
    sellerEmail: typeof raw.sellerEmail === 'string' ? raw.sellerEmail : null,
  }
}

function coerceOrder(raw: unknown): Order | null {
  const row = asRecord(raw)
  if (!row) return null
  const id = toIdString(row.id)
  if (!id) return null
  const itemsRaw = Array.isArray(row.items) ? row.items : []
  const items = itemsRaw
    .map((it) => asRecord(it))
    .filter((rec): rec is Record<string, unknown> => rec !== null)
    .map(coerceItem)
    .filter((it): it is OrderItem => it !== null)
  return {
    id,
    userEmail: typeof row.userEmail === 'string' ? row.userEmail : '',
    items,
    totalAmount: toNumber(row.totalAmount),
    status: typeof row.status === 'string' ? row.status : 'PENDING',
    createdAt: typeof row.createdAt === 'string' ? row.createdAt : null,
  }
}

export const ordersApi = {
  async listMyOrders(): Promise<Order[]> {
    const { data } = await httpClient.get<ApiEnvelope<unknown>>(ORDERS_BASE)
    if (!Array.isArray(data?.result)) return []
    return data.result
      .map(coerceOrder)
      .filter((o): o is Order => o !== null)
  },

  async getById(id: string): Promise<Order | null> {
    const { data } = await httpClient.get<ApiEnvelope<unknown>>(
      `${ORDERS_BASE}/${id}`,
    )
    return coerceOrder(data?.result)
  },

  async create(payload: CreateOrderPayload): Promise<Order | null> {
    const { data } = await httpClient.post<ApiEnvelope<unknown>>(
      ORDERS_BASE,
      payload,
    )
    return coerceOrder(data?.result)
  },
}
