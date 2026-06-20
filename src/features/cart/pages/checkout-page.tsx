import { useEffect } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import { Loader2 } from 'lucide-react'
import { productsApi } from '@/features/products/api/products.api'
import { useCreateOrderMutation } from '@/features/orders/hooks/use-orders'
import { useCreatePaymentMutation } from '@/features/payments/hooks/use-payments'
import {
  checkoutSchema,
  type CheckoutFormValues,
} from '@/features/cart/schemas/checkout.schemas'
import { getApiErrorMessage } from '@/shared/lib/api-error'
import {
  loadCheckoutProfile,
  saveCheckoutProfile,
  saveOrderShipping,
} from '@/shared/lib/shipping-storage'
import { calcCartSubtotal, useCartStore } from '@/shared/stores/cart-store'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/shared/ui/button'
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/shared/ui/card'
import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/label'
import { Textarea } from '@/shared/ui/textarea'
import { formatVnd } from '@/shared/lib/product-price'
import { PaymentMethodCards } from '@/features/cart/components/payment-method-cards'
import { useSyncCart } from '@/features/cart/hooks/use-sync-cart'

const savedProfile = loadCheckoutProfile()

export function CheckoutPage() {
  const navigate = useNavigate()
  const createOrder = useCreateOrderMutation()
  const createPayment = useCreatePaymentMutation()
  const {
    items: cartItems,
    buyNowItems,
    clearCart,
    clearBuyNow,
    updateQuantity,
    updateBuyNowQuantity,
    removeItem,
  } = useCartStore()
  const isBuyNow = buyNowItems != null && buyNowItems.length > 0
  const items = isBuyNow ? buyNowItems : cartItems
  const subtotal = calcCartSubtotal(items)

  const adjustQuantity = (productId: string, quantity: number) => {
    if (isBuyNow) updateBuyNowQuantity(productId, quantity)
    else updateQuantity(productId, quantity)
  }

  const dropItem = (productId: string) => {
    if (isBuyNow) clearBuyNow()
    else removeItem(productId)
  }

  const finishCheckout = () => {
    if (isBuyNow) clearBuyNow()
    else clearCart()
  }

  const { isSyncing } = useSyncCart(items.map((item) => item.productId))
  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<CheckoutFormValues>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: savedProfile ?? {
      customerName: '',
      phone: '',
      address: '',
      paymentMethod: 'COD',
    },
  })

  useEffect(() => {
    if (savedProfile) reset(savedProfile)
  }, [reset])

  if (items.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Chưa có sản phẩm để thanh toán</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Vui lòng thêm sản phẩm vào giỏ hàng trước khi tạo đơn.
        </CardContent>
        <CardFooter>
          <Link to={isBuyNow && items[0] ? `/products/${items[0].productId}` : '/cart'}>
            <Button>{isBuyNow ? 'Quay lại sản phẩm' : 'Xem giỏ hàng'}</Button>
          </Link>
        </CardFooter>
      </Card>
    )
  }

  const onSubmit = async (data: CheckoutFormValues) => {
    try {
      for (const item of items) {
        const product = await productsApi.getById(item.productId)
        if (!product) {
          toast.error(`Sản phẩm "${item.name}" không còn tồn tại.`)
          dropItem(item.productId)
          return
        }
        const stock = product.stockQuantity ?? product.stock ?? null
        if (stock != null && stock <= 0) {
          toast.error(`"${product.name}" đã hết hàng.`)
          dropItem(item.productId)
          return
        }
        if (stock != null && item.quantity > stock) {
          toast.warning(`"${product.name}" chỉ còn ${stock} sản phẩm. Đã cập nhật số lượng.`)
          adjustQuantity(item.productId, stock)
          return
        }
      }

      const order = await createOrder.mutateAsync({
        items: items.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
        })),
      })

      if (!order) {
        toast.error('Không tạo được đơn hàng.')
        return
      }

      saveCheckoutProfile(data)
      saveOrderShipping(order.id, data)

      try {
        await createPayment.mutateAsync({
          orderId: order.id,
          method: data.paymentMethod,
        })
      } catch (paymentError) {
        toast.warning(
          getApiErrorMessage(
            paymentError,
            'Đơn đã tạo nhưng ghi nhận thanh toán thất bại. Kiểm tra lại trong chi tiết đơn.',
          ),
        )
      }

      finishCheckout()
      toast.success('Đặt hàng thành công.')
      reset()
      navigate(`/account/orders/${order.id}`)
    } catch (error) {
      toast.error(
        getApiErrorMessage(error, 'Không thể thanh toán. Vui lòng thử lại.'),
      )
    }
  }

  const isProcessing = createOrder.isPending || createPayment.isPending || isSubmitting

  return (
    <>
    <form
      id="checkout-form"
      className="grid gap-4 pb-28 lg:grid-cols-3 lg:pb-0"
      onSubmit={handleSubmit(onSubmit)}
    >
      <div className="lg:col-span-2 space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Thông tin giao hàng</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="checkout-name">Họ và tên</Label>
              <Input id="checkout-name" autoComplete="name" {...register('customerName')} />
              {errors.customerName ? (
                <p className="text-xs text-destructive">{errors.customerName.message}</p>
              ) : null}
            </div>
            <div className="space-y-2">
              <Label htmlFor="checkout-phone">Số điện thoại</Label>
              <Input id="checkout-phone" autoComplete="tel" inputMode="tel" {...register('phone')} />
              {errors.phone ? (
                <p className="text-xs text-destructive">{errors.phone.message}</p>
              ) : null}
            </div>
            <div className="space-y-2">
              <Label htmlFor="checkout-address">Địa chỉ nhận hàng</Label>
              <Textarea
                id="checkout-address"
                autoComplete="street-address"
                rows={3}
                placeholder="Số nhà, đường, phường/xã, quận/huyện, tỉnh/thành phố"
                {...register('address')}
              />
              {errors.address ? (
                <p className="text-xs text-destructive">{errors.address.message}</p>
              ) : null}
            </div>
            <div className="space-y-2">
              <Label>Phương thức thanh toán</Label>
              <Controller
                name="paymentMethod"
                control={control}
                render={({ field }) => (
                  <PaymentMethodCards
                    value={field.value}
                    onChange={field.onChange}
                    error={errors.paymentMethod?.message}
                  />
                )}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Tóm tắt đơn hàng</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {isSyncing ? (
            <p className="flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Đang cập nhật giá và tồn kho…
            </p>
          ) : null}
          {items.map((item) => (
            <div key={item.productId} className="flex items-center gap-3">
              <div className="h-12 w-12 shrink-0 overflow-hidden rounded-md border bg-muted/40">
                {item.imageUrl ? (
                  <img src={item.imageUrl} alt="" className="h-full w-full object-contain p-0.5" loading="lazy" />
                ) : null}
              </div>
              <div className="flex min-w-0 flex-1 items-center justify-between gap-2">
                <span className="line-clamp-2">
                  {item.name} x{item.quantity}
                </span>
                <span className="shrink-0 tabular-nums">{formatVnd((item.unitPrice ?? 0) * item.quantity)}</span>
              </div>
            </div>
          ))}
          <div className="border-t pt-3">
            <div className="flex items-center justify-between font-semibold">
              <span>Tổng thanh toán</span>
              <span className="text-secondary">{formatVnd(subtotal)}</span>
            </div>
          </div>
        </CardContent>
        <CardFooter className="hidden flex-col gap-2 sm:flex">
          <Button
            type="submit"
            className="w-full"
            size="lg"
            disabled={isProcessing || isSyncing}
          >
            {isProcessing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : null}
            Xác nhận thanh toán
          </Button>
          <Link
            to={isBuyNow && items[0] ? `/products/${items[0].productId}` : '/cart'}
            className="w-full"
            onClick={() => {
              if (isBuyNow) clearBuyNow()
            }}
          >
            <Button variant="outline" className="w-full">
              {isBuyNow ? 'Quay lại sản phẩm' : 'Quay lại giỏ hàng'}
            </Button>
          </Link>
        </CardFooter>
      </Card>
    </form>

    <div className="fixed inset-x-0 bottom-0 z-30 border-t bg-background/95 p-4 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] backdrop-blur-sm sm:hidden">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
        <div>
          <p className="text-xs text-muted-foreground">Tổng thanh toán</p>
          <p className="text-lg font-semibold text-secondary">{formatVnd(subtotal)}</p>
        </div>
        <Button
          type="submit"
          form="checkout-form"
          size="lg"
          className="shrink-0"
          disabled={isProcessing || isSyncing}
        >
          {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Xác nhận
        </Button>
      </div>
    </div>
    </>
  )
}
