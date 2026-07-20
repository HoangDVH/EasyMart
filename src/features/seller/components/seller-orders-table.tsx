import { useState, type MouseEvent } from 'react'
import { Link } from 'react-router-dom'
import {
  Check,
  ChevronRight,
  Copy,
  Inbox,
  Loader2,
  PackageCheck,
} from 'lucide-react'
import type { Order } from '@/features/orders/types/order.types'
import { formatDateTime, formatVnd } from '@/features/seller/components/seller-formatters'
import {
  FULFILLMENT_ACTION_LABELS,
  FULFILLMENT_BADGE_CLASSES,
  FULFILLMENT_LABELS,
  getNextFulfillmentStatus,
  getOrderFulfillmentStatus,
  isCodPayment,
  isOrderPaid,
} from '@/features/orders/lib/fulfillment'
import { cn } from '@/shared/lib/utils'
import { Badge } from '@/shared/ui/badge'
import { Button } from '@/shared/ui/button'
import { EmptyState } from '@/shared/ui/empty-state'
import { PaginationBar } from '@/shared/ui/pagination-bar'
import { Skeleton } from '@/shared/ui/skeleton'

type SellerOrdersTableProps = {
  orders: Order[]
  isLoading: boolean
  isError: boolean
  errorText: string | null
  page: number
  totalPages: number
  onPageChange: (page: number) => void
  updatingOrderId: string | null
  onAdvanceStatus: (order: Order, nextStatus: string) => void
}

function isCancelledOrder(order: Order): boolean {
  const code = order.status.toUpperCase()
  return code.includes('CANCEL') || code.includes('FAIL') || code.includes('REJECT')
}

function PaymentBadge({ order }: { order: Order }) {
  if (isCancelledOrder(order)) {
    return <Badge className="border-destructive/30 bg-destructive/10 text-destructive">Đã hủy</Badge>
  }
  const fulfillment = getOrderFulfillmentStatus(order)
  if (isCodPayment(order)) {
    if (fulfillment === 'DELIVERED') {
      return (
        <Badge className="border-emerald-300/60 bg-emerald-50 text-emerald-700">Đã thu COD</Badge>
      )
    }
    return <Badge className="border-amber-300/60 bg-amber-50 text-amber-700">COD</Badge>
  }
  if (isOrderPaid(order)) {
    return (
      <Badge className="border-emerald-300/60 bg-emerald-50 text-emerald-700">Đã thanh toán</Badge>
    )
  }
  return <Badge className="border-amber-300/60 bg-amber-50 text-amber-700">Chưa TT</Badge>
}

function FulfillmentBadge({ order }: { order: Order }) {
  if (isCancelledOrder(order) || !isOrderPaid(order)) {
    return <span className="text-xs text-muted-foreground">—</span>
  }
  const fulfillment = getOrderFulfillmentStatus(order)
  if (!fulfillment) return <span className="text-xs text-muted-foreground">—</span>
  return (
    <Badge className={cn(FULFILLMENT_BADGE_CLASSES[fulfillment])}>
      {FULFILLMENT_LABELS[fulfillment]}
    </Badge>
  )
}

function CopyIdButton({ orderId }: { orderId: string }) {
  const [copied, setCopied] = useState(false)
  const shortId = orderId.length > 10 ? `${orderId.slice(0, 8)}…` : orderId

  async function onCopy(event: MouseEvent) {
    event.preventDefault()
    event.stopPropagation()
    try {
      await navigator.clipboard.writeText(orderId)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      /* ignore */
    }
  }

  return (
    <button
      type="button"
      className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      title={`Sao chép ${orderId}`}
      aria-label={`Sao chép mã đơn ${orderId}`}
      onClick={(e) => void onCopy(e)}
    >
      <span className="font-medium text-foreground tabular-nums">#{shortId}</span>
      {copied ? (
        <Check className="h-3.5 w-3.5 text-emerald-600" aria-hidden />
      ) : (
        <Copy className="h-3.5 w-3.5" aria-hidden />
      )}
    </button>
  )
}

function AdvanceButton({
  order,
  updating,
  onAdvance,
}: {
  order: Order
  updating: boolean
  onAdvance: (order: Order, nextStatus: string) => void
}) {
  const fulfillment = getOrderFulfillmentStatus(order)
  const nextStatus = fulfillment ? getNextFulfillmentStatus(fulfillment) : null
  const paid = isOrderPaid(order)
  const canAdvance = paid && fulfillment != null && nextStatus != null

  if (canAdvance && nextStatus) {
    return (
      <Button
        type="button"
        size="sm"
        className="gap-1.5"
        disabled={updating}
        onClick={() => onAdvance(order, nextStatus)}
      >
        {updating ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
        ) : (
          <PackageCheck className="h-3.5 w-3.5" aria-hidden />
        )}
        {updating ? 'Đang cập nhật…' : FULFILLMENT_ACTION_LABELS[nextStatus]}
      </Button>
    )
  }

  if (fulfillment === 'DELIVERED') {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700">
        <PackageCheck className="h-3.5 w-3.5" aria-hidden />
        Hoàn tất
      </span>
    )
  }

  return null
}

