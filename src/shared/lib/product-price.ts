import type { Product } from '@/features/products/types/product.types'

export function resolveProductUnitPrice(product: Pick<Product, 'price' | 'discountPrice'>) {
  const price = product.price ?? null
  const discount = product.discountPrice ?? null
  if (price != null && discount != null && discount < price) {
    return { unitPrice: discount, originalPrice: price }
  }
  return { unitPrice: price, originalPrice: null as number | null }
}

export function formatVnd(n: number | null | undefined) {
  if (n == null || !Number.isFinite(n)) return '—'
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n)
}
