import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { httpClient } from '@/shared/api/http-client'
import { env } from '@/shared/config/env'
import { PRODUCT_MEDIA } from '@/shared/constants/catalog'
import { useAuthStore } from '@/shared/stores/auth-store'
import { useProfileQuery } from '@/features/auth/hooks/use-auth'
import { getApiErrorMessage } from '@/shared/lib/api-error'
import { cn } from '@/shared/lib/utils'
import { Button } from '@/shared/ui/button'
import { Card, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card'
import { Badge } from '@/shared/ui/badge'
import {
  useCategoriesQuery,
  useProductQuery,
  useProductsQuery,
} from '@/features/products/hooks/use-catalog'
import type { Product } from '@/features/products/types/product.types'
import { Loader2, SlidersHorizontal, Star, X } from 'lucide-react'

const PAGE_SIZE = 8

type PriceFilterKey = 'all' | 'under-5m' | '5m-10m' | '10m-20m' | 'over-20m'
type SortFilterKey = 'default' | 'price-asc' | 'price-desc' | 'rating-desc' | 'discount-desc'
type FeaturedFilterKey = 'all' | 'featured' | 'non-featured'

const PRICE_OPTIONS: { key: PriceFilterKey; label: string }[] = [
  { key: 'all', label: 'Tất cả' },
  { key: 'under-5m', label: 'Dưới 5 triệu' },
  { key: '5m-10m', label: '5 - 10 triệu' },
  { key: '10m-20m', label: '10 - 20 triệu' },
  { key: 'over-20m', label: 'Trên 20 triệu' },
]

function mapPriceRange(filter: PriceFilterKey): { minPrice?: number; maxPrice?: number } {
  switch (filter) {
    case 'under-5m':
      return { maxPrice: 5_000_000 }
    case '5m-10m':
      return { minPrice: 5_000_000, maxPrice: 10_000_000 }
    case '10m-20m':
      return { minPrice: 10_000_000, maxPrice: 20_000_000 }
    case 'over-20m':
      return { minPrice: 20_000_000 }
    default:
      return {}
  }
}

/** Map sort UI → query string `sort` của backend (Spring Pageable). `discount-desc` không có cột tương ứng nên xử lý client-side. */
function mapSortToBackend(sort: SortFilterKey): string | undefined {
  switch (sort) {
    case 'price-asc':
      return 'price,asc'
    case 'price-desc':
      return 'price,desc'
    case 'rating-desc':
      return 'rating,desc'
    case 'default':
      return 'createdAt,desc'
    default:
      return undefined
  }
}

function formatVnd(n: number | null | undefined) {
  if (n == null || !Number.isFinite(n)) return '—'
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n)
}

function displayPrice(product: Product): { current: number | null; original: number | null; discountPercent: number | null } {
  const price = product.price ?? null
  const discount = product.discountPrice ?? null
  if (price != null && discount != null && discount < price) {
    const pct = Math.max(1, Math.round(((price - discount) / price) * 100))
    return { current: discount, original: price, discountPercent: pct }
  }
  return { current: price, original: null, discountPercent: null }
}

function formatRating(value: number | null | undefined) {
  if (value == null || !Number.isFinite(value)) return null
  return value.toFixed(1)
}

function formatSoldCount(value: number | null | undefined) {
  if (value == null || !Number.isFinite(value) || value < 0) return null
  return new Intl.NumberFormat('vi-VN', { notation: 'compact', maximumFractionDigits: 1 }).format(value)
}

function assetHostnames(): string[] {
  const out = new Set<string>()
  for (const candidate of [env.API_BASE_URL, env.PUBLIC_ASSET_BASE_URL]) {
    const s = typeof candidate === 'string' ? candidate.trim() : ''
    if (!s.length) continue
    try {
      out.add(new URL(s).hostname)
    } catch {
      /* bỏ qua base không parse được */
    }
  }
  return [...out]
}

