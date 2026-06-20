import { useMutation } from '@tanstack/react-query'
import { paymentsApi } from '@/features/payments/api/payments.api'
import type { CreatePaymentPayload } from '@/features/payments/types/payment.types'

export function useCreatePaymentMutation() {
  return useMutation({
    mutationFn: (payload: CreatePaymentPayload) => paymentsApi.create(payload),
  })
}
