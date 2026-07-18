export type OrderItem = {
  productId: string
  productName: string
  unitPrice: number
  quantity: number
  sellerEmail: string | null
  /** Trạng thái giao hàng phía seller: AWAITING_CONFIRMATION → ... → DELIVERED */
  fulfillmentStatus: string | null
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
  /**
   * Phương thức thanh toán nếu backend trả về (COD/CASH/VNPAY…).
   * COD thường vẫn có status=PAID để seller được phép giao — UI phải phân biệt.
   */
  paymentMethod: string | null
}

export type CreateOrderPayload = {
  items: { productId: string; quantity: number }[]
}
