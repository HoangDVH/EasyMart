import { useMutation, useQuery } from '@tanstack/react-query'
import { paymentsApi } from '@/features/payments/api/payments.api'
import type {
  CreatePaymentPayload,
  VnpayPaymentInitRequest,
} from '@/features/payments/types/payment.types'

export const paymentsQueryKeyRoot = ['payments'] as const

export function useCreatePaymentMutation() {
  return useMutation({
    mutationFn: (payload: CreatePaymentPayload) => paymentsApi.create(payload),
  })
}

export function useInitVnpayMutation() {
  return useMutation({
    mutationFn: (payload: VnpayPaymentInitRequest) => paymentsApi.initVnpay(payload),
  })
}

export function useMyPaymentsQuery(enabled = true) {
  return useQuery({
    queryKey: [...paymentsQueryKeyRoot, 'mine'],
    queryFn: () => paymentsApi.listMyPayments(),
    enabled,
    staleTime: 30 * 1000,
  })
}

export function useSellerPaymentsQuery(enabled = true) {
  return useQuery({
    queryKey: [...paymentsQueryKeyRoot, 'seller'],
    queryFn: () => paymentsApi.listSellerPayments(),
    enabled,
    staleTime: 30 * 1000,
  })
}
