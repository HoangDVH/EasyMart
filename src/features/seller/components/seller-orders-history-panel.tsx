import { Check, Copy, ImageOff, Inbox, Loader2, PackageCheck } from 'lucide-react'
import { useState } from 'react'
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
import { Skeleton } from '@/shared/ui/skeleton'

type SellerOrdersHistoryPanelProps = {
  orders: Order[]
  /** Map productId -> ảnh đại diện, tra từ danh sách sản phẩm của seller. */
  productImageById?: Map<string, string>
  isLoading: boolean
  isError: boolean
  errorText: string | null
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

  /** COD: backend vẫn set PAID để được giao — UI không được gọi là "đã thanh toán". */
  if (isCodPayment(order)) {
    if (fulfillment === 'DELIVERED') {
      return (
        <Badge className="border-emerald-300/60 bg-emerald-50 text-emerald-700">Đã thu COD</Badge>
      )
    }
    return (
      <Badge className="border-amber-300/60 bg-amber-50 text-amber-700">
        COD · Thu khi nhận hàng
      </Badge>
    )
  }

  if (isOrderPaid(order)) {
    return (
      <Badge className="border-emerald-300/60 bg-emerald-50 text-emerald-700">Đã thanh toán</Badge>
    )
  }
  return <Badge className="border-amber-300/60 bg-amber-50 text-amber-700">Chưa thanh toán</Badge>
}

function CopyOrderId({ orderId }: { orderId: string }) {
  const [copied, setCopied] = useState(false)
  const shortId = orderId.length > 8 ? `${orderId.slice(0, 8)}…` : orderId

  async function onCopy() {
    try {
      await navigator.clipboard.writeText(orderId)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      /* Trình duyệt chặn clipboard — bỏ qua, người dùng vẫn thấy mã đơn. */
    }
  }

  return (
    <button
      type="button"
      className="inline-flex min-h-10 items-center gap-1.5 rounded-md px-2 py-1.5 font-medium transition-colors hover:bg-muted"
      title={`Sao chép mã đơn ${orderId}`}
      onClick={() => void onCopy()}
    >
      <span className="sm:hidden">Đơn #{shortId}</span>
      <span className="hidden sm:inline">Đơn #{orderId}</span>
      {copied ? (
        <Check className="h-4 w-4 text-emerald-600" aria-hidden />
      ) : (
        <Copy className="h-4 w-4 text-muted-foreground" aria-hidden />
      )}
    </button>
  )
}

function ItemThumb({ src }: { src: string | null }) {
  return (
    <div className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-lg border bg-muted/40">
      {src ? (
        <img src={src} alt="" className="h-full w-full object-contain" loading="lazy" />
      ) : (
        <ImageOff className="h-4 w-4 text-muted-foreground/60" aria-hidden />
      )}
    </div>
  )
}

export function SellerOrdersHistoryPanel({
  orders,
  productImageById,
  isLoading,
  isError,
  errorText,
  updatingOrderId,
  onAdvanceStatus,
}: SellerOrdersHistoryPanelProps) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }, (_, i) => (
          <Skeleton key={i} className="h-36 w-full rounded-xl" />
        ))}
      </div>
    )
  }

  if (isError) {
    return <p className="text-sm text-destructive">{errorText || 'Không tải được lịch sử đơn.'}</p>
  }

  if (orders.length === 0) {
    return (
      <EmptyState
        icon={Inbox}
        title="Không có đơn hàng"
        description="Chưa có đơn hàng nào ở trạng thái này."
      />
    )
  }

  return (
    <div className="space-y-3">
      {orders.map((order) => {
        const fulfillment = getOrderFulfillmentStatus(order)
        const nextStatus = fulfillment ? getNextFulfillmentStatus(fulfillment) : null
        const paid = isOrderPaid(order)
        const isUpdating = updatingOrderId === order.id
        const canAdvance = paid && fulfillment != null && nextStatus != null

        return (
          <div key={order.id} className="overflow-hidden rounded-xl border bg-card">
            {/* Header: mã đơn + người mua bên trái, badge trạng thái bên phải */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-b bg-muted/30 px-4 py-2.5">
              <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                <CopyOrderId orderId={order.id} />
                <span className="hidden text-muted-foreground/50 sm:inline">·</span>
                <span className="truncate text-xs text-muted-foreground">
                  {order.userEmail || 'Không rõ người mua'}
                </span>
                <span className="hidden text-muted-foreground/50 sm:inline">·</span>
                <span className="text-xs text-muted-foreground">
                  {formatDateTime(order.createdAt)}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <PaymentBadge order={order} />
                {fulfillment && paid ? (
                  <Badge className={cn(FULFILLMENT_BADGE_CLASSES[fulfillment])}>
                    {FULFILLMENT_LABELS[fulfillment]}
                  </Badge>
                ) : null}
              </div>
            </div>

            {/* Danh sách sản phẩm trong đơn */}
            <div className="divide-y">
              {order.items.map((item, index) => (
                <div
                  key={`${item.productId}-${index}`}
                  className="flex items-center gap-3 px-4 py-3"
                >
                  <ItemThumb src={productImageById?.get(String(item.productId)) ?? null} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {item.productName || `Sản phẩm #${item.productId}`}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatVnd(item.unitPrice)} × {item.quantity}
                    </p>
                  </div>
                  <p className="shrink-0 text-sm font-medium tabular-nums">
                    {formatVnd(item.unitPrice * item.quantity)}
                  </p>
                </div>
              ))}
            </div>

            {/* Footer: tổng tiền + hành động */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-t bg-muted/20 px-4 py-3">
              <p className="text-sm">
                <span className="text-muted-foreground">Tổng đơn: </span>
                <span className="text-base font-semibold text-primary tabular-nums">
                  {formatVnd(order.totalAmount)}
                </span>
              </p>

              {canAdvance ? (
                <Button
                  size="sm"
                  className="gap-1.5"
                  disabled={isUpdating}
                  onClick={() => onAdvanceStatus(order, nextStatus)}
                >
                  {isUpdating ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <PackageCheck className="h-3.5 w-3.5" />
                  )}
                  {isUpdating ? 'Đang cập nhật...' : FULFILLMENT_ACTION_LABELS[nextStatus]}
                </Button>
              ) : fulfillment === 'DELIVERED' ? (
                <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700">
                  <PackageCheck className="h-3.5 w-3.5" aria-hidden />
                  Hoàn tất giao hàng
                </span>
              ) : !paid && !isCancelledOrder(order) ? (
                <span className="text-xs text-muted-foreground">
                  Chờ thanh toán — chưa thể xử lý giao hàng
                </span>
              ) : null}
            </div>
          </div>
        )
      })}
    </div>
  )
}
