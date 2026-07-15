import type { PaymentMethod } from '@/features/payments/types/payment.types'

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  COD: 'Thanh toán khi nhận hàng (COD)',
  VNPAY: 'Chuyển khoản / Thẻ ngân hàng (VNPay)',
}

export function paymentMethodLabel(method: string | null | undefined): string {
  if (!method) return '—'
  const normalized = method.toUpperCase()
  if (normalized === 'CASH' || normalized === 'COD') {
    return PAYMENT_METHOD_LABELS.COD
  }
  if (normalized === 'VNPAY') {
    return PAYMENT_METHOD_LABELS.VNPAY
  }
  return method
}

export function paymentStatusMeta(status: string): { label: string; tone: string } {
  const code = status.toUpperCase()
  if (code.includes('PAID') || code.includes('SUCCESS') || code.includes('COMPLETE')) {
    return { label: 'Thành công', tone: 'border-emerald-300/60 bg-emerald-50 text-emerald-700' }
  }
  if (code.includes('FAIL') || code.includes('CANCEL') || code.includes('REJECT')) {
    return { label: 'Thất bại', tone: 'border-destructive/30 bg-destructive/10 text-destructive' }
  }
  if (code.includes('PEND') || code.includes('WAIT')) {
    return { label: 'Đang chờ', tone: 'border-amber-300/60 bg-amber-50 text-amber-700' }
  }
  return { label: status || '—', tone: 'border-border bg-muted text-foreground' }
}
