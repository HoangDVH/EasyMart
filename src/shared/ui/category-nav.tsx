import { useEffect, useMemo, useRef } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import {
  Crown,
  Footprints,
  Laptop,
  Layers,
  Shirt,
  Smartphone,
  Tag,
  type LucideIcon,
} from 'lucide-react'
import { productsApi } from '@/features/products/api/products.api'
import { getProductsQueryKey, useCategoriesQuery } from '@/features/products/hooks/use-catalog'
import { cn } from '@/shared/lib/utils'

/** Map `Category.code` (PHONE, LAPTOP…) → icon hiển thị. Code lạ rơi vào `Tag` mặc định. */
const CATEGORY_ICON_BY_CODE: Record<string, LucideIcon> = {
  PHONE: Smartphone,
  TABLET: Smartphone,
  LAPTOP: Laptop,
  PC: Laptop,
  WATCH: Crown,
  ACCESSORY: Tag,
  SHIRT: Shirt,
  PANTS: Layers,
  SHOES: Footprints,
  HAT: Crown,
}

/** Có vài category dùng tên thay vì code chuẩn → fallback theo lower(name). */
const CATEGORY_ICON_BY_NAME: Record<string, LucideIcon> = {
  'điện thoại': Smartphone,
  'điên thoại': Smartphone,
  laptop: Laptop,
  áo: Shirt,
  ao: Shirt,
  quần: Layers,
  quan: Layers,
  giày: Footprints,
  giay: Footprints,
  nón: Crown,
  non: Crown,
  tablet: Smartphone,
}

function pickIcon(code: string | null | undefined, name: string): LucideIcon {
  if (code) {
    const k = code.toUpperCase()
    if (CATEGORY_ICON_BY_CODE[k]) return CATEGORY_ICON_BY_CODE[k]
  }
  const lower = name.trim().toLowerCase()
  if (CATEGORY_ICON_BY_NAME[lower]) return CATEGORY_ICON_BY_NAME[lower]
  return Tag
}

export function CategoryNav({ className }: { className?: string }) {
  const queryClient = useQueryClient()
  const [searchParams] = useSearchParams()
  const activeCategoryId = searchParams.get('categoryId')
  const categoriesQuery = useCategoriesQuery()
  const keyword = searchParams.get('keyword')?.trim() ?? ''
  const prefetchSeedRef = useRef<string>('')

  const items = useMemo(() => {
    return (categoriesQuery.data ?? []).map((c) => ({
      id: c.id,
      name: c.name,
      code: c.code ?? null,
      icon: pickIcon(c.code, c.name),
    }))
  }, [categoriesQuery.data])

  const buildHref = (categoryId: string | null) => {
    const next = new URLSearchParams(searchParams)
    if (categoryId == null) next.delete('categoryId')
    else next.set('categoryId', categoryId)
    /** Khi đổi danh mục, reset trang về 0 — `ProductCatalog` cũng tự reset khi categoryId đổi nhưng để URL sạch hơn ta xoá page */
    next.delete('page')
    const search = next.toString()
    return `/${search ? `?${search}` : ''}`
  }

  const prefetchCategoryProducts = (categoryId: string | null) => {
    const params = {
      page: 0,
      size: 8,
      keyword: keyword || undefined,
      categoryId: categoryId ?? undefined,
      sort: 'createdAt,desc',
    } as const
    void queryClient.prefetchQuery({
      queryKey: getProductsQueryKey(params),
      queryFn: () => productsApi.list(params),
      staleTime: 60 * 1000,
    })
  }

  useEffect(() => {
    if (categoriesQuery.isPending) return
    if (items.length === 0) return
    const seedKey = `${keyword}::${items.map((x) => x.id).join(',')}`
    if (prefetchSeedRef.current === seedKey) return
    prefetchSeedRef.current = seedKey

    const activeIdx = activeCategoryId ? items.findIndex((x) => x.id === activeCategoryId) : -1
    const targetCategoryIds = new Set<string | null>()
    targetCategoryIds.add(null)
    if (activeIdx >= 0) {
      targetCategoryIds.add(items[activeIdx].id)
      if (activeIdx - 1 >= 0) targetCategoryIds.add(items[activeIdx - 1].id)
      if (activeIdx + 1 < items.length) targetCategoryIds.add(items[activeIdx + 1].id)
    } else {
      for (const item of items.slice(0, 2)) targetCategoryIds.add(item.id)
    }

    for (const categoryId of targetCategoryIds) {
      prefetchCategoryProducts(categoryId)
    }
  }, [categoriesQuery.isPending, items, keyword, activeCategoryId])

  if (categoriesQuery.isPending) {
    return (
      <div className={cn('flex items-center gap-2 overflow-x-auto px-4 py-2', className)}>
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-8 w-24 shrink-0 animate-pulse rounded-full bg-muted" />
        ))}
      </div>
    )
  }

  if (items.length === 0) return null

  return (
    <nav
      aria-label="Danh mục sản phẩm"
      className={cn('flex items-center gap-1 overflow-x-auto px-4 py-2 sm:gap-2', className)}
    >
      <Link
        to={buildHref(null)}
        onMouseEnter={() => prefetchCategoryProducts(null)}
        onFocus={() => prefetchCategoryProducts(null)}
        className={cn(
          'inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition sm:text-sm',
          activeCategoryId == null
            ? 'border-primary bg-primary text-primary-foreground'
            : 'border-border bg-background hover:border-primary/50 hover:text-primary',
        )}
      >
        <Layers className="h-4 w-4" aria-hidden />
        Tất cả
      </Link>
      {items.map((c) => {
        const Icon = c.icon
        const isActive = activeCategoryId === c.id
        return (
          <Link
            key={c.id}
            to={buildHref(c.id)}
            onMouseEnter={() => prefetchCategoryProducts(c.id)}
            onFocus={() => prefetchCategoryProducts(c.id)}
            className={cn(
              'inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition sm:text-sm',
              isActive
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-border bg-background hover:border-primary/50 hover:text-primary',
            )}
            title={c.name}
          >
            <Icon className="h-4 w-4" aria-hidden />
            <span>{c.name}</span>
          </Link>
        )
      })}
    </nav>
  )
}
