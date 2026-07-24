import type { Product } from '@/features/products/types/product.types'

export type SellerProductFormValues = {
  name: string
  description: string
  price: string
  discountPrice: string
  stock: string
  categoryId: string
  brandId: string
  isFeatured: boolean
  images: string[]
}

export type SellerProductsFilters = {
  keyword: string
  sort: 'newest' | 'name-asc' | 'price-asc' | 'price-desc' | 'stock-asc' | 'stock-desc'
  stockStatus: 'all' | 'in-stock' | 'low-stock' | 'out-of-stock'
  page: number
  pageSize: number
}

/** Ngưỡng cảnh báo sắp hết hàng — đồng bộ với badge trang chi tiết sản phẩm. */
export const LOW_STOCK_THRESHOLD = 5

export function getProductStock(product: Product): number {
  return product.stock ?? product.stockQuantity ?? 0
}

export const defaultSellerProductFormValues: SellerProductFormValues = {
  name: '',
  description: '',
  price: '',
  discountPrice: '',
  stock: '',
  categoryId: '',
  brandId: '1',
  isFeatured: false,
  images: [],
}

export function productToFormValues(product: Product): SellerProductFormValues {
  /** Gửi lại đúng ref gốc từ API — tránh mất ảnh khi chỉ sửa giá. */
  const images =
    product.imageRefs && product.imageRefs.length > 0
      ? [...product.imageRefs]
      : product.images && product.images.length > 0
        ? [...product.images]
        : product.imageUrl
          ? [product.imageUrl]
          : []

  return {
    name: product.name,
    description: product.description ?? '',
    price: product.price != null ? String(product.price) : '',
    discountPrice: product.discountPrice != null ? String(product.discountPrice) : '',
    stock:
      product.stock != null ? String(product.stock) : product.stockQuantity != null ? String(product.stockQuantity) : '',
    categoryId: product.categoryId ?? '',
    brandId: product.brandId ?? '1',
    isFeatured: product.featured ?? false,
    images,
  }
}
