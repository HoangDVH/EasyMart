import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useLayoutEffect } from 'react'
import { toast } from 'react-toastify'
import { authApi } from '@/features/auth/api/auth.api'
import { getApiErrorMessage } from '@/shared/lib/api-error'
import { silentRefreshAccessToken } from '@/shared/api/http-client'
import type {
  LoginPayload,
  RegisterPayload,
  UserRole,
} from '@/features/auth/types/auth.types'
import { useAuthStore } from '@/shared/stores/auth-store'

const PROFILE_QUERY_KEY = ['profile']
const SESSION_QUERY_KEY = ['restore-session']

export function useRestoreSessionQuery(enabled = true) {
  return useQuery({
    queryKey: SESSION_QUERY_KEY,
    queryFn: silentRefreshAccessToken,
    enabled,
    retry: false,
    staleTime: 0,
    gcTime: 0,
  })
}

export function useProfileQuery(enabled = true) {
  const accessToken = useAuthStore((state) => state.accessToken)
  const setUser = useAuthStore((state) => state.setUser)
  const clearAuth = useAuthStore((state) => state.clearAuth)

  const query = useQuery({
    queryKey: [...PROFILE_QUERY_KEY, accessToken ?? ''],
    queryFn: authApi.getProfile,
    enabled: enabled && Boolean(accessToken),
    retry: false,
  })

  useLayoutEffect(() => {
    if (query.data) setUser(query.data)
  }, [query.data, setUser])

  useEffect(() => {
    if (query.isError) clearAuth()
  }, [query.isError, clearAuth])

  return query
}

export function useLoginMutation() {
  const setAccessToken = useAuthStore((state) => state.setAccessToken)
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: LoginPayload) => authApi.login(payload),
    onSuccess: (result) => {
      setAccessToken(result.accessToken)
      void queryClient.invalidateQueries({ queryKey: PROFILE_QUERY_KEY })
    },
  })
}

export function useRegisterMutation() {
  return useMutation({
    mutationFn: (payload: RegisterPayload) => authApi.register(payload),
  })
}

export function useLogoutMutation() {
  const clearAuth = useAuthStore((state) => state.clearAuth)
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => authApi.logout(),
    onSettled: async (_data, error) => {
      clearAuth()
      await queryClient.clear()
      if (error) {
        toast.warning(
          getApiErrorMessage(error, 'Đã xóa phiên trên trình duyệt. (Máy chủ có thể chưa phản hồi.)'),
        )
      } else {
        toast.success('Đã đăng xuất.')
      }
    },
  })
}

export function useHasRole(role: UserRole) {
  const user = useAuthStore((state) => state.user)
  return user?.role === role
}
