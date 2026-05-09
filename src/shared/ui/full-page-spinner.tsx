import { Loader2 } from 'lucide-react'
import { cn } from '@/shared/lib/utils'

type FullPageSpinnerProps = {
  message?: string
  className?: string
}

export function FullPageSpinner({ message, className }: FullPageSpinnerProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        'fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-background/80 backdrop-blur-sm',
        className,
      )}
    >
      <Loader2 className="h-10 w-10 animate-spin text-primary" aria-hidden />
      {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}
    </div>
  )
}
