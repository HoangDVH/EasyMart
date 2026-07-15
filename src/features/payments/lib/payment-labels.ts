import type { PaymentMethod } from '@/features/payments/types/payment.types'

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  COD: 'Thanh toán khi nhận hàng (COD)',
  VNPAY: 'Chuyển khoản / Thẻ ngân hàng (VNPay)',
}

export function paymentMethodLabel(method: string | null | undefined): string {
  if (!method) return '—'
  return PAYMENT_METHOD_LABELS[method as PaymentMethod] ?? method
}
