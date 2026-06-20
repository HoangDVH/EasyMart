import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { ShoppingCart } from 'lucide-react'
import { useProfileQuery, useRestoreSessionQuery } from '@/features/auth/hooks/use-auth'
import { useAuthStore } from '@/shared/stores/auth-store'
import { calcCartCount, useCartStore } from '@/shared/stores/cart-store'
import { Button } from '@/shared/ui/button'
import { Breadcrumb } from '@/shared/ui/breadcrumb'
import { CategoryNav } from '@/shared/ui/category-nav'
import { FullPageSpinner } from '@/shared/ui/full-page-spinner'
import { HeaderSearch } from '@/shared/ui/header-search'
import { UserMenu } from '@/shared/ui/user-menu'

export function AppLayout() {
  const location = useLocation()
  const accessToken = useAuthStore((state) => state.accessToken)
  const restoreSessionQuery = useRestoreSessionQuery(!accessToken)
  const effectiveToken = accessToken ?? restoreSessionQuery.data ?? null
  const profileQuery = useProfileQuery(Boolean(effectiveToken))
  const profile = profileQuery.data
  const cartCount = useCartStore((state) => calcCartCount(state.items))
  const showSellerNav =
    profile?.role === 'ADMIN' || profile?.role === 'SELLER' || profile?.roles?.includes('SELLER')

  if (effectiveToken && profileQuery.isLoading) {
    return <FullPageSpinner message="Đang tải tài khoản..." />
  }

  const breadcrumbItems = (() => {
    const pathname = location.pathname
    if (pathname === '/') return []
    if (pathname.startsWith('/products/')) return []
    if (pathname === '/cart') return [{ label: 'Trang chủ', to: '/' }, { label: 'Giỏ hàng' }]
    if (pathname === '/checkout') return [{ label: 'Trang chủ', to: '/' }, { label: 'Thanh toán' }]
    if (pathname === '/seller') return [{ label: 'Trang chủ', to: '/' }, { label: 'Quản lí sản phẩm' }]
    if (pathname === '/admin') return [{ label: 'Trang chủ', to: '/' }, { label: 'Admin' }]
    if (pathname === '/account') {
      return [{ label: 'Trang chủ', to: '/' }, { label: 'Tài khoản' }]
    }
    if (pathname === '/account/orders') {
      return [
        { label: 'Trang chủ', to: '/' },
        { label: 'Tài khoản', to: '/account' },
        { label: 'Đơn mua' },
      ]
    }
    if (pathname.startsWith('/account/orders/')) {
      return [
        { label: 'Trang chủ', to: '/' },
        { label: 'Tài khoản', to: '/account' },
        { label: 'Đơn mua', to: '/account/orders' },
        { label: 'Chi tiết đơn' },
      ]
    }
    if (pathname.startsWith('/policies/')) {
      const slug = pathname.split('/').pop() ?? ''
      const titles: Record<string, string> = {
        returns: 'Đổi trả',
        privacy: 'Bảo mật',
        shipping: 'Vận chuyển',
      }
      return [{ label: 'Trang chủ', to: '/' }, { label: titles[slug] ?? 'Chính sách' }]
    }
    return [{ label: 'Trang chủ', to: '/' }]
  })()

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 bg-primary text-primary-foreground shadow-sm">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3 sm:gap-6">
          <Link
            to="/"
            className="shrink-0 rounded-md bg-primary-foreground px-3 py-1.5 text-sm font-bold tracking-wide text-primary shadow-sm"
          >
            EasyMart
          </Link>

          <div className="flex-1">
            <HeaderSearch />
          </div>

          <div className="flex shrink-0 items-center gap-1.5 sm:gap-3">
            <NavLink
              to="/cart"
              className={({ isActive }) =>
                `inline-flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm transition ${
                  isActive
                    ? 'text-primary-foreground'
                    : 'text-primary-foreground/85 hover:text-primary-foreground'
                }`
              }
              aria-label="Giỏ hàng"
            >
              <span className="relative inline-flex">
                <ShoppingCart className="h-5 w-5" aria-hidden />
                {cartCount > 0 ? (
                  <span className="absolute -right-2 -top-2 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-secondary px-1 text-[10px] font-semibold text-secondary-foreground ring-2 ring-primary">
                    {cartCount > 99 ? '99+' : cartCount}
                  </span>
                ) : null}
              </span>
              <span className="hidden sm:inline">Giỏ hàng</span>
            </NavLink>
            {effectiveToken && profile?.email ? (
              <UserMenu email={profile.email} variant="onPrimary" />
            ) : (
              <NavLink to="/auth/login">
                <Button
                  size="sm"
                  variant="secondary"
                  className="shadow-sm hover:brightness-105"
                >
                  Đăng nhập
                </Button>
              </NavLink>
            )}
          </div>
        </div>

        <div className="border-t border-primary-foreground/15 bg-background text-foreground">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-2">
            <CategoryNav className="flex-1" />
            <div className="hidden items-center gap-3 px-4 text-sm text-muted-foreground sm:flex">
              {profile?.role === 'ADMIN' ? (
                <NavLink
                  to="/admin"
                  className={({ isActive }) =>
                    isActive ? 'font-medium text-foreground' : 'hover:text-foreground'
                  }
                >
                  Admin
                </NavLink>
              ) : null}
              {showSellerNav ? (
                <NavLink
                  to="/seller"
                  className={({ isActive }) =>
                    isActive ? 'font-medium text-foreground' : 'hover:text-foreground'
                  }
                >
                  Quản lí sản phẩm
                </NavLink>
              ) : null}
            </div>
          </div>
          {(profile?.role === 'ADMIN' || showSellerNav) ? (
            <div className="flex items-center gap-3 border-t px-4 py-2 text-sm text-muted-foreground sm:hidden">
              {profile?.role === 'ADMIN' ? (
                <NavLink
                  to="/admin"
                  className={({ isActive }) =>
                    isActive ? 'font-medium text-foreground' : 'hover:text-foreground'
                  }
                >
                  Admin
                </NavLink>
              ) : null}
              {showSellerNav ? (
                <NavLink
                  to="/seller"
                  className={({ isActive }) =>
                    isActive ? 'font-medium text-foreground' : 'hover:text-foreground'
                  }
                >
                  Quản lí sản phẩm
                </NavLink>
              ) : null}
            </div>
          ) : null}
        </div>
      </header>
      <main className="mx-auto max-w-6xl p-4">
        <Breadcrumb items={breadcrumbItems} />
        <Outlet />
      </main>
      <footer className="mt-8 border-t border-primary-foreground/10 bg-primary text-primary-foreground">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-8 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-2 sm:col-span-2 lg:col-span-1">
            <p className="text-base font-bold">EasyMart</p>
            <p className="text-sm text-primary-foreground/85">
              Mua sắm trực tuyến an toàn — giá tốt, giao nhanh, hỗ trợ tận tâm.
            </p>
          </div>
          <div>
            <p className="mb-2 text-sm font-semibold">Hỗ trợ khách hàng</p>
            <ul className="space-y-1.5 text-sm text-primary-foreground/85">
              <li>
                <a href="mailto:support@easymart.vn" className="hover:text-primary-foreground hover:underline">
                  support@easymart.vn
                </a>
              </li>
              <li>Hotline: 1900 1234 (8h–22h)</li>
              <li>
                <Link to="/cart" className="hover:text-primary-foreground hover:underline">
                  Theo dõi giỏ hàng
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <p className="mb-2 text-sm font-semibold">Chính sách</p>
            <ul className="space-y-1.5 text-sm text-primary-foreground/85">
              <li>
                <Link to="/policies/returns" className="hover:text-primary-foreground hover:underline">
                  Chính sách đổi trả
                </Link>
              </li>
              <li>
                <Link to="/policies/privacy" className="hover:text-primary-foreground hover:underline">
                  Chính sách bảo mật
                </Link>
              </li>
              <li>
                <Link to="/policies/shipping" className="hover:text-primary-foreground hover:underline">
                  Vận chuyển &amp; giao hàng
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <p className="mb-2 text-sm font-semibold">Về EasyMart</p>
            <ul className="space-y-1.5 text-sm text-primary-foreground/85">
              <li>
                <Link to="/" className="hover:text-primary-foreground hover:underline">
                  Trang chủ
                </Link>
              </li>
              <li>
                <Link to="/?hasDiscount=1" className="hover:text-primary-foreground hover:underline">
                  Ưu đãi hôm nay
                </Link>
              </li>
              <li>
                <Link to="/auth/login" className="hover:text-primary-foreground hover:underline">
                  Đăng nhập / Đăng ký
                </Link>
              </li>
            </ul>
          </div>
        </div>
        <div className="border-t border-primary-foreground/15">
          <div className="mx-auto flex max-w-6xl flex-col gap-1 px-4 py-4 text-center text-xs text-primary-foreground/75 sm:flex-row sm:items-center sm:justify-between sm:text-sm">
            <span>© {new Date().getFullYear()} EasyMart. Bảo lưu mọi quyền.</span>
            <span>Mua sắm an toàn — Giá tốt mỗi ngày</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
