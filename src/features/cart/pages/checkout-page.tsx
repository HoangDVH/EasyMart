import { useEffect, useMemo, useState } from 'react'
import { flushSync } from 'react-dom'
import { Controller, useForm } from 'react-hook-form'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import { Loader2 } from 'lucide-react'
import { AddressFormModal } from '@/features/account/components/address-form-modal'
import {
  useAddressesQuery,
  useCreateAddressMutation,
} from '@/features/account/hooks/use-addresses'
import type { UserAddressFormValues } from '@/features/account/schemas/profile.schemas'
import { useProfileQuery } from '@/features/auth/hooks/use-auth'
import {
  CheckoutAddressPickerModal,
  CheckoutShippingSummary,
} from '@/features/cart/components/checkout-shipping-address'
import { CheckoutSteps } from '@/features/cart/components/checkout-steps'
import { PaymentMethodCards } from '@/features/cart/components/payment-method-cards'
import { useSyncCart } from '@/features/cart/hooks/use-sync-cart'
import {
  checkoutSchema,
  type CheckoutFormValues,
} from '@/features/cart/schemas/checkout.schemas'
import { useCreateOrderMutation } from '@/features/orders/hooks/use-orders'
import {
  useCreatePaymentMutation,
  useInitVnpayMutation,
} from '@/features/payments/hooks/use-payments'
import {
  isVnpayCheckoutPending,
  isVnpayRedirectingFlag,
  markVnpayCheckoutPending,
  saveVnpayTxnRefOrderId,
  setVnpayRedirectingFlag,
} from '@/features/payments/lib/vnpay-return'
import { productsApi } from '@/features/products/api/products.api'
import { getApiErrorMessage } from '@/shared/lib/api-error'
import { formatVnd } from '@/shared/lib/product-price'
import {
  calculateShippingFee,
  FREE_SHIPPING_THRESHOLD,
  isFreeShipping,
} from '@/shared/lib/shipping-fee'
import {
  loadCheckoutProfile,
  saveCheckoutProfile,
  saveOrderShipping,
} from '@/shared/lib/shipping-storage'
import { useAuthStore } from '@/shared/stores/auth-store'
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
import { Label } from '@/shared/ui/label'

function VnpayRedirectScreen() {
  return (
    <>
      <CheckoutSteps current="checkout" />
      <div className="mx-auto flex max-w-lg flex-col items-center gap-3 py-16 text-sm text-muted-foreground">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        Đang chuyển tới cổng VNPay…
        <p className="text-center text-xs">Vui lòng không đóng hoặc tải lại trang.</p>
      </div>
    </>
  )
}

