import { Loader2, PackageCheck } from 'lucide-react'
import type { Order } from '@/features/orders/types/order.types'
import { formatDateTime, formatVnd } from '@/features/seller/components/seller-formatters'
import {
  FULFILLMENT_ACTION_LABELS,
  FULFILLMENT_BADGE_CLASSES,
  FULFILLMENT_LABELS,
  getNextFulfillmentStatus,
  getOrderFulfillmentStatus,
  isOrderPaid,
} from '@/features/seller/lib/fulfillment'
import { cn } from '@/shared/lib/utils'
import { Badge } from '@/shared/ui/badge'
import { Button } from '@/shared/ui/button'
import { Skeleton } from '@/shared/ui/skeleton'

type SellerOrdersHistoryPanelProps = {
  orders: Order[]
  isLoading: boolean
  isError: boolean
  errorText: string | null
  updatingOrderId: string | null
  onAdvanceStatus: (order: Order, nextStatus: string) => void
}

export function SellerOrdersHistoryPanel({
  orders,
  isLoading,
  isError,
  errorText,
  updatingOrderId,
  onAdvanceStatus,
}: SellerOrdersHistoryPanelProps) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
    )
  }

  if (isError) {
    return <p className="text-sm text-destructive">{errorText || 'Không tải được lịch sử đơn.'}</p>
  }

  if (orders.length === 0) {
    return <p className="text-sm text-muted-foreground">Seller chưa có đơn hàng nào.</p>
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
          <div key={order.id} className="rounded-md border p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-medium">Đơn #{order.id}</p>
              <div className="flex flex-wrap items-center gap-2">
                <Badge>{order.status}</Badge>
                {fulfillment ? (
                  <Badge className={cn(FULFILLMENT_BADGE_CLASSES[fulfillment])}>
                    {FULFILLMENT_LABELS[fulfillment]}
                  </Badge>
                ) : null}
              </div>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Người mua: {order.userEmail || '—'} | Tạo lúc: {formatDateTime(order.createdAt)}
            </p>
            <div className="mt-2 space-y-1">
              {order.items.map((item, index) => (
                <p key={`${item.productId}-${index}`} className="text-sm text-muted-foreground">
                  - {item.productName || `Sản phẩm #${item.productId}`} x{item.quantity} (
                  {formatVnd(item.unitPrice * item.quantity)})
                </p>
              ))}
            </div>
            <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-semibold">Tổng đơn: {formatVnd(order.totalAmount)}</p>

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
                <span className="text-xs font-medium text-emerald-700">
                  Hoàn tất giao hàng
                </span>
              ) : !paid ? (
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
