import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { sellerApi, type SellerProductPayload } from '@/features/seller/api/seller.api'
import type { Order } from '@/features/orders/types/order.types'

export const sellerQueryKeyRoot = ['seller'] as const

const sellerProductsQueryKey = [...sellerQueryKeyRoot, 'products'] as const
export const sellerOrdersHistoryQueryKey = [...sellerQueryKeyRoot, 'orders-history'] as const

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

export function useUpdateSellerOrderStatusMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ orderId, status }: { orderId: string; status: string }) =>
      sellerApi.updateSellerStatus(orderId, status),
    /** Cập nhật cache ngay sau khi API thành công — không đợi refetch. */
    onSuccess: (updatedOrder, { orderId, status }) => {
      queryClient.setQueryData<Order[]>(sellerOrdersHistoryQueryKey, (prev) => {
        if (!prev) return prev
        return prev.map((order) => {
          if (order.id !== orderId) return order
          if (updatedOrder) return updatedOrder
          return {
            ...order,
            items: order.items.map((item) => ({ ...item, fulfillmentStatus: status })),
          }
        })
      })
    },
  })
}
