import axios from 'axios'

type ErrorPayload = {
  message?: string
  error?: string
}

type ApiErrorResponse = {
  message?: string
  result?: ErrorPayload
}

export function getApiErrorMessage(
  error: unknown,
  fallback = 'Có lỗi xảy ra. Vui lòng thử lại.',
) {
  if (axios.isAxiosError<ApiErrorResponse>(error)) {
    return (
      error.response?.data?.message ??
      error.response?.data?.result?.message ??
      error.response?.data?.result?.error ??
      error.message ??
      fallback
    )
  }

  if (error instanceof Error) {
    return error.message
  }

  return fallback
}
