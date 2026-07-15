import type { CheckoutFormValues } from '@/features/cart/schemas/checkout.schemas'
import type { PaymentMethod } from '@/features/payments/types/payment.types'

const PROFILE_KEY = 'easymart-checkout-profile'
const ORDER_SHIPPING_PREFIX = 'easymart-order-shipping:'

function normalizePaymentMethod(value: unknown): PaymentMethod {
  if (value === 'VNPAY' || value === 'BANK_TRANSFER') return 'VNPAY'
  return 'COD'
}

export function saveCheckoutProfile(values: CheckoutFormValues) {
  try {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(values))
  } catch {
    /* ignore quota errors */
  }
}

export function loadCheckoutProfile(): CheckoutFormValues | null {
  try {
    const raw = localStorage.getItem(PROFILE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<CheckoutFormValues>
    if (
      typeof parsed.customerName === 'string' &&
      typeof parsed.phone === 'string' &&
      typeof parsed.address === 'string'
    ) {
      return {
        customerName: parsed.customerName,
        phone: parsed.phone,
        address: parsed.address,
        paymentMethod: normalizePaymentMethod(parsed.paymentMethod),
      }
    }
  } catch {
    /* ignore */
  }
  return null
}

export function saveOrderShipping(orderId: string, values: CheckoutFormValues) {
  try {
    localStorage.setItem(`${ORDER_SHIPPING_PREFIX}${orderId}`, JSON.stringify(values))
  } catch {
    /* ignore */
  }
}

export function loadOrderShipping(orderId: string): CheckoutFormValues | null {
  try {
    const raw = localStorage.getItem(`${ORDER_SHIPPING_PREFIX}${orderId}`)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<CheckoutFormValues>
    if (
      typeof parsed.customerName === 'string' &&
      typeof parsed.phone === 'string' &&
      typeof parsed.address === 'string'
    ) {
      return {
        customerName: parsed.customerName,
        phone: parsed.phone,
        address: parsed.address,
        paymentMethod: normalizePaymentMethod(parsed.paymentMethod),
      }
    }
  } catch {
    /* ignore */
  }
  return null
}
