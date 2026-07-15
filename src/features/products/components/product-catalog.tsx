import { useEffect, useMemo, useRef, useState, type MouseEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { httpClient } from '@/shared/api/http-client'
import { env } from '@/shared/config/env'
import { PRODUCT_MEDIA } from '@/shared/constants/catalog'
import { getApiErrorMessage } from '@/shared/lib/api-error'
import { cn } from '@/shared/lib/utils'
import { EmptyState } from '@/shared/ui/empty-state'
import { PaginationBar } from '@/shared/ui/pagination-bar'
import { Card, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card'
import { Badge } from '@/shared/ui/badge'
import { Button } from '@/shared/ui/button'
import {
  useCategoriesQuery,
  useProductQuery,
  useProductsQuery,
} from '@/features/products/hooks/use-catalog'
import type { Product } from '@/features/products/types/product.types'
import { SearchX, ShoppingCart, Star } from 'lucide-react'
import { toast } from 'react-toastify'
import { useCartStore } from '@/shared/stores/cart-store'
import {
  CatalogFilterBar,
  type FeaturedFilterKey,
  type PriceFilterKey,
  type SortFilterKey,
} from '@/features/products/components/catalog-filter-bar'

const PAGE_SIZE = 8

function dedupeProducts(rows: Product[]): Product[] {
  const seen = new Set<string>()
  return rows.filter((product) => {
    const id = product.id?.trim()
    const name = product.name?.trim()
    if (!id || !name || seen.has(id)) return false
    seen.add(id)
    return true
  })
}

/** Tránh lưới 2–3 cột khi chỉ có 1–2 sản phẩm → ô trống bên cạnh. */
function catalogGridClass(count: number) {
  if (count <= 1) return 'grid-cols-1 sm:max-w-xs'
  if (count === 2) return 'grid-cols-2 sm:max-w-2xl'
  return 'grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
}

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

function ProductImage({ product, className, alt }: { product: Product; className?: string; alt?: string }) {
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
      alt={alt ?? product.name}
      className={cn('block', className)}
      loading="lazy"
      onError={tryBlobOnError ? onImgError : () => setBroken(true)}
    />
  )
}

function ProductCatalogCard({ product }: { product: Product }) {
  const addToCart = useCartStore((state) => state.addItem)
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

  const isOutOfStock = product.stockQuantity != null && product.stockQuantity <= 0

  const handleAddToCart = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation()
    if (isOutOfStock) {
      toast.error('Sản phẩm đã hết hàng.')
      return
    }
    addToCart(product, 1)
    toast.success('Đã thêm vào giỏ hàng.')
    event.currentTarget.blur()
  }

  return (
    <Card className="group overflow-hidden border-border/60 transition-all duration-300 hover:-translate-y-1 hover:border-primary/20 hover:shadow-xl hover:shadow-primary/15">
      <div className="relative px-3 pt-3">
        <Link
          to={`/products/${product.id}`}
          className="relative isolate block h-48 w-full shrink-0 overflow-hidden rounded-lg bg-gradient-to-br from-muted/70 via-background to-muted/40 md:h-52"
        >
          {needsDetailImage && detailForImage.isPending ? (
            <div className="absolute inset-0 animate-pulse bg-muted/80" />
          ) : (
            <ProductImage
              product={merged}
              alt={product.name}
              className="pointer-events-none h-full w-full object-contain object-center"
            />
          )}
        </Link>
        {product.featured ? (
          <Badge className="pointer-events-none absolute left-5 top-5 z-[1] border-secondary/30 bg-secondary text-secondary-foreground shadow-sm">
            <Star className="mr-1 h-3.5 w-3.5 fill-current text-secondary-foreground" />
            Nổi bật
          </Badge>
        ) : null}
        {isOutOfStock ? (
          <Badge className="pointer-events-none absolute right-5 top-5 z-[1] bg-destructive text-destructive-foreground">
            Hết hàng
          </Badge>
        ) : null}
        {!isOutOfStock ? (
          <>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              className="absolute bottom-5 right-5 z-[2] h-9 w-9 rounded-full p-0 shadow-md md:hidden"
              onClick={handleAddToCart}
              aria-label="Thêm vào giỏ"
            >
              <ShoppingCart className="h-4 w-4" />
            </Button>
            <div className="pointer-events-none absolute inset-x-3 bottom-3 top-3 hidden translate-y-0 overflow-hidden rounded-lg md:block">
              <div className="absolute inset-x-0 bottom-0 translate-y-full bg-gradient-to-t from-black/60 to-transparent p-3 opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100 [@media(hover:hover)_and_(pointer:fine)]:pointer-events-auto">
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  className="w-full gap-1.5 shadow-md"
                  onClick={handleAddToCart}
                >
                  <ShoppingCart className="h-3.5 w-3.5" />
                  Thêm vào giỏ
                </Button>
              </div>
            </div>
          </>
        ) : null}
      </div>
      <CardHeader className="space-y-2 pb-3">
        <Link to={`/products/${product.id}`} className="block hover:text-primary">
          <CardTitle className="line-clamp-2 text-base leading-snug">{product.name}</CardTitle>
        </Link>
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
  const filterBarRef = useRef<HTMLDivElement>(null)
  const [searchParams, setSearchParams] = useSearchParams()

  /** Keyword + categoryId là nguồn URL → state (header-search và category-nav cập nhật URL). */
  const keyword = searchParams.get('keyword')?.trim() ?? ''
  const categoryFilter = searchParams.get('categoryId') ?? 'all'
  const hasDiscountFromUrl =
    searchParams.get('hasDiscount') === '1' || searchParams.get('discount') === '1'

  const [page, setPage] = useState(0)
  const [priceFilter, setPriceFilter] = useState<PriceFilterKey>('all')
  const [sortFilter, setSortFilter] = useState<SortFilterKey>('default')
  const [minRatingFilter, setMinRatingFilter] = useState(0)
  const [onlyDiscountFilter, setOnlyDiscountFilter] = useState(hasDiscountFromUrl)
  const [onlyInStockFilter, setOnlyInStockFilter] = useState(false)
  const [featuredFilter, setFeaturedFilter] = useState<FeaturedFilterKey>('all')

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

  const filteredProducts = useMemo(() => {
    const rows = dedupeProducts([...(pageData?.content ?? [])])
    /** `discount-desc` không có cột backend tương ứng — sort cục bộ theo trang hiện tại. */
    if (sortFilter === 'discount-desc') {
      rows.sort((a, b) => (displayPrice(b).discountPercent ?? 0) - (displayPrice(a).discountPercent ?? 0))
    }
    return rows
  }, [pageData?.content, sortFilter])

  /** Khi đổi filter/trang: không ghép sản phẩm cũ với lưới mới (tránh ô trống lạ). */
  const isLoadingProducts =
    (listQuery.isPending && !pageData) || (listQuery.isFetching && listQuery.isPlaceholderData)
  const skeletonCount = Math.min(PAGE_SIZE, Math.max(3, filteredProducts.length || PAGE_SIZE))
  const productGridClass = catalogGridClass(
    isLoadingProducts ? skeletonCount : filteredProducts.length,
  )

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
    const next = new URLSearchParams(searchParams)
    next.delete('hasDiscount')
    next.delete('discount')
    setSearchParams(next, { replace: true })
  }

  useEffect(() => {
    setOnlyDiscountFilter(hasDiscountFromUrl)
  }, [hasDiscountFromUrl])

  /** Reset về trang 0 mỗi khi đổi filter để không bị lệch trang. */
  useEffect(() => {
    setPage(0)
  }, [keyword, categoryFilter, featuredFilter, sortFilter, priceFilter, onlyDiscountFilter, onlyInStockFilter, minRatingFilter])

  /** Trang vượt quá dữ liệu (sau khi dồn trang) → quay về trang cuối hợp lệ. */
  useEffect(() => {
    if (isLoadingProducts) return
    const total = pageData?.totalElements ?? 0
    if (page > 0 && filteredProducts.length === 0 && total > 0) {
      setPage(Math.max(0, totalPages - 1))
    }
  }, [isLoadingProducts, page, filteredProducts.length, pageData?.totalElements, totalPages])

  const clearDiscountUrl = () => {
    setOnlyDiscountFilter(false)
    const next = new URLSearchParams(searchParams)
    next.delete('hasDiscount')
    next.delete('discount')
    setSearchParams(next)
  }

  const handlePageChange = (nextPage: number) => {
    setPage(nextPage)
    filterBarRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

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
      <div className="border-b pb-4">
        <h2 className="text-lg font-semibold tracking-tight">{heroTitle}</h2>
        <p className="mt-0.5 text-sm text-muted-foreground">{heroSubtitle}</p>
      </div>

      {listQuery.isError ? (
        <Card>
          <EmptyState
            icon={SearchX}
            title="Không tải được sản phẩm"
            description={getApiErrorMessage(listQuery.error, 'Vui lòng thử lại sau.')}
            action={
              <Button type="button" variant="outline" size="sm" onClick={() => void listQuery.refetch()}>
                Thử lại
              </Button>
            }
          />
        </Card>
      ) : null}

      <div ref={filterBarRef}>
      <CatalogFilterBar
        keyword={keyword}
        onClearKeyword={clearKeyword}
        hasDiscountFromUrl={hasDiscountFromUrl}
        onClearDiscountUrl={clearDiscountUrl}
        priceFilter={priceFilter}
        onPriceFilterChange={setPriceFilter}
        categoryFilter={categoryFilter}
        onCategoryFilterChange={setCategoryFilter}
        categories={categories}
        minRatingFilter={minRatingFilter}
        onMinRatingFilterChange={setMinRatingFilter}
        featuredFilter={featuredFilter}
        onFeaturedFilterChange={setFeaturedFilter}
        onlyDiscountFilter={onlyDiscountFilter}
        onOnlyDiscountFilterChange={setOnlyDiscountFilter}
        onlyInStockFilter={onlyInStockFilter}
        onOnlyInStockFilterChange={setOnlyInStockFilter}
        sortFilter={sortFilter}
        onSortFilterChange={setSortFilter}
        totalCount={pageData?.totalElements ?? 0}
        visibleCount={filteredProducts.length}
        onResetFilters={resetFilters}
        activeFilterCount={activeFilterCount}
      />
      </div>

      {!listQuery.isError ? (
      <div className="space-y-4">
        <div className="relative">
          <div className={cn('stagger-children grid gap-3 sm:gap-4', productGridClass, filteredProducts.length === 1 && 'sm:mx-0')}>
          {isLoadingProducts
            ? Array.from({ length: skeletonCount }).map((_, i) => (
                <Card key={`sk-${i}`} className="overflow-hidden">
                  <div className="h-48 animate-pulse bg-muted md:h-52" />
                  <CardHeader className="space-y-2">
                    <div className="h-4 w-2/3 animate-pulse rounded bg-muted" />
                    <div className="h-3 w-1/3 animate-pulse rounded bg-muted" />
                  </CardHeader>
                </Card>
              ))
            : filteredProducts.map((product) => (
                <ProductCatalogCard key={product.id} product={product} />
              ))}
          </div>
        </div>

        {!isLoadingProducts && filteredProducts.length === 0 ? (
          <EmptyState
            icon={SearchX}
            title="Không tìm thấy sản phẩm phù hợp"
            description={
              keyword
                ? `Không có kết quả cho "${keyword}". Thử từ khoá khác hoặc đổi bộ lọc.`
                : 'Bộ lọc hiện tại không trả về sản phẩm nào.'
            }
            action={
              keyword || activeFilterCount > 0 ? (
                <>
                  {keyword ? (
                    <Button type="button" variant="outline" size="sm" onClick={clearKeyword}>
                      Xóa từ khóa
                    </Button>
                  ) : null}
                  {activeFilterCount > 0 ? (
                    <Button type="button" variant="outline" size="sm" onClick={resetFilters}>
                      Reset bộ lọc
                    </Button>
                  ) : null}
                </>
              ) : undefined
            }
          />
        ) : null}
      </div>
      ) : null}

      {!listQuery.isError ? (
      <PaginationBar
        page={page}
        totalPages={totalPages}
        isFetching={listQuery.isFetching}
        onPageChange={handlePageChange}
      />
      ) : null}

    </div>
  )
}
