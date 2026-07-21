import { Fragment } from 'react'
import { Link } from 'react-router-dom'
import { cn } from '@/shared/lib/utils'

export type BreadcrumbItem = {
  label: string
  to?: string
}

type BreadcrumbProps = {
  items: BreadcrumbItem[]
  className?: string
}

export function Breadcrumb({ items, className }: BreadcrumbProps) {
  if (items.length === 0) return null
  return (
    <nav
      aria-label="Breadcrumb"
      className={cn(
        'mb-3 flex flex-wrap items-center gap-y-1 animate-fade-in text-sm text-muted-foreground',
        className,
      )}
    >
      {items.map((item, index) => {
        const isLast = index === items.length - 1
        return (
          <Fragment key={`${item.label}-${index}`}>
            {index > 0 ? <span className="mx-1.5 shrink-0">/</span> : null}
            {item.to && !isLast ? (
              <Link to={item.to} className="max-w-[40vw] truncate hover:text-foreground sm:max-w-xs">
                {item.label}
              </Link>
            ) : (
              <span
                className={cn(
                  'min-w-0 break-words',
                  isLast ? 'line-clamp-2 font-medium text-foreground' : 'truncate',
                )}
              >
                {item.label}
              </span>
            )}
          </Fragment>
        )
      })}
    </nav>
  )
}
