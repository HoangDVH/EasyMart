import { useState } from 'react'
import { Loader2, XCircle } from 'lucide-react'
import { toast } from 'react-toastify'
import { canCancelOrder } from '@/features/orders/components/order-formatters'
import { useCancelOrderMutation } from '@/features/orders/hooks/use-orders'
import { getApiErrorMessage } from '@/shared/lib/api-error'
import { Button } from '@/shared/ui/button'
import { ConfirmDialog } from '@/shared/ui/confirm-dialog'
import { cn } from '@/shared/lib/utils'

type OrderCancelButtonProps = {
  orderId: string
  status: string
  className?: string
  size?: 'sm' | 'default'
  fullWidth?: boolean
  onCancelled?: () => void
}

export function OrderCancelButton({
  orderId,
  status,
  className,
  size = 'sm',
  fullWidth = false,
  onCancelled,
}: OrderCancelButtonProps) {
  const [confirmOpen, setConfirmOpen] = useState(false)
  const cancelOrder = useCancelOrderMutation()

  if (!canCancelOrder(status)) return null

  const handleConfirm = async () => {
    try {
      await cancelOrder.mutateAsync(orderId)
      toast.success('Đã hủy đơn hàng.')
      setConfirmOpen(false)
      onCancelled?.()
    } catch (error) {
      toast.error(
        getApiErrorMessage(
          error,
          'Không thể hủy đơn. Chỉ hủy được đơn chưa thanh toán (PENDING_PAYMENT).',
        ),
      )
    }
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size={size}
        className={cn(
          'gap-1.5 border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive',
          fullWidth && 'w-full',
          className,
        )}
        disabled={cancelOrder.isPending}
        onClick={() => setConfirmOpen(true)}
      >
        {cancelOrder.isPending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <XCircle className="h-4 w-4" />
        )}
        Hủy đơn hàng
      </Button>

      <ConfirmDialog
        open={confirmOpen}
        title="Hủy đơn hàng?"
        description="Chỉ hủy được đơn chưa thanh toán. Tồn kho sẽ được hoàn lại và giao dịch VNPay đang chờ (nếu có) sẽ bị hủy."
        confirmLabel="Hủy đơn"
        cancelLabel="Giữ đơn"
        destructive
        loading={cancelOrder.isPending}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={() => void handleConfirm()}
      />
    </>
  )
}
