import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Loader2, ShoppingCart, Tag, Trash2 } from 'lucide-react'
import { toast } from 'react-toastify'
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
import { CheckoutSteps } from '@/features/cart/components/checkout-steps'
import { cn } from '@/shared/lib/utils'

export function CartPage() {
  const navigate = useNavigate()
  const accessToken = useAuthStore((state) => state.accessToken)
  const {
    items,
    selectedIds,
    updateQuantity,
    removeItem,
    clearCart,
    clearBuyNow,
    toggleSelected,
    selectAll,
    deselectAll,
  } = useCartStore()
  const [confirmClearOpen, setConfirmClearOpen] = useState(false)

  useEffect(() => {
    clearBuyNow()
  }, [clearBuyNow])

  useEffect(() => {
    const ids = new Set(items.map((item) => item.productId))
    const pruned = selectedIds.filter((id) => ids.has(id))
    if (pruned.length === 0 && items.length > 0) {
      selectAll()
      return
    }
    if (pruned.length !== selectedIds.length) {
      useCartStore.getState().setSelectedIds(pruned)
    }
  }, [items, selectedIds, selectAll])

  const { isSyncing } = useSyncCart(items.map((item) => item.productId))
  const selectedItems = useMemo(
    () => items.filter((item) => selectedIds.includes(item.productId)),
    [items, selectedIds],
  )
  const itemCount = calcCartCount(items)
  const selectedCount = calcCartCount(selectedItems)
  const subtotal = calcCartSubtotal(selectedItems)
  const allSelected = items.length > 0 && selectedItems.length === items.length

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
    <div className="space-y-4">
      <CheckoutSteps current="cart" />
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
        <CardContent className="stagger-children space-y-3">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="h-4 w-4 accent-primary"
              checked={allSelected}
              onChange={() => (allSelected ? deselectAll() : selectAll())}
            />
            <span>
              Chọn tất cả ({selectedItems.length}/{items.length})
            </span>
          </label>
          {items.map((item) => {
            const checked = selectedIds.includes(item.productId)
            return (
              <div
                key={item.productId}
                className={cn(
                  'flex gap-3 rounded-xl border p-3 transition-colors hover:border-primary/20 hover:bg-muted/30',
                  checked && 'border-primary/30 bg-primary/[0.03]',
                )}
              >
                <input
                  type="checkbox"
                  className="mt-1 h-4 w-4 shrink-0 accent-primary"
                  checked={checked}
                  onChange={() => toggleSelected(item.productId)}
                  aria-label={`Chọn ${item.name}`}
                />
                <div className="h-16 w-16 shrink-0 overflow-hidden rounded-md bg-muted/40 sm:h-20 sm:w-20">
                  {item.imageUrl ? (
                    <img src={item.imageUrl} alt={item.name} className="h-full w-full object-contain p-1" loading="lazy" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-[10px] text-muted-foreground">
                      Không có ảnh
                    </div>
                  )}
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
                    <span className="font-semibold text-primary">
                      {item.unitPrice != null ? formatVnd(item.unitPrice) : 'Liên hệ'}
                    </span>
                    {hasCartDiscount(item) && item.originalPrice != null ? (
                      <span className="text-xs text-muted-foreground line-through">
                        {formatVnd(item.originalPrice)}
                      </span>
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
                      className="h-10 w-10 shrink-0 p-0"
                      onClick={() => removeItem(item.productId)}
                      aria-label="Xóa khỏi giỏ"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            )
          })}
        </CardContent>
        <CardFooter className="flex flex-col items-stretch gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm text-muted-foreground">
              Tạm tính ({selectedCount} sản phẩm chọn)
            </p>
            <p className="text-xl font-semibold text-primary">{formatVnd(subtotal)}</p>
          </div>
          <Button
            size="lg"
            onClick={() => {
              if (selectedItems.length === 0) {
                toast.info('Chọn ít nhất một sản phẩm để thanh toán.')
                return
              }
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