function isLikelyBinaryAssetUrl(url: string): boolean {
  let path = ''
  try {
    path = new URL(url).pathname
  } catch {
    path = url
  }
  const p = path.toLowerCase()
  if (p.includes('/files/')) return true
  if (p.includes('/products/images')) return true
  if (p.includes('product-images')) return true
  if (/\.(webp|jpe?g|png|gif|bmp|svg)(\?|$)/i.test(p)) return true
  const apiBase = PRODUCT_MEDIA.downloadApiBase
  if (apiBase.length > 0 && p.includes(apiBase.toLowerCase())) return true
  return false
}

function needsAuthBlobLoad(url: string): boolean {
  if (!isLikelyBinaryAssetUrl(url)) return false
  try {
    return assetHostnames().includes(new URL(url).hostname)
  } catch {
    return false
  }
}

async function fetchImageBlobWithAuth(imageUrl: string): Promise<{ ok: boolean; blobUrl?: string }> {
  try {
    const res = await httpClient.get(imageUrl, { responseType: 'blob' })
    const ct = String(res.headers['content-type'] ?? '').toLowerCase()
    if (!ct.startsWith('image/')) return { ok: false }
    return { ok: true, blobUrl: URL.createObjectURL(res.data) }
  } catch {
    return { ok: false }
  }
}

function ProductImage({ product, className }: { product: Product; className?: string }) {
  const [broken, setBroken] = useState(false)
  const [blobSrc, setBlobSrc] = useState<string | null>(null)
  const blobSrcRef = useRef<string | null>(null)
  const imageUrl = product.imageUrl ?? null
  const tryBlobOnError = imageUrl ? needsAuthBlobLoad(imageUrl) : false

  useEffect(() => {
    setBroken(false)
    if (blobSrcRef.current) {
      URL.revokeObjectURL(blobSrcRef.current)
      blobSrcRef.current = null
    }
    setBlobSrc(null)
  }, [product.id, imageUrl])

  useEffect(() => {
    return () => {
      if (blobSrcRef.current) URL.revokeObjectURL(blobSrcRef.current)
    }
  }, [])

  const displaySrc = blobSrc ?? imageUrl

  const onImgError = () => {
    if (!imageUrl || blobSrc || !tryBlobOnError) {
      setBroken(true)
      return
    }
    void (async () => {
      const { ok, blobUrl } = await fetchImageBlobWithAuth(imageUrl)
      if (!ok || !blobUrl) {
        setBroken(true)
        return
      }
      if (blobSrcRef.current) URL.revokeObjectURL(blobSrcRef.current)
      blobSrcRef.current = blobUrl
      setBlobSrc(blobUrl)
      setBroken(false)
    })()
  }

  if (!displaySrc || broken) {
    return (
      <div
        className={cn(
          'flex w-full items-center justify-center bg-transparent py-6 text-xs text-muted-foreground',
          className,
        )}
      >
        Không có ảnh
      </div>
    )
  }

  return (
    <img
      src={displaySrc}
      alt=""
      className={cn('block', className)}
      loading="lazy"
      onError={tryBlobOnError ? onImgError : () => setBroken(true)}
    />
  )
}

