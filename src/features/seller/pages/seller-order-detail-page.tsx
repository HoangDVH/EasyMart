import { useMemo } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, ImageOff, Loader2, PackageCheck, RefreshCw } from 'lucide-react'
import { isAxiosError } from 'axios'
import { toast } from 'react-toastify'
import {
  FULFILLMENT_ACTION_LABELS,
  FULFILLMENT_BADGE_CLASSES,
  FULFILLMENT_LABELS,
  getNextFulfillmentStatus,
  getOrderFulfillmentStatus,
  isCodPayment,
  isFulfillmentStatus,
  isOrderPaid,
} from '@/features/orders/lib/fulfillment'
import type { Order } from '@/features/orders/types/order.types'
import { formatDateTime, formatVnd } from '@/features/seller/components/seller-formatters'
import {
  useSellerOrderHistoryQuery,
  useSellerProductsQuery,
  useUpdateSellerOrderStatusMutation,
} from '@/features/seller/hooks/use-seller'
import { getApiErrorMessage } from '@/shared/lib/api-error'
import { cn } from '@/shared/lib/utils'
import { useAuthStore } from '@/shared/stores/auth-store'
import { Badge } from '@/shared/ui/badge'
import { Button } from '@/shared/ui/button'
import { Card, CardContent } from '@/shared/ui/card'
import { Skeleton } from '@/shared/ui/skeleton'

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

export function SellerOrderDetailPage() {
  const { id = '' } = useParams()
  const accessToken = useAuthStore((state) => state.accessToken)
  const ordersQuery = useSellerOrderHistoryQuery(Boolean(accessToken))
  const productsQuery = useSellerProductsQuery(Boolean(accessToken))
  const updateStatusMutation = useUpdateSellerOrderStatusMutation()

  const order = (ordersQuery.data ?? []).find((item) => item.id === id) ?? null
  const productImageById = useMemo(() => {
    const map = new Map<string, string>()
    for (const product of productsQuery.data ?? []) {
      const src = product.images?.[0] ?? product.imageUrl
      if (src) map.set(String(product.id), src)
    }
    return map
  }, [productsQuery.data])

  async function onAdvanceStatus(currentOrder: Order, nextStatus: string) {
    try {
      await updateStatusMutation.mutateAsync({ orderId: currentOrder.id, status: nextStatus })
      const label = isFulfillmentStatus(nextStatus)
        ? FULFILLMENT_LABELS[nextStatus]
        : nextStatus
      toast.success(`Đơn #${currentOrder.id}: chuyển sang "${label}".`)
    } catch (error) {
      if (isAxiosError(error) && error.response?.status === 409) {
        toast.error(
          getApiErrorMessage(
            error,
            'Không thể chuyển trạng thái: sai thứ tự hoặc đơn chưa thanh toán.',
          ),
        )
        void ordersQuery.refetch()
        return
      }
      toast.error(getApiErrorMessage(error, 'Không cập nhật được trạng thái giao hàng.'))
    }
  }

  const fulfillment = order ? getOrderFulfillmentStatus(order) : null
  const nextStatus = fulfillment ? getNextFulfillmentStatus(fulfillment) : null
  const paid = order ? isOrderPaid(order) : false
  const canAdvance = Boolean(order && paid && fulfillment && nextStatus)
  const isUpdating =
    updateStatusMutation.isPending && updateStatusMutation.variables?.orderId === order?.id

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Link
          to="/seller/orders"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Quay lại danh sách đơn
        </Link>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="gap-2 self-start sm:self-auto"
          onClick={() => void ordersQuery.refetch()}
          disabled={ordersQuery.isFetching}
        >
          <RefreshCw
            className={cn('h-3.5 w-3.5', ordersQuery.isFetching && 'animate-spin')}
            aria-hidden
          />
          Làm mới
        </Button>
      </div>

      {ordersQuery.isPending ? (
        <div className="space-y-3">
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      ) : ordersQuery.isError ? (
        <Card>
          <CardContent className="p-4 text-sm text-destructive">
            {getApiErrorMessage(ordersQuery.error, 'Không tải được chi tiết đơn hàng.')}
          </CardContent>
        </Card>
      ) : !order ? (
        <Card>
          <CardContent className="px-4 py-10 text-center">
            <p className="font-medium">Không tìm thấy đơn #{id}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Đơn có thể không thuộc cửa hàng này hoặc đã bị xóa.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardContent className="grid gap-4 p-4 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <p className="text-xs text-muted-foreground">Mã đơn</p>
                <p className="mt-1 break-all text-sm font-semibold">{order.id}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Người mua</p>
                <p className="mt-1 truncate text-sm font-medium">
                  {order.userEmail || 'Không rõ'}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Ngày tạo</p>
                <p className="mt-1 text-sm font-medium">{formatDateTime(order.createdAt)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Tổng tiền</p>
                <p className="mt-1 text-lg font-semibold tabular-nums text-primary">
                  {formatVnd(order.totalAmount)}
                </p>
              </div>
              <div className="flex flex-wrap gap-2 sm:col-span-2 lg:col-span-4">
                <PaymentBadge order={order} />
                {fulfillment && paid ? (
                  <Badge className={cn(FULFILLMENT_BADGE_CLASSES[fulfillment])}>
                    {FULFILLMENT_LABELS[fulfillment]}
                  </Badge>
                ) : null}
              </div>
            </CardContent>
          </Card>

          <Card>
            <div className="border-b px-4 py-3">
              <h2 className="text-base font-semibold">Sản phẩm trong đơn</h2>
              <p className="text-sm text-muted-foreground">{order.items.length} dòng hàng</p>
            </div>
            <div className="divide-y">
              {order.items.map((item, index) => {
                const src = productImageById.get(String(item.productId)) ?? null
                return (
                  <div
                    key={`${item.productId}-${index}`}
                    className="flex items-center gap-3 px-4 py-3"
                  >
                    <div className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-lg border bg-muted/40">
                      {src ? (
                        <img src={src} alt="" className="h-full w-full object-contain" loading="lazy" />
                      ) : (
                        <ImageOff className="h-4 w-4 text-muted-foreground/60" aria-hidden />
                      )}
                    </div>
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
                )
              })}
            </div>
            <div className="flex flex-col gap-3 border-t bg-muted/20 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm">
                <span className="text-muted-foreground">Tổng đơn: </span>
                <span className="text-base font-semibold tabular-nums text-primary">
                  {formatVnd(order.totalAmount)}
                </span>
              </p>
              {canAdvance && nextStatus ? (
                <Button
                  type="button"
                  className="gap-1.5"
                  disabled={isUpdating}
                  onClick={() => void onAdvanceStatus(order, nextStatus)}
                >
                  {isUpdating ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                  ) : (
                    <PackageCheck className="h-3.5 w-3.5" aria-hidden />
                  )}
                  {isUpdating ? 'Đang cập nhật…' : FULFILLMENT_ACTION_LABELS[nextStatus]}
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
          </Card>
        </>
      )}
    </div>
  )
}
