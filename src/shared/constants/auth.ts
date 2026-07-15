export const AUTH_ENDPOINTS = {
  login: '/api/v1/auth/login',
  register: '/api/v1/auth/register',
  refresh: '/api/v1/auth/refresh',
  logout: '/api/v1/auth/logout',
  forgotPassword: '/api/v1/auth/forgot-password',
  resetPassword: '/api/v1/auth/reset-password',
  me: '/api/v1/users/me',
} as const
