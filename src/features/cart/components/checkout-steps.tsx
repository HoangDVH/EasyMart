import { Link } from 'react-router-dom'
import { Check } from 'lucide-react'
import { cn } from '@/shared/lib/utils'

const STEPS = [
  { key: 'cart', label: 'Giỏ hàng', to: '/cart' },
  { key: 'checkout', label: 'Thanh toán', to: '/checkout' },
  { key: 'done', label: 'Hoàn tất' },
] as const

type CheckoutStepKey = (typeof STEPS)[number]['key']

export function CheckoutSteps({ current }: { current: CheckoutStepKey }) {
  const currentIndex = STEPS.findIndex((s) => s.key === current)

  return (
    <nav aria-label="Tiến trình thanh toán" className="mb-4">
      <ol className="flex items-center gap-2 sm:gap-4">
        {STEPS.map((step, index) => {
          const done = index < currentIndex
          const active = index === currentIndex
          const clickable = done && 'to' in step && step.to

          const content = (
            <>
              <span
                className={cn(
                  'inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold',
                  done
                    ? 'bg-primary text-primary-foreground'
                    : active
                      ? 'bg-secondary text-secondary-foreground'
                      : 'bg-muted text-muted-foreground',
                )}
                aria-hidden
              >
                {done ? <Check className="h-3.5 w-3.5" /> : index + 1}
              </span>
              <span
                className={cn(
                  'truncate text-xs font-medium sm:text-sm',
                  active ? 'text-foreground' : done ? 'text-primary' : 'text-muted-foreground',
                )}
              >
                {step.label}
              </span>
            </>
          )

          return (
            <li key={step.key} className="flex min-w-0 flex-1 items-center gap-2">
              <div className="flex min-w-0 items-center gap-2">
                {clickable ? (
                  <Link to={step.to!} className="flex min-w-0 items-center gap-2 hover:opacity-90">
                    {content}
                  </Link>
                ) : (
                  content
                )}
              </div>
              {index < STEPS.length - 1 ? (
                <div
                  className={cn('hidden h-px flex-1 sm:block', done ? 'bg-primary/40' : 'bg-border')}
                  aria-hidden
                />
              ) : null}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
