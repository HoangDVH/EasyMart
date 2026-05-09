export type Product = {
  id: string
  name: string
  description?: string | null
  price?: number | null
  discountPrice?: number | null
  rating?: number | null
  soldCount?: number | null
  /** Backend trả `stock` (int32). Field `stockQuantity` giữ lại làm alias để code cũ không vỡ. */
  stock?: number | null
  stockQuantity?: number | null
  /** Ảnh đại diện (phần tử đầu của `images` hoặc field legacy) — dùng trực tiếp trong `<img src>` khi là URL đầy đủ theo docs API */
  imageUrl?: string | null
  /** `GET /products` trả `images: string[]` — URL dùng trực tiếp trong thẻ img */
  images?: string[]
  categoryId?: string | null
  /** Backend trả `categoryName` từ join — hiển thị thay cho id */
  categoryName?: string | null
  brandId?: string | null
  sellerId?: string | null
  sellerEmail?: string | null
  status?: string | null
  /** Backend dùng `featured: boolean` */
  featured?: boolean | null
  createdAt?: string | null
}

/** Spring Data Page trong field `result` (backend mới: items/totalElements/totalPages/page/size) */
export type SpringPage<T> = {
  content: T[]
  totalElements?: number
  totalPages?: number
  number?: number
  size?: number
}

export type ProductListParams = {
  page: number
  size: number
  /** Tìm theo tên/mô tả (case-insensitive). Backend: `keyword` */
  keyword?: string
  /** Lọc theo danh mục (int64). Backend: `categoryId` */
  categoryId?: number | string
  /** Lọc theo brand (int64). Backend: `brandId` */
  brandId?: number | string
  /** Backend: `isFeatured` — omit = tất cả, true = chỉ nổi bật, false = không nổi bật */
  isFeatured?: boolean
  /** Backend filter theo giá thấp nhất */
  minPrice?: number
  /** Backend filter theo giá cao nhất */
  maxPrice?: number
  /** Backend filter theo đánh giá tối thiểu */
  minRating?: number
  /** Backend filter chỉ sản phẩm còn hàng */
  inStock?: boolean
  /** Backend filter chỉ sản phẩm có giảm giá */
  hasDiscount?: boolean
  /** Định dạng `property,(asc|desc)`, vd: `price,asc` */
  sort?: string
}

export type Category = {
  id: string
  code?: string | null
  name: string
}
