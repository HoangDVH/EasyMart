import axios from 'axios'

type ErrorPayload = {
  message?: string
  error?: string
}

type ApiErrorResponse = {
  message?: string
  result?: ErrorPayload
}

export function getApiErrorStatus(error: unknown): number | null {
  if (axios.isAxiosError(error)) {
    return error.response?.status ?? null
  }
  return null
}

export function getApiErrorMessage(
  error: unknown,
  fallback = 'Có lỗi xảy ra. Vui lòng thử lại.',
) {
  if (axios.isAxiosError<ApiErrorResponse>(error)) {
    if (error.code === 'ECONNABORTED' || error.message.toLowerCase().includes('timeout')) {
      return 'Máy chủ phản hồi quá chậm (có thể đang khởi động). Vui lòng thử lại sau vài giây.'
    }

    if (!error.response && error.message === 'Network Error') {
      return 'Không kết nối được máy chủ. Kiểm tra mạng hoặc thử lại sau.'
    }

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
