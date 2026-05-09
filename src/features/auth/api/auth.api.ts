import { AUTH_ENDPOINTS } from '@/shared/constants/auth'
import { httpClient } from '@/shared/api/http-client'
import type {
  LoginPayload,
  RegisterPayload,
  User,
} from '@/features/auth/types/auth.types'

type ApiResponse<T> = {
  code: number
  message: string
  result: T
}

type AuthenticationResponse = {
  accessToken: string
  authenticated: boolean
}

type UserResponse = {
  id: string
  email: string
  roles?: string[]
}

function stripSpringPrefix(role: string) {
  return role.replace(/^ROLE_/i, '').toUpperCase()
}

/** ADMIN có quyền cao nhất, tiếp theo SELLER — chỉ fallback USER */
function normalizeRole(roles: string[] = []): User['role'] {
  const normalized = roles.map(stripSpringPrefix)
  if (normalized.some((r) => r.includes('ADMIN'))) return 'ADMIN'
  if (normalized.some((r) => r.includes('SELLER'))) return 'SELLER'
  return 'USER'
}

function mapUser(data: UserResponse): User {
  const roles = data.roles ?? []
  return {
    id: data.id,
    email: data.email,
    roles,
    role: normalizeRole(roles),
  }
}

export const authApi = {
  async login(payload: LoginPayload) {
    const { data } = await httpClient.post<ApiResponse<AuthenticationResponse>>(
      AUTH_ENDPOINTS.login,
      payload,
    )
    return {
      accessToken: data.result.accessToken,
    }
  },
  async register(payload: RegisterPayload) {
    const { data } = await httpClient.post<ApiResponse<UserResponse>>(AUTH_ENDPOINTS.register, payload)
    return mapUser(data.result)
  },
  async logout() {
    await httpClient.post(AUTH_ENDPOINTS.logout, {})
  },
  async getProfile() {
    const { data } = await httpClient.get<ApiResponse<UserResponse>>(AUTH_ENDPOINTS.me)
    return mapUser(data.result)
  },
}