function ProductCatalogCard({
  product,
  onOpenDetail,
}: {
  product: Product
  onOpenDetail: (id: string) => void
}) {
  const needsDetailImage = !product.imageUrl
  const detailForImage = useProductQuery(product.id, { enabled: needsDetailImage })
  const merged: Product =
    needsDetailImage && detailForImage.data?.imageUrl
      ? {
          ...product,
          imageUrl: detailForImage.data.imageUrl,
          images: detailForImage.data.images ?? product.images,
        }
      : product

  return (
    <Card
      className="group cursor-pointer overflow-hidden border-border/60 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary/10"
      onClick={() => onOpenDetail(product.id)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onOpenDetail(product.id)
        }
      }}
      role="button"
      tabIndex={0}
    >
      <div className="px-3 pt-3">
        <div className="relative isolate h-48 w-full shrink-0 overflow-hidden rounded-lg bg-gradient-to-br from-muted/70 via-background to-muted/40 md:h-52">
        {needsDetailImage && detailForImage.isPending ? (
          <div className="absolute inset-0 animate-pulse bg-muted/80" />
        ) : (
          <ProductImage
            product={merged}
            className="pointer-events-none h-full w-full object-contain object-center"
          />
        )}
        {product.featured ? (
          <Badge className="absolute left-2 top-2 z-[1] border-secondary/30 bg-secondary text-secondary-foreground shadow-sm">
            <Star className="mr-1 h-3.5 w-3.5 fill-current text-secondary-foreground" />
            Nổi bật
          </Badge>
        ) : null}
      </div>
      </div>
      <CardHeader className="space-y-2 pb-3">
        <CardTitle className="line-clamp-2 text-base leading-snug">{product.name}</CardTitle>
        <CardDescription className="space-y-2">
          {(() => {
            const price = displayPrice(product)
            const rating = formatRating(product.rating)
            const soldCount = formatSoldCount(product.soldCount)
            return (
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-lg font-semibold text-primary">{formatVnd(price.current)}</span>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  {price.original != null ? <span className="text-muted-foreground line-through">{formatVnd(price.original)}</span> : null}
                  {price.discountPercent != null ? (
                    <span className="rounded-md bg-secondary/10 px-1.5 py-0.5 text-xs font-semibold text-secondary">
                      -{price.discountPercent}%
                    </span>
                  ) : null}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {rating ? (
                    <span className="inline-flex w-fit items-center text-xs font-medium text-amber-700">
                      <Star className="mr-1 h-3.5 w-3.5 fill-amber-400 text-amber-500" />
                      {rating}
                    </span>
                  ) : null}
                  {rating && soldCount ? <span className="text-xs text-muted-foreground">•</span> : null}
                  {soldCount ? <span className="text-xs text-muted-foreground">Đã bán {soldCount}</span> : null}
                  {product.categoryName ? (
                    <Badge className="border-border/60 bg-muted/40 text-foreground">
                      {product.categoryName}
                    </Badge>
                  ) : null}
                </div>
              </div>
            )
          })()}
        </CardDescription>
      </CardHeader>
    </Card>
  )
}