const detailLinkClass =
  'inline-flex h-9 items-center justify-center gap-1 rounded-md border border-input bg-background px-3 text-sm font-medium shadow-sm transition-all hover:border-primary/30 hover:bg-muted'

export function SellerOrdersTable({
  orders,
  isLoading,
  isError,
  errorText,
  page,
  totalPages,
  onPageChange,
  updatingOrderId,
  onAdvanceStatus,
}: SellerOrdersTableProps) {
  if (isLoading) {
    return (
      <div className="space-y-2 p-4">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
      </div>
    )
  }

  if (isError) {
    return <p className="p-4 text-sm text-destructive">{errorText || 'Không tải được đơn hàng.'}</p>
  }

  if (orders.length === 0) {
    return (
      <EmptyState
        icon={Inbox}
        title="Không có đơn hàng phù hợp"
        description="Thử đổi từ khóa hoặc bộ lọc trạng thái."
      />
    )
  }

  return (
    <>
      <div className="divide-y md:hidden">
        {orders.map((order) => {
          const updating = updatingOrderId === order.id
          return (
            <div key={order.id} className="space-y-3 p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-1">
                    <Link
                      to={`/seller/orders/${order.id}`}
                      className="truncate font-medium hover:text-primary"
                    >
                      Đơn #{order.id.length > 10 ? `${order.id.slice(0, 8)}…` : order.id}
                    </Link>
                    <CopyIdButton orderId={order.id} />
                  </div>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">
                    {order.userEmail || 'Không rõ người mua'}
                  </p>
                  <p className="text-xs text-muted-foreground">{formatDateTime(order.createdAt)}</p>
                </div>
                <p className="shrink-0 text-sm font-semibold tabular-nums text-primary">
                  {formatVnd(order.totalAmount)}
                </p>
              </div>
              <div className="flex flex-wrap gap-1.5">
                <PaymentBadge order={order} />
                <FulfillmentBadge order={order} />
              </div>
              <div className="flex flex-wrap gap-2">
                <AdvanceButton order={order} updating={updating} onAdvance={onAdvanceStatus} />
                <Link to={`/seller/orders/${order.id}`} className={detailLinkClass}>
                  Chi tiết
                  <ChevronRight className="h-3.5 w-3.5" aria-hidden />
                </Link>
              </div>
            </div>
          )
        })}
      </div>

      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-[860px] text-sm">
          <thead className="border-b bg-muted/40 text-left text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-medium">Mã đơn</th>
              <th className="px-4 py-3 font-medium">Người mua</th>
              <th className="px-4 py-3 font-medium">Ngày tạo</th>
              <th className="px-4 py-3 font-medium">Thanh toán</th>
              <th className="px-4 py-3 font-medium">Giao hàng</th>
              <th className="px-4 py-3 font-medium text-right">Tổng</th>
              <th className="px-4 py-3 text-right font-medium">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => {
              const updating = updatingOrderId === order.id
              return (
                <tr
                  key={order.id}
                  className={cn('border-b last:border-b-0', updating && 'bg-muted/20')}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-0.5">
                      <Link
                        to={`/seller/orders/${order.id}`}
                        className="font-medium hover:text-primary"
                      >
                        #{order.id.length > 12 ? `${order.id.slice(0, 10)}…` : order.id}
                      </Link>
                      <CopyIdButton orderId={order.id} />
                    </div>
                  </td>
                  <td className="max-w-[180px] truncate px-4 py-3">{order.userEmail || '—'}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                    {formatDateTime(order.createdAt)}
                  </td>
                  <td className="px-4 py-3">
                    <PaymentBadge order={order} />
                  </td>
                  <td className="px-4 py-3">
                    <FulfillmentBadge order={order} />
                  </td>
                  <td className="px-4 py-3 text-right font-medium tabular-nums">
                    {formatVnd(order.totalAmount)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap items-center justify-end gap-1.5">
                      <AdvanceButton
                        order={order}
                        updating={updating}
                        onAdvance={onAdvanceStatus}
                      />
                      <Link to={`/seller/orders/${order.id}`} className={detailLinkClass}>
                        Chi tiết
                      </Link>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {totalPages > 1 ? (
        <div className="px-4 pb-4">
          <PaginationBar page={page} totalPages={totalPages} onPageChange={onPageChange} />
        </div>
      ) : null}
    </>
  )
}
