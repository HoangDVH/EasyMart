import { httpClient } from '@/shared/api/http-client'
import type { ApiEnvelope } from '@/shared/types/api-result'
import type { User, UserRole } from '@/features/auth/types/auth.types'

const USERS_BASE = '/api/v1/users'

export type UserUpdatePayload = {
  password: string
}

export type AdminCreateUserPayload = {
  email: string
  password: string
}

export type AdminRolePayload = {
  role: UserRole
  enabled?: boolean
}

type RawUser = {
  id?: unknown
  email?: unknown
  roles?: unknown
}

function stripSpringPrefix(role: string): string {
  return role.replace(/^ROLE_/i, '').toUpperCase()
}

function normalizeRole(roles: string[]): UserRole {
  const normalized = roles.map(stripSpringPrefix)
  if (normalized.some((r) => r.includes('ADMIN'))) return 'ADMIN'
  if (normalized.some((r) => r.includes('SELLER'))) return 'SELLER'
  return 'USER'
}

function mapUser(raw: RawUser | null | undefined): User | null {
  if (!raw) return null
  const id =
    typeof raw.id === 'string'
      ? raw.id
      : typeof raw.id === 'number' && Number.isFinite(raw.id)
        ? String(raw.id)
        : null
  const email = typeof raw.email === 'string' ? raw.email : null
  if (!id || !email) return null
  const roles = Array.isArray(raw.roles)
    ? raw.roles.filter((r): r is string => typeof r === 'string')
    : []
  return {
    id,
    email,
    roles,
    role: normalizeRole(roles),
  }
}

export const usersApi = {
  async getMe(): Promise<User | null> {
    const { data } = await httpClient.get<ApiEnvelope<RawUser>>(`${USERS_BASE}/me`)
    return mapUser(data?.result)
  },

  async updateMe(payload: UserUpdatePayload): Promise<User | null> {
    const { data } = await httpClient.put<ApiEnvelope<RawUser>>(
      `${USERS_BASE}/me`,
      payload,
    )
    return mapUser(data?.result)
  },

  async listAll(): Promise<User[]> {
    const { data } = await httpClient.get<ApiEnvelope<unknown>>(USERS_BASE)
    if (!Array.isArray(data?.result)) return []
    return data.result
      .map((row) => mapUser((row ?? null) as RawUser))
      .filter((user): user is User => user !== null)
  },

  async create(payload: AdminCreateUserPayload): Promise<User | null> {
    const { data } = await httpClient.post<ApiEnvelope<RawUser>>(USERS_BASE, payload)
    return mapUser(data?.result)
  },

  async updateUser(id: string, payload: UserUpdatePayload): Promise<User | null> {
    const { data } = await httpClient.put<ApiEnvelope<RawUser>>(
      `${USERS_BASE}/${id}`,
      payload,
    )
    return mapUser(data?.result)
  },

  async deleteUser(id: string): Promise<void> {
    await httpClient.delete(`${USERS_BASE}/${id}`)
  },

  async assignRole(id: string, payload: AdminRolePayload): Promise<User | null> {
    const { data } = await httpClient.patch<ApiEnvelope<RawUser>>(
      `${USERS_BASE}/${id}/roles`,
      payload,
    )
    return mapUser(data?.result)
  },
}
