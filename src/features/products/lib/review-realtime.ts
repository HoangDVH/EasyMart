import type { QueryClient } from '@tanstack/react-query'
import { toast } from 'react-toastify'
import { parseProductReview } from '@/features/products/api/reviews.api'
import { productsQueryKeyRoot } from '@/features/products/hooks/use-catalog'
import {
  removeReviewFromCache,
  reviewsQueryKeyRoot,
  upsertReviewInCache,
} from '@/features/products/hooks/use-reviews'
import type { Product } from '@/features/products/types/product.types'
import type { ProductReviewRealtimeEvent } from '@/features/products/types/review.types'

function applyProductRatingFromEvent(
  queryClient: QueryClient,
  productId: string,
  productRating: number | null | undefined,
  reviewCount: number | null | undefined,
) {
  queryClient.setQueryData<Product>([...productsQueryKeyRoot, 'detail', productId], (prev) => {
    if (!prev) return prev
    return {
      ...prev,
      ...(productRating != null ? { rating: productRating } : {}),
      ...(reviewCount != null ? { reviewCount } : {}),
    }
  })
  void queryClient.invalidateQueries({ queryKey: productsQueryKeyRoot })
}

/** Xử lý event REVIEW_* — cập nhật rating/count + list reviews. */
export function handleReviewRealtimeEvent(
  queryClient: QueryClient,
  raw: unknown,
  options?: { toast?: boolean },
) {
  const event = (raw ?? {}) as ProductReviewRealtimeEvent
  const productId =
    event.productId != null && String(event.productId).length > 0 ? String(event.productId) : null
  if (!productId) {
    void queryClient.invalidateQueries({ queryKey: reviewsQueryKeyRoot })
    return
  }

  const type = String(event.type ?? '').toUpperCase()
  applyProductRatingFromEvent(queryClient, productId, event.productRating, event.reviewCount)

  const review = parseProductReview(event.review)
  if (type.includes('DELETED') && (review || event.review)) {
    const id = review?.id ?? String((event.review as { id?: string | number })?.id ?? '')
    if (id) removeReviewFromCache(queryClient, productId, id)
    else void queryClient.invalidateQueries({ queryKey: [...reviewsQueryKeyRoot, productId] })
  } else if (type.includes('CREATED') && review) {
    upsertReviewInCache(queryClient, productId, review, 'prepend')
  } else if (type.includes('UPDATED') && review) {
    upsertReviewInCache(queryClient, productId, review, 'replace')
  } else {
    void queryClient.invalidateQueries({ queryKey: [...reviewsQueryKeyRoot, productId] })
  }

  if (options?.toast) {
    if (type.includes('CREATED')) toast.info('Có đánh giá mới trên sản phẩm của bạn.')
    else if (type.includes('UPDATED')) toast.info('Một đánh giá đã được cập nhật.')
    else if (type.includes('DELETED')) toast.info('Một đánh giá đã bị xóa.')
  }
}
