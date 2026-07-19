import { Suspense, useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { ChevronLeft, ChevronRight, LayoutDashboard, Package, Receipt } from 'lucide-react'
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

const SIDEBAR_COLLAPSED_KEY = 'seller-sidebar-collapsed'

export function SellerLayout() {
  /** Trạng thái kết nối lấy từ AppLayout — không mở STOMP lần 2. */
  const realtimeStatus = useOrdersRealtimeStore((state) => state.status)
  const [collapsed, setCollapsed] = useState(() => {
    try {
      /** Mặc định mở; chỉ thu gọn khi user đã chủ động chọn (1). */
      return localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === '1'
    } catch {
      return false
    }
  })

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      const next = !prev
      try {
        localStorage.setItem(SIDEBAR_COLLAPSED_KEY, next ? '1' : '0')
      } catch {
        /* localStorage bị chặn thì bỏ qua, chỉ mất ghi nhớ */
      }
      return next
    })
  }

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

      <aside
        className={cn(
          'sticky-below-header hidden shrink-0 transition-[width] duration-300 lg:sticky lg:block lg:self-start',
          collapsed ? 'w-[4.25rem]' : 'w-56',
        )}
      >
        <div className="rounded-xl border bg-card shadow-sm">
          <div
            className={cn(
              'flex items-center border-b',
              collapsed ? 'justify-center p-2.5' : 'gap-2 p-3',
            )}
          >
            {/* Nút đóng/mở đứng trước tiêu đề */}
            <button
              type="button"
              onClick={toggleCollapsed}
              aria-label={collapsed ? 'Mở rộng menu' : 'Thu gọn menu'}
              title={collapsed ? 'Mở rộng menu' : 'Thu gọn menu'}
              className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              {collapsed ? (
                <ChevronRight className="h-4 w-4" aria-hidden />
              ) : (
                <ChevronLeft className="h-4 w-4" aria-hidden />
              )}
            </button>
            {collapsed ? null : (
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">Kênh người bán</p>
                <p className="text-xs text-muted-foreground">Sản phẩm & đơn hàng</p>
              </div>
            )}
          </div>

          <nav className="flex flex-col gap-1 p-2" aria-label="Menu người bán">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                title={collapsed ? item.label : undefined}
                className={({ isActive }) =>
                  cn(
                    'flex items-center rounded-lg text-sm transition-all duration-200',
                    collapsed ? 'justify-center px-0 py-2.5' : 'gap-3 px-3 py-2.5',
                    isActive
                      ? 'bg-primary/10 font-medium text-primary shadow-sm shadow-primary/10'
                      : cn(
                          'text-muted-foreground hover:bg-muted hover:text-foreground',
                          !collapsed && 'hover:translate-x-0.5',
                        ),
                  )
                }
              >
                <item.icon className="h-4 w-4 shrink-0" aria-hidden />
                {collapsed ? <span className="sr-only">{item.label}</span> : <span>{item.label}</span>}
              </NavLink>
            ))}
          </nav>
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
