import { Link } from 'react-router-dom'
import { CalendarDays, CreditCard, ExternalLink, RefreshCw } from 'lucide-react'
import { useMyPaymentsQuery } from '@/features/payments/hooks/use-payments'
import { paymentMethodLabel, paymentStatusMeta } from '@/features/payments/lib/payment-labels'
import { formatOrderDate, formatVnd } from '@/features/orders/components/order-formatters'
import { OrderIdDisplay } from '@/features/orders/components/order-id-display'
import { getApiErrorMessage } from '@/shared/lib/api-error'
import { useAuthStore } from '@/shared/stores/auth-store'
import { Badge } from '@/shared/ui/badge'
import { Button } from '@/shared/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card'
import { EmptyState } from '@/shared/ui/empty-state'
import { Skeleton } from '@/shared/ui/skeleton'
import { cn } from '@/shared/lib/utils'
import type { Payment } from '@/features/payments/types/payment.types'

function PaymentRow({ payment }: { payment: Payment }) {
  const status = paymentStatusMeta(payment.status)

  return (
    <Card className="hover-lift overflow-hidden">
      <CardContent className="space-y-3 p-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Mã giao dịch</p>
            <p className="font-mono text-sm font-medium">{payment.id}</p>
          </div>
          <Badge className={cn('border', status.tone)}>{status.label}</Badge>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <p className="text-xs text-muted-foreground">Đơn hàng</p>
            <Link
              to={`/account/orders/${payment.orderId}`}
              className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
            >
              <OrderIdDisplay id={payment.orderId} showCopy={false} />
              <ExternalLink className="h-3.5 w-3.5" />
            </Link>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Phương thức</p>
            <p className="text-sm">{paymentMethodLabel(payment.method)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Số tiền</p>
            <p className="text-sm font-semibold text-primary">{formatVnd(payment.amount)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Thời gian</p>
            <p className="inline-flex items-center gap-1 text-sm">
              <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" />
              {formatOrderDate(payment.createdAt)}
            </p>
          </div>
        </div>

        {payment.transactionRef ? (
          <p className="rounded-md border bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
            Mã tham chiếu: <span className="font-mono text-foreground">{payment.transactionRef}</span>
          </p>
        ) : null}
      </CardContent>
    </Card>
  )
}

function PaymentSkeleton() {
  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
      </CardContent>
    </Card>
  )
}

export function MyPaymentsPage() {
  const accessToken = useAuthStore((state) => state.accessToken)
  const paymentsQuery = useMyPaymentsQuery(Boolean(accessToken))

  if (paymentsQuery.isPending) {
    return (
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Lịch sử thanh toán</CardTitle>
            <CardDescription>Đang tải giao dịch...</CardDescription>
          </CardHeader>
        </Card>
        <PaymentSkeleton />
        <PaymentSkeleton />
      </div>
    )
  }

  if (paymentsQuery.isError) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Lịch sử thanh toán</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-destructive">
            {getApiErrorMessage(paymentsQuery.error, 'Không tải được lịch sử thanh toán.')}
          </p>
          <Button size="sm" variant="outline" onClick={() => void paymentsQuery.refetch()}>
            Thử lại
          </Button>
        </CardContent>
      </Card>
    )
  }

  const payments = [...(paymentsQuery.data ?? [])].sort((a, b) => {
    const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0
    const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0
    return tb - ta
  })

  if (payments.length === 0) {
    return (
      <Card>
        <EmptyState
          icon={CreditCard}
          title="Chưa có giao dịch thanh toán"
          description="Các giao dịch COD hoặc VNPay sẽ hiển thị tại đây sau khi bạn đặt hàng."
          action={
            <Link to="/">
              <Button variant="secondary">Bắt đầu mua sắm</Button>
            </Link>
          }
        />
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-primary" />
              Lịch sử thanh toán
            </CardTitle>
            <CardDescription>{payments.length} giao dịch đã ghi nhận.</CardDescription>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5"
            onClick={() => void paymentsQuery.refetch()}
            disabled={paymentsQuery.isFetching}
          >
            <RefreshCw className={cn('h-4 w-4', paymentsQuery.isFetching && 'animate-spin')} />
            {paymentsQuery.isFetching ? 'Đang tải...' : 'Làm mới'}
          </Button>
        </CardHeader>
      </Card>

      <div className="stagger-children space-y-3">
        {payments.map((payment) => (
          <PaymentRow key={payment.id} payment={payment} />
        ))}
      </div>
    </div>
  )
}
