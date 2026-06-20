export type PaymentMethod = 'COD' | 'BANK_TRANSFER'

export type CreatePaymentPayload = {
  orderId: string | number
  method: PaymentMethod
}

export type Payment = {
  id: string
  orderId: string
  method: string
  amount: number
  status: string
  transactionRef: string | null
  createdAt: string | null
}
