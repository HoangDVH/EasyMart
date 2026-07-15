import { create } from 'zustand'
import type { User } from '@/features/auth/types/auth.types'

const ACCESS_TOKEN_KEY = 'easymart-access-token'

function readStoredAccessToken(): string | null {
  try {
    const token = sessionStorage.getItem(ACCESS_TOKEN_KEY)
    return token && token.length > 0 ? token : null
  } catch {
    return null
  }
}

function writeStoredAccessToken(token: string | null) {
  try {
    if (token) sessionStorage.setItem(ACCESS_TOKEN_KEY, token)
    else sessionStorage.removeItem(ACCESS_TOKEN_KEY)
  } catch {
    /* ignore quota / private mode */
  }
}

type AuthState = {
  accessToken: string | null
  user: User | null
  setAccessToken: (token: string | null) => void
  setUser: (user: User | null) => void
  clearAuth: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  accessToken: readStoredAccessToken(),
  user: null,
  setAccessToken: (accessToken) => {
    writeStoredAccessToken(accessToken)
    set({ accessToken })
  },
  setUser: (user) => set({ user }),
  clearAuth: () => {
    writeStoredAccessToken(null)
    set({ accessToken: null, user: null })
  },
}))