export function ProductCatalog() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const accessToken = useAuthStore((state) => state.accessToken)
  const { data: profile } = useProfileQuery(Boolean(accessToken))
  const [page, setPage] = useState(0)
  const [priceFilter, setPriceFilter] = useState<PriceFilterKey>('all')
  const [sortFilter, setSortFilter] = useState<SortFilterKey>('default')
  const [minRatingFilter, setMinRatingFilter] = useState(0)
  const [onlyDiscountFilter, setOnlyDiscountFilter] = useState(false)
  const [onlyInStockFilter, setOnlyInStockFilter] = useState(false)
  const [featuredFilter, setFeaturedFilter] = useState<FeaturedFilterKey>('all')
  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false)

  /** Keyword + categoryId là nguồn URL → state (header-search và category-nav cập nhật URL). */
  const keyword = searchParams.get('keyword')?.trim() ?? ''
  const categoryFilter = searchParams.get('categoryId') ?? 'all'

  const categoriesQuery = useCategoriesQuery()
  const categories = categoriesQuery.data ?? []
  const activeCategoryName = useMemo(() => {
    if (categoryFilter === 'all') return null
    return categories.find((c) => c.id === categoryFilter)?.name ?? null
  }, [categories, categoryFilter])

  const isFeaturedParam: boolean | undefined =
    featuredFilter === 'featured' ? true : featuredFilter === 'non-featured' ? false : undefined
  const { minPrice, maxPrice } = mapPriceRange(priceFilter)
  const minRating = minRatingFilter > 0 ? minRatingFilter : undefined

  const listQuery = useProductsQuery({
    page,
    size: PAGE_SIZE,
    keyword: keyword || undefined,
    categoryId: categoryFilter !== 'all' ? categoryFilter : undefined,
    isFeatured: isFeaturedParam,
    minPrice,
    maxPrice,
    minRating,
    inStock: onlyInStockFilter || undefined,
    hasDiscount: onlyDiscountFilter || undefined,
    sort: mapSortToBackend(sortFilter),
  })

  const setCategoryFilter = (value: string) => {
    const next = new URLSearchParams(searchParams)
    if (!value || value === 'all') next.delete('categoryId')
    else next.set('categoryId', value)
    setSearchParams(next, { replace: true })
  }

  const clearKeyword = () => {
    const next = new URLSearchParams(searchParams)
    next.delete('keyword')
    setSearchParams(next, { replace: true })
  }

  const pageData = listQuery.data
  const totalPages = Math.max(1, pageData?.totalPages ?? 1)
  /** Giữ data cũ bằng placeholderData, nên dùng overlay skeleton khi đang fetch bộ lọc mới. */
  const showTransitionSkeleton = listQuery.isFetching && listQuery.isPlaceholderData

  const filteredProducts = useMemo(() => {
    const rows = [...(pageData?.content ?? [])]
    /** `discount-desc` không có cột backend tương ứng — sort cục bộ theo trang hiện tại. */
    if (sortFilter === 'discount-desc') {
      rows.sort((a, b) => (displayPrice(b).discountPercent ?? 0) - (displayPrice(a).discountPercent ?? 0))
    }
    return rows
  }, [pageData?.content, sortFilter])

  const activeFilterCount = useMemo(() => {
    let count = 0
    if (priceFilter !== 'all') count += 1
    if (onlyDiscountFilter) count += 1
    if (onlyInStockFilter) count += 1
    if (minRatingFilter > 0) count += 1
    if (categoryFilter !== 'all') count += 1
    if (featuredFilter !== 'all') count += 1
    if (sortFilter !== 'default') count += 1
    return count
  }, [priceFilter, onlyDiscountFilter, onlyInStockFilter, minRatingFilter, categoryFilter, featuredFilter, sortFilter])

  const resetFilters = () => {
    setPriceFilter('all')
    setSortFilter('default')
    setMinRatingFilter(0)
    setOnlyDiscountFilter(false)
    setOnlyInStockFilter(false)
    setCategoryFilter('all')
    setFeaturedFilter('all')
  }

  useEffect(() => {
    if (!isFilterSheetOpen) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previous
    }
  }, [isFilterSheetOpen])

  /** Reset về trang 0 mỗi khi đổi filter để không bị lệch trang. */
  useEffect(() => {
    setPage(0)
  }, [keyword, categoryFilter, featuredFilter, sortFilter, priceFilter, onlyDiscountFilter, onlyInStockFilter, minRatingFilter])

  const openDetail = (id: string) => navigate(`/products/${id}`)

  const renderFilterPanel = (mobile = false) => (
    <div className={cn('rounded-xl border bg-background p-3 sm:p-4', mobile && 'border-none p-0')}>
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold">Bộ lọc sản phẩm</h3>
        <Button type="button" variant="ghost" size="sm" onClick={resetFilters} disabled={activeFilterCount === 0}>
          Reset
        </Button>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {PRICE_OPTIONS.map((x) => (
          <button
            key={x.key}
            type="button"
            onClick={() => setPriceFilter(x.key)}
            className={cn(
              'rounded-full border px-3 py-1.5 text-xs transition sm:text-sm',
              priceFilter === x.key ? 'border-primary bg-primary/10 text-primary' : 'border-border hover:border-primary/40',
            )}
          >
            {x.label}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setOnlyDiscountFilter((v) => !v)}
          className={cn(
            'rounded-full border px-3 py-1.5 text-xs transition sm:text-sm',
            onlyDiscountFilter ? 'border-primary bg-primary/10 text-primary' : 'border-border hover:border-primary/40',
          )}
        >
          Đang giảm giá
        </button>
        <button
          type="button"
          onClick={() => setOnlyInStockFilter((v) => !v)}
          className={cn(
            'rounded-full border px-3 py-1.5 text-xs transition sm:text-sm',
            onlyInStockFilter ? 'border-primary bg-primary/10 text-primary' : 'border-border hover:border-primary/40',
          )}
        >
          Còn hàng
        </button>
      </div>

      <div className="mt-3 grid gap-2">
        <select
          value={minRatingFilter}
          onChange={(e) => setMinRatingFilter(Number(e.target.value))}
          className="h-10 rounded-md border border-input bg-background px-3 text-sm"
        >
          <option value={0}>Đánh giá: Tất cả</option>
          <option value={3}>Từ 3 sao</option>
          <option value={4}>Từ 4 sao</option>
          <option value={4.5}>Từ 4.5 sao</option>
        </select>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="h-10 rounded-md border border-input bg-background px-3 text-sm"
          disabled={categoriesQuery.isPending}
        >
          <option value="all">
            {categoriesQuery.isPending ? 'Đang tải danh mục…' : 'Danh mục: Tất cả'}
          </option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <select
          value={featuredFilter}
          onChange={(e) => setFeaturedFilter(e.target.value as FeaturedFilterKey)}
          className="h-10 rounded-md border border-input bg-background px-3 text-sm"
        >
          <option value="all">Nổi bật: Tất cả</option>
          <option value="featured">Chỉ sản phẩm nổi bật</option>
          <option value="non-featured">Không nổi bật</option>
        </select>
        <select
          value={sortFilter}
          onChange={(e) => setSortFilter(e.target.value as SortFilterKey)}
          className="h-10 rounded-md border border-input bg-background px-3 text-sm"
        >
          <option value="default">Sắp xếp: Mới nhất</option>
          <option value="price-asc">Giá thấp đến cao</option>
          <option value="price-desc">Giá cao đến thấp</option>
          <option value="rating-desc">Đánh giá cao nhất</option>
          <option value="discount-desc">Giảm giá mạnh nhất (theo trang)</option>
        </select>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">Đang hiển thị {filteredProducts.length} sản phẩm sau lọc</p>
    </div>
  )

  const heroTitle = keyword
    ? `Kết quả cho "${keyword}"`
    : activeCategoryName
      ? `Danh mục: ${activeCategoryName}`
      : 'Gợi ý nổi bật hôm nay'
  const heroSubtitle = keyword
    ? 'Hiển thị sản phẩm khớp với từ khoá tìm kiếm.'
    : activeCategoryName
      ? 'Sản phẩm thuộc danh mục đã chọn.'
      : 'Chọn nhanh sản phẩm đang được quan tâm, giá tốt và sẵn hàng.'

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border bg-gradient-to-r from-primary/10 via-background to-secondary/10 p-4 sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">{heroTitle}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{heroSubtitle}</p>
            {profile?.role === 'ADMIN' ? (
              <p className="mt-2 text-sm text-muted-foreground">
                Danh sách từ <code className="rounded bg-muted px-1 text-xs">GET /api/v1/products</code>
                {accessToken ? (
                  <> — đặt hàng qua <code className="rounded bg-muted px-1 text-xs">POST /api/v1/orders</code></>
                ) : (
                  <> — <Link className="text-primary underline" to="/auth/login">Đăng nhập</Link> để đặt hàng</>
                )}
              </p>
            ) : null}
          </div>
          {(keyword || activeCategoryName) ? (
            <div className="flex flex-wrap items-center gap-2">
              {keyword ? (
                <button
                  type="button"
                  onClick={clearKeyword}
                  className="inline-flex items-center gap-1.5 rounded-full border bg-background px-3 py-1 text-xs hover:border-destructive/40 hover:text-destructive"
                >
                  Từ khoá: "{keyword}" <X className="h-3 w-3" aria-hidden />
                </button>
              ) : null}
              {activeCategoryName ? (
                <button
                  type="button"
                  onClick={() => setCategoryFilter('all')}
                  className="inline-flex items-center gap-1.5 rounded-full border bg-background px-3 py-1 text-xs hover:border-destructive/40 hover:text-destructive"
                >
                  Danh mục: {activeCategoryName} <X className="h-3 w-3" aria-hidden />
                </button>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>

      {listQuery.isError ? (
        <p className="text-sm text-destructive">
          {getApiErrorMessage(listQuery.error, 'Không tải được danh sách sản phẩm.')}
        </p>
      ) : null}
      <div className="flex justify-end lg:hidden">
        <Button type="button" variant="outline" onClick={() => setIsFilterSheetOpen(true)}>
          <SlidersHorizontal className="mr-2 h-4 w-4" />
          Bộ lọc
          {activeFilterCount > 0 ? (
            <span className="ml-2 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[11px] font-semibold text-primary-foreground">
              {activeFilterCount}
            </span>
          ) : null}
        </Button>
      </div>

      <div className="lg:grid lg:grid-cols-[280px_1fr] lg:gap-6">
        <aside className="hidden lg:block">
          <div className="sticky top-24">{renderFilterPanel()}</div>
        </aside>

        <div className="space-y-4">
          <div className="relative">
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {listQuery.isPending && !pageData
              ? Array.from({ length: PAGE_SIZE }).map((_, i) => (
                  <Card key={`sk-${i}`} className="overflow-hidden">
                    <div className="h-48 animate-pulse bg-muted md:h-52" />
                    <CardHeader className="space-y-2">
                      <div className="h-4 w-2/3 animate-pulse rounded bg-muted" />
                      <div className="h-3 w-1/3 animate-pulse rounded bg-muted" />
                    </CardHeader>
                  </Card>
                ))
              : null}

            {filteredProducts.map((product) => (
              <ProductCatalogCard key={product.id} product={product} onOpenDetail={openDetail} />
            ))}
            </div>

            {showTransitionSkeleton ? (
              <div className="pointer-events-none absolute inset-0 z-10 grid gap-4 bg-background/35 p-0 backdrop-blur-[1px] sm:grid-cols-2 xl:grid-cols-3">
                {Array.from({ length: Math.max(1, Math.min(PAGE_SIZE, filteredProducts.length || PAGE_SIZE)) }).map((_, i) => (
                  <Card key={`overlay-sk-${i}`} className="overflow-hidden border-border/50">
                    <div className="h-48 animate-pulse bg-muted/85 md:h-52" />
                    <CardHeader className="space-y-2">
                      <div className="h-4 w-2/3 animate-pulse rounded bg-muted/85" />
                      <div className="h-3 w-1/3 animate-pulse rounded bg-muted/85" />
                    </CardHeader>
                  </Card>
                ))}
              </div>
            ) : null}
          </div>

          {!listQuery.isPending && filteredProducts.length === 0 ? (
            <div className="rounded-lg border border-dashed bg-muted/30 p-6 text-center">
              <p className="text-sm font-medium">Không tìm thấy sản phẩm phù hợp</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {keyword
                  ? `Không có kết quả cho "${keyword}". Thử từ khoá khác hoặc đổi bộ lọc.`
                  : 'Bộ lọc hiện tại không trả về sản phẩm nào.'}
              </p>
              {(keyword || activeFilterCount > 0) ? (
                <div className="mt-3 flex justify-center gap-2">
                  {keyword ? (
                    <Button type="button" variant="outline" size="sm" onClick={clearKeyword}>
                      Xoá từ khoá
                    </Button>
                  ) : null}
                  {activeFilterCount > 0 ? (
                    <Button type="button" variant="outline" size="sm" onClick={resetFilters}>
                      Reset bộ lọc
                    </Button>
                  ) : null}
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>

      <div className="flex items-center justify-between gap-2 border-t pt-4">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={page <= 0 || listQuery.isFetching}
          onClick={() => setPage((p) => Math.max(0, p - 1))}
        >
          Trang trước
        </Button>
        <span className="text-sm text-muted-foreground">
          Trang {page + 1} / {totalPages}
          {listQuery.isFetching ? (
            <Loader2 className="ml-2 inline h-4 w-4 animate-spin align-text-bottom" aria-hidden />
          ) : null}
        </span>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={page + 1 >= totalPages || listQuery.isFetching}
          onClick={() => setPage((p) => p + 1)}
        >
          Trang sau
        </Button>
      </div>

      {isFilterSheetOpen ? (
        <div className="fixed inset-0 z-[70] lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/40"
            onClick={() => setIsFilterSheetOpen(false)}
            aria-label="Đóng bộ lọc"
          />
          <div className="absolute inset-x-0 bottom-0 max-h-[80vh] overflow-y-auto rounded-t-2xl border bg-background p-4 shadow-2xl">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold">Bộ lọc sản phẩm</h3>
              <Button type="button" variant="ghost" size="sm" onClick={() => setIsFilterSheetOpen(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            {renderFilterPanel(true)}
            <div className="mt-4">
              <Button type="button" className="w-full" onClick={() => setIsFilterSheetOpen(false)}>
                Xem {filteredProducts.length} sản phẩm
              </Button>
            </div>
          </div>
        </div>
      ) : null}

    </div>
  )
}
