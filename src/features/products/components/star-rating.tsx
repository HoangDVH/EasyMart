import { Star } from 'lucide-react'
import { cn } from '@/shared/lib/utils'

type StarRatingProps = {
  value: number
  onChange?: (value: number) => void
  size?: 'sm' | 'md' | 'lg'
  /** Chỉ hiện sao đầy theo điểm TB (có nửa sao gần đúng) */
  readOnly?: boolean
  /** `shopee` = cam #ee4d2d như Shopee */
  tone?: 'amber' | 'shopee'
  className?: string
  'aria-label'?: string
}

const sizeClass = {
  sm: 'h-3.5 w-3.5',
  md: 'h-5 w-5',
  lg: 'h-6 w-6',
}

const toneClass = {
  amber: {
    filled: 'fill-amber-400 text-amber-500',
    empty: 'fill-transparent text-amber-300/80',
  },
  shopee: {
    filled: 'fill-[#ee4d2d] text-[#ee4d2d]',
    empty: 'fill-transparent text-[#ee4d2d]/35',
  },
}

export function StarRating({
  value,
  onChange,
  size = 'md',
  readOnly = false,
  tone = 'amber',
  className,
  'aria-label': ariaLabel,
}: StarRatingProps) {
  const interactive = Boolean(onChange) && !readOnly
  const clamped = Math.max(0, Math.min(5, value))
  const colors = toneClass[tone]

  return (
    <div
      className={cn('inline-flex items-center gap-0.5', className)}
      role={interactive ? 'radiogroup' : 'img'}
      aria-label={ariaLabel ?? `Đánh giá ${clamped.toFixed(1)} trên 5`}
    >
      {[1, 2, 3, 4, 5].map((star) => {
        const filled = clamped >= star
        const half = !filled && clamped >= star - 0.5
        return (
          <button
            key={star}
            type="button"
            disabled={!interactive}
            role={interactive ? 'radio' : undefined}
            aria-checked={interactive ? clamped === star : undefined}
            aria-label={interactive ? `${star} sao` : undefined}
            className={cn(
              'relative',
              interactive
                ? 'cursor-pointer rounded p-0.5 transition-transform hover:scale-110'
                : 'cursor-default',
              !interactive && 'pointer-events-none',
            )}
            onClick={() => onChange?.(star)}
          >
            <Star
              className={cn(sizeClass[size], filled ? colors.filled : colors.empty)}
              aria-hidden
            />
            {half ? (
              <span className="pointer-events-none absolute inset-0 overflow-hidden" style={{ width: '50%' }}>
                <Star className={cn(sizeClass[size], colors.filled)} aria-hidden />
              </span>
            ) : null}
          </button>
        )
      })}
    </div>
  )
}
