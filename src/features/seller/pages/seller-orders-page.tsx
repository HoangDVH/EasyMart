import { useEffect, useMemo, useState } from 'react'
import { RefreshCw, Search, X } from 'lucide-react'
import { isAxiosError } from 'axios'
import { toast } from 'react-toastify'
import {
  FULFILLMENT_LABELS,
  getOrderFulfillmentStatus,
  isFulfillmentStatus,
  isOrderPaid,
} from '@/features/orders/lib/fulfillment'
import type { Order } from '@/features/orders/types/order.types'
import { SellerOrdersTable } from '@/features/seller/components/seller-orders-table'
import { SellerStatsCards } from '@/features/seller/components/seller-stats-cards'
import {
  useSellerOrderHistoryQuery,
  useUpdateSellerOrderStatusMutation,
} from '@/features/seller/hooks/use-seller'
import { getApiErrorMessage } from '@/shared/lib/api-error'
import { cn } from '@/shared/lib/utils'
import { useAuthStore } from '@/shared/stores/auth-store'
import { Button } from '@/shared/ui/button'
import { Card, CardContent } from '@/shared/ui/card'
import { Input } from '@/shared/ui/input'
import { Select } from '@/shared/ui/select'

type OrderTabValue =
  | 'all'
  | 'unpaid'
  | 'awaiting'
  | 'processing'
  | 'shipping'
  | 'delivered'
  | 'cancelled'

const ORDER_FILTERS: { value: OrderTabValue; label: string }[] = [
  { value: 'all', label: 'Tất cả trạng thái' },
  { value: 'unpaid', label: 'Chờ thanh toán' },
  { value: 'awaiting', label: 'Chờ xác nhận' },
  { value: 'processing', label: 'Đang chuẩn bị' },
  { value: 'shipping', label: 'Đang giao' },
  { value: 'delivered', label: 'Đã giao' },
  { value: 'cancelled', label: 'Đã hủy' },
]

const PAGE_SIZE = 10

function isCancelledOrder(order: Order): boolean {
  const code = order.status.toUpperCase()
  return code.includes('CANCEL') || code.includes('FAIL') || code.includes('REJECT')
}

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
  const updateOrderStatusMutation = useUpdateSellerOrderStatusMutation()
  const [statusFilter, setStatusFilter] = useState<OrderTabValue>('all')
  const [searchKeyword, setSearchKeyword] = useState('')
  const [page, setPage] = useState(0)

  const sellerOrders = sellerOrdersQuery.data ?? []

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

  const filteredOrders = useMemo(() => {
    const keyword = searchKeyword.trim().toLowerCase()
    return sellerOrders.filter((order) => {
      if (statusFilter !== 'all' && getOrderTab(order) !== statusFilter) return false
      if (!keyword) return true
      return (
        order.id.toLowerCase().includes(keyword) ||
        (order.userEmail ?? '').toLowerCase().includes(keyword)
      )
    })
  }, [sellerOrders, statusFilter, searchKeyword])

  const totalPages = Math.max(1, Math.ceil(filteredOrders.length / PAGE_SIZE))

  useEffect(() => {
    setPage(0)
  }, [searchKeyword, statusFilter])

  useEffect(() => {
    if (page > totalPages - 1) setPage(Math.max(0, totalPages - 1))
  }, [page, totalPages])

  const pageOrders = useMemo(() => {
    const start = page * PAGE_SIZE
    return filteredOrders.slice(start, start + PAGE_SIZE)
  }, [filteredOrders, page])

  const paidRevenue = useMemo(
    () => sellerOrders.reduce((sum, order) => (isOrderPaid(order) ? sum + order.totalAmount : sum), 0),
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
    <div className="space-y-5">
      <SellerStatsCards
        isLoading={sellerOrdersQuery.isPending}
        totalProducts={null}
        lowStockCount={null}
        totalOrders={sellerOrders.length}
        totalRevenue={paidRevenue}
      />

      <Card>
        <div className="flex flex-col gap-3 border-b p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-semibold">Danh sách đơn hàng</h2>
            <p className="text-sm text-muted-foreground">
              {sellerOrdersQuery.isPending
                ? 'Đang tải…'
                : `${filteredOrders.length} / ${sellerOrders.length} đơn`}
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            className="gap-2 self-start sm:self-auto"
            onClick={() => void sellerOrdersQuery.refetch()}
            disabled={sellerOrdersQuery.isFetching}
          >
            <RefreshCw
              className={cn('h-4 w-4', sellerOrdersQuery.isFetching && 'animate-spin')}
              aria-hidden
            />
            Làm mới
          </Button>
        </div>

        <div className="flex flex-col gap-3 border-b p-4 lg:flex-row lg:flex-wrap lg:items-center">
          <div className="relative min-w-0 flex-1 lg:max-w-sm">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <Input
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              placeholder="Tìm mã đơn hoặc email…"
              className="pl-9 pr-10"
              aria-label="Tìm đơn hàng"
            />
            {searchKeyword ? (
              <button
                type="button"
                className="absolute right-1.5 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
                aria-label="Xóa từ khóa"
                onClick={() => setSearchKeyword('')}
              >
                <X className="h-4 w-4" />
              </button>
            ) : null}
          </div>
          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as OrderTabValue)}
            className="w-full min-w-0 lg:w-56"
            aria-label="Lọc theo trạng thái"
          >
            {ORDER_FILTERS.map((option) => {
              const count = tabCounts[option.value]
              return (
                <option key={option.value} value={option.value}>
                  {option.label}
                  {count > 0 ? ` (${count})` : ''}
                </option>
              )
            })}
          </Select>
        </div>

        <CardContent className="p-0">
          <SellerOrdersTable
            orders={pageOrders}
            isLoading={sellerOrdersQuery.isPending}
            isError={sellerOrdersQuery.isError}
            errorText={ordersErrorText}
            page={page}
            totalPages={totalPages}
            onPageChange={setPage}
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
