import { Suspense } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { LayoutDashboard, Package, Receipt, Store } from 'lucide-react'
import type { SellerOutletContext } from '@/features/seller/hooks/use-seller-outlet'
import { useOrdersRealtimeStore } from '@/features/orders/stores/orders-realtime-store'
import { cn } from '@/shared/lib/utils'
import { RouteChunkFallback } from '@/shared/ui/route-chunk-fallback'

type NavItem = {
  to: string
  label: string
  icon: typeof Package
  end?: boolean
}

const navItems: NavItem[] = [
  {
    to: '/seller',
    label: 'Tổng quan',
    icon: LayoutDashboard,
    end: true,
  },
  {
    to: '/seller/products',
    label: 'Quản lý sản phẩm',
    icon: Package,
  },
  {
    to: '/seller/orders',
    label: 'Lịch sử đơn hàng',
    icon: Receipt,
  },
]

function RealtimeBadge({ status }: { status: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium',
        status === 'connected'
          ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
          : status === 'connecting'
            ? 'border-amber-200 bg-amber-50 text-amber-700'
            : 'border-border bg-muted text-muted-foreground',
      )}
    >
      <span
        className={cn(
          'h-1.5 w-1.5 rounded-full',
          status === 'connected'
            ? 'bg-emerald-500'
            : status === 'connecting'
              ? 'animate-pulse bg-amber-500'
              : 'bg-muted-foreground/50',
        )}
        aria-hidden
      />
      {status === 'connected'
        ? 'Realtime đang bật'
        : status === 'connecting'
          ? 'Đang kết nối...'
          : 'Realtime tạm ngắt'}
    </span>
  )
}

export function SellerLayout() {
  /** Trạng thái kết nối lấy từ AppLayout — không mở STOMP lần 2. */
  const realtimeStatus = useOrdersRealtimeStore((state) => state.status)

  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
      {/* Tab ngang trên mobile — sidebar dọc chỉ hiện từ lg trở lên. */}
      <nav
        aria-label="Kênh người bán"
        className="flex gap-2 overflow-x-auto pb-1 lg:hidden [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              cn(
                'inline-flex shrink-0 items-center gap-2 rounded-full border px-3 py-2 text-sm font-medium transition-all',
                isActive
                  ? 'border-primary bg-primary text-primary-foreground shadow-sm'
                  : 'border-border bg-background text-muted-foreground hover:border-primary/40',
              )
            }
          >
            <item.icon className="h-4 w-4" aria-hidden />
            {item.label}
          </NavLink>
        ))}
      </nav>

      <aside className="sticky-below-header hidden w-56 shrink-0 lg:sticky lg:block lg:self-start">
        <div className="rounded-xl border bg-card shadow-sm">
          <div className="flex items-center gap-3 border-b p-4">
            <div className="grid h-10 w-10 place-items-center rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 text-primary">
              <Store className="h-5 w-5" aria-hidden />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">Kênh người bán</p>
              <p className="text-xs text-muted-foreground">Sản phẩm & đơn hàng</p>
            </div>
          </div>

          <nav className="flex flex-col gap-1 p-2" aria-label="Menu người bán">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-all duration-200',
                    isActive
                      ? 'bg-primary/10 font-medium text-primary shadow-sm shadow-primary/10'
                      : 'text-muted-foreground hover:translate-x-0.5 hover:bg-muted hover:text-foreground',
                  )
                }
              >
                <item.icon className="h-4 w-4" aria-hidden />
                <span>{item.label}</span>
              </NavLink>
            ))}
          </nav>

          <div className="border-t p-3">
            <RealtimeBadge status={realtimeStatus} />
          </div>
        </div>
      </aside>

      <section className="min-w-0 flex-1">
        <Suspense fallback={<RouteChunkFallback />}>
          <Outlet context={{ realtimeStatus } satisfies SellerOutletContext} />
        </Suspense>
      </section>
    </div>
  )
}
