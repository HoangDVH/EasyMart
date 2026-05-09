import type { Order } from '@/features/orders/types/order.types'
import { formatDateTime, formatVnd } from '@/features/seller/components/seller-formatters'
import { Badge } from '@/shared/ui/badge'
import { Skeleton } from '@/shared/ui/skeleton'

type SellerOrdersHistoryPanelProps = {
  orders: Order[]
  isLoading: boolean
  isError: boolean
  errorText: string | null
}

export function SellerOrdersHistoryPanel({
  orders,
  isLoading,
  isError,
  errorText,
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
      {orders.map((order) => (
        <div key={order.id} className="rounded-md border p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-medium">Đơn #{order.id}</p>
            <Badge>{order.status}</Badge>
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
          <p className="mt-2 text-sm font-semibold">Tổng đơn: {formatVnd(order.totalAmount)}</p>
        </div>
      ))}
    </div>
  )
}
