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
      className={cn('mb-3 animate-fade-in text-sm text-muted-foreground', className)}
    >
      {items.map((item, index) => {
        const isLast = index === items.length - 1
        return (
          <Fragment key={`${item.label}-${index}`}>
            {index > 0 ? <span className="mx-1.5">/</span> : null}
            {item.to && !isLast ? (
              <Link to={item.to} className="hover:text-foreground">
                {item.label}
              </Link>
            ) : (
              <span className={isLast ? 'text-foreground' : undefined}>{item.label}</span>
            )}
          </Fragment>
        )
      })}
    </nav>
  )
}
