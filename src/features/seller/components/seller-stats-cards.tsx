import { AlertTriangle, Package, ShoppingCart, Wallet } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { formatVnd } from '@/features/seller/components/seller-formatters'
import { cn } from '@/shared/lib/utils'
import { Card, CardContent } from '@/shared/ui/card'
import { Skeleton } from '@/shared/ui/skeleton'

type StatCard = {
  label: string
  value: string
  hint?: string
  icon: LucideIcon
  iconClass: string
}

type SellerStatsCardsProps = {
  isLoading: boolean
  totalProducts?: number | null
  lowStockCount?: number | null
  totalOrders?: number | null
  totalRevenue?: number | null
}

export function SellerStatsCards({
  isLoading,
  totalProducts = null,
  lowStockCount = null,
  totalOrders = null,
  totalRevenue = null,
}: SellerStatsCardsProps) {
  const cards: StatCard[] = []

  if (totalProducts != null) {
    cards.push({
      label: 'Sản phẩm',
      value: String(totalProducts),
      icon: Package,
      iconClass: 'bg-primary/10 text-primary',
    })
  }
  if (lowStockCount != null) {
    cards.push({
      label: 'Sắp hết / hết hàng',
      value: String(lowStockCount),
      hint: lowStockCount > 0 ? 'Cần nhập thêm hàng' : 'Kho ổn định',
      icon: AlertTriangle,
      iconClass:
        lowStockCount > 0 ? 'bg-amber-100 text-amber-600' : 'bg-emerald-100 text-emerald-600',
    })
  }
  if (totalOrders != null) {
    cards.push({
      label: 'Đơn hàng',
      value: String(totalOrders),
      icon: ShoppingCart,
      iconClass: 'bg-sky-100 text-sky-600',
    })
  }
  if (totalRevenue != null) {
    cards.push({
      label: 'Doanh thu (đơn PAID)',
      value: formatVnd(totalRevenue),
      icon: Wallet,
      iconClass: 'bg-emerald-100 text-emerald-600',
    })
  }

  if (cards.length === 0) return null

  return (
    <div
      className={cn(
        'grid gap-3',
        cards.length === 1 && 'grid-cols-1 sm:grid-cols-2',
        cards.length === 2 && 'grid-cols-2',
        cards.length >= 3 && 'grid-cols-2 lg:grid-cols-4',
      )}
    >
      {cards.map((card) => (
        <Card key={card.label} className="overflow-hidden">
          <CardContent className="flex items-center gap-3 p-4">
            <div className={cn('grid h-10 w-10 shrink-0 place-items-center rounded-lg', card.iconClass)}>
              <card.icon className="h-5 w-5" aria-hidden />
            </div>
            <div className="min-w-0">
              <p className="truncate text-xs text-muted-foreground">{card.label}</p>
              {isLoading ? (
                <Skeleton className="mt-1 h-5 w-16" />
              ) : (
                <p className="truncate text-lg font-semibold tabular-nums">{card.value}</p>
              )}
              {card.hint && !isLoading ? (
                <p className="truncate text-[11px] text-muted-foreground">{card.hint}</p>
              ) : null}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
