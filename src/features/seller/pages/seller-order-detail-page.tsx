import { useMemo } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, RefreshCw } from 'lucide-react'
import { isAxiosError } from 'axios'
import { toast } from 'react-toastify'
import {
  FULFILLMENT_LABELS,
  isFulfillmentStatus,
} from '@/features/orders/lib/fulfillment'
import type { Order } from '@/features/orders/types/order.types'
import { SellerOrdersHistoryPanel } from '@/features/seller/components/seller-orders-history-panel'
import {
  useSellerOrderHistoryQuery,
  useSellerProductsQuery,
  useUpdateSellerOrderStatusMutation,
} from '@/features/seller/hooks/use-seller'
import { getApiErrorMessage } from '@/shared/lib/api-error'
import { cn } from '@/shared/lib/utils'
import { useAuthStore } from '@/shared/stores/auth-store'
import { Button } from '@/shared/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card'

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

  const errorText = ordersQuery.isError
    ? getApiErrorMessage(ordersQuery.error, 'Không tải được chi tiết đơn hàng.')
    : null

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <Link
            to="/seller/orders"
            className="mb-2 inline-flex min-h-10 items-center gap-1 text-xs font-medium text-muted-foreground hover:text-primary"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Quay lại danh sách đơn
          </Link>
          <CardTitle className="break-all text-base sm:text-lg">
            Trạng thái đơn #{id.length > 12 ? `${id.slice(0, 8)}…` : id}
          </CardTitle>
          <CardDescription>
            Xem sản phẩm, thanh toán và cập nhật tiến trình giao hàng của riêng đơn này.
          </CardDescription>
        </div>
        <Button
          size="sm"
          variant="outline"
          className="h-10 w-full gap-1.5 sm:h-9 sm:w-auto"
          onClick={() => void ordersQuery.refetch()}
          disabled={ordersQuery.isFetching}
        >
          <RefreshCw
            className={cn('h-3.5 w-3.5', ordersQuery.isFetching && 'animate-spin')}
          />
          Làm mới
        </Button>
      </CardHeader>
      <CardContent>
        {!ordersQuery.isPending && !ordersQuery.isError && !order ? (
          <div className="rounded-lg border border-dashed px-4 py-10 text-center">
            <p className="font-medium">Không tìm thấy đơn #{id}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Đơn có thể không thuộc cửa hàng này hoặc đã bị xóa.
            </p>
          </div>
        ) : (
          <SellerOrdersHistoryPanel
            orders={order ? [order] : []}
            productImageById={productImageById}
            isLoading={ordersQuery.isPending}
            isError={ordersQuery.isError}
            errorText={errorText}
            updatingOrderId={
              updateStatusMutation.isPending
                ? updateStatusMutation.variables?.orderId ?? null
                : null
            }
            onAdvanceStatus={(currentOrder, nextStatus) =>
              void onAdvanceStatus(currentOrder, nextStatus)
            }
          />
        )}
      </CardContent>
    </Card>
  )
}
