import type { Order } from '@/features/orders/types/order.types'
import type { PaymentMethod } from '@/features/payments/types/payment.types'
import { loadOrderShipping } from '@/shared/lib/shipping-storage'

export type ResolvedShipping = {
  customerName: string
  phone: string
  address: string
  paymentMethod: PaymentMethod | null
}

function coercePaymentMethod(value: string | null | undefined): PaymentMethod | null {
  if (!value?.trim()) return null
  const code = value.trim().toUpperCase()
  if (code === 'COD' || code === 'CASH') return 'COD'
  if (code === 'VNPAY' || code === 'VN_PAY') return 'VNPAY'
  return null
}

/** Ưu tiên địa chỉ + PTTT từ API đơn; fallback localStorage (đơn cũ). */
export function resolveOrderShipping(
  order: Order | null | undefined,
  orderIdFallback?: string,
): ResolvedShipping | null {
  const orderId = order?.id ?? orderIdFallback
  const local = orderId ? loadOrderShipping(orderId) : null

  if (order) {
    const hasApi =
      Boolean(order.receiverName?.trim()) ||
      Boolean(order.receiverPhone?.trim()) ||
      Boolean(order.shippingAddress?.trim()) ||
      Boolean(order.paymentMethod?.trim())

    if (hasApi || local) {
      return {
        customerName: order.receiverName?.trim() || local?.customerName || '',
        phone: order.receiverPhone?.trim() || local?.phone || '',
        address: order.shippingAddress?.trim() || local?.address || '',
        paymentMethod:
          coercePaymentMethod(order.paymentMethod) ?? local?.paymentMethod ?? null,
      }
    }
  }

  if (!local) return null
  return {
    customerName: local.customerName,
    phone: local.phone,
    address: local.address,
    paymentMethod: local.paymentMethod,
  }
}
