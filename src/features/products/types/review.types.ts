export type ProductReview = {
  id: string
  productId: string
  userEmail: string
  userFullName: string | null
  userAvatarUrl: string | null
  rating: number
  comment: string | null
  createdAt: string | null
  updatedAt: string | null
}

export type ProductReviewPage = {
  items: ProductReview[]
  totalElements: number
  page: number
  size: number
}

export type ProductReviewPayload = {
  rating: number
  comment?: string
}

export type ProductReviewEventType = 'REVIEW_CREATED' | 'REVIEW_UPDATED' | 'REVIEW_DELETED'

export type ProductReviewRealtimeEvent = {
  type?: ProductReviewEventType | string
  productId?: string | number
  productRating?: number | null
  reviewCount?: number | null
  review?: unknown
  occurredAt?: string
}
