/** Backend có thể dùng prefix khác (`/products`). Mặc định Swagger kiểu `/api/v1/products`. */
const PRODUCTS_BASE = `${String(import.meta.env.VITE_PRODUCTS_API_BASE ?? '/api/v1/products').trim().replace(/\/$/, '')}`

export const PRODUCT_ENDPOINTS = {
  list: PRODUCTS_BASE,
  byId: (id: string) => `${PRODUCTS_BASE}/${id}`,
  /** POST multipart, Bearer — response `result.urls` (theo docs backend) */
  uploadImages: `${PRODUCTS_BASE}/images`,
} as const

/**
 * Chỉnh theo Swagger backend sau khi đổi upload / ResourceHandler.
 * Ví dụ static: `/files/product-images` — ví dụ qua REST: set `downloadApiBase` = `/api/v1/files`.
 */
export const PRODUCT_MEDIA = {
  /** Thư mục ảnh trên server (chuỗi bắt đầu bằng /, không slash cuối) */
  staticDir: (import.meta.env.VITE_PRODUCT_IMAGES_STATIC_DIR ?? '/files/product-images').replace(/\/$/, ''),
  /**
   * Nếu ảnh chỉ lấy qua API (vd `GET /api/v1/files/{name}`) thì set path gốc, vd `/api/v1/files`.
   * Khi có giá trị, tên/UUID file thường nối vào đây thay vì `staticDir`.
   */
  downloadApiBase: String(import.meta.env.VITE_PRODUCT_IMAGE_DOWNLOAD_API ?? '').trim().replace(/\/$/, ''),
} as const

export const ORDER_ENDPOINTS = {
  /** Backend có thể dùng path khác — chỉnh theo Swagger */
  create: '/api/v1/orders',
} as const

const CATEGORIES_BASE = `${String(import.meta.env.VITE_CATEGORIES_API_BASE ?? '/api/v1/categories').trim().replace(/\/$/, '')}`

export const CATEGORY_ENDPOINTS = {
  list: CATEGORIES_BASE,
  byId: (id: string | number) => `${CATEGORIES_BASE}/${id}`,
} as const
