import { useMemo } from 'react'
import { RefreshCw } from 'lucide-react'
import { isAxiosError } from 'axios'
import { toast } from 'react-toastify'
import { Button } from '@/shared/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card'
import { getApiErrorMessage } from '@/shared/lib/api-error'
import { useAuthStore } from '@/shared/stores/auth-store'
import {
  useSellerOrderHistoryQuery,
  useUpdateSellerOrderStatusMutation,
} from '@/features/seller/hooks/use-seller'
import { FULFILLMENT_LABELS, isFulfillmentStatus } from '@/features/orders/lib/fulfillment'
import type { Order } from '@/features/orders/types/order.types'
import { cn } from '@/shared/lib/utils'
import { SellerOrdersHistoryPanel } from '@/features/seller/components/seller-orders-history-panel'
import { SellerStatsCards } from '@/features/seller/components/seller-stats-cards'

export function SellerOrdersPage() {
  const accessToken = useAuthStore((state) => state.accessToken)
  const sellerOrdersQuery = useSellerOrderHistoryQuery(Boolean(accessToken))
  const updateOrderStatusMutation = useUpdateSellerOrderStatusMutation()

  const sellerOrders = sellerOrdersQuery.data ?? []

  const totalSoldUnits = useMemo(
    () =>
      sellerOrders.reduce(
        (sum, order) => sum + order.items.reduce((itemSum, item) => itemSum + item.quantity, 0),
        0,
      ),
    [sellerOrders],
  )

  const paidRevenue = useMemo(
    () =>
      sellerOrders.reduce(
        (sum, order) => (order.status === 'PAID' ? sum + order.totalAmount : sum),
        0,
      ),
    [sellerOrders],
  )

  async function onAdvanceOrderStatus(order: Order, nextStatus: string) {
    try {
      await updateOrderStatusMutation.mutateAsync({ orderId: order.id, status: nextStatus })
      const label = isFulfillmentStatus(nextStatus) ? FULFILLMENT_LABELS[nextStatus] : nextStatus
      toast.success(`Đơn #${order.id}: chuyển sang "${label}".`)
    } catch (error) {
      if (isAxiosError(error) && error.response?.status === 409) {
        toast.error(
          getApiErrorMessage(
            error,
            'Không thể chuyển trạng thái: sai thứ tự hoặc đơn chưa thanh toán.',
          ),
        )
        void sellerOrdersQuery.refetch()
        return
      }
      toast.error(getApiErrorMessage(error, 'Không cập nhật được trạng thái giao hàng.'))
    }
  }

  const ordersErrorText = sellerOrdersQuery.isError
    ? getApiErrorMessage(sellerOrdersQuery.error, 'Không tải được lịch sử đơn của seller.')
    : null

  return (
    <div className="space-y-4">
      <SellerStatsCards
        isLoading={sellerOrdersQuery.isPending}
        totalProducts={null}
        lowStockCount={null}
        totalOrders={sellerOrders.length}
        totalRevenue={paidRevenue}
      />

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <div>
            <CardTitle>Đơn hàng sản phẩm</CardTitle>
            <CardDescription>
              Tổng {sellerOrders.length} đơn · đã bán {totalSoldUnits} sản phẩm.
            </CardDescription>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5"
            onClick={() => void sellerOrdersQuery.refetch()}
            disabled={sellerOrdersQuery.isFetching}
          >
            <RefreshCw className={cn('h-3.5 w-3.5', sellerOrdersQuery.isFetching && 'animate-spin')} />
            {sellerOrdersQuery.isFetching ? 'Đang tải...' : 'Làm mới'}
          </Button>
        </CardHeader>
        <CardContent>
          <SellerOrdersHistoryPanel
            orders={sellerOrders}
            isLoading={sellerOrdersQuery.isPending}
            isError={sellerOrdersQuery.isError}
            errorText={ordersErrorText}
            updatingOrderId={
              updateOrderStatusMutation.isPending
                ? updateOrderStatusMutation.variables?.orderId ?? null
                : null
            }
            onAdvanceStatus={(order, nextStatus) => void onAdvanceOrderStatus(order, nextStatus)}
          />
        </CardContent>
      </Card>
    </div>
  )
}
