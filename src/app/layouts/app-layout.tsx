import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { ShoppingCart, Loader2 } from 'lucide-react'
import { useEffect } from 'react'
import { useProfileQuery, useRestoreSessionQuery } from '@/features/auth/hooks/use-auth'
import {
  buildOrderSuccessPath,
  isVnpayReturnUrl,
  isVnpaySuccess,
  loadVnpayCheckoutPending,
  loadVnpayOrderCookie,
  parseVnpayReturnParams,
  readVnpaySearchFromLocation,
  resolveVnpayOrderId,
} from '@/features/payments/lib/vnpay-return'
import { useAuthStore } from '@/shared/stores/auth-store'
import { calcCartCount, useCartStore } from '@/shared/stores/cart-store'
import { Button } from '@/shared/ui/button'
import { Breadcrumb } from '@/shared/ui/breadcrumb'
import { CategoryNav } from '@/shared/ui/category-nav'
import { FullPageSpinner } from '@/shared/ui/full-page-spinner'
import { HeaderSearch } from '@/shared/ui/header-search'
import { UserMenu } from '@/shared/ui/user-menu'
import { AnimatedOutlet } from '@/shared/ui/page-transition'

export function AppLayout() {
  const location = useLocation()
  const navigate = useNavigate()
  const accessToken = useAuthStore((state) => state.accessToken)
  const restoreSessionQuery = useRestoreSessionQuery(!accessToken)
  const effectiveToken = accessToken ?? restoreSessionQuery.data ?? null
  const isRestoringSession = !accessToken && restoreSessionQuery.isPending
  const profileQuery = useProfileQuery(Boolean(effectiveToken))
  const profile = profileQuery.data
  const cartCount = useCartStore((state) => calcCartCount(state.items))
  const showSellerNav =
    profile?.role === 'ADMIN' || profile?.role === 'SELLER' || profile?.roles?.includes('SELLER')

  /** VNPay return URL backend có thể cấu hình về `/` — chuyển sang trang thành công hoặc handler chuẩn. */
  useEffect(() => {
    const vnpaySearch = readVnpaySearchFromLocation(location)

    if (isVnpayReturnUrl(vnpaySearch)) {
      const vnpay = parseVnpayReturnParams(vnpaySearch)
      const orderId = resolveVnpayOrderId(vnpay, vnpaySearch)

      if (isVnpaySuccess(vnpay.responseCode) && orderId) {
        const target = buildOrderSuccessPath(orderId)
        if (location.pathname !== target) {
          navigate(target, { replace: true })
          return
        }
      }

      if (location.pathname !== '/payment/result') {
        navigate(`/payment/result${vnpaySearch.startsWith('?') ? vnpaySearch : `?${vnpaySearch}`}`, {
          replace: true,
        })
      }
      return
    }

    const pendingOrderId = loadVnpayCheckoutPending()?.orderId ?? loadVnpayOrderCookie()
    if (
      pendingOrderId &&
      (location.pathname === '/' || location.pathname === '') &&
      !isVnpayReturnUrl(vnpaySearch)
    ) {
      navigate(buildOrderSuccessPath(pendingOrderId), { replace: true })
    }
  }, [location.pathname, location.search, location.hash, navigate])

  const isCheckoutFlowRoute =
    location.pathname === '/checkout' ||
    location.pathname === '/payment/result' ||
    location.pathname.startsWith('/checkout/success/')

  if (effectiveToken && profileQuery.isPending && !profileQuery.data && !isCheckoutFlowRoute) {
    return <FullPageSpinner message="Đang tải tài khoản..." />
  }

  const breadcrumbItems = (() => {
    const pathname = location.pathname
    if (pathname === '/') return []
    if (pathname.startsWith('/products/')) return []
    if (pathname === '/cart') return [{ label: 'Trang chủ', to: '/' }, { label: 'Giỏ hàng' }]
    if (pathname === '/checkout') return [{ label: 'Trang chủ', to: '/' }, { label: 'Thanh toán' }]
    if (pathname.startsWith('/checkout/success/')) {
      return [
        { label: 'Trang chủ', to: '/' },
        { label: 'Thanh toán', to: '/checkout' },
        { label: 'Hoàn tất' },
      ]
    }
    if (pathname === '/payment/result') {
      return [{ label: 'Trang chủ', to: '/' }, { label: 'Kết quả thanh toán' }]
    }
    if (pathname === '/seller') return [{ label: 'Trang chủ', to: '/' }, { label: 'Quản lý sản phẩm' }]
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
    if (pathname === '/account/payments') {
      return [
        { label: 'Trang chủ', to: '/' },
        { label: 'Tài khoản', to: '/account' },
        { label: 'Thanh toán' },
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

  const headerActions = (
    <>
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
      {isRestoringSession ? (
        <span className="inline-flex h-9 w-9 items-center justify-center" aria-label="Đang tải">
          <Loader2 className="h-4 w-4 animate-spin text-primary-foreground/80" />
        </span>
      ) : effectiveToken && profile?.email ? (
        <UserMenu email={profile.email} variant="onPrimary" />
      ) : (
        <NavLink to="/auth/login">
          <Button
            size="sm"
            variant="secondary"
            className="shadow-sm hover:brightness-105 px-2.5 text-xs sm:px-4 sm:text-sm"
          >
            Đăng nhập
          </Button>
        </NavLink>
      )}
    </>
  )

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 bg-primary/95 text-primary-foreground shadow-md shadow-primary/15 backdrop-blur-lg supports-[backdrop-filter]:bg-primary/90">
        <div className="mx-auto max-w-6xl px-4 pt-2.5 sm:pt-3">
          <div className="flex items-center justify-between gap-2 sm:hidden">
            <Link
              to="/"
              className="shrink-0 rounded-lg bg-primary-foreground px-2.5 py-1.5 text-sm font-bold tracking-wide text-primary shadow-sm transition-transform duration-200 hover:scale-[1.02] active:scale-[0.98]"
            >
              EasyMart
            </Link>
            <div className="flex shrink-0 items-center gap-1">{headerActions}</div>
          </div>

          <div className="mt-2 flex items-center gap-3 pb-2.5 sm:mt-0 sm:pb-3">
            <Link
              to="/"
              className="hidden shrink-0 rounded-lg bg-primary-foreground px-3 py-1.5 text-sm font-bold tracking-wide text-primary shadow-sm transition-transform duration-200 hover:scale-[1.02] active:scale-[0.98] sm:inline-flex"
            >
              EasyMart
            </Link>
            <div className="min-w-0 flex-1">
              <HeaderSearch />
            </div>
            <div className="hidden shrink-0 items-center gap-3 sm:flex">{headerActions}</div>
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
                  Quản lý sản phẩm
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
                  Quản lý sản phẩm
                </NavLink>
              ) : null}
            </div>
          ) : null}
        </div>
      </header>
      <main className="mx-auto max-w-6xl p-4 pb-8">
        <Breadcrumb items={breadcrumbItems} />
        <AnimatedOutlet />
      </main>
      <footer className="mt-auto border-t border-primary-foreground/10 bg-gradient-to-b from-primary to-primary/95 text-primary-foreground">
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
                  Xem giỏ hàng
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
