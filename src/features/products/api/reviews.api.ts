import { httpClient } from '@/shared/api/http-client'
import { PRODUCT_ENDPOINTS } from '@/shared/constants/catalog'
import type { ApiEnvelope } from '@/shared/types/api-result'
import type {
  ProductReview,
  ProductReviewPage,
  ProductReviewPayload,
} from '@/features/products/types/review.types'

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null
}

function toIdString(value: unknown): string | null {
  if (typeof value === 'string' && value.length > 0) return value
  if (typeof value === 'number' && Number.isFinite(value)) return String(value)
  return null
}

function toNumberOrNull(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null
  if (typeof value === 'string' && value.trim().length > 0) {
    const n = Number(value)
    return Number.isFinite(n) ? n : null
  }
  return null
}

function pickString(...candidates: unknown[]): string | null {
  for (const c of candidates) {
    if (typeof c === 'string') {
      const t = c.trim()
      if (t.length > 0) return t
    }
  }
  return null
}

export function parseProductReview(raw: unknown): ProductReview | null {
  const row = asRecord(raw)
  if (!row) return null
  const id = toIdString(row.id ?? row.reviewId)
  const productId = toIdString(row.productId)
  const userEmail = pickString(row.userEmail, row.email)
  const rating = toNumberOrNull(row.rating)
  if (!id || !productId || !userEmail || rating == null) return null
  return {
    id,
    productId,
    userEmail,
    userFullName: pickString(row.userFullName, row.fullName, row.userName),
    userAvatarUrl: pickString(row.userAvatarUrl, row.avatarUrl, row.avatar),
    rating: Math.max(1, Math.min(5, Math.round(rating))),
    comment: pickString(row.comment, row.content, row.text),
    createdAt: pickString(row.createdAt),
    updatedAt: pickString(row.updatedAt),
  }
}

function parseReviewPage(raw: unknown): ProductReviewPage {
  const result = asRecord(raw) ?? {}
  const list =
    (Array.isArray(result.items) && result.items) ||
    (Array.isArray(result.content) && result.content) ||
    (Array.isArray(raw) && raw) ||
    []
  const items = list
    .map((item) => parseProductReview(item))
    .filter((item): item is ProductReview => item != null)
  return {
    items,
    totalElements: toNumberOrNull(result.totalElements) ?? items.length,
    page: toNumberOrNull(result.page ?? result.number) ?? 0,
    size: toNumberOrNull(result.size) ?? items.length,
  }
}

export type ListReviewsParams = {
  page?: number
  size?: number
  sort?: string
}

export const reviewsApi = {
  async list(productId: string, params: ListReviewsParams = {}, signal?: AbortSignal) {
    const { data } = await httpClient.get<ApiEnvelope<unknown>>(
      PRODUCT_ENDPOINTS.reviews(productId),
      {
        signal,
        params: {
          page: params.page ?? 0,
          size: params.size ?? 20,
          sort: params.sort ?? 'createdAt,desc',
        },
      },
    )
    return parseReviewPage(data.result)
  },

  async create(productId: string, payload: ProductReviewPayload) {
    const { data } = await httpClient.post<ApiEnvelope<unknown>>(
      PRODUCT_ENDPOINTS.reviews(productId),
      {
        rating: payload.rating,
        comment: payload.comment?.trim() || undefined,
      },
    )
    const review = parseProductReview(data.result)
    if (!review) throw new Error('Phản hồi đánh giá không hợp lệ.')
    return review
  },

  async update(productId: string, reviewId: string, payload: ProductReviewPayload) {
    const { data } = await httpClient.put<ApiEnvelope<unknown>>(
      PRODUCT_ENDPOINTS.reviewById(productId, reviewId),
      {
        rating: payload.rating,
        comment: payload.comment?.trim() || undefined,
      },
    )
    const review = parseProductReview(data.result)
    if (!review) throw new Error('Phản hồi đánh giá không hợp lệ.')
    return review
  },

  async remove(productId: string, reviewId: string) {
    await httpClient.delete(PRODUCT_ENDPOINTS.reviewById(productId, reviewId))
  },
}
