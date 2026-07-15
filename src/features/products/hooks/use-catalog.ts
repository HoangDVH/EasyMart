import { useQuery, type QueryClient } from '@tanstack/react-query'
import { categoriesApi } from '@/features/products/api/categories.api'
import { productsApi } from '@/features/products/api/products.api'
import type { ProductListParams } from '@/features/products/types/product.types'

export { useCreateOrderMutation } from '@/features/orders/hooks/use-orders'

export const productsQueryKeyRoot = ['products'] as const
export const categoriesQueryKey = ['categories'] as const

export function getProductsQueryKey(params: ProductListParams) {
  return [
    ...productsQueryKeyRoot,
    params.page,
    params.size,
    params.keyword ?? '',
    params.categoryId ?? '',
    params.brandId ?? '',
    params.isFeatured ?? '',
    params.minPrice ?? '',
    params.maxPrice ?? '',
    params.minRating ?? '',
    params.inStock ?? '',
    params.hasDiscount ?? '',
    params.sort ?? '',
  ] as const
}

export function useProductsQuery(params: ProductListParams) {
  return useQuery({
    queryKey: getProductsQueryKey(params),
    queryFn: ({ signal }) => productsApi.listWindow(params, signal),
    placeholderData: (prev) => prev,
    /** Chuyển qua lại danh mục trong thời gian ngắn dùng luôn cache để mượt hơn. */
    staleTime: 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
  })
}

export function prefetchProductList(queryClient: QueryClient, params: ProductListParams) {
  void queryClient.prefetchQuery({
    queryKey: getProductsQueryKey(params),
    queryFn: ({ signal }) => productsApi.listWindow(params, signal),
    staleTime: 60 * 1000,
  })
}

export function useProductQuery(
  productId: string | null,
  options?: { enabled?: boolean },
) {
  const enabledOverride = options?.enabled ?? true
  return useQuery({
    queryKey: ['product', productId ?? ''],
    queryFn: () => productsApi.getById(productId!),
    enabled: Boolean(productId) && enabledOverride,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  })
}

export function useCategoriesQuery() {
  return useQuery({
    queryKey: categoriesQueryKey,
    queryFn: () => categoriesApi.list(),
    staleTime: 5 * 60 * 1000,
  })
}

export function prefetchProductDetail(queryClient: QueryClient, productId: string) {
  void queryClient.prefetchQuery({
    queryKey: ['product', productId],
    queryFn: () => productsApi.getById(productId),
    staleTime: 5 * 60 * 1000,
  })
}

