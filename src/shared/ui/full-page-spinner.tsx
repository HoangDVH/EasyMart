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
        'fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-background/80 backdrop-blur-md animate-fade-in',
        className,
      )}
    >
      <div className="grid h-16 w-16 place-items-center rounded-2xl bg-primary/10 shadow-lg shadow-primary/10">
        <Loader2 className="h-9 w-9 animate-spin text-primary" aria-hidden />
      </div>
      {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}
    </div>
  )
}
