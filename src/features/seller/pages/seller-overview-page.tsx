import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { AlertTriangle, ImageOff } from 'lucide-react'
import { useAuthStore } from '@/shared/stores/auth-store'
import {
  useSellerOrderHistoryQuery,
  useSellerProductsQuery,
} from '@/features/seller/hooks/use-seller'
import { isCodPayment, isOrderPaid } from '@/features/orders/lib/fulfillment'
import { formatDateTime, formatVnd } from '@/features/seller/components/seller-formatters'
import {
  getProductStock,
  LOW_STOCK_THRESHOLD,
} from '@/features/seller/components/seller-types'
import type { Order } from '@/features/orders/types/order.types'
import type { Product } from '@/features/products/types/product.types'
import { Badge } from '@/shared/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card'
import { Skeleton } from '@/shared/ui/skeleton'
import { SellerStatsCards } from '@/features/seller/components/seller-stats-cards'

function isCancelledOrder(order: Order): boolean {
  const code = order.status.toUpperCase()
  return code.includes('CANCEL') || code.includes('FAIL') || code.includes('REJECT')
}

function LowStockRow({ product }: { product: Product }) {
  const stock = getProductStock(product)
  const src = product.images?.[0] ?? product.imageUrl ?? null
  return (
    <div className="flex items-center gap-3 py-2.5">
      <div className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-lg border bg-muted/40">
        {src ? (
          <img src={src} alt="" className="h-full w-full object-contain" loading="lazy" />
        ) : (
          <ImageOff className="h-4 w-4 text-muted-foreground/60" aria-hidden />
        )}
      </div>
      <p className="min-w-0 flex-1 truncate text-sm">{product.name}</p>
      {stock <= 0 ? (
        <Badge className="border-destructive/30 bg-destructive/10 text-destructive">Hết hàng</Badge>
      ) : (
        <Badge className="border-amber-300/60 bg-amber-50 text-amber-700">Còn {stock}</Badge>
      )}
    </div>
  )
}

export function SellerOverviewPage() {
  const accessToken = useAuthStore((state) => state.accessToken)
  const productsQuery = useSellerProductsQuery(Boolean(accessToken))
  const ordersQuery = useSellerOrderHistoryQuery(Boolean(accessToken))

  const products = productsQuery.data ?? []
  const orders = ordersQuery.data ?? []

  const paidRevenue = useMemo(
    () =>
      orders.reduce((sum, order) => (order.status === 'PAID' ? sum + order.totalAmount : sum), 0),
    [orders],
  )

  const lowStockProducts = useMemo(
    () =>
      [...products]
        .filter((p) => getProductStock(p) <= LOW_STOCK_THRESHOLD)
        .sort((a, b) => getProductStock(a) - getProductStock(b))
        .slice(0, 5),
    [products],
  )

  const recentOrders = useMemo(
    () =>
      [...orders]
        .sort(
          (a, b) =>
            (new Date(b.createdAt ?? 0).getTime() || 0) -
            (new Date(a.createdAt ?? 0).getTime() || 0),
        )
        .slice(0, 5),
    [orders],
  )

  const attentionStockCount = useMemo(
    () => products.filter((p) => getProductStock(p) <= LOW_STOCK_THRESHOLD).length,
    [products],
  )

  return (
    <div className="space-y-4">
      <SellerStatsCards
        isLoading={productsQuery.isPending || ordersQuery.isPending}
        totalProducts={products.length}
        lowStockCount={attentionStockCount}
        totalOrders={orders.length}
        totalRevenue={paidRevenue}
      />

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Cảnh báo tồn kho */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <AlertTriangle className="h-4 w-4 text-amber-500" aria-hidden />
                Cảnh báo tồn kho
              </CardTitle>
              <CardDescription>Sản phẩm sắp hết hoặc đã hết hàng.</CardDescription>
            </div>
            <Link
              to="/seller/products"
              className="text-xs font-medium text-primary hover:underline"
            >
              Xem tất cả
            </Link>
          </CardHeader>
          <CardContent>
            {productsQuery.isPending ? (
              <div className="space-y-2">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : lowStockProducts.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">
                Kho ổn định — chưa có sản phẩm nào sắp hết hàng.
              </p>
            ) : (
              <div className="divide-y">
                {lowStockProducts.map((product) => (
                  <LowStockRow key={product.id} product={product} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Đơn hàng gần đây */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
            <div>
              <CardTitle className="text-base">Đơn hàng gần đây</CardTitle>
              <CardDescription>5 đơn mới nhất của cửa hàng.</CardDescription>
            </div>
            <Link to="/seller/orders" className="text-xs font-medium text-primary hover:underline">
              Xem tất cả
            </Link>
          </CardHeader>
          <CardContent>
            {ordersQuery.isPending ? (
              <div className="space-y-2">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : recentOrders.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">
                Chưa có đơn hàng nào.
              </p>
            ) : (
              <div className="divide-y">
                {recentOrders.map((order) => (
                  <div key={order.id} className="flex items-center gap-3 py-2.5">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">Đơn #{order.id}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {formatDateTime(order.createdAt)} · {order.userEmail || '—'}
                      </p>
                    </div>
                    {isCancelledOrder(order) ? (
                      <Badge className="border-destructive/30 bg-destructive/10 text-destructive">
                        Đã hủy
                      </Badge>
                    ) : isCodPayment(order) ? (
                      <Badge className="border-amber-300/60 bg-amber-50 text-amber-700">
                        COD · Thu khi nhận hàng
                      </Badge>
                    ) : isOrderPaid(order) ? (
                      <Badge className="border-emerald-300/60 bg-emerald-50 text-emerald-700">
                        Đã thanh toán
                      </Badge>
                    ) : (
                      <Badge className="border-amber-300/60 bg-amber-50 text-amber-700">
                        Chưa thanh toán
                      </Badge>
                    )}
                    <p className="shrink-0 text-sm font-semibold tabular-nums">
                      {formatVnd(order.totalAmount)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
