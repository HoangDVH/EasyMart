export type PaymentMethod = 'COD' | 'VNPAY'

export type CreatePaymentPayload = {
  orderId: string | number
  method: 'COD' | 'CASH'
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

export type VnpayPaymentInitRequest = {
  orderId: string | number
}

export type VnpayPaymentInitResponse = {
  paymentId: string
  orderId: string
  amount: number
  status: string
  transactionRef: string | null
  paymentUrl: string
}
