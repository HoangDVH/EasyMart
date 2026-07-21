import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { ShoppingCart, Loader2, CircleHelp } from 'lucide-react'
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
import { Breadcrumb } from '@/shared/ui/breadcrumb'
import { CategoryNav } from '@/shared/ui/category-nav'
import { FullPageSpinner } from '@/shared/ui/full-page-spinner'
import { HeaderSearch } from '@/shared/ui/header-search'
import { HeaderNotifications } from '@/shared/ui/header-notifications'
import { UserMenu } from '@/shared/ui/user-menu'
import { AnimatedOutlet } from '@/shared/ui/page-transition'
import { ScrollToTop } from '@/shared/ui/scroll-to-top'
import { useOrdersRealtime } from '@/features/orders/hooks/use-orders-realtime'

/** lucide-react đã bỏ icon thương hiệu nên vẽ SVG Facebook/Instagram tại chỗ. */
function FacebookIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M22 12a10 10 0 1 0-11.56 9.88v-6.99H7.9V12h2.54V9.8c0-2.5 1.49-3.89 3.77-3.89 1.09 0 2.23.2 2.23.2v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56V12h2.78l-.44 2.89h-2.34v6.99A10 10 0 0 0 22 12Z" />
    </svg>
  )
}

function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
    </svg>
  )
}

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

  /** Một kết nối STOMP dùng chung mọi role — chuông navbar nhận thông báo realtime.
   * Chờ profile để biết role trước khi gắn audience thông báo. */
  useOrdersRealtime(Boolean(effectiveToken && profile))

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
    if (pathname === '/account') {
      return [{ label: 'Trang chủ', to: '/' }, { label: 'Tài khoản' }]
    }
    if (pathname === '/account/addresses') {
      return [
        { label: 'Trang chủ', to: '/' },
        { label: 'Tài khoản', to: '/account' },
        { label: 'Sổ địa chỉ' },
      ]
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

  const cartLink = (
    <NavLink
      to="/cart"
      className="group relative inline-flex h-11 w-11 items-center justify-center rounded-md sm:h-auto sm:w-auto sm:p-1.5"
      aria-label="Giỏ hàng"
    >
      <ShoppingCart className="h-6 w-6 text-primary-foreground/90 transition group-hover:text-primary-foreground sm:h-7 sm:w-7" aria-hidden />
      {cartCount > 0 ? (
        <span className="absolute right-1 top-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-primary-foreground px-1 text-[10px] font-bold text-primary ring-2 ring-primary sm:-right-1 sm:-top-0.5">
          {cartCount > 99 ? '99+' : cartCount}
        </span>
      ) : null}
    </NavLink>
  )

  const authArea = isRestoringSession ? (
    <span className="inline-flex h-11 w-11 items-center justify-center sm:h-6 sm:w-6" aria-label="Đang tải">
      <Loader2 className="h-4 w-4 animate-spin text-primary-foreground/80" />
    </span>
  ) : effectiveToken && profile?.email ? (
    <UserMenu email={profile.email} variant="onPrimary" />
  ) : (
    <span className="flex items-center gap-1.5 text-sm sm:gap-2">
      <NavLink
        to="/auth/register"
        className="hidden rounded-md px-2 py-2 hover:text-primary-foreground sm:inline"
      >
        Đăng ký
      </NavLink>
      <span className="hidden text-primary-foreground/40 sm:inline" aria-hidden>
        |
      </span>
      <NavLink
        to="/auth/login"
        className="rounded-md px-2 py-2 font-medium hover:text-primary-foreground"
      >
        Đăng nhập
      </NavLink>
    </span>
  )

  return (
    <div className="min-h-screen bg-background">
      <ScrollToTop />
      <header className="sticky top-0 z-40 bg-gradient-to-b from-primary to-primary/95 text-primary-foreground shadow-md shadow-primary/15">
        {/* Top bar kiểu Shopee: link phụ trái, tiện ích + tài khoản phải */}
        <div className="hidden border-b border-primary-foreground/10 sm:block">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-1.5 text-xs text-primary-foreground/85">
            <div className="flex items-center gap-2">
              {showSellerNav ? (
                <>
                  <NavLink to="/seller" className="hover:text-primary-foreground">
                    Kênh người bán
                  </NavLink>
                  <span className="text-primary-foreground/40" aria-hidden>
                    |
                  </span>
                </>
              ) : null}
              {profile?.role === 'ADMIN' ? (
                <>
                  <NavLink to="/admin" className="hover:text-primary-foreground">
                    Admin
                  </NavLink>
                  <span className="text-primary-foreground/40" aria-hidden>
                    |
                  </span>
                </>
              ) : null}
              <span className="inline-flex items-center gap-1.5">
                Kết nối
                <a
                  href="https://facebook.com"
                  target="_blank"
                  rel="noreferrer"
                  aria-label="Facebook"
                  className="hover:text-primary-foreground"
                >
                  <FacebookIcon className="h-3.5 w-3.5" />
                </a>
                <a
                  href="https://instagram.com"
                  target="_blank"
                  rel="noreferrer"
                  aria-label="Instagram"
                  className="hover:text-primary-foreground"
                >
                  <InstagramIcon className="h-3.5 w-3.5" />
                </a>
              </span>
            </div>

            <div className="flex items-center gap-3">
              {effectiveToken && profile?.email ? (
                <HeaderNotifications user={profile} variant="onPrimary" label="Thông báo" />
              ) : null}
              <Link
                to="/policies/shipping"
                className="inline-flex items-center gap-1 hover:text-primary-foreground"
              >
                <CircleHelp className="h-3.5 w-3.5" aria-hidden />
                Hỗ trợ
              </Link>
              {authArea}
            </div>
          </div>
        </div>

        {/* Hàng chính: logo lớn + search + giỏ hàng (bố cục Shopee) */}
        <div className="mx-auto max-w-6xl px-4 py-2 sm:py-4">
          <div className="flex items-center justify-between gap-2 sm:hidden">
            <Link to="/" className="inline-flex min-w-0 items-center gap-1.5 text-base font-extrabold tracking-tight">
              <span className="grid h-7 w-7 shrink-0 place-items-center overflow-hidden rounded-lg">
                <img
                  src="/favicon-192.png"
                  alt=""
                  className="h-full w-full object-cover"
                  aria-hidden
                />
              </span>
              EasyMart
            </Link>
            <div className="flex shrink-0 items-center gap-0.5">
              {effectiveToken && profile?.email ? (
                <HeaderNotifications user={profile} variant="onPrimary" />
              ) : null}
              {cartLink}
              {authArea}
            </div>
          </div>

          <div className="mt-1.5 flex items-center gap-3 sm:mt-0 sm:gap-6">
            <Link
              to="/"
              className="hidden shrink-0 items-center gap-2 text-2xl font-extrabold tracking-tight transition-transform duration-200 hover:scale-[1.02] sm:inline-flex"
            >
              <span className="grid h-9 w-9 place-items-center overflow-hidden rounded-xl">
                <img
                  src="/favicon-192.png"
                  alt=""
                  className="h-full w-full object-cover"
                  aria-hidden
                />
              </span>
              EasyMart
            </Link>
            <div className="min-w-0 flex-1">
              <HeaderSearch />
            </div>
            <div className="hidden shrink-0 sm:block">{cartLink}</div>
          </div>
        </div>

        <div className="border-t border-primary-foreground/15 bg-background text-foreground">
          <div className="mx-auto max-w-6xl">
            <CategoryNav />
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
                  className={() =>
                    location.pathname.startsWith('/seller')
                      ? 'font-medium text-foreground'
                      : 'hover:text-foreground'
                  }
                >
                  Kênh người bán
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
