import { useMemo, useState } from 'react'
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { useAuthStore } from '@/shared/stores/auth-store'
import {
  useSellerOrderHistoryQuery,
  useSellerProductsQuery,
} from '@/features/seller/hooks/use-seller'
import { isOrderPaid } from '@/features/orders/lib/fulfillment'
import { formatVnd } from '@/features/seller/components/seller-formatters'
import {
  getProductStock,
  LOW_STOCK_THRESHOLD,
} from '@/features/seller/components/seller-types'
import { cn } from '@/shared/lib/utils'
import { Card, CardContent } from '@/shared/ui/card'
import { Skeleton } from '@/shared/ui/skeleton'
import { SellerStatsCards } from '@/features/seller/components/seller-stats-cards'

const RANGE_OPTIONS = [
  { days: 7, label: '7 ngày' },
  { days: 14, label: '14 ngày' },
  { days: 30, label: '30 ngày' },
] as const

type RangeDays = (typeof RANGE_OPTIONS)[number]['days']

type RevenuePoint = {
  /** yyyy-mm-dd để so khớp đơn theo ngày */
  key: string
  /** Nhãn hiển thị trên trục X, ví dụ "19/7" */
  label: string
  revenue: number
  orders: number
}

function toDayKey(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

const compactVnd = new Intl.NumberFormat('vi-VN', {
  notation: 'compact',
  maximumFractionDigits: 1,
})

function RevenueTooltip({
  active,
  payload,
}: {
  active?: boolean
  payload?: Array<{ payload: RevenuePoint }>
}) {
  if (!active || !payload?.length) return null
  const point = payload[0].payload
  return (
    <div className="rounded-lg border bg-background px-3 py-2 text-sm shadow-md">
      <p className="font-medium">Ngày {point.label}</p>
      <p className="text-muted-foreground">
        Doanh thu: <span className="font-semibold text-foreground">{formatVnd(point.revenue)}</span>
      </p>
      <p className="text-muted-foreground">
        Đơn đã thanh toán: <span className="font-semibold text-foreground">{point.orders}</span>
      </p>
    </div>
  )
}

export function SellerOverviewPage() {
  const accessToken = useAuthStore((state) => state.accessToken)
  const productsQuery = useSellerProductsQuery(Boolean(accessToken))
  const ordersQuery = useSellerOrderHistoryQuery(Boolean(accessToken))
  const [rangeDays, setRangeDays] = useState<RangeDays>(14)

  const products = productsQuery.data ?? []
  const orders = ordersQuery.data ?? []

  const paidRevenue = useMemo(
    () => orders.reduce((sum, order) => (isOrderPaid(order) ? sum + order.totalAmount : sum), 0),
    [orders],
  )

  const attentionStockCount = useMemo(
    () => products.filter((p) => getProductStock(p) <= LOW_STOCK_THRESHOLD).length,
    [products],
  )

  const chartData = useMemo<RevenuePoint[]>(() => {
    const byDay = new Map<string, { revenue: number; orders: number }>()
    for (const order of orders) {
      if (!isOrderPaid(order) || !order.createdAt) continue
      const created = new Date(order.createdAt)
      if (Number.isNaN(created.getTime())) continue
      const key = toDayKey(created)
      const entry = byDay.get(key) ?? { revenue: 0, orders: 0 }
      entry.revenue += order.totalAmount
      entry.orders += 1
      byDay.set(key, entry)
    }

    const points: RevenuePoint[] = []
    const today = new Date()
    for (let i = rangeDays - 1; i >= 0; i -= 1) {
      const day = new Date(today)
      day.setDate(today.getDate() - i)
      const key = toDayKey(day)
      const entry = byDay.get(key)
      points.push({
        key,
        label: `${day.getDate()}/${day.getMonth() + 1}`,
        revenue: entry?.revenue ?? 0,
        orders: entry?.orders ?? 0,
      })
    }
    return points
  }, [orders, rangeDays])

  const rangeRevenue = useMemo(
    () => chartData.reduce((sum, point) => sum + point.revenue, 0),
    [chartData],
  )
  const rangeOrders = useMemo(
    () => chartData.reduce((sum, point) => sum + point.orders, 0),
    [chartData],
  )
  const hasRevenue = chartData.some((point) => point.revenue > 0)

  return (
    <div className="space-y-5">
      <SellerStatsCards
        isLoading={productsQuery.isPending || ordersQuery.isPending}
        totalProducts={products.length}
        lowStockCount={attentionStockCount}
        totalOrders={orders.length}
        totalRevenue={paidRevenue}
      />

      <Card>
        <div className="flex flex-col gap-3 border-b p-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-base font-semibold">Biểu đồ doanh thu</h2>
            <p className="text-sm text-muted-foreground">
              {formatVnd(rangeRevenue)} · {rangeOrders} đơn đã thanh toán trong {rangeDays} ngày qua
            </p>
          </div>
          <div className="flex shrink-0 gap-1 rounded-lg border bg-muted/40 p-1">
            {RANGE_OPTIONS.map((option) => (
              <button
                key={option.days}
                type="button"
                onClick={() => setRangeDays(option.days)}
                className={cn(
                  'rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
                  rangeDays === option.days
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
        <CardContent className="pt-4">
          {ordersQuery.isPending ? (
            <Skeleton className="h-72 w-full" />
          ) : (
            <div className="relative h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartData} margin={{ top: 8, right: 0, bottom: 0, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" />
                  <XAxis
                    dataKey="label"
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 11 }}
                    interval="preserveStartEnd"
                    minTickGap={16}
                  />
                  <YAxis
                    yAxisId="revenue"
                    width={52}
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 11 }}
                    tickFormatter={(value: number) => (value === 0 ? '0' : compactVnd.format(value))}
                  />
                  <YAxis
                    yAxisId="orders"
                    orientation="right"
                    width={32}
                    allowDecimals={false}
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 11 }}
                  />
                  <Tooltip content={<RevenueTooltip />} cursor={{ fill: 'var(--color-muted)', opacity: 0.5 }} />
                  <Legend
                    verticalAlign="top"
                    height={28}
                    iconSize={10}
                    wrapperStyle={{ fontSize: 12 }}
                  />
                  <Bar
                    yAxisId="revenue"
                    dataKey="revenue"
                    name="Doanh thu"
                    fill="var(--color-primary)"
                    fillOpacity={0.85}
                    radius={[4, 4, 0, 0]}
                    maxBarSize={28}
                  />
                  <Line
                    yAxisId="orders"
                    type="monotone"
                    dataKey="orders"
                    name="Số đơn"
                    stroke="#f59e0b"
                    strokeWidth={2}
                    dot={{ r: 2.5, fill: '#f59e0b', strokeWidth: 0 }}
                    activeDot={{ r: 4 }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
              {!hasRevenue ? (
                <p className="pointer-events-none absolute inset-0 grid place-items-center text-sm text-muted-foreground">
                  Chưa có doanh thu trong {rangeDays} ngày qua.
                </p>
              ) : null}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
