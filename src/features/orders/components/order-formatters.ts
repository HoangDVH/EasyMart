import { formatVnd } from '@/shared/lib/product-price'

export function formatOrderDate(value: string | null | undefined) {
  if (!value) return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return value
  return new Intl.DateTimeFormat('vi-VN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(d)
}

export { formatVnd }

/** Map nhãn trạng thái dễ đọc + tone màu (status backend free-form) */
export function orderStatusMeta(status: string): { label: string; tone: string } {
  const code = status.toUpperCase()
  if (code.includes('CANCEL') || code.includes('FAIL') || code.includes('REJECT')) {
    return { label: 'Đã huỷ', tone: 'border-destructive/30 bg-destructive/10 text-destructive' }
  }
  if (code.includes('COMPLETE') || code.includes('SUCCESS') || code.includes('DELIVERED')) {
    return { label: 'Hoàn tất', tone: 'border-emerald-300/60 bg-emerald-50 text-emerald-700' }
  }
  if (code.includes('SHIP') || code.includes('DELIVER')) {
    return { label: 'Đang giao', tone: 'border-sky-300/60 bg-sky-50 text-sky-700' }
  }
  if (code.includes('PAID') || code.includes('PAY')) {
    return { label: 'Đã thanh toán', tone: 'border-secondary/30 bg-secondary/10 text-secondary' }
  }
  if (code.includes('PROCESS') || code.includes('CONFIRM')) {
    return { label: 'Đang xử lý', tone: 'border-amber-300/60 bg-amber-50 text-amber-700' }
  }
  if (code.includes('PEND')) {
    return { label: 'Chờ xử lý', tone: 'border-amber-300/60 bg-amber-50 text-amber-700' }
  }
  return { label: status || 'Khác', tone: 'border-border bg-muted text-foreground' }
}

export function canCancelOrder(status: string) {
  const code = status.toUpperCase()
  return code.includes('PEND') && !code.includes('CANCEL')
}
