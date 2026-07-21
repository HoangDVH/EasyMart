import type { UserRole } from '@/features/auth/types/auth.types'

type LocationLike = {
  pathname: string
  search?: string
  hash?: string
}

/** Ghép pathname + search + hash để quay lại đúng trang. */
export function locationToReturnTo(location: LocationLike) {
  return `${location.pathname}${location.search ?? ''}${location.hash ?? ''}`
}

export function buildLoginPath(returnTo: string) {
  return `/auth/login?next=${encodeURIComponent(returnTo)}`
}

export function buildRegisterPath(returnTo: string) {
  return `/auth/register?next=${encodeURIComponent(returnTo)}`
}

/** Trang mặc định sau đăng nhập theo role (seller/admin → dashboard). */
export function homePathForRole(role?: UserRole | null) {
  if (role === 'ADMIN') return '/admin'
  if (role === 'SELLER') return '/seller'
  return '/'
}

function isSafeInternalPath(path: string) {
  return path.startsWith('/') && !path.startsWith('//') && !path.startsWith('/auth')
}

function pathOnly(path: string) {
  const q = path.indexOf('?')
  const h = path.indexOf('#')
  let end = path.length
  if (q >= 0) end = Math.min(end, q)
  if (h >= 0) end = Math.min(end, h)
  return path.slice(0, end) || '/'
}

function isDashboardPath(path: string) {
  const pathname = pathOnly(path)
  return pathname.startsWith('/seller') || pathname.startsWith('/admin')
}

/**
 * Buyer: giữ next khi đang checkout/giỏ/account…
 * Seller/Admin: chỉ giữ next nếu đã là dashboard — không kéo về checkout/SP.
 */
function shouldUseReturnPath(path: string, role?: UserRole | null) {
  if (!isSafeInternalPath(path) || path === '/') return false

  if (role === 'ADMIN' || role === 'SELLER') {
    return isDashboardPath(path)
  }

  const pathname = pathOnly(path)
  if (isDashboardPath(path)) return true
  if (pathname.startsWith('/checkout') || pathname === '/cart') return true
  if (pathname.startsWith('/account') || pathname.startsWith('/payment')) return true
  return false
}

/**
 * Link Đăng nhập/Đăng ký trên storefront: chỉ kèm `?next=` cho buyer tiếp tục mua.
 * Không gắn next từ checkout/catalog vào link chung (tránh seller/admin bị kéo theo).
 */
export function buildAuthEntryPath(
  kind: 'login' | 'register',
  location: LocationLike,
) {
  const returnTo = locationToReturnTo(location)
  const pathname = pathOnly(returnTo)
  const buyerContinue =
    pathname.startsWith('/checkout') ||
    pathname === '/cart' ||
    pathname.startsWith('/account') ||
    pathname.startsWith('/payment')

  if (!buyerContinue) {
    return kind === 'login' ? '/auth/login' : '/auth/register'
  }
  return kind === 'login' ? buildLoginPath(returnTo) : buildRegisterPath(returnTo)
}

/**
 * Buyer: ưu tiên `?next=` / state `from` khi đang mua hàng.
 * Seller/Admin: luôn về dashboard (trừ khi next đã là /seller|/admin).
 */
export function resolvePostLoginPath(
  search: string,
  stateFrom?: string | LocationLike | null,
  role?: UserRole | null,
) {
  const nextParam = new URLSearchParams(search).get('next')
  if (nextParam && shouldUseReturnPath(nextParam, role)) {
    return nextParam
  }

  const fromPath =
    typeof stateFrom === 'string'
      ? stateFrom
      : stateFrom
        ? locationToReturnTo(stateFrom)
        : undefined

  if (fromPath && shouldUseReturnPath(fromPath, role)) {
    return fromPath
  }

  return homePathForRole(role)
}
