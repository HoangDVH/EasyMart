import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { toast } from 'react-toastify'
import { ShoppingCart, Star, Zap } from 'lucide-react'
import { ProductPromoPanel } from '@/features/products/components/product-promo-panel'
import { ProductServiceGuarantees } from '@/features/products/components/product-service-guarantees'
import { ProductSupplierCard } from '@/features/products/components/product-supplier-card'
import { RelatedProducts } from '@/features/products/components/related-products'
import { useProductQuery } from '@/features/products/hooks/use-catalog'
import {
  getProductPromoMock,
  getProductSupplierMock,
} from '@/features/products/lib/product-promo-mock'
import { buildLoginPath } from '@/shared/lib/auth-redirect'
import { getApiErrorMessage } from '@/shared/lib/api-error'
import { formatVnd } from '@/shared/lib/product-price'
import { useAuthStore } from '@/shared/stores/auth-store'
import { useCartStore } from '@/shared/stores/cart-store'
import { Breadcrumb } from '@/shared/ui/breadcrumb'
import { Button } from '@/shared/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card'
import { Label } from '@/shared/ui/label'
import { QuantityStepper } from '@/shared/ui/quantity-stepper'
import { Skeleton } from '@/shared/ui/skeleton'
import { cn } from '@/shared/lib/utils'

function displayPrice(price: number | null | undefined, discountPrice: number | null | undefined) {
  if (price != null && discountPrice != null && discountPrice < price) {
    const pct = Math.max(1, Math.round(((price - discountPrice) / price) * 100))
    return { current: discountPrice, original: price, discountPercent: pct }
  }
  return { current: price ?? null, original: null as number | null, discountPercent: null as number | null }
}

