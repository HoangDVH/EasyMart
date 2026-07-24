import { Suspense, useMemo, useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import {
  ChevronLeft,
  ChevronRight,
  LayoutDashboard,
  Menu,
  Package,
  Receipt,
  Users,
  Wallet,
  X,
} from 'lucide-react'
import { useProfileQuery } from '@/features/auth/hooks/use-auth'
import { useOrdersRealtime } from '@/features/orders/hooks/use-orders-realtime'
import { useOrdersRealtimeStore } from '@/features/orders/stores/orders-realtime-store'
import type { SellerOutletContext } from '@/features/seller/hooks/use-seller-outlet'
import { useAuthStore } from '@/shared/stores/auth-store'
import { cn } from '@/shared/lib/utils'
import { HeaderNotifications } from '@/shared/ui/header-notifications'
import { RouteChunkFallback } from '@/shared/ui/route-chunk-fallback'
import { ScrollToTop } from '@/shared/ui/scroll-to-top'
import { UserMenu } from '@/shared/ui/user-menu'

type NavItem = {
  to: string
  label: string
  icon: typeof Package
  end?: boolean
}

const SELLER_NAV: NavItem[] = [
  { to: '/seller', label: 'Tổng quan', icon: LayoutDashboard, end: true },
  { to: '/seller/products', label: 'Sản phẩm', icon: Package },
  { to: '/seller/orders', label: 'Đơn hàng', icon: Receipt },
  { to: '/seller/payments', label: 'Doanh thu', icon: Wallet },
]

const ADMIN_NAV: NavItem[] = [
  { to: '/admin', label: 'Quản lý người dùng', icon: Users, end: true },
]

const SIDEBAR_COLLAPSED_KEY = 'dashboard-sidebar-collapsed'

function pageTitle(pathname: string): string {
  if (pathname.startsWith('/admin/account')) return 'Tài khoản'
  if (pathname.startsWith('/admin')) return 'Người dùng'
  if (pathname.startsWith('/seller/account')) return 'Tài khoản'
  if (pathname.startsWith('/seller/products')) return 'Sản phẩm'
  if (pathname.startsWith('/seller/payments')) return 'Doanh thu'
  if (/^\/seller\/orders\/[^/]+$/.test(pathname)) return 'Chi tiết đơn'
  if (pathname.startsWith('/seller/orders')) return 'Đơn hàng'
  if (pathname.startsWith('/seller')) return 'Tổng quan'
  return 'Dashboard'
}

function RealtimeDot({ status }: { status: string }) {
  return (
    <span
      title={
        status === 'connected'
          ? 'Realtime đang bật'
          : status === 'connecting'
            ? 'Đang kết nối realtime…'
            : 'Realtime tạm ngắt'
      }
      className={cn(
        'inline-flex h-2 w-2 rounded-full',
        status === 'connected'
          ? 'bg-emerald-500'
          : status === 'connecting'
            ? 'animate-pulse bg-amber-500'
            : 'bg-muted-foreground/40',
      )}
      aria-hidden
    />
  )
}

export function DashboardLayout() {
  const location = useLocation()
  const accessToken = useAuthStore((state) => state.accessToken)
  const profileQuery = useProfileQuery(Boolean(accessToken))
  const profile = profileQuery.data
  const realtimeStatus = useOrdersRealtimeStore((state) => state.status)

  /** Một kết nối STOMP cho seller/admin khi không còn nằm trong AppLayout.
   * Chờ profile vào store để phân audience seller/buyer đúng. */
  useOrdersRealtime(Boolean(accessToken && profile))

  const isAdminArea = location.pathname.startsWith('/admin')
  const navItems = isAdminArea ? ADMIN_NAV : SELLER_NAV
  const brandTitle = isAdminArea ? 'Admin' : 'Kênh người bán'
  const brandSubtitle = isAdminArea ? 'Quản trị EasyMart' : 'Sản phẩm & đơn hàng'

  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === '1'
    } catch {
      return false
    }
  })
  const [mobileOpen, setMobileOpen] = useState(false)

  const title = useMemo(() => pageTitle(location.pathname), [location.pathname])

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      const next = !prev
      try {
        localStorage.setItem(SIDEBAR_COLLAPSED_KEY, next ? '1' : '0')
      } catch {
        /* ignore */
      }
      return next
    })
  }

  const navLinkClass = ({ isActive }: { isActive: boolean }, compact: boolean) =>
    cn(
      'flex items-center rounded-lg text-sm transition-colors',
      compact ? 'justify-center px-0 py-2.5' : 'gap-3 px-3 py-2.5',
      isActive
        ? 'bg-primary/10 font-medium text-primary'
        : 'text-muted-foreground hover:bg-muted hover:text-foreground',
    )

  const sidebarBody = (compact: boolean) => (
    <>
      <div
        className={cn(
          'flex h-14 shrink-0 items-center border-b',
          compact ? 'justify-center px-2' : 'gap-2 px-3',
        )}
      >
        <button
          type="button"
          onClick={toggleCollapsed}
          className="hidden h-9 w-9 shrink-0 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground lg:grid"
          aria-label={compact ? 'Mở rộng menu' : 'Thu gọn menu'}
          title={compact ? 'Mở rộng menu' : 'Thu gọn menu'}
        >
          {compact ? (
            <ChevronRight className="h-4 w-4" aria-hidden />
          ) : (
            <ChevronLeft className="h-4 w-4" aria-hidden />
          )}
        </button>
        {!compact ? (
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{brandTitle}</p>
            <p className="truncate text-xs text-muted-foreground">{brandSubtitle}</p>
          </div>
        ) : null}
        <button
          type="button"
          className="grid h-9 w-9 place-items-center rounded-lg text-muted-foreground hover:bg-muted lg:hidden"
          aria-label="Đóng menu"
          onClick={() => setMobileOpen(false)}
        >
          <X className="h-4 w-4" aria-hidden />
        </button>
      </div>

      <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-2" aria-label="Menu dashboard">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            title={compact ? item.label : undefined}
            onClick={() => setMobileOpen(false)}
            className={(args) => navLinkClass(args, compact)}
          >
            <item.icon className="h-4 w-4 shrink-0" aria-hidden />
            {compact ? <span className="sr-only">{item.label}</span> : <span>{item.label}</span>}
          </NavLink>
        ))}

        {!isAdminArea && profile?.role === 'ADMIN' ? (
          <NavLink
            to="/admin"
            title={compact ? 'Admin' : undefined}
            onClick={() => setMobileOpen(false)}
            className={(args) => navLinkClass(args, compact)}
          >
            <Users className="h-4 w-4 shrink-0" aria-hidden />
            {compact ? <span className="sr-only">Admin</span> : <span>Admin</span>}
          </NavLink>
        ) : null}

        {isAdminArea && (profile?.role === 'SELLER' || profile?.role === 'ADMIN') ? (
          <NavLink
            to="/seller"
            title={compact ? 'Kênh người bán' : undefined}
            onClick={() => setMobileOpen(false)}
            className={(args) => navLinkClass(args, compact)}
          >
            <LayoutDashboard className="h-4 w-4 shrink-0" aria-hidden />
            {compact ? <span className="sr-only">Kênh người bán</span> : <span>Kênh người bán</span>}
          </NavLink>
        ) : null}
      </nav>

      <div
        className={cn(
          'mt-auto shrink-0 border-t p-2',
          compact && 'flex justify-center',
        )}
      >
        {profile?.email ? (
          <UserMenu
            email={profile.email}
            variant="default"
            menuPlacement="up"
            compact={compact}
            className={compact ? undefined : 'w-full'}
            onNavigate={() => setMobileOpen(false)}
          />
        ) : null}
      </div>
    </>
  )

  return (
    <div className="flex min-h-screen bg-muted/30 text-foreground">
      <ScrollToTop />

      {/* Desktop sidebar */}
      <aside
        className={cn(
          'sticky top-0 hidden h-screen shrink-0 flex-col border-r bg-card transition-[width] duration-300 lg:flex',
          collapsed ? 'w-[4.25rem]' : 'w-60',
        )}
      >
        {sidebarBody(collapsed)}
      </aside>

      {/* Mobile drawer */}
      {mobileOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/40"
            aria-label="Đóng menu"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col bg-card shadow-xl">
            {sidebarBody(false)}
          </aside>
        </div>
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-40 flex h-14 items-center gap-3 border-b bg-card/95 px-3 backdrop-blur sm:px-5">
          <button
            type="button"
            className="grid h-10 w-10 place-items-center rounded-lg text-muted-foreground hover:bg-muted lg:hidden"
            aria-label="Mở menu"
            onClick={() => setMobileOpen(true)}
          >
            <Menu className="h-5 w-5" aria-hidden />
          </button>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h1 className="truncate text-base font-semibold sm:text-lg">{title}</h1>
              <RealtimeDot status={realtimeStatus} />
            </div>
            <p className="hidden truncate text-xs text-muted-foreground sm:block">
              EasyMart Dashboard
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-1 sm:gap-2">
            {profile ? (
              <HeaderNotifications user={profile} variant="default" />
            ) : null}
          </div>
        </header>

        <main className="flex-1 overflow-x-hidden p-3 sm:p-5 lg:p-6">
          <div className="mx-auto w-full max-w-[1400px]">
            <Suspense fallback={<RouteChunkFallback />}>
              <Outlet context={{ realtimeStatus } satisfies SellerOutletContext} />
            </Suspense>
          </div>
        </main>
      </div>
    </div>
  )
}
