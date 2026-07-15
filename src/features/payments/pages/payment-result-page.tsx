import { Link, useLocation, useSearchParams } from 'react-router-dom'
import { AlertCircle, Loader2, RefreshCw, XCircle } from 'lucide-react'
import { useEffect, useMemo, useRef } from 'react'
import { CheckoutSteps } from '@/features/cart/components/checkout-steps'
import {
  buildOrderSuccessPath,
  clearVnpayCheckoutPending,
  isVnpayFailure,
  isVnpaySuccess,
  loadVnpayPendingOrderId,
  markVnpayCheckoutPending,
  parseVnpayReturnParams,
  readVnpaySearchFromLocation,
  resolveVnpayOrderId,
  saveVnpayTxnRefOrderId,
  vnpayResponseMessage,
} from '@/features/payments/lib/vnpay-return'
import { useInitVnpayMutation } from '@/features/payments/hooks/use-payments'
import { getApiErrorMessage } from '@/shared/lib/api-error'
import { Button } from '@/shared/ui/button'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/shared/ui/card'
import { toast } from 'react-toastify'

function goToOrderSuccess(orderId: string) {
  clearVnpayCheckoutPending()
  window.location.replace(buildOrderSuccessPath(orderId))
}

export function PaymentResultPage() {
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const initVnpay = useInitVnpayMutation()
  const redirectedRef = useRef(false)

  const vnpaySearch = useMemo(
    () => readVnpaySearchFromLocation(location),
    [location.search, location.hash],
  )

  const vnpay = useMemo(() => parseVnpayReturnParams(vnpaySearch), [vnpaySearch])
  const orderId = useMemo(() => {
    const fromParams = resolveVnpayOrderId(
      vnpay,
      `${searchParams.toString() ? `?${searchParams.toString()}` : ''}${vnpaySearch}`,
    )
    return fromParams ?? loadVnpayPendingOrderId()
  }, [vnpay, searchParams, vnpaySearch])
  const success = isVnpaySuccess(vnpay.responseCode)
  const failed = isVnpayFailure(vnpay.responseCode)
  const hasVnpayParams = Boolean(vnpay.responseCode || vnpay.txnRef)
  const awaitingReturn = searchParams.get('awaiting') === '1'

  useEffect(() => {
    if (redirectedRef.current || !orderId) return

    if (success) {
      redirectedRef.current = true
      goToOrderSuccess(orderId)
      return
    }

    if (!hasVnpayParams && awaitingReturn) {
      redirectedRef.current = true
      goToOrderSuccess(orderId)
    }
  }, [success, orderId, hasVnpayParams, awaitingReturn])

  const handleRetryPayment = async () => {
    if (!orderId) return
    try {
      const result = await initVnpay.mutateAsync({ orderId })
      markVnpayCheckoutPending(orderId)
      if (result.transactionRef) saveVnpayTxnRefOrderId(result.transactionRef, orderId)
      window.location.href = result.paymentUrl
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Không thể mở lại cổng VNPay.'))
    }
  }

  if ((success && orderId) || (!hasVnpayParams && awaitingReturn && orderId)) {
    return (
      <div className="mx-auto flex max-w-lg flex-col items-center gap-3 py-16 text-sm text-muted-foreground">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        Thanh toán thành công — đang chuyển tới trang xác nhận…
      </div>
    )
  }

  if (!hasVnpayParams) {
    return (
      <div className="mx-auto max-w-lg space-y-4 pb-8">
        <CheckoutSteps current="done" />
        <Card>
          <CardHeader className="items-center text-center">
            <span className="inline-flex h-14 w-14 animate-scale-in items-center justify-center rounded-full bg-muted text-muted-foreground">
              <AlertCircle className="h-8 w-8" />
            </span>
            <CardTitle>Không có kết quả thanh toán</CardTitle>
          </CardHeader>
          <CardContent className="text-center text-sm text-muted-foreground">
            Trang này dùng để nhận kết quả từ VNPay sau khi thanh toán. Nếu bạn vừa quay lại từ
            cổng VNPay mà không thấy thông tin, hãy kiểm tra đơn hàng trong tài khoản.
          </CardContent>
          <CardFooter className="flex flex-col gap-2 sm:flex-row">
            <Link to="/account/orders" className="w-full sm:flex-1">
              <Button variant="outline" className="w-full">
                Xem đơn mua
              </Button>
            </Link>
            <Link to="/" className="w-full sm:flex-1">
              <Button className="w-full">Tiếp tục mua sắm</Button>
            </Link>
          </CardFooter>
        </Card>
      </div>
    )
  }

  const message = vnpayResponseMessage(vnpay.responseCode)

  if (failed) {
    return (
      <div className="mx-auto max-w-lg space-y-4 pb-8">
        <CheckoutSteps current="done" />

        <Card className="overflow-hidden border-destructive/20">
          <CardHeader className="items-center space-y-3 pb-2 text-center">
            <span className="inline-flex h-16 w-16 animate-scale-in items-center justify-center rounded-full bg-red-100 text-red-600 shadow-lg shadow-red-200/50">
              <XCircle className="h-9 w-9" />
            </span>
            <div className="space-y-1">
              <CardTitle className="text-xl">Thanh toán VNPay thất bại</CardTitle>
              <p className="text-sm text-muted-foreground">{message}</p>
            </div>
          </CardHeader>

          <CardContent className="text-center text-xs text-muted-foreground">
            Đơn hàng vẫn được lưu. Bạn có thể thử thanh toán lại bằng VNPay hoặc xem trong mục đơn
            mua.
          </CardContent>

          <CardFooter className="flex flex-col gap-2 sm:flex-row">
            {orderId ? (
              <Link to={`/account/orders/${orderId}`} className="w-full sm:flex-1">
                <Button className="w-full">Xem chi tiết đơn</Button>
              </Link>
            ) : (
              <Link to="/account/orders" className="w-full sm:flex-1">
                <Button className="w-full">Xem đơn mua</Button>
              </Link>
            )}
            {orderId ? (
              <Button
                type="button"
                variant="outline"
                className="w-full gap-1.5 sm:flex-1"
                disabled={initVnpay.isPending}
                onClick={() => void handleRetryPayment()}
              >
                {initVnpay.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                Thanh toán lại VNPay
              </Button>
            ) : (
              <Link to="/" className="w-full sm:flex-1">
                <Button variant="outline" className="w-full">
                  Tiếp tục mua sắm
                </Button>
              </Link>
            )}
          </CardFooter>
        </Card>
      </div>
    )
  }

  if (success && !orderId) {
    return (
      <div className="mx-auto max-w-lg space-y-4 pb-8">
        <CheckoutSteps current="done" />
        <Card className="overflow-hidden border-primary/20">
          <CardHeader className="items-center space-y-3 pb-2 text-center">
            <span className="inline-flex h-16 w-16 animate-success-pop items-center justify-center rounded-full bg-emerald-100 text-emerald-600 shadow-lg shadow-emerald-200/50">
              <AlertCircle className="h-9 w-9" />
            </span>
            <div className="space-y-1">
              <CardTitle className="text-xl">Thanh toán VNPay thành công</CardTitle>
              <p className="text-sm text-muted-foreground">{message}</p>
            </div>
          </CardHeader>
          <CardContent className="text-center text-sm text-muted-foreground">
            Giao dịch đã được ghi nhận. Vui lòng kiểm tra đơn hàng trong tài khoản của bạn.
          </CardContent>
          <CardFooter className="flex flex-col gap-2 sm:flex-row">
            <Link to="/account/orders" className="w-full sm:flex-1">
              <Button className="w-full">Xem đơn mua</Button>
            </Link>
            <Link to="/" className="w-full sm:flex-1">
              <Button variant="outline" className="w-full">
                Tiếp tục mua sắm
              </Button>
            </Link>
          </CardFooter>
        </Card>
      </div>
    )
  }

  return (
    <div className="mx-auto flex max-w-lg flex-col items-center gap-3 py-16 text-sm text-muted-foreground">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      Đang xác nhận kết quả thanh toán…
    </div>
  )
}
