import axios from 'axios'
import { env } from '@/shared/config/env'
import { AUTH_ENDPOINTS } from '@/shared/constants/auth'
import { useAuthStore } from '@/shared/stores/auth-store'

type RefreshResponse = {
  result?: {
    accessToken?: string
  }
}

let isRefreshing = false
let refreshPromise: Promise<string | null> | null = null

export const httpClient = axios.create({
  baseURL: env.API_BASE_URL,
  withCredentials: true,
})

export async function silentRefreshAccessToken() {
  const { setAccessToken, clearAuth } = useAuthStore.getState()

  try {
    const { data } = await axios.post<RefreshResponse>(
      `${env.API_BASE_URL}${AUTH_ENDPOINTS.refresh}`,
      {},
      {
        withCredentials: true,
        timeout: 2000,
      },
    )

    const newAccessToken = data.result?.accessToken ?? null

    if (!newAccessToken) {
      clearAuth()
      return null
    }

    setAccessToken(newAccessToken)
    return newAccessToken
  } catch {
    clearAuth()
    return null
  }
}

httpClient.interceptors.request.use((config) => {
  const accessToken = useAuthStore.getState().accessToken
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`
  }
  return config
})

httpClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config

    if (error.response?.status !== 401 || originalRequest._retry) {
      return Promise.reject(error)
    }

    originalRequest._retry = true

    if (!isRefreshing) {
      isRefreshing = true
      refreshPromise = silentRefreshAccessToken().finally(() => {
        isRefreshing = false
      })
    }

    const newAccessToken = await refreshPromise
    if (!newAccessToken) {
      return Promise.reject(error)
    }

    originalRequest.headers.Authorization = `Bearer ${newAccessToken}`
    return httpClient(originalRequest)
  },
)
