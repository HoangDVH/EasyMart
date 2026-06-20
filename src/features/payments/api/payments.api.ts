import { httpClient } from '@/shared/api/http-client'
import type { ApiEnvelope } from '@/shared/types/api-result'
import type { CreatePaymentPayload, Payment } from '@/features/payments/types/payment.types'

const PAYMENTS_BASE = '/api/v1/payments'

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

function coercePayment(raw: unknown): Payment | null {
  const row = asRecord(raw)
  if (!row) return null
  const id = toIdString(row.id)
  const orderId = toIdString(row.orderId)
  if (!id || !orderId) return null
  return {
    id,
    orderId,
    method: typeof row.method === 'string' ? row.method : '',
    amount: typeof row.amount === 'number' ? row.amount : 0,
    status: typeof row.status === 'string' ? row.status : '',
    transactionRef: typeof row.transactionRef === 'string' ? row.transactionRef : null,
    createdAt: typeof row.createdAt === 'string' ? row.createdAt : null,
  }
}

export const paymentsApi = {
  async create(payload: CreatePaymentPayload): Promise<Payment | null> {
    const { data } = await httpClient.post<ApiEnvelope<unknown>>(PAYMENTS_BASE, {
      orderId: Number(payload.orderId),
      method: payload.method,
    })
    return coercePayment(data?.result)
  },
}
