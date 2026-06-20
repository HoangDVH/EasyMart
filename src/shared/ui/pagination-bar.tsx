import { Loader2 } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { cn } from '@/shared/lib/utils'

function buildPageItems(current: number, total: number): (number | 'ellipsis')[] {
  if (total <= 1) return [0]
  if (total <= 7) return Array.from({ length: total }, (_, i) => i)

  const items: (number | 'ellipsis')[] = [0]
  const start = Math.max(1, current - 1)
  const end = Math.min(total - 2, current + 1)

  if (start > 1) items.push('ellipsis')
  for (let i = start; i <= end; i += 1) items.push(i)
  if (end < total - 2) items.push('ellipsis')
  if (total > 1) items.push(total - 1)

  return items
}

type PaginationBarProps = {
  page: number
  totalPages: number
  isFetching?: boolean
  onPageChange: (page: number) => void
  className?: string
}

export function PaginationBar({
  page,
  totalPages,
  isFetching = false,
  onPageChange,
  className,
}: PaginationBarProps) {
  const items = buildPageItems(page, totalPages)

  return (
    <div className={cn('flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between', className)}>
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={page <= 0 || isFetching}
        onClick={() => onPageChange(Math.max(0, page - 1))}
      >
        Trang trước
      </Button>

      <div className="flex flex-wrap items-center justify-center gap-1">
        {items.map((item, idx) =>
          item === 'ellipsis' ? (
            <span key={`e-${idx}`} className="px-1 text-sm text-muted-foreground">
              …
            </span>
          ) : (
            <Button
              key={item}
              type="button"
              size="sm"
              variant={item === page ? 'default' : 'outline'}
              className="min-w-9 px-2"
              disabled={isFetching}
              onClick={() => onPageChange(item)}
              aria-current={item === page ? 'page' : undefined}
            >
              {item + 1}
            </Button>
          ),
        )}
        {isFetching ? <Loader2 className="ml-1 h-4 w-4 animate-spin text-muted-foreground" aria-hidden /> : null}
      </div>

      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={page + 1 >= totalPages || isFetching}
        onClick={() => onPageChange(page + 1)}
      >
        Trang sau
      </Button>
    </div>
  )
}
