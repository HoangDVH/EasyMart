import type { Product } from '@/features/products/types/product.types'

export type SellerProductFormValues = {
  name: string
  description: string
  price: string
  discountPrice: string
  stock: string
  rating: string
  categoryId: string
  brandId: string
  isFeatured: boolean
  images: string[]
}

export type SellerProductsFilters = {
  keyword: string
  sort: 'newest' | 'name-asc' | 'price-asc' | 'price-desc' | 'stock-asc' | 'stock-desc'
  stockStatus: 'all' | 'in-stock' | 'out-of-stock'
  page: number
  pageSize: number
}

export const defaultSellerProductFormValues: SellerProductFormValues = {
  name: '',
  description: '',
  price: '',
  discountPrice: '',
  stock: '',
  rating: '',
  categoryId: '',
  brandId: '1',
  isFeatured: false,
  images: [],
}

export function productToFormValues(product: Product): SellerProductFormValues {
  return {
    name: product.name,
    description: product.description ?? '',
    price: product.price != null ? String(product.price) : '',
    discountPrice: product.discountPrice != null ? String(product.discountPrice) : '',
    stock:
      product.stock != null ? String(product.stock) : product.stockQuantity != null ? String(product.stockQuantity) : '',
    rating: product.rating != null ? String(product.rating) : '',
    categoryId: product.categoryId ?? '',
    brandId: product.brandId ?? '1',
    isFeatured: product.featured ?? false,
    images: product.images ?? [],
  }
}