export function CheckoutPage() {
  const navigate = useNavigate()
  const accessToken = useAuthStore((state) => state.accessToken)
  const userId = useAuthStore((state) => state.user?.id)
  const profileQuery = useProfileQuery(Boolean(accessToken))
  const addressesQuery = useAddressesQuery(Boolean(accessToken))
  const createAddressMutation = useCreateAddressMutation()
  const createOrder = useCreateOrderMutation()
  const createPayment = useCreatePaymentMutation()
  const initVnpay = useInitVnpayMutation()
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
  const shippingFee = calculateShippingFee(subtotal)
  const payableTotal = subtotal + shippingFee
  const freeShip = isFreeShipping(subtotal)
  const [redirectingToVnpay, setRedirectingToVnpay] = useState(() => isVnpayRedirectingFlag())
  const [selectedAddressId, setSelectedAddressId] = useState<string | 'new'>('new')
  const [prefillDone, setPrefillDone] = useState(false)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [addressFormOpen, setAddressFormOpen] = useState(false)

  const {
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<CheckoutFormValues>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: {
      customerName: '',
      phone: '',
      address: '',
      paymentMethod: 'COD',
    },
  })

  /** Đổi tài khoản → xóa form địa chỉ cũ, prefill lại theo user mới. */
  useEffect(() => {
    setPrefillDone(false)
    setSelectedAddressId('new')
    reset({
      customerName: '',
      phone: '',
      address: '',
      paymentMethod: 'COD',
    })
  }, [userId, accessToken, reset])

  const customerName = watch('customerName')
  const phone = watch('phone')
  const address = watch('address')
  const selectedPaymentMethod = watch('paymentMethod')
  const isVnpayBusy =
    redirectingToVnpay ||
    isVnpayRedirectingFlag() ||
    isVnpayCheckoutPending() ||
    ((createOrder.isPending || initVnpay.isPending || isSubmitting) &&
      selectedPaymentMethod === 'VNPAY')

  const { isSyncing } = useSyncCart(isVnpayBusy ? [] : items.map((item) => item.productId))

  const addresses = addressesQuery.data ?? []
  const defaultAddress = useMemo(
    () => addresses.find((a) => a.isDefault) ?? addresses[0] ?? null,
    [addresses],
  )
  const selectedSaved = useMemo(
    () =>
      typeof selectedAddressId === 'string' && selectedAddressId !== 'new'
        ? (addresses.find((a) => a.id === selectedAddressId) ?? null)
        : null,
    [addresses, selectedAddressId],
  )

  useEffect(() => {
    if (prefillDone) return
    if (addressesQuery.isPending || profileQuery.isPending) return

    if (defaultAddress) {
      setSelectedAddressId(defaultAddress.id)
      reset({
        customerName: defaultAddress.receiverName,
        phone: defaultAddress.phone,
        address: defaultAddress.address,
        paymentMethod: loadCheckoutProfile()?.paymentMethod ?? 'COD',
      })
      setPrefillDone(true)
      return
    }

    const savedProfile = loadCheckoutProfile()
    if (savedProfile) {
      reset(savedProfile)
      setSelectedAddressId('new')
      setPrefillDone(true)
      return
    }

    const profile = profileQuery.data
    if (profile?.fullName || profile?.phone) {
      reset({
        customerName: profile.fullName ?? '',
        phone: profile.phone ?? '',
        address: '',
        paymentMethod: 'COD',
      })
    }
    setSelectedAddressId('new')
    setPrefillDone(true)
  }, [
    prefillDone,
    addressesQuery.isPending,
    profileQuery.isPending,
    defaultAddress,
    profileQuery.data,
    reset,
  ])

  const applyAddress = (addressId: string) => {
    const found = addresses.find((a) => a.id === addressId)
    if (!found) return
    setSelectedAddressId(addressId)
    setValue('customerName', found.receiverName, { shouldValidate: true })
    setValue('phone', found.phone, { shouldValidate: true })
    setValue('address', found.address, { shouldValidate: true })
    setPickerOpen(false)
  }

  const openAddressFlow = () => {
    if (addresses.length > 0) setPickerOpen(true)
    else setAddressFormOpen(true)
  }

  const onCreateAddress = async (data: UserAddressFormValues) => {
    try {
      const created = await createAddressMutation.mutateAsync({
        label: data.label?.trim() || undefined,
        receiverName: data.receiverName.trim(),
        phone: data.phone.trim(),
        address: data.address.trim(),
        isDefault: Boolean(data.isDefault) || addresses.length === 0,
      })
      if (created) {
        setSelectedAddressId(created.id)
        setValue('customerName', created.receiverName, { shouldValidate: true })
        setValue('phone', created.phone, { shouldValidate: true })
        setValue('address', created.address, { shouldValidate: true })
      } else {
        setSelectedAddressId('new')
        setValue('customerName', data.receiverName.trim(), { shouldValidate: true })
        setValue('phone', data.phone.trim(), { shouldValidate: true })
        setValue('address', data.address.trim(), { shouldValidate: true })
      }
      toast.success('Đã thêm địa chỉ.')
      setAddressFormOpen(false)
      setPickerOpen(false)
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Không lưu được địa chỉ.'))
    }
  }

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

  if (isVnpayBusy) {
    return <VnpayRedirectScreen />
  }

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
        receiverName: data.customerName.trim(),
        receiverPhone: data.phone.trim(),
        shippingAddress: data.address.trim(),
      })

      if (!order) {
        toast.error('Không tạo được đơn hàng.')
        return
      }

      saveCheckoutProfile(data)
      saveOrderShipping(order.id, data)

      const payWithVnpay = data.paymentMethod === 'VNPAY'

      if (payWithVnpay) {
        setVnpayRedirectingFlag(true)
        flushSync(() => setRedirectingToVnpay(true))
        try {
          const vnpay = await initVnpay.mutateAsync({ orderId: order.id })
          if (!vnpay.paymentUrl.startsWith('http')) {
            throw new Error('Không nhận được link VNPay hợp lệ từ máy chủ.')
          }
          const token = useAuthStore.getState().accessToken
          if (token) useAuthStore.getState().setAccessToken(token)
          markVnpayCheckoutPending(order.id)
          if (vnpay.transactionRef) saveVnpayTxnRefOrderId(vnpay.transactionRef, order.id)
          window.location.assign(vnpay.paymentUrl)
          return
        } catch (paymentError) {
          setVnpayRedirectingFlag(false)
          setRedirectingToVnpay(false)
          toast.error(
            getApiErrorMessage(
              paymentError,
              'Không mở được cổng VNPay. Đơn đã được tạo — bạn có thể thanh toán lại trong chi tiết đơn.',
            ),
          )
          navigate(`/account/orders/${order.id}`)
          return
        }
      }

      try {
        await createPayment.mutateAsync({
          orderId: order.id,
          method: 'COD',
        })
      } catch (paymentError) {
        toast.error(
          getApiErrorMessage(
            paymentError,
            'Đơn đã tạo nhưng ghi nhận thanh toán COD thất bại. Kiểm tra lại trong chi tiết đơn.',
          ),
        )
        navigate(`/account/orders/${order.id}`)
        return
      }

      finishCheckout()
      navigate(`/checkout/success/${order.id}`)
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Không thể thanh toán. Vui lòng thử lại.'))
    }
  }

  const isProcessing =
    createOrder.isPending || createPayment.isPending || initVnpay.isPending || isSubmitting
  const submitLabel =
    selectedPaymentMethod === 'VNPAY' ? 'Tiếp tục thanh toán VNPay' : 'Xác nhận đặt hàng'

  return (
    <>
      <CheckoutSteps current="checkout" />
      <form
        id="checkout-form"
        className="grid gap-4 lg:grid-cols-3"
        onSubmit={handleSubmit(onSubmit)}
      >
        <div className="space-y-4 lg:col-span-2">
          <CheckoutShippingSummary
            customerName={customerName}
            phone={phone}
            address={address}
            isDefault={selectedSaved?.isDefault}
            label={selectedSaved?.label}
            loading={addressesQuery.isPending && !prefillDone}
            onChangeClick={openAddressFlow}
          />
          {(errors.customerName || errors.phone || errors.address) && (
            <p className="text-xs text-destructive">
              {errors.customerName?.message ||
                errors.phone?.message ||
                errors.address?.message ||
                'Vui lòng chọn địa chỉ nhận hàng hợp lệ.'}
            </p>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Phương thức thanh toán</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label className="sr-only">Phương thức thanh toán</Label>
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
                    <img
                      src={item.imageUrl}
                      alt={item.name}
                      className="h-full w-full object-contain p-0.5"
                      loading="lazy"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-[10px] text-muted-foreground">
                      Không có ảnh
                    </div>
                  )}
                </div>
                <div className="flex min-w-0 flex-1 items-center justify-between gap-2">
                  <span className="line-clamp-2">
                    {item.name} x{item.quantity}
                  </span>
                  <span className="shrink-0 tabular-nums">
                    {formatVnd((item.unitPrice ?? 0) * item.quantity)}
                  </span>
                </div>
              </div>
            ))}
            <div className="space-y-2 border-t pt-3 text-sm">
              <div className="flex items-center justify-between text-muted-foreground">
                <span>Tạm tính</span>
                <span className="tabular-nums">{formatVnd(subtotal)}</span>
              </div>
              <div className="flex items-center justify-between text-muted-foreground">
                <span>Phí vận chuyển</span>
                <span className="tabular-nums">
                  {freeShip ? 'Miễn phí' : formatVnd(shippingFee)}
                </span>
              </div>
              {!freeShip ? (
                <p className="text-xs text-muted-foreground">
                  Miễn ship cho đơn từ {formatVnd(FREE_SHIPPING_THRESHOLD)}.
                </p>
              ) : (
                <p className="text-xs text-emerald-700">Đơn đủ điều kiện miễn phí vận chuyển.</p>
              )}
              <div className="flex items-center justify-between font-semibold">
                <span>Tổng thanh toán</span>
                <span className="text-primary tabular-nums">{formatVnd(payableTotal)}</span>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-2">
            <Button type="submit" className="w-full" size="lg" disabled={isProcessing || isSyncing}>
              {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {submitLabel}
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

      <CheckoutAddressPickerModal
        open={pickerOpen}
        addresses={addresses}
        selectedId={selectedAddressId}
        onClose={() => setPickerOpen(false)}
        onConfirm={applyAddress}
        onAddNew={() => {
          setPickerOpen(false)
          setAddressFormOpen(true)
        }}
      />

      <AddressFormModal
        open={addressFormOpen}
        editing={null}
        defaultAsFirst={addresses.length === 0}
        isSubmitting={createAddressMutation.isPending}
        onClose={() => setAddressFormOpen(false)}
        onSubmit={onCreateAddress}
      />
    </>
  )
}
