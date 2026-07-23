import { Link } from 'react-router-dom'
import { Star } from 'lucide-react'
import { useProductsQuery } from '@/features/products/hooks/use-catalog'
import { formatVnd } from '@/shared/lib/product-price'
import type { Product } from '@/features/products/types/product.types'
import { Card, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card'
import { Skeleton } from '@/shared/ui/skeleton'

function displayPrice(price: number | null | undefined, discountPrice: number | null | undefined) {
  if (price != null && discountPrice != null && discountPrice < price) {
    return { current: discountPrice, original: price }
  }
  return { current: price ?? null, original: null as number | null }
}

type RelatedProductsProps = {
  productId: string
  categoryId?: string | null
}

export function RelatedProducts({ productId, categoryId }: RelatedProductsProps) {
  const listQuery = useProductsQuery({
    page: 0,
    size: 8,
    categoryId: categoryId ?? undefined,
  })

  const related =
    listQuery.data?.content?.filter((p) => p.id !== productId).slice(0, 4) ?? []

  if (listQuery.isPending) {
    return (
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Sản phẩm liên quan</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-48 w-full rounded-xl" />
          ))}
        </div>
      </div>
    )
  }

  if (related.length === 0) return null

  return (
    <section className="space-y-3">
      <h2 className="text-base font-medium text-[#000000de]">Sản phẩm liên quan</h2>
      <div className="stagger-children grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {related.map((product) => (
          <RelatedProductCard key={product.id} product={product} />
        ))}
      </div>
    </section>
  )
}

function RelatedProductCard({ product }: { product: Product }) {
  const price = displayPrice(product.price, product.discountPrice)
  const image = product.imageUrl ?? product.images?.[0]

  return (
    <Link to={`/products/${product.id}`}>
      <Card className="h-full overflow-hidden rounded-sm border-[#00000014] shadow-none transition-colors hover:border-primary/30">
        <div className="aspect-square bg-card p-2">
          {image ? (
            <img src={image} alt={product.name} className="h-full w-full object-contain" loading="lazy" />
          ) : (
            <div className="flex h-full items-center justify-center text-xs text-muted-foreground">Không có ảnh</div>
          )}
        </div>
        <CardHeader className="space-y-1 p-3">
          <CardTitle className="line-clamp-2 text-sm leading-snug">{product.name}</CardTitle>
          <CardDescription className="space-y-1">
            <span className="text-base font-semibold text-primary">{formatVnd(price.current)}</span>
            {product.rating != null ? (
              <span className="flex items-center gap-1 text-xs text-amber-700">
                <Star className="h-3 w-3 fill-amber-400 text-amber-500" />
                {product.rating.toFixed(1)}
              </span>
            ) : null}
          </CardDescription>
        </CardHeader>
      </Card>
    </Link>
  )
}
