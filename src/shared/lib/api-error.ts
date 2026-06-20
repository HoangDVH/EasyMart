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
    const raw =
      error.response?.data?.message ??
      error.response?.data?.result?.message ??
      error.response?.data?.result?.error ??
      error.message ??
      fallback

    if (raw === 'Uncategorized error') {
      const status = error.response?.status
      if (status === 500) {
        return 'Lỗi máy chủ (500). Kiểm tra ảnh sản phẩm và các trường bắt buộc, rồi thử lại.'
      }
      return fallback
    }

    return raw
  }

  if (error instanceof Error) {
    return error.message
  }

  return fallback
}
