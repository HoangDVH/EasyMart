import { useMemo, useState } from 'react'
import { RefreshCw } from 'lucide-react'
import { isAxiosError } from 'axios'
import { toast } from 'react-toastify'
import { Button } from '@/shared/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card'
import { getApiErrorMessage } from '@/shared/lib/api-error'
import { useAuthStore } from '@/shared/stores/auth-store'
import {
  useSellerOrderHistoryQuery,
  useSellerProductsQuery,
  useUpdateSellerOrderStatusMutation,
} from '@/features/seller/hooks/use-seller'
import {
  FULFILLMENT_LABELS,
  getOrderFulfillmentStatus,
  isFulfillmentStatus,
  isOrderPaid,
} from '@/features/orders/lib/fulfillment'
import type { Order } from '@/features/orders/types/order.types'
import { cn } from '@/shared/lib/utils'
import { SellerOrdersHistoryPanel } from '@/features/seller/components/seller-orders-history-panel'
import { SellerStatsCards } from '@/features/seller/components/seller-stats-cards'

type OrderTabValue =
  | 'all'
  | 'unpaid'
  | 'awaiting'
  | 'processing'
  | 'shipping'
  | 'delivered'
  | 'cancelled'

const ORDER_TABS: { value: OrderTabValue; label: string }[] = [
  { value: 'all', label: 'Tất cả' },
  { value: 'unpaid', label: 'Chờ thanh toán' },
  { value: 'awaiting', label: 'Chờ xác nhận' },
  { value: 'processing', label: 'Đang chuẩn bị' },
  { value: 'shipping', label: 'Đang giao' },
  { value: 'delivered', label: 'Đã giao' },
  { value: 'cancelled', label: 'Đã hủy' },
]

function isCancelledOrder(order: Order): boolean {
  const code = order.status.toUpperCase()
  return code.includes('CANCEL') || code.includes('FAIL') || code.includes('REJECT')
}

/** Phân loại đơn vào 1 tab duy nhất theo mức ưu tiên: hủy > chưa thanh toán > tiến trình giao. */
function getOrderTab(order: Order): Exclude<OrderTabValue, 'all'> {
  if (isCancelledOrder(order)) return 'cancelled'
  if (!isOrderPaid(order)) return 'unpaid'
  const fulfillment = getOrderFulfillmentStatus(order)
  switch (fulfillment) {
    case 'DELIVERED':
      return 'delivered'
    case 'SHIPPED':
      return 'shipping'
    case 'CONFIRMED':
    case 'PROCESSING':
      return 'processing'
    case 'AWAITING_CONFIRMATION':
    default:
      return 'awaiting'
  }
}

export function SellerOrdersPage() {
  const accessToken = useAuthStore((state) => state.accessToken)
  const sellerOrdersQuery = useSellerOrderHistoryQuery(Boolean(accessToken))
  const sellerProductsQuery = useSellerProductsQuery(Boolean(accessToken))
  const updateOrderStatusMutation = useUpdateSellerOrderStatusMutation()
  const [activeTab, setActiveTab] = useState<OrderTabValue>('all')

  const sellerOrders = sellerOrdersQuery.data ?? []

  /** Ảnh đại diện sản phẩm để hiện trong card đơn hàng. */
  const productImageById = useMemo(() => {
    const map = new Map<string, string>()
    for (const product of sellerProductsQuery.data ?? []) {
      const src = product.images?.[0] ?? product.imageUrl
      if (src) map.set(String(product.id), src)
    }
    return map
  }, [sellerProductsQuery.data])

  const tabCounts = useMemo(() => {
    const counts: Record<OrderTabValue, number> = {
      all: sellerOrders.length,
      unpaid: 0,
      awaiting: 0,
      processing: 0,
      shipping: 0,
      delivered: 0,
      cancelled: 0,
    }
    for (const order of sellerOrders) {
      counts[getOrderTab(order)] += 1
    }
    return counts
  }, [sellerOrders])

  const visibleOrders = useMemo(() => {
    if (activeTab === 'all') return sellerOrders
    return sellerOrders.filter((order) => getOrderTab(order) === activeTab)
  }, [sellerOrders, activeTab])

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
        <CardHeader className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle>Đơn hàng</CardTitle>
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
              <RefreshCw
                className={cn('h-3.5 w-3.5', sellerOrdersQuery.isFetching && 'animate-spin')}
              />
              {sellerOrdersQuery.isFetching ? 'Đang tải...' : 'Làm mới'}
            </Button>
          </div>

          {/* Tab trạng thái đơn — kiểu Shopee/Lazada seller center */}
          <div
            role="tablist"
            aria-label="Lọc theo trạng thái đơn"
            className="flex gap-1 overflow-x-auto border-b [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            {ORDER_TABS.map((tab) => {
              const active = activeTab === tab.value
              const count = tabCounts[tab.value]
              return (
                <button
                  key={tab.value}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  className={cn(
                    'relative shrink-0 whitespace-nowrap px-3 pb-2.5 pt-1.5 text-sm transition-colors',
                    active ? 'font-medium text-primary' : 'text-muted-foreground hover:text-foreground',
                  )}
                  onClick={() => setActiveTab(tab.value)}
                >
                  {tab.label}
                  {count > 0 ? (
                    <span
                      className={cn(
                        'ml-1.5 rounded-full px-1.5 py-0.5 text-[11px] tabular-nums',
                        active ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground',
                      )}
                    >
                      {count}
                    </span>
                  ) : null}
                  {active ? (
                    <span
                      className="absolute inset-x-1 bottom-0 h-0.5 rounded-full bg-primary"
                      aria-hidden
                    />
                  ) : null}
                </button>
              )
            })}
          </div>
        </CardHeader>
        <CardContent>
          <SellerOrdersHistoryPanel
            orders={visibleOrders}
            productImageById={productImageById}
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
