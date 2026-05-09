import { Navigate, Outlet, useLocation } from 'react-router-dom'
import type { UserRole } from '@/features/auth/types/auth.types'
import { useProfileQuery, useRestoreSessionQuery } from '@/features/auth/hooks/use-auth'
import { useAuthStore } from '@/shared/stores/auth-store'
import { FullPageSpinner } from '@/shared/ui/full-page-spinner'

export function ProtectedRoute() {
  const location = useLocation()
  const accessToken = useAuthStore((state) => state.accessToken)
  const shouldRestoreSession = !accessToken
  const restoreSessionQuery = useRestoreSessionQuery(shouldRestoreSession)
  const effectiveToken = accessToken ?? restoreSessionQuery.data

  if (shouldRestoreSession && restoreSessionQuery.isPending) {
    return <FullPageSpinner message="Đang khôi phục phiên đăng nhập..." />
  }

  if (!effectiveToken) {
    return <Navigate to="/auth/login" replace state={{ from: location }} />
  }

  return <Outlet />
}

type RoleGuardProps = {
  allowedRoles: UserRole[]
}

export function RoleGuard({ allowedRoles }: RoleGuardProps) {
  const accessToken = useAuthStore((state) => state.accessToken)
  const { data: profile, isPending } = useProfileQuery(Boolean(accessToken))

  if (isPending) {
    return <FullPageSpinner message="Đang tải quyền truy cập..." />
  }

  if (!profile || !allowedRoles.includes(profile.role)) {
    return <Navigate to="/" replace />
  }

  return <Outlet />
}
