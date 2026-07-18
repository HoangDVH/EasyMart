import { Check, Circle, X } from 'lucide-react'
import { cn } from '@/shared/lib/utils'
import type { OrderStatusDisplayOptions } from '@/features/orders/components/order-formatters'
import {
  FULFILLMENT_FLOW,
  isFulfillmentStatus,
  type FulfillmentStatus,
} from '@/features/orders/lib/fulfillment'

/** Timeline đầy đủ cho buyer — 5 bước theo tiến trình giao hàng. */
const FULFILLMENT_STEPS: { id: FulfillmentStatus; label: string }[] = [
  { id: 'AWAITING_CONFIRMATION', label: 'Chờ xác nhận' },
  { id: 'CONFIRMED', label: 'Chờ chuẩn bị hàng' },
  { id: 'PROCESSING', label: 'Chờ vận chuyển' },
  { id: 'SHIPPED', label: 'Chờ giao' },
  { id: 'DELIVERED', label: 'Chờ nhận' },
]

const FALLBACK_STEPS = [
  { id: 'placed', label: 'Đặt hàng' },
  { id: 'processing', label: 'Đang xử lý' },
  { id: 'shipping', label: 'Đang giao' },
  { id: 'done', label: 'Hoàn tất' },
] as const

function fulfillmentStepIndex(status: FulfillmentStatus): number {
  return FULFILLMENT_FLOW.indexOf(status)
}

function resolveFallbackStepIndex(
  status: string,
  options?: OrderStatusDisplayOptions,
): number {
  const code = status.toUpperCase()
  if (code.includes('CANCEL') || code.includes('FAIL') || code.includes('REJECT')) return -1
  if (code.includes('COMPLETE') || code.includes('SUCCESS') || code.includes('DELIVERED')) return 3
  if (code.includes('SHIP') || code.includes('DELIVER')) return 2
  if (code.includes('PAID') || code.includes('PROCESS') || code.includes('CONFIRM')) return 1
  if (code.includes('PEND') || code.includes('PAY')) {
    return options?.paymentMethod === 'COD' ? 1 : 0
  }
  return options?.paymentMethod === 'COD' ? 1 : 0
}

type OrderStatusTimelineProps = {
  status: string
  className?: string
  paymentMethod?: OrderStatusDisplayOptions['paymentMethod']
  fulfillmentStatus?: string | null
}

export function OrderStatusTimeline({
  status,
  className,
  paymentMethod,
  fulfillmentStatus,
}: OrderStatusTimelineProps) {
  const code = status.toUpperCase()
  const isCancelled =
    code.includes('CANCEL') || code.includes('FAIL') || code.includes('REJECT')

  if (isCancelled) {
    return (
      <div
        className={cn(
          'flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive',
          className,
        )}
      >
        <X className="h-4 w-4 shrink-0" />
        <span>Đơn hàng đã bị huỷ hoặc không thành công.</span>
      </div>
    )
  }

  const hasFulfillment = isFulfillmentStatus(fulfillmentStatus)
  const steps = hasFulfillment ? FULFILLMENT_STEPS : FALLBACK_STEPS
  const activeIndex = hasFulfillment
    ? fulfillmentStepIndex(fulfillmentStatus)
    : resolveFallbackStepIndex(status, { paymentMethod, fulfillmentStatus })

  return (
    <div className={cn('space-y-3', className)}>
      <p className="text-sm font-semibold">Tiến trình đơn hàng</p>
      <ol
        className={cn(
          'grid gap-2',
          steps.length === 5 ? 'grid-cols-2 sm:grid-cols-5' : 'grid-cols-4',
        )}
        aria-label="Tiến trình đơn hàng"
      >
        {steps.map((step, index) => {
          const done = index < activeIndex
          const current = index === activeIndex
          return (
            <li key={step.id} className="flex flex-col items-center text-center">
              <div
                className={cn(
                  'mb-1.5 flex h-8 w-8 items-center justify-center rounded-full border-2 text-xs font-semibold transition',
                  done && 'border-emerald-500 bg-emerald-500 text-white',
                  current && 'border-primary bg-primary text-primary-foreground',
                  !done && !current && 'border-muted-foreground/30 bg-muted text-muted-foreground',
                )}
              >
                {done ? (
                  <Check className="h-4 w-4" />
                ) : current ? (
                  <Circle className="h-3 w-3 fill-current" />
                ) : (
                  index + 1
                )}
              </div>
              <span
                className={cn(
                  'text-[10px] leading-tight sm:text-xs',
                  current ? 'font-medium text-foreground' : 'text-muted-foreground',
                )}
              >
                {step.label}
              </span>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
