/** Vai chính dùng cho route/auth logic — có định thứ tự ưu tiên trong mapper API */
export type UserRole = 'ADMIN' | 'SELLER' | 'USER'

export type User = {
  id: string
  email: string
  roles: string[]
  /** Ưu tiên ADMIN → SELLER → USER khi backend cho nhiều vai */
  role: UserRole
}

export type AuthTokens = {
  accessToken: string
}

export type LoginPayload = {
  email: string
  password: string
}

export type RegisterPayload = {
  email: string
  password: string
}
