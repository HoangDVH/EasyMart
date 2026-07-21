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
  const heightClass = size === 'sm' ? 'h-10' : 'h-10'
  const gridCols = size === 'sm' ? 'grid-cols-[2.75rem_2.75rem_2.75rem]' : 'grid-cols-[2.5rem_2.75rem_2.5rem]'

  return (
    <div
      className={cn(
        'inline-grid w-fit max-w-fit shrink-0 overflow-hidden rounded-md border bg-background',
        gridCols,
        heightClass,
        disabled && 'opacity-50',
      )}
      role="group"
      aria-label={ariaLabel}
    >
      <Button
        type="button"
        variant="ghost"
        size={btnSize}
        className="h-full w-full min-w-0 rounded-none rounded-l-md px-0"
        disabled={disabled || value <= min}
        onClick={() => onChange(clamp(value - 1, min, max))}
        aria-label="Giảm số lượng"
      >
        <Minus className="h-3.5 w-3.5" />
      </Button>
      <span
        id={id}
        className="flex h-full w-full min-w-0 items-center justify-center border-x border-border bg-muted/20 text-sm font-medium tabular-nums"
        aria-live="polite"
      >
        {value}
      </span>
      <Button
        type="button"
        variant="ghost"
        size={btnSize}
        className="h-full w-full min-w-0 rounded-none rounded-r-md px-0"
        disabled={disabled || value >= max}
        onClick={() => onChange(clamp(value + 1, min, max))}
        aria-label="Tăng số lượng"
      >
        <Plus className="h-3.5 w-3.5" />
      </Button>
    </div>
  )
}
