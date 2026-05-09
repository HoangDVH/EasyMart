import { PRODUCT_ENDPOINTS, PRODUCT_MEDIA } from '@/shared/constants/catalog'
import { httpClient } from '@/shared/api/http-client'
import { env } from '@/shared/config/env'
import type { ApiEnvelope } from '@/shared/types/api-result'
import type { Product, ProductListParams, SpringPage } from '@/features/products/types/product.types'

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : null
}

function toIdString(value: unknown): string | null {
  if (typeof value === 'string' && value.length > 0) return value
  if (typeof value === 'number' && Number.isFinite(value)) return String(value)
  return null
}

function pickNonEmptyString(...candidates: unknown[]): string | null {
  for (const c of candidates) {
    if (typeof c === 'string') {
      const t = c.trim()
      if (t.length > 0) return t
    }
  }
  return null
}

function toNumberOrNull(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null
  if (typeof value === 'string' && value.trim().length > 0) {
    const n = Number(value)
    return Number.isFinite(n) ? n : null
  }
  return null
}

/** Một số endpoint trả `{ product: { ..., images } }` thay vì phẳng */
function unwrapProductRow(raw: Record<string, unknown>): Record<string, unknown> {
  const nested = asRecord(raw.product ?? raw.payload)
  if (
    nested &&
    (toIdString(nested.id ?? nested.productId) != null ||
      typeof nested.name === 'string' ||
      nested.title != null ||
      Array.isArray(nested.images))
  ) {
    return nested
  }
  return raw
}

const UUID_V4ISH = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function assetRoot(): string {
  return (env.PUBLIC_ASSET_BASE_URL?.trim() || env.API_BASE_URL).replace(/\/$/, '')
}

