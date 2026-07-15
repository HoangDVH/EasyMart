import { Link } from 'react-router-dom'
import { CalendarDays, Package, ShoppingBag } from 'lucide-react'
import { useMyOrdersQuery } from '@/features/orders/hooks/use-orders'
import {
  formatOrderDate,
  formatVnd,
  orderStatusMeta,
} from '@/features/orders/components/order-formatters'
import { OrderIdDisplay } from '@/features/orders/components/order-id-display'
import { OrderItemThumb } from '@/features/orders/components/order-item-thumb'
import { getApiErrorMessage } from '@/shared/lib/api-error'
import { loadOrderShipping } from '@/shared/lib/shipping-storage'
import { useAuthStore } from '@/shared/stores/auth-store'
import { Badge } from '@/shared/ui/badge'
import { Button } from '@/shared/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card'
import { EmptyState } from '@/shared/ui/empty-state'
import { Skeleton } from '@/shared/ui/skeleton'
import { cn } from '@/shared/lib/utils'
import type { Order } from '@/features/orders/types/order.types'

function OrderCard({ order }: { order: Order }) {
  const shipping = loadOrderShipping(order.id)
  const meta = orderStatusMeta(order.status, { paymentMethod: shipping?.paymentMethod })
  const totalQty = order.items.reduce((sum, it) => sum + it.quantity, 0)

  return (
    <Card className="overflow-hidden">
      <CardHeader className="flex flex-col gap-2 border-b bg-muted/30 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <CardTitle className="text-base">
            Đơn <OrderIdDisplay id={order.id} showCopy={false} />
          </CardTitle>
          <CardDescription className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
            <span className="inline-flex items-center gap-1">
              <CalendarDays className="h-3.5 w-3.5" />
              {formatOrderDate(order.createdAt)}
            </span>
            <span className="inline-flex items-center gap-1">
              <Package className="h-3.5 w-3.5" />
              {totalQty} sản phẩm
            </span>
          </CardDescription>
        </div>
        <Badge className={cn('w-fit border', meta.tone)}>{meta.label}</Badge>
      </CardHeader>
      <CardContent className="space-y-3 pt-4">
        <ul className="divide-y">
          {order.items.length === 0 ? (
            <li className="py-2 text-sm text-muted-foreground">Đơn không có sản phẩm.</li>
          ) : (
            order.items.slice(0, 3).map((it, idx) => (
              <li key={`${it.productId}-${idx}`} className="flex items-start gap-3 py-2">
                <OrderItemThumb productId={it.productId} name={it.productName} />
                <div className="flex min-w-0 flex-1 items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <Link
                      to={`/products/${it.productId}`}
                      className="line-clamp-2 text-sm font-medium hover:text-primary hover:underline"
                    >
                      {it.productName || `Sản phẩm #${it.productId}`}
                    </Link>
                    <p className="text-xs text-muted-foreground">x{it.quantity}</p>
                  </div>
                  <p className="shrink-0 text-sm font-medium tabular-nums">
                    {formatVnd(it.unitPrice * it.quantity)}
                  </p>
                </div>
              </li>
            ))
          )}
        </ul>
        {order.items.length > 3 ? (
          <p className="text-xs text-muted-foreground">+ {order.items.length - 3} sản phẩm khác</p>
        ) : null}
        <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-3">
          <span className="text-sm text-muted-foreground">Tổng thanh toán</span>
          <span className="text-lg font-semibold text-secondary">{formatVnd(order.totalAmount)}</span>
        </div>
        <Link to={`/account/orders/${order.id}`}>
          <Button variant="outline" size="sm" className="w-full sm:w-auto">
            Xem chi tiết đơn
          </Button>
        </Link>
      </CardContent>
    </Card>
  )
}

function OrderSkeleton() {
  return (
    <Card>
      <CardHeader className="flex flex-col gap-2 border-b sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-3 w-48" />
        </div>
        <Skeleton className="h-6 w-20" />
      </CardHeader>
      <CardContent className="space-y-3 pt-4">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
      </CardContent>
    </Card>
  )
}

export function MyOrdersPage() {
  const accessToken = useAuthStore((state) => state.accessToken)
  const ordersQuery = useMyOrdersQuery(Boolean(accessToken))

  if (ordersQuery.isPending) {
    return (
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Đơn mua</CardTitle>
            <CardDescription>Đang tải các đơn hàng đã đặt...</CardDescription>
          </CardHeader>
        </Card>
        <OrderSkeleton />
        <OrderSkeleton />
      </div>
    )
  }

  if (ordersQuery.isError) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Đơn mua</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-destructive">
            {getApiErrorMessage(ordersQuery.error, 'Không tải được danh sách đơn hàng.')}
          </p>
          <Button size="sm" variant="outline" onClick={() => void ordersQuery.refetch()}>
            Thử lại
          </Button>
        </CardContent>
      </Card>
    )
  }

  const orders = ordersQuery.data ?? []

  if (orders.length === 0) {
    return (
      <Card>
        <EmptyState
          icon={ShoppingBag}
          title="Chưa có đơn hàng"
          description="Các đơn bạn đặt sẽ hiển thị tại đây. Bắt đầu mua sắm để trải nghiệm EasyMart."
          action={
            <Link to="/">
              <Button variant="secondary">Bắt đầu mua sắm</Button>
            </Link>
          }
        />
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <ShoppingBag className="h-5 w-5 text-primary" />
              Đơn mua
            </CardTitle>
            <CardDescription>Tổng cộng {orders.length} đơn hàng đã đặt.</CardDescription>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => void ordersQuery.refetch()}
            disabled={ordersQuery.isFetching}
          >
            {ordersQuery.isFetching ? 'Đang tải...' : 'Làm mới'}
          </Button>
        </CardHeader>
      </Card>

      <div className="space-y-4">
        {orders.map((order) => (
          <OrderCard key={order.id} order={order} />
        ))}
      </div>
    </div>
  )
}
