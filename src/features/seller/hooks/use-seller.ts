import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { sellerApi, type SellerProductPayload } from '@/features/seller/api/seller.api'

export const sellerQueryKeyRoot = ['seller'] as const

const sellerProductsQueryKey = [...sellerQueryKeyRoot, 'products'] as const
const sellerOrdersHistoryQueryKey = [...sellerQueryKeyRoot, 'orders-history'] as const

export function useSellerProductsQuery(enabled = true) {
  return useQuery({
    queryKey: sellerProductsQueryKey,
    queryFn: () => sellerApi.listMyProducts(),
    enabled,
    staleTime: 30 * 1000,
  })
}

export function useSellerOrderHistoryQuery(enabled = true) {
  return useQuery({
    queryKey: sellerOrdersHistoryQueryKey,
    queryFn: () => sellerApi.sellerOrderHistory(),
    enabled,
    staleTime: 30 * 1000,
  })
}

export function useCreateSellerProductMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: SellerProductPayload) => sellerApi.createProduct(payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: sellerProductsQueryKey })
    },
  })
}

export function useUpdateSellerProductMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ productId, payload }: { productId: string; payload: SellerProductPayload }) =>
      sellerApi.updateProduct(productId, payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: sellerProductsQueryKey })
    },
  })
}

export function useDeleteSellerProductMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (productId: string) => sellerApi.deleteProduct(productId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: sellerProductsQueryKey })
    },
  })
}

export function useUploadSellerImagesMutation() {
  return useMutation({
    mutationFn: (files: File[]) => sellerApi.uploadImages(files),
  })
}
