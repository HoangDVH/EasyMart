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
    fulfillmentStatus:
      typeof raw.fulfillmentStatus === 'string' && raw.fulfillmentStatus.length > 0
        ? raw.fulfillmentStatus
        : null,
  }
}

function pickPaymentMethod(row: Record<string, unknown>): string | null {
  const directKeys = ['paymentMethod', 'paymentType', 'payment_method', 'method']
  for (const key of directKeys) {
    const value = row[key]
    if (typeof value === 'string' && value.trim().length > 0) {
      const upper = value.trim().toUpperCase()
      /** Tránh nhầm `method` với field khác không phải thanh toán. */
      if (key === 'method' && !['COD', 'CASH', 'VNPAY', 'VN_PAY', 'BANK'].includes(upper)) {
        continue
      }
      return value.trim()
    }
  }
  const payment = asRecord(row.payment)
  if (payment) {
    for (const key of ['method', 'paymentMethod', 'type']) {
      const value = payment[key]
      if (typeof value === 'string' && value.trim().length > 0) return value.trim()
    }
  }
  const payments = Array.isArray(row.payments) ? row.payments : []
  for (const entry of payments) {
    const rec = asRecord(entry)
    if (!rec) continue
    for (const key of ['method', 'paymentMethod', 'type']) {
      const value = rec[key]
      if (typeof value === 'string' && value.trim().length > 0) return value.trim()
    }
  }
  return null
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
    subtotal: row.subtotal == null ? null : toNumber(row.subtotal),
    shippingFee: row.shippingFee == null ? null : toNumber(row.shippingFee),
    totalAmount: toNumber(row.totalAmount),
    receiverName: typeof row.receiverName === 'string' ? row.receiverName : null,
    receiverPhone: typeof row.receiverPhone === 'string' ? row.receiverPhone : null,
    shippingAddress: typeof row.shippingAddress === 'string' ? row.shippingAddress : null,
    status: typeof row.status === 'string' ? row.status : 'PENDING',
    createdAt: typeof row.createdAt === 'string' ? row.createdAt : null,
    paymentMethod: pickPaymentMethod(row),
  }
}

/** Parse đơn từ API / payload realtime STOMP (`event.order`). */
export function parseOrder(raw: unknown): Order | null {
  return coerceOrder(raw)
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

  /** Hủy đơn chưa thanh toán (PENDING_PAYMENT). */
  async cancel(id: string): Promise<Order | null> {
    const { data } = await httpClient.post<ApiEnvelope<unknown>>(
      `${ORDERS_BASE}/${id}/cancel`,
      {},
    )
    return coerceOrder(data?.result)
  },
}
