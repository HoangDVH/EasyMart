import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { reviewsApi, type ListReviewsParams } from '@/features/products/api/reviews.api'
import type { ProductReview, ProductReviewPayload } from '@/features/products/types/review.types'
import { productsQueryKeyRoot } from '@/features/products/hooks/use-catalog'

export const reviewsQueryKeyRoot = ['product-reviews'] as const

export function getReviewsQueryKey(productId: string, params?: ListReviewsParams) {
  return [
    ...reviewsQueryKeyRoot,
    productId,
    params?.page ?? 0,
    params?.size ?? 20,
    params?.sort ?? 'createdAt,desc',
  ] as const
}

export function useProductReviewsQuery(productId: string | null, params?: ListReviewsParams) {
  return useQuery({
    queryKey: productId ? getReviewsQueryKey(productId, params) : [...reviewsQueryKeyRoot, 'idle'],
    queryFn: ({ signal }) => reviewsApi.list(productId!, params, signal),
    enabled: Boolean(productId),
    staleTime: 30_000,
  })
}

function invalidateProductAndReviews(queryClient: ReturnType<typeof useQueryClient>, productId: string) {
  void queryClient.invalidateQueries({ queryKey: reviewsQueryKeyRoot })
  void queryClient.invalidateQueries({ queryKey: [...productsQueryKeyRoot, 'detail', productId] })
  void queryClient.invalidateQueries({ queryKey: productsQueryKeyRoot })
}

export function useCreateReviewMutation(productId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: ProductReviewPayload) => reviewsApi.create(productId, payload),
    onSuccess: () => invalidateProductAndReviews(queryClient, productId),
  })
}

export function useUpdateReviewMutation(productId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ reviewId, payload }: { reviewId: string; payload: ProductReviewPayload }) =>
      reviewsApi.update(productId, reviewId, payload),
    onSuccess: () => invalidateProductAndReviews(queryClient, productId),
  })
}

export function useDeleteReviewMutation(productId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (reviewId: string) => reviewsApi.remove(productId, reviewId),
    onSuccess: () => invalidateProductAndReviews(queryClient, productId),
  })
}

export function upsertReviewInCache(
  queryClient: ReturnType<typeof useQueryClient>,
  productId: string,
  review: ProductReview,
  mode: 'prepend' | 'replace',
) {
  queryClient.setQueriesData(
    { queryKey: [...reviewsQueryKeyRoot, productId] },
    (prev: { items: ProductReview[]; totalElements: number; page: number; size: number } | undefined) => {
      if (!prev) return prev
      const idx = prev.items.findIndex((item) => item.id === review.id)
      if (mode === 'replace' || idx >= 0) {
        if (idx < 0) {
          return {
            ...prev,
            items: [review, ...prev.items],
            totalElements: prev.totalElements + 1,
          }
        }
        const items = [...prev.items]
        items[idx] = review
        return { ...prev, items }
      }
      return {
        ...prev,
        items: [review, ...prev.items],
        totalElements: prev.totalElements + 1,
      }
    },
  )
}

export function removeReviewFromCache(
  queryClient: ReturnType<typeof useQueryClient>,
  productId: string,
  reviewId: string,
) {
  queryClient.setQueriesData(
    { queryKey: [...reviewsQueryKeyRoot, productId] },
    (prev: { items: ProductReview[]; totalElements: number; page: number; size: number } | undefined) => {
      if (!prev) return prev
      const items = prev.items.filter((item) => item.id !== reviewId)
      if (items.length === prev.items.length) return prev
      return {
        ...prev,
        items,
        totalElements: Math.max(0, prev.totalElements - 1),
      }
    },
  )
}