export function ProductDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const accessToken = useAuthStore((state) => state.accessToken)
  const addToCart = useCartStore((state) => state.addItem)
  const prepareBuyNow = useCartStore((state) => state.prepareBuyNow)
  const detailQuery = useProductQuery(id ?? null)
  const [qty, setQty] = useState(1)
  const [activeImageIndex, setActiveImageIndex] = useState(0)

  const product = detailQuery.data
  const galleryImages = useMemo(() => {
    const urls = product?.images?.filter((url) => url.trim().length > 0) ?? []
    if (urls.length > 0) return urls
    if (product?.imageUrl) return [product.imageUrl]
    return []
  }, [product])

  useEffect(() => {
    setActiveImageIndex(0)
  }, [product?.id])

  const maxQty = useMemo(() => {
    if (!product) return 99
    return product.stockQuantity != null && product.stockQuantity >= 0 ? product.stockQuantity : 99
  }, [product])

  const handleAddToCart = () => {
    if (!product) return
    const quantity = Math.min(Math.max(1, qty), maxQty)
    addToCart(product, quantity)
    toast.success('Đã thêm vào giỏ hàng.')
  }

  const handleOrderNow = () => {
    if (!product) return
    const quantity = Math.min(Math.max(1, qty), maxQty)
    prepareBuyNow(product, quantity)
    if (!accessToken) {
      navigate(buildLoginPath('/checkout'))
      return
    }
    navigate('/checkout')
  }

  if (detailQuery.isPending) {
    return (
      <div>
        <Breadcrumb
          className="mb-6"
          items={[{ label: 'Trang chủ', to: '/' }, { label: 'Đang tải sản phẩm...' }]}
        />
        <Card className="w-full overflow-hidden">
          <div className="grid lg:grid-cols-2 lg:items-stretch">
            <div className="border-b border-border/70 lg:border-b-0 lg:border-r">
              <Skeleton className="min-h-[260px] w-full rounded-none sm:min-h-[300px] lg:min-h-[360px]" aria-hidden />
            </div>
            <div>
              <CardHeader className="space-y-3">
                <Skeleton className="h-7 w-2/3" />
                <Skeleton className="h-6 w-1/3" />
                <Skeleton className="h-4 w-1/4" />
              </CardHeader>
              <CardContent className="space-y-4">
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-24 w-full" />
                <div className="grid gap-2 sm:grid-cols-2">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              </CardContent>
            </div>
          </div>
        </Card>
      </div>
    )
  }

  if (detailQuery.isError || !product) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-sm text-destructive">{getApiErrorMessage(detailQuery.error, 'Không tải được sản phẩm.')}</p>
          <Link to="/" className="mt-4 inline-block text-sm text-primary underline">
            Quay lại danh sách
          </Link>
        </CardContent>
      </Card>
    )
  }

  const price = displayPrice(product.price, product.discountPrice)
  const isOutOfStock = product.stockQuantity != null && product.stockQuantity <= 0
  const promo = getProductPromoMock(product)
  const supplier = getProductSupplierMock(product)
  const soldLabel =
    product.soldCount != null && product.soldCount > 0
      ? product.soldCount >= 1000
        ? `${(product.soldCount / 1000).toFixed(1)}k`
        : String(product.soldCount)
      : null

  return (
    <div className="space-y-8 pb-4">
      <Breadcrumb
        className="mb-8"
        items={[
          { label: 'Trang chủ', to: '/' },
          ...(product.categoryName && product.categoryId
            ? [{ label: product.categoryName, to: `/?categoryId=${product.categoryId}` }]
            : product.categoryName
              ? [{ label: product.categoryName }]
              : []),
          { label: product.name },
        ]}
      />

      <Card className="w-full overflow-hidden">
        <div className="grid lg:grid-cols-2 lg:items-stretch">
          <div className="flex min-h-0 flex-col border-b border-border/70 lg:border-b-0 lg:border-r">
            <div className="relative flex min-h-[280px] flex-1 items-center justify-center bg-card p-6 sm:min-h-[320px] lg:min-h-[420px]">
              {galleryImages.length > 0 ? (
                <img
                  src={galleryImages[activeImageIndex]}
                  alt={product.name}
                  className={cn(
                    'max-h-full max-w-full object-contain object-center',
                    isOutOfStock && 'opacity-60',
                  )}
                  decoding="async"
                />
              ) : (
                <div className="px-4 text-sm text-muted-foreground">Không có ảnh</div>
              )}
              {isOutOfStock ? (
                <div className="absolute inset-0 flex items-center justify-center bg-background/40">
                  <span className="rounded-md bg-destructive px-4 py-2 text-sm font-semibold text-destructive-foreground shadow-md">
                    Hết hàng
                  </span>
                </div>
              ) : null}
            </div>
            {galleryImages.length > 1 ? (
              <div className="flex gap-3 overflow-x-auto border-t border-border/70 p-4">
                {galleryImages.map((url, index) => (
                  <button
                    key={`${url}-${index}`}
                    type="button"
                    className={cn(
                      'h-16 w-16 shrink-0 overflow-hidden rounded-md border bg-card p-1.5 transition',
                      index === activeImageIndex
                        ? 'border-primary ring-2 ring-primary/30'
                        : 'border-border hover:border-primary/50',
                    )}
                    onClick={() => setActiveImageIndex(index)}
                    aria-label={`Xem ảnh ${index + 1}`}
                  >
                    <img src={url} alt="" className="h-full w-full object-contain" loading="lazy" />
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          <div className="flex flex-col">
            <CardHeader className="space-y-4 px-5 pb-4 pt-5 sm:px-6 sm:pt-6">
              <CardTitle className="break-words text-xl leading-snug lg:text-2xl">{product.name}</CardTitle>

              <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-sm">
                {product.rating != null ? (
                  <span className="inline-flex items-center gap-1 font-medium text-amber-700">
                    <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-500" aria-hidden />
                    {product.rating.toFixed(1)}
                  </span>
                ) : null}
                {product.rating != null && soldLabel ? (
                  <span className="text-muted-foreground/40" aria-hidden>
                    |
                  </span>
                ) : null}
                {soldLabel ? (
                  <span className="text-muted-foreground">Đã bán {soldLabel}</span>
                ) : null}
                {product.stockQuantity != null ? (
                  <>
                    <span className="text-muted-foreground/40" aria-hidden>
                      |
                    </span>
                    <span
                      className={cn(
                        'font-medium',
                        isOutOfStock
                          ? 'text-destructive'
                          : product.stockQuantity <= 5
                            ? 'text-amber-700'
                            : 'text-emerald-700',
                      )}
                    >
                      {isOutOfStock
                        ? 'Hết hàng'
                        : product.stockQuantity <= 5
                          ? `Chỉ còn ${product.stockQuantity} sản phẩm`
                          : 'Còn hàng'}
                    </span>
                  </>
                ) : null}
              </div>

              <div className="rounded-lg bg-muted/40 px-4 py-4 sm:px-5">
                <div className="flex flex-wrap items-end gap-2.5">
                  <span className="text-2xl font-bold tracking-tight text-primary sm:text-3xl">
                    {formatVnd(price.current)}
                  </span>
                  {price.original != null ? (
                    <>
                      <span className="pb-0.5 text-sm text-muted-foreground line-through">
                        {formatVnd(price.original)}
                      </span>
                      {price.discountPercent != null ? (
                        <span className="mb-0.5 rounded bg-primary/10 px-1.5 py-0.5 text-xs font-bold text-primary">
                          -{price.discountPercent}%
                        </span>
                      ) : null}
                    </>
                  ) : null}
                </div>
              </div>
            </CardHeader>

            <CardContent className="flex flex-1 flex-col space-y-6 px-5 pb-6 pt-0 sm:px-6 sm:pb-7">
              <ProductPromoPanel promo={promo} discountPercent={price.discountPercent} />

              <div className="flex w-fit flex-col gap-3">
                <Label className="text-muted-foreground">Số lượng</Label>
                <QuantityStepper
                  value={qty}
                  min={1}
                  max={maxQty}
                  disabled={isOutOfStock}
                  onChange={setQty}
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <Button
                  type="button"
                  variant="outline"
                  className="h-11 gap-2 border-primary/40 text-primary hover:bg-primary/5 sm:h-11"
                  onClick={handleAddToCart}
                  disabled={isOutOfStock}
                >
                  <ShoppingCart className="h-4 w-4 shrink-0" />
                  <span className="truncate">Thêm vào giỏ</span>
                </Button>
                <Button
                  type="button"
                  className="h-11 gap-2 sm:h-11"
                  onClick={handleOrderNow}
                  disabled={isOutOfStock}
                >
                  <Zap className="h-4 w-4 shrink-0" />
                  <span className="truncate">Mua ngay</span>
                </Button>
              </div>
            </CardContent>
          </div>
        </div>
      </Card>

      <ProductSupplierCard supplier={supplier} />
      <ProductServiceGuarantees />

      {product.description ? (
        <Card>
          <CardHeader className="px-5 pb-3 pt-5 sm:px-6 sm:pt-6">
            <CardTitle className="text-base">Mô tả sản phẩm</CardTitle>
          </CardHeader>
          <CardContent className="px-5 pb-5 sm:px-6 sm:pb-6">
            <p className="whitespace-pre-line text-sm leading-7 text-muted-foreground">
              {product.description}
            </p>
          </CardContent>
        </Card>
      ) : null}

      <RelatedProducts productId={product.id} categoryId={product.categoryId} />
    </div>
  )
}
