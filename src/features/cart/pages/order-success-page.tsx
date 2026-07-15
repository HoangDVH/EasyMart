import { Link, useParams } from 'react-router-dom'
import { CheckCircle2, Package } from 'lucide-react'
import { useEffect, useMemo } from 'react'
import { CheckoutSteps } from '@/features/cart/components/checkout-steps'
import { useOrderQuery } from '@/features/orders/hooks/use-orders'
import { OrderIdDisplay } from '@/features/orders/components/order-id-display'
import { formatVnd } from '@/features/orders/components/order-formatters'
import { getApiErrorMessage } from '@/shared/lib/api-error'
import { loadOrderShipping } from '@/shared/lib/shipping-storage'
import { Button } from '@/shared/ui/button'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/shared/ui/card'
import { Skeleton } from '@/shared/ui/skeleton'
import { clearVnpaySession, loadVnpayPendingOrderId } from '@/features/payments/lib/vnpay-return'
import { paymentMethodLabel } from '@/features/payments/lib/payment-labels'

export function OrderSuccessPage() {
  const { orderId: orderIdParam } = useParams()
  const orderId = useMemo(
    () => orderIdParam?.trim() || loadVnpayPendingOrderId(),
    [orderIdParam],
  )
  const orderQuery = useOrderQuery(orderId ?? null)
  const shipping = orderId ? loadOrderShipping(orderId) : null
  const paymentMethod = shipping?.paymentMethod ?? 'VNPAY'

  useEffect(() => {
    if (orderId) clearVnpaySession()
  }, [orderId])

  if (!orderId) {
    return (
      <div className="mx-auto max-w-lg space-y-4 pb-8">
        <CheckoutSteps current="done" />
        <Card>
          <CardHeader>
            <CardTitle>Không tìm thấy mã đơn hàng</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Thanh toán có thể đã thành công. Vui lòng kiểm tra mục đơn mua của bạn.
          </CardContent>
          <CardFooter>
            <Link to="/account/orders">
              <Button>Xem đơn mua</Button>
            </Link>
          </CardFooter>
        </Card>
      </div>
    )
  }

  if (orderQuery.isPending) {
    return (
      <div className="mx-auto max-w-lg space-y-4">
        <CheckoutSteps current="done" />
        <Card>
          <CardHeader className="items-center text-center">
            <Skeleton className="h-14 w-14 rounded-full" />
            <Skeleton className="h-6 w-48" />
          </CardHeader>
          <CardContent className="space-y-3">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
          </CardContent>
        </Card>
      </div>
    )
  }

  const order = orderQuery.data
  const showOfflineSuccess = (orderQuery.isError || !order) && paymentMethod === 'VNPAY' && shipping

  if (orderQuery.isError && !showOfflineSuccess) {
    return (
      <div className="mx-auto max-w-lg space-y-4">
        <CheckoutSteps current="done" />
        <Card>
          <CardHeader>
            <CardTitle>Không tải được thông tin đơn</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>{getApiErrorMessage(orderQuery.error, 'Đơn hàng không tồn tại hoặc bạn không có quyền xem.')}</p>
            <Link to="/account/orders">
              <Button variant="outline">Xem đơn mua của tôi</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  const totalQty = order?.items.reduce((sum, item) => sum + item.quantity, 0) ?? null

  return (
    <div className="mx-auto max-w-lg space-y-4 pb-8">
      <CheckoutSteps current="done" />

      <Card className="overflow-hidden border-primary/20">
        <CardHeader className="items-center space-y-3 pb-2 text-center">
          <span className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
            <CheckCircle2 className="h-9 w-9" aria-hidden />
          </span>
          <div className="space-y-1">
            <CardTitle className="text-xl">Đặt hàng thành công!</CardTitle>
            <p className="text-sm text-muted-foreground">
              Cảm ơn bạn đã mua sắm tại EasyMart. Chúng tôi sẽ xử lý đơn sớm nhất.
            </p>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <div className="rounded-lg border bg-muted/30 p-4 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-muted-foreground">Mã đơn hàng</span>
              <OrderIdDisplay id={orderId} />
            </div>
            {order ? (
              <>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-muted-foreground">Tổng thanh toán</span>
                  <span className="font-semibold text-secondary">{formatVnd(order.totalAmount)}</span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-muted-foreground">Sản phẩm</span>
                  <span>
                    {totalQty} sp · {order.items.length} mặt hàng
                  </span>
                </div>
              </>
            ) : null}
            <div className="flex items-start justify-between gap-2">
              <span className="shrink-0 text-muted-foreground">Thanh toán</span>
              <span className="text-right">{paymentMethodLabel(paymentMethod)}</span>
            </div>
          </div>

          {paymentMethod === 'VNPAY' ? (
            <div className="rounded-lg border border-emerald-200/80 bg-emerald-50/80 p-3 text-xs text-emerald-900">
              <p className="font-medium">Thanh toán VNPay thành công</p>
              <p className="mt-1 leading-relaxed">
                Giao dịch đã được ghi nhận. Đơn hàng sẽ được xử lý sau khi VNPay xác nhận (IPN).
              </p>
            </div>
          ) : (
            <p className="text-center text-xs text-muted-foreground">
              Thanh toán khi nhận hàng. Shipper sẽ liên hệ trước khi giao.
            </p>
          )}

          {shipping ? (
            <div className="flex items-start gap-2 rounded-lg border p-3 text-xs text-muted-foreground">
              <Package className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              <div>
                <p className="font-medium text-foreground">{shipping.customerName}</p>
                <p>{shipping.phone}</p>
                <p className="mt-0.5 leading-relaxed">{shipping.address}</p>
              </div>
            </div>
          ) : null}
        </CardContent>
        <CardFooter className="flex flex-col gap-2 sm:flex-row">
          <Link to={`/account/orders/${orderId}`} className="w-full sm:flex-1">
            <Button className="w-full gap-1.5">
              <Package className="h-4 w-4" />
              Xem chi tiết đơn
            </Button>
          </Link>
          <Link to="/" className="w-full sm:flex-1">
            <Button variant="outline" className="w-full">
              Tiếp tục mua sắm
            </Button>
          </Link>
        </CardFooter>
      </Card>
    </div>
  )
}
