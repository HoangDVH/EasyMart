import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { toast } from 'react-toastify'
import { ShoppingCart, Star } from 'lucide-react'
import { useCreateOrderMutation, useProductQuery } from '@/features/products/hooks/use-catalog'
import { getApiErrorMessage } from '@/shared/lib/api-error'
import { useAuthStore } from '@/shared/stores/auth-store'
import { useCartStore } from '@/shared/stores/cart-store'
import { Breadcrumb } from '@/shared/ui/breadcrumb'
import { Button } from '@/shared/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card'
import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/label'
import { Skeleton } from '@/shared/ui/skeleton'

function formatVnd(n: number | null | undefined) {
  if (n == null || !Number.isFinite(n)) return '—'
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n)
}

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
  const detailQuery = useProductQuery(id ?? null)
  const createOrder = useCreateOrderMutation()
  const [qty, setQty] = useState(1)

  const product = detailQuery.data
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

  const handleOrderNow = async () => {
    if (!accessToken) {
      toast.info('Vui lòng đăng nhập để đặt hàng.')
      return
    }
    if (!product) return
    const quantity = Math.min(Math.max(1, qty), maxQty)
    try {
      await createOrder.mutateAsync({
        items: [{ productId: product.id, quantity }],
      })
      toast.success('Đặt hàng thành công.')
      navigate('/cart')
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Không tạo được đơn hàng.'))
    }
  }

  if (detailQuery.isPending) {
    return (
      <div className="space-y-4">
        <Breadcrumb items={[{ label: 'Trang chủ', to: '/' }, { label: 'Đang tải sản phẩm...' }]} />
        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="overflow-hidden">
            <Skeleton className="aspect-square w-full rounded-none lg:aspect-[4/5]" aria-hidden />
          </Card>
          <Card>
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
          </Card>
        </div>
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

  return (
    <div className="space-y-4">
      <Breadcrumb items={[{ label: 'Trang chủ', to: '/' }, { label: product.name }]} />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="overflow-hidden">
          <div className="relative aspect-square w-full bg-gradient-to-br from-muted/70 via-background to-muted/40 lg:aspect-[4/5]">
            {product.imageUrl ? (
              <img
                src={product.imageUrl}
                alt={product.name}
                className="block h-full w-full max-h-full max-w-full object-contain object-center"
                decoding="async"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center px-4 text-sm text-muted-foreground">
                Không có ảnh
              </div>
            )}
          </div>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{product.name}</CardTitle>
            <CardDescription className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-2xl font-semibold text-primary">{formatVnd(price.current)}</span>
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
              {product.rating != null ? (
                <span className="inline-flex items-center rounded-full border border-amber-300/60 bg-amber-50 px-2 py-0.5 text-xs text-amber-700">
                  <Star className="mr-1 h-3.5 w-3.5 fill-amber-400 text-amber-500" />
                  {product.rating.toFixed(1)} / 5
                </span>
              ) : null}
              {product.stockQuantity != null ? <div>Tồn kho: {product.stockQuantity}</div> : null}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {product.description ? <p className="text-sm leading-relaxed text-muted-foreground">{product.description}</p> : null}
            <div className="space-y-2">
              <Label htmlFor="qty">Số lượng</Label>
              <Input
                id="qty"
                type="number"
                min={1}
                max={maxQty}
                value={qty}
                onChange={(e) => setQty(Number(e.target.value) || 1)}
              />
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <Button
                type="button"
                variant="outline"
                className="gap-2"
                onClick={handleAddToCart}
                disabled={product.stockQuantity != null && product.stockQuantity <= 0}
              >
                <ShoppingCart className="h-4 w-4" />
                Thêm vào giỏ
              </Button>
              <Button
                type="button"
                variant="secondary"
                className="gap-2 shadow-sm hover:brightness-105"
                onClick={() => void handleOrderNow()}
                disabled={createOrder.isPending || (product.stockQuantity != null && product.stockQuantity <= 0)}
              >
                <ShoppingCart className="h-4 w-4" />
                Mua ngay
              </Button>
            </div>
            <Link to="/" className="inline-block text-sm text-primary underline">
              ← Quay lại danh sách sản phẩm
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
