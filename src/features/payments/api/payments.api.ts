import { httpClient } from '@/shared/api/http-client'
import type { ApiEnvelope } from '@/shared/types/api-result'
import type {
  CreatePaymentPayload,
  Payment,
  VnpayPaymentInitRequest,
  VnpayPaymentInitResponse,
} from '@/features/payments/types/payment.types'

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

function toNumber(value: unknown, fallback = 0): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim().length > 0) {
    const n = Number(value)
    if (Number.isFinite(n)) return n
  }
  return fallback
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
    amount: toNumber(row.amount),
    status: typeof row.status === 'string' ? row.status : '',
    transactionRef: typeof row.transactionRef === 'string' ? row.transactionRef : null,
    createdAt: typeof row.createdAt === 'string' ? row.createdAt : null,
  }
}

function pickPaymentUrl(row: Record<string, unknown>): string {
  for (const key of ['paymentUrl', 'payUrl', 'redirectUrl', 'url', 'vnpUrl']) {
    const val = row[key]
    if (typeof val === 'string' && val.trim().startsWith('http')) return val.trim()
  }
  return ''
}

function coerceVnpayInit(raw: unknown): VnpayPaymentInitResponse | null {
  const row = asRecord(raw)
  if (!row) return null
  const paymentId = toIdString(row.paymentId)
  const orderId = toIdString(row.orderId)
  const paymentUrl = pickPaymentUrl(row)
  if (!paymentId || !orderId || !paymentUrl) return null
  return {
    paymentId,
    orderId,
    amount: toNumber(row.amount),
    status: typeof row.status === 'string' ? row.status : 'PENDING',
    transactionRef: typeof row.transactionRef === 'string' ? row.transactionRef : null,
    paymentUrl,
  }
}

export const paymentsApi = {
  /** Mock COD/CASH — backend nhận `method: CASH` để đánh dấu đơn PAID. */
  async create(payload: CreatePaymentPayload): Promise<Payment | null> {
    const method = payload.method === 'COD' ? 'CASH' : payload.method
    const { data } = await httpClient.post<ApiEnvelope<unknown>>(PAYMENTS_BASE, {
      orderId: Number(payload.orderId),
      method,
    })
    return coercePayment(data?.result)
  },

  /** Khởi tạo thanh toán VNPay — trả URL redirect sang cổng VNPay. */
  async initVnpay(payload: VnpayPaymentInitRequest): Promise<VnpayPaymentInitResponse> {
    const { data } = await httpClient.post<ApiEnvelope<unknown>>(`${PAYMENTS_BASE}/vnpay`, {
      orderId: Number(payload.orderId),
    })
    const result = coerceVnpayInit(data?.result)
    if (!result) throw new Error('Không nhận được link thanh toán VNPay.')
    return result
  },

  async listMyPayments(): Promise<Payment[]> {
    const { data } = await httpClient.get<ApiEnvelope<unknown>>(PAYMENTS_BASE)
    if (!Array.isArray(data?.result)) return []
    return data.result.map(coercePayment).filter((p): p is Payment => p !== null)
  },

  async listSellerPayments(): Promise<Payment[]> {
    const { data } = await httpClient.get<ApiEnvelope<unknown>>(`${PAYMENTS_BASE}/seller/history`)
    if (!Array.isArray(data?.result)) return []
    return data.result.map(coercePayment).filter((p): p is Payment => p !== null)
  },
}
