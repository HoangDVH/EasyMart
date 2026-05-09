import { Link, useNavigate } from 'react-router-dom'
import { Trash2 } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/shared/ui/card'
import { Input } from '@/shared/ui/input'
import { calcCartCount, calcCartSubtotal, useCartStore } from '@/shared/stores/cart-store'

function formatVnd(n: number) {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n)
}

export function CartPage() {
  const navigate = useNavigate()
  const { items, updateQuantity, removeItem, clearCart } = useCartStore()
  const itemCount = calcCartCount(items)
  const subtotal = calcCartSubtotal(items)

  if (items.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Giỏ hàng trống</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Bạn chưa thêm sản phẩm nào. Quay về trang chủ để chọn sản phẩm phù hợp.
        </CardContent>
        <CardFooter>
          <Link to="/">
            <Button>Tiếp tục mua sắm</Button>
          </Link>
        </CardFooter>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>Giỏ hàng của bạn ({itemCount})</CardTitle>
          <Button variant="outline" onClick={clearCart}>
            Xóa tất cả
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {items.map((item) => (
            <div key={item.productId} className="flex flex-col gap-3 rounded-lg border p-3 sm:flex-row sm:items-center">
              <div className="h-16 w-24 shrink-0 overflow-hidden rounded-md bg-muted/40">
                {item.imageUrl ? (
                  <img src={item.imageUrl} alt={item.name} className="h-full w-full object-contain p-1" loading="lazy" />
                ) : null}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{item.name}</p>
                <p className="text-sm text-muted-foreground">{item.price != null ? formatVnd(item.price) : 'Liên hệ'}</p>
              </div>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min={1}
                  max={item.stockQuantity != null && item.stockQuantity > 0 ? item.stockQuantity : undefined}
                  value={item.quantity}
                  onChange={(e) => updateQuantity(item.productId, Number(e.target.value) || 1)}
                  className="w-20"
                />
                <Button variant="outline" size="sm" onClick={() => removeItem(item.productId)} aria-label="Xóa khỏi giỏ">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
        <CardFooter className="flex-col items-stretch gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Tạm tính</p>
            <p className="text-xl font-semibold text-primary">{formatVnd(subtotal)}</p>
          </div>
          <Button size="lg" onClick={() => navigate('/checkout')}>
            Tiến hành thanh toán
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
