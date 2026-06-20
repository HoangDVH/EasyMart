import { Minus, Plus } from 'lucide-react'
import { cn } from '@/shared/lib/utils'
import { Button } from '@/shared/ui/button'

type QuantityStepperProps = {
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
  disabled?: boolean
  size?: 'sm' | 'default'
  id?: string
  'aria-label'?: string
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

export function QuantityStepper({
  value,
  onChange,
  min = 1,
  max = 99,
  disabled = false,
  size = 'default',
  id,
  'aria-label': ariaLabel = 'Số lượng',
}: QuantityStepperProps) {
  const btnSize = size === 'sm' ? 'sm' : 'default'
  const heightClass = size === 'sm' ? 'h-9' : 'h-10'

  return (
    <div
      className={cn('inline-flex items-center rounded-md border', heightClass, disabled && 'opacity-50')}
      role="group"
      aria-label={ariaLabel}
    >
      <Button
        type="button"
        variant="ghost"
        size={btnSize}
        className="h-full rounded-none rounded-l-md px-2.5"
        disabled={disabled || value <= min}
        onClick={() => onChange(clamp(value - 1, min, max))}
        aria-label="Giảm số lượng"
      >
        <Minus className="h-3.5 w-3.5" />
      </Button>
      <span
        id={id}
        className={cn(
          'flex min-w-10 items-center justify-center border-x px-2 text-sm font-medium tabular-nums',
          size === 'sm' ? 'min-w-9' : 'min-w-11',
        )}
        aria-live="polite"
      >
        {value}
      </span>
      <Button
        type="button"
        variant="ghost"
        size={btnSize}
        className="h-full rounded-none rounded-r-md px-2.5"
        disabled={disabled || value >= max}
        onClick={() => onChange(clamp(value + 1, min, max))}
        aria-label="Tăng số lượng"
      >
        <Plus className="h-3.5 w-3.5" />
      </Button>
    </div>
  )
}
