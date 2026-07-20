import type { UserRole } from '@/features/auth/types/auth.types'

export function buildLoginPath(returnTo: string) {
  return `/auth/login?next=${encodeURIComponent(returnTo)}`
}

/** Trang mặc định sau đăng nhập theo role (seller/admin → dashboard). */
export function homePathForRole(role?: UserRole | null) {
  if (role === 'ADMIN') return '/admin'
  if (role === 'SELLER') return '/seller'
  return '/'
}

/**
 * Ưu tiên `?next=` / state `from` (deep link / bảo vệ route),
 * không thì về dashboard theo role.
 */
export function resolvePostLoginPath(
  search: string,
  stateFromPathname?: string,
  role?: UserRole | null,
) {
  const nextParam = new URLSearchParams(search).get('next')
  if (nextParam && nextParam.startsWith('/') && !nextParam.startsWith('//')) {
    return nextParam
  }
  if (
    stateFromPathname?.startsWith('/') &&
    !stateFromPathname.startsWith('//') &&
    stateFromPathname !== '/' &&
    !stateFromPathname.startsWith('/auth')
  ) {
    return stateFromPathname
  }
  return homePathForRole(role)
}
