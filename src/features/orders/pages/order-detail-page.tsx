import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, CalendarDays, Loader2, MapPin, Package, Phone, RefreshCw, User } from 'lucide-react'
import { toast } from 'react-toastify'
import { useOrderQuery } from '@/features/orders/hooks/use-orders'
import { useInitVnpayMutation } from '@/features/payments/hooks/use-payments'
import { paymentMethodLabel } from '@/features/payments/lib/payment-labels'
import { markVnpayCheckoutPending, saveVnpayTxnRefOrderId } from '@/features/payments/lib/vnpay-return'
import { useAuthStore } from '@/shared/stores/auth-store'
import {
  formatOrderDate,
  formatVnd,
  orderStatusMeta,
} from '@/features/orders/components/order-formatters'
import { OrderIdDisplay } from '@/features/orders/components/order-id-display'
import { OrderItemThumb } from '@/features/orders/components/order-item-thumb'
import { OrderStatusTimeline } from '@/features/orders/components/order-status-timeline'
import { getApiErrorMessage } from '@/shared/lib/api-error'
import { loadOrderShipping } from '@/shared/lib/shipping-storage'
import { Badge } from '@/shared/ui/badge'
import { Button } from '@/shared/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card'
import { Skeleton } from '@/shared/ui/skeleton'
import { cn } from '@/shared/lib/utils'

function isPendingPayment(status: string) {
  const code = status.toUpperCase()
  return code.includes('PENDING') || (code.includes('PEND') && code.includes('PAY'))
}

export function OrderDetailPage() {
  const { id } = useParams()
  const orderQuery = useOrderQuery(id ?? null)
  const initVnpay = useInitVnpayMutation()
  const shipping = id ? loadOrderShipping(id) : null

  if (orderQuery.isPending) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-4 w-64" />
          </CardHeader>
          <CardContent className="space-y-3">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </CardContent>
        </Card>
      </div>
    )
  }

  if (orderQuery.isError || !orderQuery.data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Không tìm thấy đơn hàng</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-destructive">
            {getApiErrorMessage(orderQuery.error, 'Đơn hàng không tồn tại hoặc bạn không có quyền xem.')}
          </p>
          <Link to="/account/orders">
            <Button variant="outline">Quay lại danh sách đơn</Button>
          </Link>
        </CardContent>
      </Card>
    )
  }

  const order = orderQuery.data
  const meta = orderStatusMeta(order.status, { paymentMethod: shipping?.paymentMethod })
  const totalQty = order.items.reduce((sum, it) => sum + it.quantity, 0)
  const showVnpayRetry =
    shipping?.paymentMethod === 'VNPAY' && isPendingPayment(order.status)

  const handleRetryVnpay = async () => {
    try {
      const result = await initVnpay.mutateAsync({ orderId: order.id })
      const token = useAuthStore.getState().accessToken
      if (token) useAuthStore.getState().setAccessToken(token)
      markVnpayCheckoutPending(order.id)
      if (result.transactionRef) saveVnpayTxnRefOrderId(result.transactionRef, order.id)
      window.location.href = result.paymentUrl
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Không thể mở cổng VNPay.'))
    }
  }

  return (
    <div className="space-y-4">
      <Link
        to="/account/orders"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Quay lại đơn mua
      </Link>

      <Card>
        <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <CardTitle className="flex flex-wrap items-center gap-2">
              Đơn <OrderIdDisplay id={order.id} />
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
        <CardContent className="space-y-6">
          <OrderStatusTimeline status={order.status} paymentMethod={shipping?.paymentMethod} />

          {shipping ? (
            <div className="rounded-lg border bg-muted/20 p-4">
              <h3 className="mb-3 text-sm font-semibold">Thông tin giao hàng</h3>
              <dl className="space-y-2 text-sm">
                <div className="flex items-start gap-2">
                  <User className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                  <div>
                    <dt className="text-xs text-muted-foreground">Người nhận</dt>
                    <dd>{shipping.customerName}</dd>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Phone className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                  <div>
                    <dt className="text-xs text-muted-foreground">Số điện thoại</dt>
                    <dd>{shipping.phone}</dd>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                  <div>
                    <dt className="text-xs text-muted-foreground">Địa chỉ</dt>
                    <dd>{shipping.address}</dd>
                  </div>
                </div>
                {shipping.paymentMethod ? (
                  <div>
                    <dt className="text-xs text-muted-foreground">Thanh toán</dt>
                    <dd>{paymentMethodLabel(shipping.paymentMethod)}</dd>
                  </div>
                ) : null}
              </dl>
            </div>
          ) : (
            <div className="rounded-lg border border-dashed bg-muted/20 p-4 text-sm text-muted-foreground">
              Chưa có thông tin giao hàng cho đơn này.
            </div>
          )}

          <div>
            <h3 className="mb-3 text-sm font-semibold">Sản phẩm</h3>
            <ul className="divide-y rounded-lg border">
              {order.items.map((it, idx) => (
                <li key={`${it.productId}-${idx}`} className="flex items-start gap-3 p-3">
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
              ))}
            </ul>
          </div>

          <div className="flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
            <span className="text-sm text-muted-foreground">Tổng thanh toán</span>
            <div className="flex flex-col items-stretch gap-2 sm:items-end">
              <span className="text-xl font-semibold text-secondary">{formatVnd(order.totalAmount)}</span>
              {showVnpayRetry ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  disabled={initVnpay.isPending}
                  onClick={() => void handleRetryVnpay()}
                >
                  {initVnpay.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                  Thanh toán lại VNPay
                </Button>
              ) : null}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
