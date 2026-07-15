import type { LucideIcon } from 'lucide-react'
import { cn } from '@/shared/lib/utils'

type EmptyStateProps = {
  icon: LucideIcon
  title: string
  description: string
  action?: React.ReactNode
  className?: string
}

export function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center px-4 py-10 text-center animate-scale-in', className)}>
      <div className="mb-4 grid h-20 w-20 place-items-center rounded-full bg-gradient-to-br from-primary/15 via-muted to-secondary/10 shadow-inner animate-float">
        <Icon className="h-9 w-9 text-primary" aria-hidden />
      </div>
      <h3 className="text-lg font-semibold tracking-tight">{title}</h3>
      <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">{description}</p>
      {action ? <div className="mt-6 flex flex-wrap justify-center gap-2">{action}</div> : null}
    </div>
  )
}
