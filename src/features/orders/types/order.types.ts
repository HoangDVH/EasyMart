export type OrderItem = {
  productId: string
  productName: string
  unitPrice: number
  quantity: number
  sellerEmail: string | null
}

/** Backend tự free-form, FE chỉ hiển thị; map nhãn ở UI khi cần. */
export type OrderStatus = string

export type Order = {
  id: string
  userEmail: string
  items: OrderItem[]
  totalAmount: number
  status: OrderStatus
  createdAt: string | null
}

export type CreateOrderPayload = {
  items: { productId: string; quantity: number }[]
}
