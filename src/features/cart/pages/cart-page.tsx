import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Loader2, ShoppingCart, Tag, Trash2 } from 'lucide-react'
import { buildLoginPath } from '@/shared/lib/auth-redirect'
import { formatVnd } from '@/shared/lib/product-price'
import { useAuthStore } from '@/shared/stores/auth-store'
import {
  calcCartCount,
  calcCartSubtotal,
  hasCartDiscount,
  useCartStore,
} from '@/shared/stores/cart-store'
import { useSyncCart } from '@/features/cart/hooks/use-sync-cart'
import { Button } from '@/shared/ui/button'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/shared/ui/card'
import { ConfirmDialog } from '@/shared/ui/confirm-dialog'
import { EmptyState } from '@/shared/ui/empty-state'
import { QuantityStepper } from '@/shared/ui/quantity-stepper'

export function CartPage() {
  const navigate = useNavigate()
  const accessToken = useAuthStore((state) => state.accessToken)
  const { items, updateQuantity, removeItem, clearCart, clearBuyNow } = useCartStore()
  const [confirmClearOpen, setConfirmClearOpen] = useState(false)

  useEffect(() => {
    clearBuyNow()
  }, [clearBuyNow])

  const { isSyncing } = useSyncCart(items.map((item) => item.productId))
  const itemCount = calcCartCount(items)
  const subtotal = calcCartSubtotal(items)

  if (items.length === 0) {
    return (
      <Card>
        <EmptyState
          icon={ShoppingCart}
          title="Giỏ hàng trống"
          description="Bạn chưa thêm sản phẩm nào. Khám phá ưu đãi hoặc quay về trang chủ để chọn sản phẩm phù hợp."
          action={
            <>
              <Link to="/">
                <Button>Tiếp tục mua sắm</Button>
              </Link>
              <Link to="/?hasDiscount=1">
                <Button variant="outline" className="gap-1.5">
                  <Tag className="h-4 w-4" />
                  Xem ưu đãi
                </Button>
              </Link>
            </>
          }
        />
      </Card>
    )
  }

  return (
    <div className="space-y-4 pb-28 sm:pb-0">
      <Card>
        <CardHeader className="flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="text-lg sm:text-xl">Giỏ hàng ({itemCount})</CardTitle>
          <div className="flex w-full items-center justify-between gap-2 sm:w-auto sm:justify-end">
            {isSyncing ? (
              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Đang cập nhật…
              </span>
            ) : null}
            <Button variant="outline" size="sm" className="shrink-0" onClick={() => setConfirmClearOpen(true)}>
              Xóa tất cả
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {items.map((item) => (
            <div key={item.productId} className="flex gap-3 rounded-lg border p-3">
              <div className="h-20 w-20 shrink-0 overflow-hidden rounded-md bg-muted/40 sm:h-16 sm:w-24">
                {item.imageUrl ? (
                  <img src={item.imageUrl} alt="" className="h-full w-full object-contain p-1" loading="lazy" />
                ) : null}
              </div>
              <div className="min-w-0 flex-1 space-y-2">
                <Link
                  to={`/products/${item.productId}`}
                  className="line-clamp-2 block text-sm font-medium leading-snug hover:text-primary hover:underline"
                  title={item.name}
                >
                  {item.name}
                </Link>
                <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm">
                  <span className="font-semibold text-secondary">
                    {item.unitPrice != null ? formatVnd(item.unitPrice) : 'Liên hệ'}
                  </span>
                  {hasCartDiscount(item) && item.originalPrice != null ? (
                    <span className="text-xs text-muted-foreground line-through">{formatVnd(item.originalPrice)}</span>
                  ) : null}
                </div>
                <div className="flex items-center justify-between gap-2">
                  <QuantityStepper
                    size="sm"
                    value={item.quantity}
                    min={1}
                    max={item.stockQuantity != null && item.stockQuantity > 0 ? item.stockQuantity : 99}
                    onChange={(qty) => updateQuantity(item.productId, qty)}
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    className="shrink-0"
                    onClick={() => removeItem(item.productId)}
                    aria-label="Xóa khỏi giỏ"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </CardContent>
        <CardFooter className="hidden flex-col items-stretch gap-3 border-t pt-4 sm:flex sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Tạm tính</p>
            <p className="text-xl font-semibold text-secondary">{formatVnd(subtotal)}</p>
          </div>
          <Button
            size="lg"
            onClick={() => {
              clearBuyNow()
              if (!accessToken) {
                navigate(buildLoginPath('/checkout'))
                return
              }
              navigate('/checkout')
            }}
          >
            Tiến hành thanh toán
          </Button>
        </CardFooter>
      </Card>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t bg-background/95 p-4 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] backdrop-blur-sm sm:hidden">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
          <div>
            <p className="text-xs text-muted-foreground">Tạm tính ({itemCount})</p>
            <p className="text-lg font-semibold text-secondary">{formatVnd(subtotal)}</p>
          </div>
          <Button
            size="lg"
            className="shrink-0"
            onClick={() => {
              clearBuyNow()
              if (!accessToken) {
                navigate(buildLoginPath('/checkout'))
                return
              }
              navigate('/checkout')
            }}
          >
            Thanh toán
          </Button>
        </div>
      </div>

      <ConfirmDialog
        open={confirmClearOpen}
        title="Xóa toàn bộ giỏ hàng?"
        description="Tất cả sản phẩm trong giỏ sẽ bị xóa. Bạn có thể thêm lại bất cứ lúc nào."
        confirmLabel="Xóa tất cả"
        destructive
        onCancel={() => setConfirmClearOpen(false)}
        onConfirm={() => {
          clearCart()
          setConfirmClearOpen(false)
        }}
      />
    </div>
  )
}
