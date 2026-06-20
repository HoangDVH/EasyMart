import { Banknote, Building2 } from 'lucide-react'
import type { CheckoutFormValues } from '@/features/cart/schemas/checkout.schemas'
import type { PaymentMethod } from '@/features/payments/types/payment.types'
import { cn } from '@/shared/lib/utils'

const OPTIONS: {
  value: PaymentMethod
  label: string
  description: string
  icon: typeof Banknote
}[] = [
  {
    value: 'COD',
    label: 'Thanh toán khi nhận hàng',
    description: 'Trả tiền mặt khi shipper giao hàng',
    icon: Banknote,
  },
  {
    value: 'BANK_TRANSFER',
    label: 'Chuyển khoản ngân hàng',
    description: 'Chuyển khoản theo hướng dẫn sau khi đặt hàng',
    icon: Building2,
  },
]

type PaymentMethodCardsProps = {
  value: CheckoutFormValues['paymentMethod']
  onChange: (method: PaymentMethod) => void
  error?: string
}

export function PaymentMethodCards({ value, onChange, error }: PaymentMethodCardsProps) {
  return (
    <div className="space-y-2">
      <div className="grid gap-2 sm:grid-cols-2" role="radiogroup" aria-label="Phương thức thanh toán">
        {OPTIONS.map((option) => {
          const Icon = option.icon
          const selected = value === option.value
          return (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onChange(option.value)}
              className={cn(
                'flex items-start gap-3 rounded-lg border p-3 text-left transition',
                selected
                  ? 'border-primary bg-primary/5 ring-1 ring-primary/30'
                  : 'border-border hover:border-primary/40 hover:bg-muted/30',
              )}
            >
              <span
                className={cn(
                  'mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full',
                  selected ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground',
                )}
              >
                <Icon className="h-4 w-4" />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-medium">{option.label}</span>
                <span className="mt-0.5 block text-xs text-muted-foreground">{option.description}</span>
              </span>
            </button>
          )
        })}
      </div>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  )
}
