import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ordersApi } from '@/features/orders/api/orders.api'
import type { CreateOrderPayload } from '@/features/orders/types/order.types'

export const ordersQueryKeyRoot = ['orders'] as const

export function useMyOrdersQuery(enabled = true) {
  return useQuery({
    queryKey: [...ordersQueryKeyRoot, 'mine'],
    queryFn: () => ordersApi.listMyOrders(),
    enabled,
    staleTime: 30 * 1000,
  })
}

export function useOrderQuery(id: string | null) {
  return useQuery({
    queryKey: [...ordersQueryKeyRoot, 'detail', id ?? ''],
    queryFn: () => ordersApi.getById(id as string),
    enabled: Boolean(id),
  })
}

export function useCreateOrderMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: CreateOrderPayload) => ordersApi.create(payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ordersQueryKeyRoot })
    },
  })
}
