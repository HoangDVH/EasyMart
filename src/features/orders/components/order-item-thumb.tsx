import { Package } from 'lucide-react'
import { useProductQuery } from '@/features/products/hooks/use-catalog'
import { cn } from '@/shared/lib/utils'
import { Skeleton } from '@/shared/ui/skeleton'

type OrderItemThumbProps = {
  productId: string
  name?: string
  className?: string
}

export function OrderItemThumb({ productId, name, className }: OrderItemThumbProps) {
  const productQuery = useProductQuery(productId)
  const imageUrl =
    productQuery.data?.imageUrl ?? productQuery.data?.images?.find((url) => url.trim().length > 0) ?? null

  if (productQuery.isPending) {
    return <Skeleton className={cn('h-14 w-14 shrink-0 rounded-md', className)} />
  }

  if (!imageUrl) {
    return (
      <div
        className={cn(
          'flex h-14 w-14 shrink-0 items-center justify-center rounded-md bg-muted/50 text-muted-foreground',
          className,
        )}
        aria-hidden
      >
        <Package className="h-5 w-5" />
      </div>
    )
  }

  return (
    <div className={cn('h-14 w-14 shrink-0 overflow-hidden rounded-md border bg-muted/30', className)}>
      <img
        src={imageUrl}
        alt={name ?? ''}
        className="h-full w-full object-contain p-0.5"
        loading="lazy"
      />
    </div>
  )
}
