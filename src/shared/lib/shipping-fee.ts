/** Khớp `ShippingFeeCalculator` trên backend. */
export const FREE_SHIPPING_THRESHOLD = 500_000
export const STANDARD_SHIPPING_FEE = 30_000

export function calculateShippingFee(subtotal: number): number {
  if (subtotal < 0) return STANDARD_SHIPPING_FEE
  return subtotal < FREE_SHIPPING_THRESHOLD ? STANDARD_SHIPPING_FEE : 0
}

export function isFreeShipping(subtotal: number): boolean {
  return calculateShippingFee(subtotal) === 0
}