/** Nối tên file / UUID (leaf) với static dir hoặc REST download theo `PRODUCT_MEDIA` */
function productStorageUrl(leaf: string): string {
  const root = assetRoot()
  const api = PRODUCT_MEDIA.downloadApiBase
  const clean = leaf.replace(/^\//, '')
  if (api) {
    return `${root}${api}/${clean}`
  }
  return `${root}${PRODUCT_MEDIA.staticDir}/${clean}`
}

/**
 * URL tuyệt đối, path bắt đầu `/`, UUID, hoặc tên file — nối theo env / `PRODUCT_MEDIA` (đồng bộ docs backend).
 */
function resolveMediaUrl(raw: string): string {
  const u = raw.trim()
  if (u.startsWith('data:image/')) return u
  if (/^https?:\/\//i.test(u)) return u
  if (u.startsWith('//')) return `https:${u}`
  const base = assetRoot()

  if (UUID_V4ISH.test(u)) {
    return productStorageUrl(`${u}.jpg`)
  }

  const strippedExt = u.replace(/\.(jpe?g|png|webp|gif|bmp|svg)(\?.*)?$/i, '')
  if (UUID_V4ISH.test(strippedExt) && !u.includes('/')) {
    return productStorageUrl(u)
  }

  if (u.startsWith('/')) return `${base}${u}`
  if (/\.(jpe?g|png|webp|gif|bmp|svg)(\?|#|$)/i.test(u) && !u.includes('://')) {
    return productStorageUrl(u)
  }
  return `${base}/${u.replace(/^\//, '')}`
}

function pickUrlFromNestedRecord(record: Record<string, unknown>): string | null {
  const flat = pickNonEmptyString(
    record.url,
    record.fileUrl,
    record.publicUrl,
    record.downloadUrl,
    record.presignedUrl,
    record.href,
    record.link,
    record.path,
    record.src,
    record.imageUrl,
    record.thumbnailUrl,
    record.filePath,
    typeof record.objectKey === 'string' && !UUID_V4ISH.test(String(record.objectKey).trim())
      ? record.objectKey
      : undefined,
  )
  return flat ? resolveMediaUrl(flat) : null
}

function looksLikeMediaPath(s: string): boolean {
  const t = s.trim()
  if (/^data:image\//i.test(t)) return true
  if (/^https?:\/\//i.test(t)) return true
  if (t.startsWith('//')) return true
  if (t.startsWith('/') && t.length > 2) return true
  if (/\.(webp|jpeg|jpg|png|gif|svg|bmp)(\?|#|$)/i.test(t)) return true
  return false
}

/** Bắt field kiểu `productImage`, `thumbnailFile` chứa chuỗi URL/path */
function scrapeLooseMediaStrings(raw: Record<string, unknown>): string | null {
  for (const [key, val] of Object.entries(raw)) {
    if (typeof val !== 'string') continue
    if (!/[a-z]*(image|img|thumb|photo|banner|cover|avatar|picture|media|cdn|attach|picture|filepath)[a-z]*/i.test(key)) continue
    if (!looksLikeMediaPath(val)) continue
    return resolveMediaUrl(val.trim())
  }
  return null
}

function pickFirstStringUrlFromArray(arr: unknown): string | null {
  if (!Array.isArray(arr)) return null
  for (const entry of arr) {
    if (typeof entry === 'string' && looksLikeMediaPath(entry)) return resolveMediaUrl(entry.trim())
    const row = asRecord(entry)
    if (row) {
      const nested = pickUrlFromNestedRecord(row)
      if (nested) return nested
    }
  }
  return null
}

function pickNestedImageObjects(raw: Record<string, unknown>): string | null {
  const nestedKeys = [
    'primaryImage',
    'primary_image',
    'thumbnail',
    'thumbnailImage',
    'cover',
    'coverImage',
    'cover_image',
    'mainImage',
    'main_image',
    'featuredImage',
    'imageFile',
    'image_file',
    'file',
    'attachment',
    'document',
    'photo',
    'picture',
    'multimedia',
    'resource',
    'avatar',
    'banner',
    'featuredMedia',
  ]
  for (const key of nestedKeys) {
    const val = raw[key]
    const row = asRecord(val)
    if (row) {
      const u = pickUrlFromNestedRecord(row)
      if (u) return u
    }
    if (typeof val === 'string' && looksLikeMediaPath(val)) return resolveMediaUrl(val.trim())
  }
  return null
}

/** Docs API: `product.images` là mảng URL — dùng trực tiếp trong `<img src>`; path tương đối vẫn nối `assetRoot`. */
function normalizedProductImages(raw: Record<string, unknown>): string[] {
  const imagesEarly = raw.images
  if (!Array.isArray(imagesEarly)) return []
  const out: string[] = []
  for (const entry of imagesEarly) {
    if (typeof entry !== 'string') continue
    const t = entry.trim()
    if (!t.length) continue
    out.push(resolveMediaUrl(t))
  }
  return out
}

export function pickImageUrl(raw: Record<string, unknown>): string | null {
  const fromImages = normalizedProductImages(raw)
  if (fromImages.length > 0) return fromImages[0]

  const flat = pickNonEmptyString(
    raw.imageUrl,
    raw.mainImageUrl,
    raw.thumbnailImageUrl,
    raw.thumbnailUrl,
    raw.previewUrl,
    raw.image,
    raw.coverImage,
    typeof raw.image !== 'object' ? raw.image : undefined,
    raw.mainImage,
    raw.storedFileName,
    raw.fileName,
    raw.originalFilename,
    raw.imageKey,
    raw.photoUrl,
    typeof raw.picture !== 'object' ? raw.picture : undefined,
    raw.bannerUrl,
    raw.avatarUrl,
    raw.coverUrl,
    raw.photo,
    raw.image_url,
    raw.thumbnail_url,
    raw.cover_image,
    raw.main_image,
    raw.imageLink,
    raw.imageHref,
    raw.displayImage,
  )
  if (flat) return resolveMediaUrl(flat)

  const pathish = pickNonEmptyString(
    raw.imagePath,
    raw.filePath,
    raw.mediaPath,
    raw.image_path,
    raw.storagePath,
    raw.objectKey,
  )
  if (pathish) return resolveMediaUrl(pathish)

  const nested = pickNestedImageObjects(raw)
  if (nested) return nested

  const arrayKeys = [
    raw.images,
    raw.imageUrls,
    raw.photoUrls,
    raw.pictures,
    raw.thumbnails,
    raw.attachments,
    raw.gallery,
    raw.mediaFiles,
    raw.files,
    raw.resources,
    raw.productImages,
  ]
  for (const ak of arrayKeys) {
    const u = pickFirstStringUrlFromArray(ak)
    if (u) return u
  }

  const media = asRecord(raw.media ?? raw.cover ?? raw.coverMedia)
  if (media) {
    const fromMedia =
      pickUrlFromNestedRecord(media) ?? pickNestedImageObjects(media) ?? pickFirstStringUrlFromArray(media.items)
    if (fromMedia) return fromMedia
  }

  const scrape = scrapeLooseMediaStrings(raw)
  if (scrape) return scrape

  return null
}

function coerceProduct(raw: Record<string, unknown>): Product | null {
  const row = unwrapProductRow(raw)
  const id = toIdString(row.id ?? row.productId)
  const nameRaw = row.name ?? row.title ?? row.productName
  const name = typeof nameRaw === 'string' ? nameRaw : null
  if (!id || !name) return null
  const images = normalizedProductImages(row)
  const imageUrl = images[0] ?? pickImageUrl({ ...row, images: [] })
  return {
    id,
    name,
    description: typeof row.description === 'string' ? row.description : null,
    price: toNumberOrNull(row.price),
    discountPrice: (() => {
      const candidate = row.discountPrice ?? row.salePrice ?? row.promoPrice ?? row.finalPrice ?? row.discount_price
      const n = toNumberOrNull(candidate)
      const base = toNumberOrNull(row.price)
      if (n == null) return null
      if (base != null && n >= base) return null
      return n
    })(),
    rating: (() => {
      const candidate = row.rating ?? row.averageRating ?? row.avgRating ?? row.rate
      const n = toNumberOrNull(candidate)
      if (n == null) return null
      return Math.max(0, Math.min(5, n))
    })(),
    soldCount: (() => {
      const candidate = row.soldCount ?? row.sold ?? row.totalSold ?? row.salesCount ?? row.orderCount
      const n = toNumberOrNull(candidate)
      if (n == null) return null
      return n < 0 ? null : Math.round(n)
    })(),
    stock: (() => {
      const candidate = row.stock ?? row.stockQuantity ?? row.quantityInStock ?? row.inventory
      const n = toNumberOrNull(candidate)
      return n == null ? null : n
    })(),
    stockQuantity: (() => {
      const candidate = row.stock ?? row.stockQuantity ?? row.quantityInStock ?? row.inventory
      const n = toNumberOrNull(candidate)
      return n == null ? null : n
    })(),
    imageUrl,
    ...(images.length > 0 ? { images } : {}),
    categoryId: toIdString(row.categoryId),
    categoryName: typeof row.categoryName === 'string' ? row.categoryName : null,
    brandId: toIdString(row.brandId),
    sellerId: toIdString(row.sellerId),
    sellerEmail: typeof row.sellerEmail === 'string' ? row.sellerEmail : null,
    featured:
      typeof row.featured === 'boolean'
        ? row.featured
        : typeof row.isFeatured === 'boolean'
          ? row.isFeatured
          : null,
    status: typeof row.status === 'string' ? row.status : null,
    createdAt: typeof row.createdAt === 'string' ? row.createdAt : null,
  }
}

function firstArray(values: Record<string, unknown>, keys: string[]): unknown[] | null {
  for (const k of keys) {
    const v = values[k]
    if (Array.isArray(v)) return v
  }
  return null
}

function parsePageEnvelope<T>(result: unknown, mapItem: (row: Record<string, unknown>) => T | null): SpringPage<T> {
  if (Array.isArray(result)) {
    const content = result.map((row) => asRecord(row)).filter(Boolean) as Record<string, unknown>[]
    const mapped = content.map((row) => mapItem(unwrapProductRow(row))).filter(Boolean) as T[]
    return { content: mapped, totalElements: mapped.length, totalPages: 1, number: 0, size: mapped.length }
  }
  const obj = asRecord(result)
  if (!obj) return { content: [] }
  const contentRaw = firstArray(obj, ['items', 'content', 'data', 'results', 'products', 'records'])
  if (!contentRaw) return { content: [] }
  const content = contentRaw
    .map((row) => asRecord(row))
    .filter(Boolean) as Record<string, unknown>[]
  const mapped = content.map((row) => mapItem(unwrapProductRow(row))).filter(Boolean) as T[]
  const pageIndex =
    typeof obj.page === 'number'
      ? obj.page
      : typeof obj.number === 'number'
        ? obj.number
        : typeof obj.pageIndex === 'number'
          ? obj.pageIndex
          : 0
  const pageSize =
    typeof obj.size === 'number'
      ? obj.size
      : typeof obj.pageSize === 'number'
        ? obj.pageSize
        : typeof obj.limit === 'number'
          ? obj.limit
          : mapped.length

  return {
    content: mapped,
    totalElements: typeof obj.totalElements === 'number' ? obj.totalElements : mapped.length,
    totalPages: typeof obj.totalPages === 'number' ? obj.totalPages : 1,
    number: pageIndex,
    size: pageSize,
  }
}

export const productsApi = {
  async list(params: ProductListParams) {
    const trimmedKeyword = params.keyword?.trim()
    const { data } = await httpClient.get<ApiEnvelope<unknown>>(PRODUCT_ENDPOINTS.list, {
      params: {
        page: params.page,
        size: params.size,
        ...(trimmedKeyword ? { keyword: trimmedKeyword } : {}),
        ...(params.categoryId != null && String(params.categoryId).length > 0
          ? { categoryId: params.categoryId }
          : {}),
        ...(params.brandId != null && String(params.brandId).length > 0
          ? { brandId: params.brandId }
          : {}),
        ...(typeof params.isFeatured === 'boolean' ? { isFeatured: params.isFeatured } : {}),
        ...(typeof params.minPrice === 'number' && Number.isFinite(params.minPrice)
          ? { minPrice: Math.max(0, Math.floor(params.minPrice)) }
          : {}),
        ...(typeof params.maxPrice === 'number' && Number.isFinite(params.maxPrice)
          ? { maxPrice: Math.max(0, Math.floor(params.maxPrice)) }
          : {}),
        ...(typeof params.minRating === 'number' && Number.isFinite(params.minRating)
          ? { minRating: Math.max(0, Math.min(5, params.minRating)) }
          : {}),
        ...(typeof params.inStock === 'boolean' ? { inStock: params.inStock } : {}),
        ...(typeof params.hasDiscount === 'boolean' ? { hasDiscount: params.hasDiscount } : {}),
        ...(params.sort ? { sort: params.sort } : {}),
      },
    })
    return parsePageEnvelope(data.result, (row) => coerceProduct(row))
  },

  async getById(id: string) {
    const { data } = await httpClient.get<ApiEnvelope<unknown>>(PRODUCT_ENDPOINTS.byId(id))
    const row = asRecord(data.result)
    if (!row) throw new Error('Dữ liệu sản phẩm không hợp lệ')
    const product = coerceProduct(row)
    if (!product) throw new Error('Không đọc được sản phẩm')
    return product
  },
}
