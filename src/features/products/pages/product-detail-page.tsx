import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { toast } from 'react-toastify'
import { ArrowLeft, ShoppingCart, Star, Zap } from 'lucide-react'
import { useProductQuery } from '@/features/products/hooks/use-catalog'
import { buildLoginPath } from '@/shared/lib/auth-redirect'
import { getApiErrorMessage } from '@/shared/lib/api-error'
import { formatVnd } from '@/shared/lib/product-price'
import { useAuthStore } from '@/shared/stores/auth-store'
import { useCartStore } from '@/shared/stores/cart-store'
import { Breadcrumb } from '@/shared/ui/breadcrumb'
import { Button } from '@/shared/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card'
import { Label } from '@/shared/ui/label'
import { QuantityStepper } from '@/shared/ui/quantity-stepper'
import { RelatedProducts } from '@/features/products/components/related-products'
import { Skeleton } from '@/shared/ui/skeleton'
import { cn } from '@/shared/lib/utils'

function displayPrice(price: number | null | undefined, discountPrice: number | null | undefined) {
  if (price != null && discountPrice != null && discountPrice < price) {
    return { current: discountPrice, original: price }
  }
  return { current: price ?? null, original: null as number | null }
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
      <div className="pb-28 sm:pb-0">
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
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-10 w-full" />
                </div>
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

  return (
    <div className="pb-28 sm:pb-0">
      <Breadcrumb className="mb-6" items={[{ label: 'Trang chủ', to: '/' }, { label: product.name }]} />

      <Card className="w-full overflow-hidden">
        <div className="grid lg:grid-cols-2 lg:items-stretch">
          <div className="flex min-h-0 flex-col border-b border-border/70 lg:border-b-0 lg:border-r">
            <div className="relative flex min-h-[260px] flex-1 items-center justify-center bg-gradient-to-br from-muted/70 via-background to-muted/40 p-4 sm:min-h-[300px] lg:min-h-[360px]">
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
              <div className="flex gap-2 overflow-x-auto border-t border-border/70 p-3">
                {galleryImages.map((url, index) => (
                  <button
                    key={`${url}-${index}`}
                    type="button"
                    className={cn(
                      'h-14 w-14 shrink-0 overflow-hidden rounded-md border bg-muted/30 p-1 transition',
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
            <CardHeader className="pb-3">
              <CardTitle className="text-xl leading-snug lg:text-2xl">{product.name}</CardTitle>
              <CardDescription className="space-y-2 pt-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xl font-semibold text-primary sm:text-2xl">{formatVnd(price.current)}</span>
                  {price.original != null ? (
                    <>
                      <span className="text-sm text-muted-foreground line-through">{formatVnd(price.original)}</span>
                      {price.current != null ? (
                        <span className="rounded-md bg-secondary/10 px-1.5 py-0.5 text-xs font-semibold text-secondary">
                          -{Math.max(1, Math.round(((price.original - price.current) / price.original) * 100))}%
                        </span>
                      ) : null}
                    </>
                  ) : null}
                </div>
                {(product.rating != null || product.stockQuantity != null) && (
                  <div className="flex flex-wrap items-center gap-2 pt-0.5">
                    {product.rating != null ? (
                      <span className="inline-flex h-7 items-center gap-1 rounded-full border border-amber-300/60 bg-amber-50 px-3 text-xs font-medium leading-none text-amber-700">
                        <Star className="h-3.5 w-3.5 shrink-0 fill-amber-400 text-amber-500" />
                        {product.rating.toFixed(1)} / 5
                      </span>
                    ) : null}
                    {product.stockQuantity != null ? (
                      <span
                        className={cn(
                          'inline-flex h-7 items-center rounded-full px-3 text-xs font-medium leading-none',
                          isOutOfStock
                            ? 'bg-destructive/10 text-destructive'
                            : product.stockQuantity <= 5
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-emerald-100 text-emerald-800',
                        )}
                      >
                        {isOutOfStock ? 'Hết hàng' : product.stockQuantity <= 5 ? 'Sắp hết hàng' : 'Còn hàng'}
                      </span>
                    ) : null}
                  </div>
                )}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-1 flex-col space-y-3.5 pt-0">
              {product.description ? (
                <p className="text-sm leading-relaxed text-muted-foreground">{product.description}</p>
              ) : null}
              <div className="flex w-fit flex-col gap-2.5">
                <Label className="text-muted-foreground">Số lượng</Label>
                <QuantityStepper
                  value={qty}
                  min={1}
                  max={maxQty}
                  disabled={isOutOfStock}
                  onChange={setQty}
                />
              </div>
              <div className="hidden gap-2 sm:grid sm:grid-cols-2">
                <Button
                  type="button"
                  variant="outline"
                  className="gap-2"
                  onClick={handleAddToCart}
                  disabled={isOutOfStock}
                >
                  <ShoppingCart className="h-4 w-4" />
                  Thêm vào giỏ
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  className="gap-2 shadow-sm hover:brightness-105"
                  onClick={handleOrderNow}
                  disabled={isOutOfStock}
                >
                  <Zap className="h-4 w-4" />
                  Mua ngay
                </Button>
              </div>
              <Link
                to="/"
                className="mt-auto inline-flex items-center gap-1.5 pt-1 text-sm text-muted-foreground transition-colors hover:text-primary"
              >
                <ArrowLeft className="h-4 w-4" />
                Quay lại danh sách
              </Link>
            </CardContent>
          </div>
        </div>
      </Card>

      <div className="mt-8">
        <RelatedProducts productId={product.id} categoryId={product.categoryId} />
      </div>

      {!isOutOfStock ? (
        <div className="mobile-bottom-bar fixed inset-x-0 bottom-0 z-30 border-t bg-background/95 p-3 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] backdrop-blur-sm sm:hidden">
          <div className="mx-auto flex max-w-6xl items-center gap-3">
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs text-muted-foreground">{product.name}</p>
              <p className="text-lg font-semibold text-primary">{formatVnd(price.current)}</p>
            </div>
            <Button type="button" variant="outline" size="sm" className="shrink-0 gap-1" onClick={handleAddToCart}>
              <ShoppingCart className="h-4 w-4" />
              Giỏ
            </Button>
            <Button type="button" variant="secondary" size="sm" className="shrink-0 gap-1" onClick={handleOrderNow}>
              <Zap className="h-4 w-4" />
              Mua ngay
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
