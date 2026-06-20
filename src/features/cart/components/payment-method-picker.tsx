import { Banknote, Building2 } from 'lucide-react'
import type { CheckoutFormValues } from '@/features/cart/schemas/checkout.schemas'
import { cn } from '@/shared/lib/utils'

const OPTIONS: {
  value: CheckoutFormValues['paymentMethod']
  label: string
  description: string
  icon: typeof Banknote
}[] = [
  {
    value: 'COD',
    label: 'Thanh toán khi nhận hàng',
    description: 'Trả tiền mặt cho shipper',
    icon: Banknote,
  },
  {
    value: 'BANK_TRANSFER',
    label: 'Chuyển khoản ngân hàng',
    description: 'Chuyển khoản trước khi giao',
    icon: Building2,
  },
]

type PaymentMethodPickerProps = {
  value: CheckoutFormValues['paymentMethod']
  onChange: (value: CheckoutFormValues['paymentMethod']) => void
  error?: string
}

export function PaymentMethodPicker({ value, onChange, error }: PaymentMethodPickerProps) {
  return (
    <div className="space-y-2">
      <div className="grid gap-2 sm:grid-cols-2" role="radiogroup" aria-label="Phương thức thanh toán">
        {OPTIONS.map((opt) => {
          const Icon = opt.icon
          const selected = value === opt.value
          return (
            <button
              key={opt.value}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onChange(opt.value)}
              className={cn(
                'flex items-start gap-3 rounded-lg border p-3 text-left transition',
                selected
                  ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                  : 'border-border hover:border-primary/40 hover:bg-muted/40',
              )}
            >
              <span
                className={cn(
                  'mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md',
                  selected ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground',
                )}
              >
                <Icon className="h-4 w-4" />
              </span>
              <span>
                <span className="block text-sm font-medium">{opt.label}</span>
                <span className="mt-0.5 block text-xs text-muted-foreground">{opt.description}</span>
              </span>
            </button>
          )
        })}
      </div>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  )
}
